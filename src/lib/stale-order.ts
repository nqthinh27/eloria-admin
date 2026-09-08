import { EOrderStatus } from '@/types/order'

/**
 * Ngưỡng (ngày) coi một đơn `PENDING` là **treo quá lâu**.
 *
 * Vì sao cần: từ 2026-08-14 backend **trừ tồn ngay khi tạo đơn** (bỏ cơ chế giữ chỗ — xem
 * CLAUDE.md mục "Mô hình tồn kho") và **không có cơ chế tự huỷ/hết hạn đơn**. Một đơn `PENDING`
 * bị bỏ quên vì vậy **giam hàng vô thời hạn**: hàng còn trong kho nhưng không bán được cho ai khác.
 *
 * Đo thật 2026-09-08 trên dữ liệu dev: **37 đơn PENDING**, 34 đơn tuổi 15–30 ngày, giữ ~238,9tr đ.
 *
 * ⚠️ Đây **chỉ là cảnh báo phía FE** — không có API nào tự huỷ đơn. Nhân viên thấy cảnh báo thì
 * vào huỷ tay để hoàn tồn. Xem PLAN Phase 16 mục ①.
 */
export const STALE_PENDING_DAYS = 7

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Số ngày trọn vẹn đã trôi qua kể từ `isoDate`. Trả `null` khi ngày không hợp lệ. */
export function daysSince(isoDate: string | null | undefined): number | null {
    if (!isoDate) return null
    const time = new Date(isoDate).getTime()
    if (Number.isNaN(time)) return null
    return Math.floor((Date.now() - time) / MS_PER_DAY)
}

/**
 * Đơn có đang **treo giam tồn** không: còn `PENDING` và đã quá {@link STALE_PENDING_DAYS} ngày.
 *
 * Chỉ xét `PENDING` — các trạng thái sau đó (`CONFIRMED`/`PACKED`/…) là đơn đang được xử lý,
 * không phải bỏ quên; `COMPLETED`/`CANCELLED` thì tồn đã chốt hoặc đã hoàn.
 */
export function isStalePending(
    status: EOrderStatus | string | null | undefined,
    createdDate: string | null | undefined,
): boolean {
    if (status !== EOrderStatus.PENDING) return false
    const age = daysSince(createdDate)
    return age !== null && age >= STALE_PENDING_DAYS
}
