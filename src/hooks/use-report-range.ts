import { useMemo, useState } from 'react'

import {
    buildCustomRange,
    buildRange,
    GRANULARITY_MAX_SPAN,
    spanOf,
    toDateInputValue,
    type RangeError,
    type ReportGranularity,
    type ReportPeriod,
} from '@/lib/report-range'
import type { ReportDateRange } from '@/types/report'

/**
 * State chung của bộ lọc kỳ báo cáo: **kỳ** (dropdown dựng sẵn / tuỳ chọn) × **đơn vị thống kê**
 * (Ngày | Tháng | Năm, mặc định Ngày — user chốt 2026-08-30).
 *
 * `range` là `null` khi khoảng đang **không dùng được** — thiếu vế, `từ > đến`, hoặc **vượt trần
 * độ dài** của đơn vị đang chọn (ngày ≤ 30 · tháng ≤ 24 · năm ≤ 10). Lúc đó màn cha **không gọi
 * API** và hiện cảnh báo tại chỗ, thay vì để backend trả `400` hoặc trả về hàng nghìn dòng.
 */
export function useReportRange(
    defaultPeriod: ReportPeriod = 'last30Days',
    defaultGranularity: ReportGranularity = 'DAY',
) {
    const [period, setPeriod] = useState<ReportPeriod>(defaultPeriod)
    const [granularity, setGranularity] = useState<ReportGranularity>(defaultGranularity)
    const today = useMemo(() => toDateInputValue(new Date()), [])
    const [customFrom, setCustomFrom] = useState(today)
    const [customTo, setCustomTo] = useState(today)

    const custom = useMemo(
        () => buildCustomRange(customFrom, customTo, granularity),
        [customFrom, customTo, granularity],
    )

    const presetRange = useMemo(
        () => (period === 'custom' ? null : buildRange(period)),
        [period],
    )

    /*
     * Kỳ dựng sẵn cũng phải tôn trọng trần — hiện không kỳ nào vượt, nhưng kiểm tra sẵn để thêm
     * kỳ mới sau này (vd "12 tháng qua") không âm thầm lọt qua giới hạn.
     */
    const presetError: RangeError | null = useMemo(() => {
        if (!presetRange) return null
        const span = spanOf(
            new Date(presetRange.fromDate),
            new Date(presetRange.toDate),
            granularity,
        )
        return span > GRANULARITY_MAX_SPAN[granularity] ? 'tooLong' : null
    }, [presetRange, granularity])

    const range: ReportDateRange | null =
        period === 'custom' ? custom.range : presetError ? null : presetRange

    return {
        period,
        setPeriod,
        granularity,
        setGranularity,
        customFrom,
        setCustomFrom,
        customTo,
        setCustomTo,
        range,
        /** Lý do khoảng hiện tại không dùng được — `null` khi hợp lệ. */
        rangeError: period === 'custom' ? custom.error : presetError,
        /** Trần của đơn vị đang chọn, để thông báo lỗi nói được con số cụ thể. */
        maxSpan: GRANULARITY_MAX_SPAN[granularity],
    }
}
