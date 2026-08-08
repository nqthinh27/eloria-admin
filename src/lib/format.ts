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

/** `13/07/2024 14:32` (theo mockup cột "Thời gian"). */
export function formatDateTime(value: string | Date): string {
    return format(new Date(value), 'dd/MM/yyyy HH:mm')
}

/** "5 phút trước" — dùng cho log/thông báo tương đối thời gian. */
export function formatRelativeTime(value: string | Date): string {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi })
}
