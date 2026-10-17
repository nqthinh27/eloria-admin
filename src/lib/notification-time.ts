import { formatDistanceToNow, type Locale } from 'date-fns'

/**
 * "5 phút trước" cho dòng thông báo. `formatDistanceToNow` **ném** `RangeError` với ngày không hợp
 * lệ — ở đây nuốt lỗi và trả chuỗi rỗng để một dòng dữ liệu xấu không làm sập cả danh sách.
 */
export function formatNotificationTime(value: string, locale: Locale): string {
    try {
        return formatDistanceToNow(new Date(value), { addSuffix: true, locale })
    } catch {
        return ''
    }
}
