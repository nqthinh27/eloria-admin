import {
    differenceInCalendarDays,
    differenceInCalendarMonths,
    differenceInCalendarYears,
    endOfDay,
    endOfMonth,
    startOfDay,
    startOfMonth,
    subDays,
} from 'date-fns'

import type { ReportDateRange } from '@/types/report'

/**
 * Đơn vị thống kê của báo cáo — user chốt 2026-08-30.
 *
 * ⚠️ **`YEAR` backend CHƯA hỗ trợ** (`EReportGroupBy` chỉ có `DAY|MONTH|BRANCH|CHANNEL|STAFF|
 * PRODUCT`; gửi `groupBy: "YEAR"` trả `400 error.input.invalid` — đã đo thật 2026-08-30).
 * Xem `REPORT_GRANULARITIES[].supported` và ghi chú ở `Dashboard.tsx`.
 */
export const REPORT_GRANULARITIES = ['DAY', 'MONTH', 'YEAR'] as const
export type ReportGranularity = (typeof REPORT_GRANULARITIES)[number]

/**
 * Trần độ dài kỳ theo từng đơn vị thống kê (user chốt 2026-08-30):
 * ngày ≤ 30 · tháng ≤ 24 · năm ≤ 10.
 *
 * Mục đích là **chặn ở FE trước khi gọi API**: backend không giới hạn độ dài kỳ, chọn 5 năm ở
 * đơn vị NGÀY sẽ trả ~1800 dòng cho một biểu đồ không đọc nổi (báo cáo **không phân trang**).
 */
export const GRANULARITY_MAX_SPAN: Record<ReportGranularity, number> = {
    DAY: 30,
    MONTH: 24,
    YEAR: 10,
}

/**
 * Đếm độ dài kỳ theo **đơn vị lịch** tương ứng, tính cả hai đầu mút
 * (1/8 → 30/8 = 30 ngày; 1/2026 → 12/2026 = 12 tháng; 2020 → 2026 = 7 năm).
 */
export function spanOf(from: Date, to: Date, granularity: ReportGranularity): number {
    switch (granularity) {
        case 'DAY':
            return differenceInCalendarDays(to, from) + 1
        case 'MONTH':
            return differenceInCalendarMonths(to, from) + 1
        case 'YEAR':
            return differenceInCalendarYears(to, from) + 1
    }
}

/**
 * Kỳ báo cáo dựng sẵn cho dropdown "Hôm nay / 7 ngày / ..." ở `01-dashboard-bao-cao.png`.
 * Dùng chung cho **cả Dashboard lẫn 4 tab Báo cáo** để hai màn không lệch định nghĩa kỳ.
 */
export const REPORT_PERIODS = [
    'today',
    'last7Days',
    'last30Days',
    'thisMonth',
    'lastMonth',
    'custom',
] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]

/**
 * Đổi một `Date` (giờ **máy người dùng**) sang chuỗi ISO-8601 UTC mà backend nhận
 * (`2026-08-01T00:00:00Z`).
 *
 * ⚠️ **Đây là chỗ dễ sai nhất của Phase 12.** Backend gom nhóm ngày/tháng theo **giờ VN
 * (Asia/Ho_Chi_Minh, UTC+7)** nhưng nhận tham số ở **UTC**. Máy chạy đúng múi giờ VN thì
 * `startOfDay` → `toISOString()` cho ra `…T17:00:00Z` của **ngày hôm trước** — đúng như backend
 * mong đợi. Máy lệch múi giờ sẽ lấy sai biên ngày; đây là hạn chế đã biết, không tự bù trừ ở FE
 * để tránh sai kép khi backend đổi cách quy đổi (xem ghi chú "Lệch múi giờ" ở PLAN Phase 12).
 */
function toIsoUtc(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Dựng `{fromDate, toDate}` cho một kỳ dựng sẵn.
 *
 * Biên kỳ lấy trọn ngày (`00:00:00` → `23:59:59.999` giờ máy) rồi mới quy sang UTC, nên
 * "Hôm nay" thật sự chứa đủ đơn trong ngày chứ không cắt tại thời điểm gọi.
 */
export function buildRange(
    period: Exclude<ReportPeriod, 'custom'>,
    now = new Date(),
): ReportDateRange {
    switch (period) {
        case 'today':
            return {
                fromDate: toIsoUtc(startOfDay(now)),
                toDate: toIsoUtc(endOfDay(now)),
            }
        case 'last7Days':
            return {
                fromDate: toIsoUtc(startOfDay(subDays(now, 6))),
                toDate: toIsoUtc(endOfDay(now)),
            }
        case 'last30Days':
            return {
                fromDate: toIsoUtc(startOfDay(subDays(now, 29))),
                toDate: toIsoUtc(endOfDay(now)),
            }
        case 'thisMonth':
            return {
                fromDate: toIsoUtc(startOfMonth(now)),
                toDate: toIsoUtc(endOfDay(now)),
            }
        case 'lastMonth': {
            const prev = subDays(startOfMonth(now), 1)
            return {
                fromDate: toIsoUtc(startOfMonth(prev)),
                toDate: toIsoUtc(endOfMonth(prev)),
            }
        }
    }
}

/** Lý do một khoảng tuỳ chọn bị từ chối — để UI hiện đúng thông báo thay vì một câu chung chung. */
export type RangeError = 'incomplete' | 'reversed' | 'tooLong'

export type CustomRangeResult =
    | { range: ReportDateRange; error: null; span: number }
    | { range: null; error: RangeError; span: number | null }

/**
 * Dựng khoảng từ 2 ô ngày (`yyyy-MM-dd`, giờ máy) và **kiểm tra trần độ dài** theo đơn vị thống kê.
 *
 * Chặn ngay ở FE thay vì để backend trả `400`, và quan trọng hơn: backend **không giới hạn độ dài
 * kỳ** nên chọn 5 năm ở đơn vị NGÀY vẫn trả về ~1800 dòng — báo cáo không phân trang, biểu đồ sẽ
 * không đọc nổi. Trần do user chốt, xem `GRANULARITY_MAX_SPAN`.
 */
export function buildCustomRange(
    from: string,
    to: string,
    granularity: ReportGranularity = 'DAY',
): CustomRangeResult {
    if (!from || !to) return { range: null, error: 'incomplete', span: null }
    const fromDate = startOfDay(new Date(`${from}T00:00:00`))
    const toDate = endOfDay(new Date(`${to}T00:00:00`))
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return { range: null, error: 'incomplete', span: null }
    }
    if (fromDate > toDate) return { range: null, error: 'reversed', span: null }

    const span = spanOf(fromDate, toDate, granularity)
    if (span > GRANULARITY_MAX_SPAN[granularity]) {
        return { range: null, error: 'tooLong', span }
    }
    return {
        range: { fromDate: toIsoUtc(fromDate), toDate: toIsoUtc(toDate) },
        error: null,
        span,
    }
}

/** `yyyy-MM-dd` theo **giờ máy** — giá trị mặc định cho `<input type="date">`. */
export function toDateInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
