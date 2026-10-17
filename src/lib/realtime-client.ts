import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'

import { apiBaseUrl } from '@/config/app'
import { renewAccessToken } from '@/lib/api-client'
import { isTokenExpiringSoon } from '@/lib/jwt'
import { getAccessToken } from '@/lib/token-store'
import type { RealtimeEnvelope } from '@/types/notification'

/**
 * Kết nối WebSocket STOMP tới backend (Phase 18a) — **nơi duy nhất được mở WebSocket** của repo
 * (giống luật "chỉ api-client được gọi HTTP").
 *
 * Contract: `35.1.eloria-backend/docs/api/fe-handoff-phase18ab-admin.md` mục 1–2.
 *  - 1 kết nối/tab, chỉ chạy khi đã đăng nhập (`RealtimeProvider` gọi `start`/`stop`).
 *  - Token đi trong header `Authorization` của khung `CONNECT` — KHÔNG đưa lên URL.
 *  - Mọi vi phạm phía server (token sai/hết hạn, subscribe sai…) ⇒ khung `ERROR` rồi server đóng
 *    socket ⇒ coi là tín hiệu nối lại.
 *  - Reconnect tự quản lý (`reconnectDelay: 0` + backoff 1s→30s): mỗi lần thử dùng một `Client`
 *    mới, và nếu token sắp/đã hết hạn thì refresh trước rồi mới nối.
 *  - Tin xảy ra lúc mất kết nối KHÔNG được replay ⇒ phát `resync` để màn đang mở gọi lại REST.
 */

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

export type RealtimeHandler = (message: RealtimeEnvelope) => void

/** 1s → 2s → 5s → 10s → 20s → 30s (giữ ở 30s). */
const BACKOFF_STEPS_MS = [1_000, 2_000, 5_000, 10_000, 20_000, 30_000]
const HEARTBEAT_MS = 10_000
/** Treo quá lâu khi bắt tay ⇒ bỏ và thử lại. */
const CONNECTION_TIMEOUT_MS = 15_000
/**
 * Nối xong phải sống đủ lâu mức này mới coi là ổn định và đặt lại backoff. Nếu không, một
 * SUBSCRIBE bị server từ chối (khung `ERROR` + đóng socket, vd STAFF nghe đơn ngoài phạm vi) sẽ
 * vòng nối-bị đuổi-nối mỗi 1 giây mãi.
 */
const STABLE_AFTER_MS = 10_000
/** Tab ẩn lâu hơn mức này rồi hiện lại ⇒ coi như có thể lỡ tin ⇒ `resync`. */
const HIDDEN_RESYNC_AFTER_MS = 30_000
const WS_PATH = '/v1.0/websocket/websocket'

/** Độ trễ trước lần nối lại thứ `attempt` (0-based). Thuần — kiểm chứng được. */
export function reconnectDelayMs(attempt: number): number {
    const index = Math.min(Math.max(attempt, 0), BACKOFF_STEPS_MS.length - 1)
    return BACKOFF_STEPS_MS[index]
}

/**
 * URL `ws(s)://` của endpoint STOMP. API luôn same-origin (CONVENTIONS mục 2) nên mặc định lấy
 * theo `location`; nếu `VITE_API_BASE_URL` là URL tuyệt đối thì bám origin của nó.
 */
