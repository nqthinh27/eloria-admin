/**
 * Thông báo (quả chuông) + khung tin WebSocket — đồng bộ contract backend Phase 18a/18b
 * (`35.1.eloria-backend/docs/api/fe-handoff-phase18ab-admin.md`, đo trên backend thật 2026-10-17).
 */

/** `refType` — quyết định route đích khi bấm dòng (backend KHÔNG gửi route, FE tự map). */
export const ENotificationRefType = {
    ORDER: 'ORDER',
    WAREHOUSE_LEDGER: 'WAREHOUSE_LEDGER',
    WORK_SHIFT: 'WORK_SHIFT',
    RETURN_REQUEST: 'RETURN_REQUEST',
    /** `refId` là **mã SKU** (không phải uuid) — đi kèm `branchId`. */
    STOCK_ITEM: 'STOCK_ITEM',
    /** Phase 18c, chỉ SUPER_ADMIN — chưa có màn đích. */
    PAYMENT_TRANSACTION: 'PAYMENT_TRANSACTION',
} as const
export type ENotificationRefType = (typeof ENotificationRefType)[keyof typeof ENotificationRefType]

/**
 * `NotificationResDTO` — phần tử của `GET /notification` và `data` của tin WS `NOTIFICATION_CREATED`.
 *
 * `title`/`content` **đã render tiếng Việt theo từng người nhận** ⇒ hiển thị nguyên văn,
 * không ghép chuỗi, không i18n. `type` chỉ để phân loại, FE không cần map hết (giữ `string`
 * để backend thêm `type` mới không làm vỡ FE).
 */
export type NotificationRes = {
    id: string
    type: string
    /** Có thể là giá trị lạ ngoài `ENotificationRefType` ⇒ coi như không có đích. */
    refType: string | null
    refId: string | null
    branchId: string | null
    title: string
    content: string
    /** Quyết định **số trên chuông**. */
    seen: boolean
    /** Quyết định **highlight** dòng. */
    read: boolean
    createdDate: string
}

/** `GET /notification` — phân trang **keyset** (không có `?page=`, không có `total`). */
export type NotificationPage = {
    data: NotificationRes[]
    nextCursor: string | null
    hasMore: boolean
}

/** `GET /notification/unseen-count` và `POST /notification/mark-all-seen`. */
export type NotificationCount = {
    /** `0 ≤ count ≤ 100` — đếm chưa-thấy trong 100 thông báo mới nhất. */
    count: number
}

/** Envelope mọi tin WebSocket. */
export type RealtimeEnvelope<TType extends string = string, TData = unknown> = {
    type: TType
    data: TData
    ts: string
}

export type NotificationCreatedEvent = RealtimeEnvelope<'NOTIFICATION_CREATED', NotificationRes>

/**
 * Các `type` đã biết (contract mục 5 + Phase 18c) — dùng để chọn icon/màu. Backend có thể thêm
 * `type` mới bất cứ lúc nào nên `NotificationRes.type` vẫn là `string`; type lạ ⇒ icon mặc định.
 */
export const ENotificationType = {
    ORDER_CREATED: 'ORDER_CREATED',
    ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
    /** Đơn đã thanh toán (webhook ngân hàng hoặc thu tay) — Phase 18c. */
    ORDER_PAID: 'ORDER_PAID',
    UNASSIGNED_ORDER_OVERDUE: 'UNASSIGNED_ORDER_OVERDUE',
    WAREHOUSE_SUBMITTED: 'WAREHOUSE_SUBMITTED',
    WAREHOUSE_APPROVED: 'WAREHOUSE_APPROVED',
    WAREHOUSE_REJECTED: 'WAREHOUSE_REJECTED',
    STOCK_COUNT_CREATED: 'STOCK_COUNT_CREATED',
    STOCK_DISPOSAL_CREATED: 'STOCK_DISPOSAL_CREATED',
    SHIFT_REQUESTED: 'SHIFT_REQUESTED',
    SHIFT_APPROVED: 'SHIFT_APPROVED',
    SHIFT_REJECTED: 'SHIFT_REJECTED',
    SHIFT_CLOSED: 'SHIFT_CLOSED',
    SHIFT_OPEN_TOO_LONG: 'SHIFT_OPEN_TOO_LONG',
    RETURN_REQUESTED: 'RETURN_REQUESTED',
    RETURN_APPROVED: 'RETURN_APPROVED',
    RETURN_REJECTED: 'RETURN_REJECTED',
    RETURN_COMPLETED: 'RETURN_COMPLETED',
    LOW_STOCK: 'LOW_STOCK',
    /** Tiền về không khớp đơn nào — chỉ SUPER_ADMIN, `refType = PAYMENT_TRANSACTION`, chưa có màn đích. */
    PAYMENT_UNMATCHED: 'PAYMENT_UNMATCHED',
} as const
export type ENotificationType = (typeof ENotificationType)[keyof typeof ENotificationType]
