import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

/** Định dạng tiền VND — luôn có `₫`, không phần thập phân (theo mockup: `1.180.000đ`). */
export function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}đ`
}

/** Định dạng số lượng — dấu chấm ngăn cách hàng nghìn theo chuẩn Việt Nam. */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value)
}

/** `13/07/2024`. */
export function formatDate(value: string | Date): string {
    return format(new Date(value), 'dd/MM/yyyy')
}

/**
 * `14:32:07 13/07/2024` — **giờ đứng trước ngày**, có cả giây (CONVENTIONS mục 5.4, chốt 2026-09-07).
 *
 * ⚠️ Trước 2026-09-07 hàm này trả `dd/MM/yyyy HH:mm` — **không còn đúng**. User chốt thống nhất
 * một định dạng ngày-giờ duy nhất cho toàn hệ thống, nên bản cũ và `formatInvoiceDateTime`
 * (vốn riêng cho hoá đơn in) nay **gộp làm một**.
 */
export function formatDateTime(value: string | Date): string {
    return format(new Date(value), 'HH:mm:ss dd/MM/yyyy')
}

/** "5 phút trước" — dùng cho log/thông báo tương đối thời gian. */
export function formatRelativeTime(value: string | Date): string {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi })
}

/**
 * Giữ lại cho hoá đơn in — nay **trùng hệt** `formatDateTime` sau khi user chốt một định dạng
 * ngày-giờ duy nhất (CONVENTIONS mục 5.4). Không xoá để `print-invoice.ts` vẫn đọc đúng ngữ nghĩa
 * "giờ in trên hoá đơn"; nếu sau này hoá đơn cần định dạng riêng thì sửa ở đây, không đụng hàm chung.
 */
export const formatInvoiceDateTime = formatDateTime