export function buildBrokerUrl(
    apiBase: string = apiBaseUrl,
    loc: Pick<Location, 'protocol' | 'host'> = window.location,
): string {
    let protocol = loc.protocol
    let host = loc.host
    if (/^https?:\/\//i.test(apiBase)) {
        const url = new URL(apiBase)
        protocol = url.protocol
        host = url.host
    }
    return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${WS_PATH}`
}

class RealtimeClient {
    private status: RealtimeStatus = 'idle'
    private running = false
    private client: Client | null = null
    /** Tăng mỗi lần start/stop để huỷ các lần nối dở dang. */
    private generation = 0
    private attempt = 0
    private everConnected = false
    private retryTimer: ReturnType<typeof setTimeout> | null = null
    private stableTimer: ReturnType<typeof setTimeout> | null = null
    /** Lần kế buộc refresh token (vừa bị server từ chối bằng khung ERROR). */
    private forceRefresh = false
    private hiddenAt: number | null = null

    private readonly handlers = new Map<string, Set<RealtimeHandler>>()
    private readonly active = new Map<string, StompSubscription>()
    private readonly resyncListeners = new Set<() => void>()
    private readonly statusListeners = new Set<(status: RealtimeStatus) => void>()

    getStatus(): RealtimeStatus {
        return this.status
    }

    /** Mở kết nối (idempotent). Phải đã có access token. */
    start(): void {
        if (this.running) return
        this.running = true
        this.generation += 1
        this.attempt = 0
        this.everConnected = false
        this.forceRefresh = false
        document.addEventListener('visibilitychange', this.onVisibilityChange)
        this.setStatus('connecting')
        void this.open(this.generation)
    }

    /** Đóng hẳn (logout / hết phiên). Giữ nguyên danh sách handler để `start` lại là dùng được. */
    stop(): void {
        if (!this.running) return
        this.running = false
        this.generation += 1
        document.removeEventListener('visibilitychange', this.onVisibilityChange)
        this.clearRetry()
        this.disposeClient()
        this.setStatus('idle')
    }

    /**
     * Đăng ký nhận tin của một destination. Gọi trước hoặc sau `start` đều được — tự (re)subscribe
     * mỗi lần nối. Trả hàm huỷ; handler cuối cùng huỷ thì `unsubscribe` trên server.
     */
    subscribe(destination: string, handler: RealtimeHandler): () => void {
        let set = this.handlers.get(destination)
        if (!set) {
            set = new Set()
            this.handlers.set(destination, set)
        }
        set.add(handler)
        this.ensureSubscribed(destination)

        return () => {
            const current = this.handlers.get(destination)
            if (!current) return
            current.delete(handler)
            if (current.size > 0) return
            this.handlers.delete(destination)
            const sub = this.active.get(destination)
            this.active.delete(destination)
            try {
                sub?.unsubscribe()
            } catch {
                // Socket đã đóng — không còn gì để huỷ.
            }
        }
    }

    /** Sau mỗi lần nối lại (và khi tab hiện lại sau thời gian dài): gọi lại REST để bù tin bị lỡ. */
    onResync(listener: () => void): () => void {
        this.resyncListeners.add(listener)
        return () => this.resyncListeners.delete(listener)
    }

    onStatusChange(listener: (status: RealtimeStatus) => void): () => void {
        this.statusListeners.add(listener)
        return () => this.statusListeners.delete(listener)
    }

    /* ------------------------------------------------------------------ */

    private setStatus(next: RealtimeStatus): void {
        if (this.status === next) return
        this.status = next
        this.statusListeners.forEach((listener) => listener(next))
    }

    private clearRetry(): void {
        if (this.retryTimer !== null) {
            clearTimeout(this.retryTimer)
            this.retryTimer = null
        }
    }

    private clearStable(): void {
        if (this.stableTimer !== null) {
            clearTimeout(this.stableTimer)
            this.stableTimer = null
        }
    }

    private disposeClient(): void {
        this.clearStable()
        const client = this.client
        this.client = null
        this.active.clear()
        if (client) void client.deactivate({ force: true }).catch(() => undefined)
    }

    /** Một lần thử nối: bảo đảm token còn hạn rồi tạo `Client` mới. */
    private async open(generation: number): Promise<void> {
        if (!(await this.ensureToken(generation))) return
        if (generation !== this.generation || !this.running) return

        const token = getAccessToken()
        if (!token) {
            this.scheduleRetry(generation)
            return
        }

        /*
         * `open()` có thể chạy chồng (hẹn giờ backoff nổ cùng lúc người dùng quay lại tab, hoặc đang
         * chờ refresh token). Client đang dở dang của lần trước phải bị huỷ, nếu không nó vẫn nối
         * được, `this.client` trỏ sang client mới và socket cũ sống mãi không ai quản lý.
         */
        if (this.client) this.disposeClient()

        const client = new Client({
            brokerURL: buildBrokerUrl(),
            connectHeaders: { Authorization: `Bearer ${token}` },
            heartbeatIncoming: HEARTBEAT_MS,
            heartbeatOutgoing: HEARTBEAT_MS,
            connectionTimeout: CONNECTION_TIMEOUT_MS,
            reconnectDelay: 0,
            onConnect: () => {
                if (this.client !== client) return
                const wasRetry = this.attempt > 0 || this.everConnected
                this.forceRefresh = false
                this.everConnected = true
                this.clearStable()
                this.stableTimer = setTimeout(() => {
                    this.stableTimer = null
                    if (this.client === client) this.attempt = 0
                }, STABLE_AFTER_MS)
                this.setStatus('connected')
                this.handlers.forEach((_set, destination) => this.ensureSubscribed(destination))
                if (wasRetry) this.emitResync()
            },
            onStompError: () => {
                // Server từ chối (token sai/hết hạn, destination sai…). Lần sau refresh token cho chắc.
                this.forceRefresh = true
                this.handleDisconnect(client, generation)
            },
            onWebSocketClose: () => this.handleDisconnect(client, generation),
        })
        this.client = client
        client.activate()
    }

    /** `true` khi đã có token dùng được; `false` khi phải dừng/hẹn lại. */
    private async ensureToken(generation: number): Promise<boolean> {
        const token = getAccessToken()
        const needRefresh = this.forceRefresh || !token || isTokenExpiringSoon(token)
        if (!needRefresh) return true

        const result = await renewAccessToken()
        if (generation !== this.generation || !this.running) return false
        if (result === 'ok') {
            this.forceRefresh = false
            return true
        }
        // `expired`: api-client đã `notifySessionExpired` ⇒ RealtimeProvider sẽ gọi `stop`.
        if (result === 'unreachable') this.scheduleRetry(generation)
        return false
    }

    private handleDisconnect(client: Client, generation: number): void {
        // Bỏ qua tín hiệu của client cũ / sau khi đã stop; mỗi client chỉ được xử lý một lần.
        if (this.client !== client || generation !== this.generation || !this.running) return
        this.disposeClient()
        this.scheduleRetry(generation)
    }

    private scheduleRetry(generation: number): void {
        if (generation !== this.generation || !this.running) return
        this.clearRetry()
        this.setStatus('reconnecting')
        const base = reconnectDelayMs(this.attempt)
        this.attempt += 1
        const delay = Math.round(base * (0.9 + Math.random() * 0.2))
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null
            void this.open(generation)
        }, delay)
    }

    private ensureSubscribed(destination: string): void {
        const client = this.client
        if (!client || !client.connected || this.active.has(destination)) return
        const sub = client.subscribe(destination, (message) => this.dispatch(destination, message))
        this.active.set(destination, sub)
    }

    private dispatch(destination: string, message: IMessage): void {
        const set = this.handlers.get(destination)
        if (!set || set.size === 0) return
        let envelope: RealtimeEnvelope
        try {
            envelope = JSON.parse(message.body) as RealtimeEnvelope
        } catch {
            return
        }
        // Chép ra mảng: handler có thể tự huỷ đăng ký trong lúc duyệt.
        Array.from(set).forEach((handler) => handler(envelope))
    }

    private emitResync(): void {
        this.resyncListeners.forEach((listener) => listener())
    }

    private readonly onVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
            this.hiddenAt = Date.now()
            return
        }
        const hiddenFor = this.hiddenAt === null ? 0 : Date.now() - this.hiddenAt
        this.hiddenAt = null

        if (this.status === 'reconnecting') {
            // Đang chờ backoff mà người dùng quay lại ⇒ thử nối ngay, không bắt chờ.
            this.clearRetry()
            this.attempt = 0
            void this.open(this.generation)
        } else if (this.status === 'connected' && hiddenFor > HIDDEN_RESYNC_AFTER_MS) {
            this.emitResync()
        }
    }
}

export const realtime = new RealtimeClient()
