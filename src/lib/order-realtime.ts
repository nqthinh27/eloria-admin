import { ApiError } from '@/lib/api-error'
import { EPaymentStatus, type OrderRealtimeData } from '@/types/order'

/** Destination STOMP của một đơn (chỉ SUBSCRIBE; đơn phải nằm trong phạm vi người dùng, nếu không server đóng socket). */
export function orderTopic(orderId: string): string {
    return `/topic/admin/order/${orderId}`
}

/**
 * Tin có áp dụng được không? `lastVersion` = `version` lớn nhất đã thấy cho đơn này (`null` = chưa
 * thấy); `displayedVersion` = `version` của bản đang hiển thị lấy từ REST (`null`/`undefined` = backend
 * chưa trả). Tin nhỏ hơn mốc lớn nhất trong hai số là tin cũ (tới sai thứ tự) ⇒ bỏ; bằng nhau vẫn
 * áp dụng (idempotent) vì có thể là tin gửi lại. Tin thiếu `version` luôn được áp dụng.
 */
export function isOrderEventFresh(
    lastVersion: number | null,
    version: number | undefined,
    displayedVersion?: number | null,
): boolean {
    if (typeof version !== 'number') return true
    const floor = Math.max(lastVersion ?? -Infinity, displayedVersion ?? -Infinity)
    return version >= floor
}

/** Đơn đã thu tiền theo dữ liệu của tin. */
export function isPaidEvent(data: Pick<OrderRealtimeData, 'paymentStatus'>): boolean {
    return data.paymentStatus === EPaymentStatus.PAID
}

/**
 * `POST /order/{id}/payment` thua cuộc đua với webhook ngân hàng:
 *  - `400 error.order.alreadyPaid` — webhook đã thu xong trước khi nhân viên bấm xác nhận tay;
 *  - `409 error.concurrentModification` — hai bên ghi đơn gần như cùng lúc.
 * Cả hai ⇒ phía gọi **tải lại đơn**: thấy `PAID` thì coi là thành công, chưa `PAID` thì mới báo lỗi.
 */
export function isPaymentRaceError(error: unknown): boolean {
    return (
        error instanceof ApiError &&
        (error.subKey === 'error.order.alreadyPaid' || error.status === 409)
    )
}
