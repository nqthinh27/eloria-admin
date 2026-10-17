/**
 * Âm "ting" nhẹ khi có thông báo mới qua WebSocket (PO chốt 2026-10-18; KHÔNG dùng Notification API
 * của hệ điều hành).
 *
 * - Tổng hợp bằng Web Audio — không kèm file âm thanh.
 * - **Autoplay policy**: trình duyệt chỉ cho phát sau khi người dùng đã tương tác với trang ⇒ chỉ
 *   bật `unlocked` ở lần `pointerdown`/`keydown` đầu tiên; trước đó `play` im lặng bỏ qua.
 * - Bật/tắt lưu ở `localStorage` (tiện ích riêng từng trình duyệt; lỗi truy cập storage ⇒ mặc định bật).
 */

const STORAGE_KEY = 'eloria-notification-sound'
/** Không phát dày hơn mức này (nhiều tin dồn một lúc vẫn chỉ kêu một tiếng). */
const MIN_GAP_MS = 800
const NOTES_HZ = [880, 1319]

let context: AudioContext | null = null
let unlocked = false
let lastPlayedAt = 0
let listening = false

function ensureContext(): AudioContext | null {
    if (context) return context
    const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
    return context
}

function unlock(): void {
    unlocked = true
    // Tạo/đánh thức context ngay trong cử chỉ của người dùng để lần phát sau không bị chặn.
    void ensureContext()
        ?.resume()
        .catch(() => undefined)
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    listening = false
}

/** Bắt đầu chờ cử chỉ đầu tiên (idempotent). Gọi một lần khi chuông được mount. */
export function armNotificationSound(): void {
    if (unlocked || listening) return
    listening = true
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
}

export function isNotificationSoundEnabled(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
        return true
    }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
        // Storage bị chặn (cửa sổ ẩn danh…) — tuỳ chọn chỉ có hiệu lực trong phiên này.
    }
}

/** Phát "ting" hai nốt ngắn. Im lặng bỏ qua khi: đang tắt, chưa có cử chỉ người dùng, hoặc vừa phát. */
export function playNotificationSound(): void {
    if (!unlocked || !isNotificationSoundEnabled()) return
    const now = Date.now()
    if (now - lastPlayedAt < MIN_GAP_MS) return
    const ctx = ensureContext()
    if (!ctx) return
    lastPlayedAt = now

    void ctx
        .resume()
        .then(() => {
            const start = ctx.currentTime
            NOTES_HZ.forEach((frequency, index) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                const at = start + index * 0.12
                osc.type = 'sine'
                osc.frequency.value = frequency
                gain.gain.setValueAtTime(0.0001, at)
                gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02)
                gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
                osc.connect(gain).connect(ctx.destination)
                osc.start(at)
                osc.stop(at + 0.25)
            })
        })
        .catch(() => undefined)
}
