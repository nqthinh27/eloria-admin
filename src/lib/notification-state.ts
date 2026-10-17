import {
    ENotificationRefType,
    type NotificationPage,
    type NotificationRes,
} from '@/types/notification'

/**
 * Logic thuần của quả chuông — tách khỏi React để kiểm chứng được mà không cần test runner.
 * Bám đúng contract 7 bước ở `fe-handoff-phase18ab-admin.md` mục 4.
 */

/** Backend đếm chưa-thấy trong 100 thông báo mới nhất ⇒ trần của badge. */
export const BADGE_CAP = 100

/** `0` ẩn badge (trả `null`) · `1–99` hiện số · `100` hiện `99+`. */
export function badgeLabel(count: number): string | null {
    if (count <= 0) return null
    if (count >= BADGE_CAP) return '99+'
    return String(count)
}

/**
 * Dữ liệu từ WebSocket/REST là dữ liệu ngoài, không tin: chỉ nhận phần tử đủ field dùng để hiển thị
 * (`id`, `type`, `title`, `content` là chuỗi; `createdDate` parse được) — còn lại bị bỏ thay vì làm
 * sập phần render. `seen`/`read` thiếu coi là `false`.
 */
export function isNotificationRes(value: unknown): value is NotificationRes {
    if (typeof value !== 'object' || value === null) return false
    const v = value as Record<string, unknown>
    return (
        typeof v.id === 'string' &&
        v.id.length > 0 &&
        typeof v.type === 'string' &&
        typeof v.title === 'string' &&
        typeof v.content === 'string' &&
        typeof v.createdDate === 'string' &&
        !Number.isNaN(Date.parse(v.createdDate))
    )
}

export type NotificationState = {
    /** Số trên chuông (`seen`), luôn trong `0..BADGE_CAP`. */
    badge: number
    items: NotificationRes[]
    /** Con trỏ keyset của trang kế — truyền NGUYÊN VĂN cho `GET ?cursor=`. */
    nextCursor: string | null
    hasMore: boolean
    /** Đã tải trang đầu ít nhất một lần ⇒ tin WS mới mới được chèn vào `items`. */
    loaded: boolean
}

export const initialNotificationState: NotificationState = {
    badge: 0,
    items: [],
    nextCursor: null,
    hasMore: false,
    loaded: false,
}

export type NotificationAction =
    /** `GET /unseen-count` trả về. */
    | { type: 'countLoaded'; count: number }
    /** Tin WS `NOTIFICATION_CREATED`. */
    | { type: 'received'; item: NotificationRes }
    /** Mở chuông ⇒ optimistic `badge = 0`. */
    | { type: 'seenAll' }
    /** Trang đầu (mở chuông / reconnect / focus lại). */
    | { type: 'firstPageLoaded'; page: NotificationPage }
    /** Trang kế (cuộn tới cuối). */
    | { type: 'nextPageLoaded'; page: NotificationPage }
    /** Bấm dòng ⇒ optimistic bỏ highlight. */
    | { type: 'readMarked'; id: string }
    /** `400 notExisted` ⇒ thông báo đã không còn. */
    | { type: 'removed'; id: string }
    | { type: 'reset' }

function clampBadge(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.min(Math.max(Math.trunc(value), 0), BADGE_CAP)
}

function time(value: string): number {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? 0 : ms
}

export function notificationReducer(
    state: NotificationState,
    action: NotificationAction,
): NotificationState {
    switch (action.type) {
        case 'countLoaded':
            return { ...state, badge: clampBadge(action.count) }

        case 'received': {
            // Đã có trong danh sách (trang đầu tải về trùng tin WS vừa tới) ⇒ không đếm hai lần.
            if (state.items.some((item) => item.id === action.item.id)) return state
            return {
                ...state,
                badge: clampBadge(state.badge + 1),
                // Danh sách chưa tải thì khi mở chuông trang đầu sẽ có tin này — không chèn trước.
                items: state.loaded ? [action.item, ...state.items] : state.items,
            }
        }

        case 'seenAll':
            return { ...state, badge: 0 }

        case 'firstPageLoaded': {
            const { data } = action.page
            const pageIds = new Set(data.map((item) => item.id))
            /*
             * Tin WS tới trong lúc GET đang bay có thể chưa nằm trong `data` ⇒ giữ lại những tin
             * local MỚI HƠN dòng đầu của trang (trang rỗng thì giữ hết). Không giữ tin cũ hơn:
             * server là nguồn sự thật cho phần còn lại.
             */
            const newestOnPage = data.length > 0 ? time(data[0].createdDate) : -Infinity
            const extras = state.items.filter(
                (item) => !pageIds.has(item.id) && time(item.createdDate) > newestOnPage,
            )
            return {
                ...state,
                items: [...extras, ...data],
                nextCursor: action.page.nextCursor,
                hasMore: action.page.hasMore,
                loaded: true,
            }
        }

        case 'nextPageLoaded': {
            const existing = new Set(state.items.map((item) => item.id))
            return {
                ...state,
                items: [...state.items, ...action.page.data.filter((item) => !existing.has(item.id))],
                nextCursor: action.page.nextCursor,
                hasMore: action.page.hasMore,
            }
        }

        case 'readMarked':
            return {
                ...state,
                items: state.items.map((item) =>
                    item.id === action.id ? { ...item, read: true, seen: true } : item,
                ),
            }

        case 'removed':
            return { ...state, items: state.items.filter((item) => item.id !== action.id) }

        case 'reset':
            return initialNotificationState
    }
}

/**
 * Route đích khi bấm một thông báo (PLAN Phase 25 mục 4). `null` = không có màn đích
 * (`PAYMENT_TRANSACTION` — Phase 18c, hoặc `refType`/`refId` lạ) ⇒ chỉ đánh dấu đã đọc.
 *
 * Các trang list đọc query `?open=` qua `useOpenFromQuery`; tồn kho đọc `?tab=` + `?sku=`.
 */
export function notificationTarget(
    notification: Pick<NotificationRes, 'refType' | 'refId' | 'branchId'>,
): string | null {
    const { refType, refId, branchId } = notification
    if (!refId) return null
    const id = encodeURIComponent(refId)

    switch (refType) {
        case ENotificationRefType.ORDER:
            return `/orders?open=${id}`
        case ENotificationRefType.WAREHOUSE_LEDGER:
            return `/inventory?tab=ledger&open=${id}`
        case ENotificationRefType.WORK_SHIFT:
            return `/shifts?open=${id}`
        case ENotificationRefType.RETURN_REQUEST:
            return `/returns?open=${id}`
        case ENotificationRefType.STOCK_ITEM:
            return `/inventory?tab=stock&sku=${id}${branchId ? `&branch=${encodeURIComponent(branchId)}` : ''}`
        default:
            return null
    }
}
