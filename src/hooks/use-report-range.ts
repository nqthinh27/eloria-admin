import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toastWarning } from '@/lib/toast'
import {
    buildCustomRange,
    buildRange,
    clampDateToMaxSpan,
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
 * `range` là `null` khi khoảng đang **không dùng được** — thiếu vế hoặc `từ > đến`. **Vượt trần độ
 * dài** (ngày ≤ 30 · tháng ≤ 24 · năm ≤ 10) không còn rơi vào nhánh này nữa: `setCustomFrom` /
 * `setCustomTo` / `setGranularity` tự **kéo ô vừa đổi về vừa đúng trần** (user chốt 2026-09-03) —
 * ô còn lại giữ nguyên, ô vừa sửa (hoặc `from`, khi đổi đơn vị thống kê) bị clamp lại gần.
 */
export function useReportRange(
    defaultPeriod: ReportPeriod = 'last30Days',
    defaultGranularity: ReportGranularity = 'DAY',
) {
    const { t } = useTranslation('report')
    const [period, setPeriod] = useState<ReportPeriod>(defaultPeriod)
    const [granularity, setGranularityState] = useState<ReportGranularity>(defaultGranularity)
    const today = useMemo(() => toDateInputValue(new Date()), [])
    const [customFrom, setCustomFromState] = useState(today)
    const [customTo, setCustomToState] = useState(today)

    const notifyClamped = useCallback(
        (unit: ReportGranularity) => {
            toastWarning('report.range.tooLong', {
                ns: 'report',
                max: GRANULARITY_MAX_SPAN[unit],
                unit: t(`report.granularity.unit.${unit}`),
            })
        },
        [t],
    )

    const setCustomFrom = useCallback(
        (value: string) => {
            if (
                value &&
                customTo &&
                spanOf(new Date(`${value}T00:00:00`), new Date(`${customTo}T00:00:00`), granularity) >
                    GRANULARITY_MAX_SPAN[granularity]
            ) {
                setCustomFromState(clampDateToMaxSpan(customTo, granularity, 'before'))
                notifyClamped(granularity)
                return
            }
            setCustomFromState(value)
        },
        [customTo, granularity, notifyClamped],
    )

    const setCustomTo = useCallback(
        (value: string) => {
            if (
                value &&
                customFrom &&
                spanOf(new Date(`${customFrom}T00:00:00`), new Date(`${value}T00:00:00`), granularity) >
                    GRANULARITY_MAX_SPAN[granularity]
            ) {
                setCustomToState(clampDateToMaxSpan(customFrom, granularity, 'after'))
                notifyClamped(granularity)
                return
            }
            setCustomToState(value)
        },
        [customFrom, granularity, notifyClamped],
    )

    const setGranularity = useCallback(
        (value: ReportGranularity) => {
            setGranularityState(value)
            if (
                customFrom &&
                customTo &&
                spanOf(new Date(`${customFrom}T00:00:00`), new Date(`${customTo}T00:00:00`), value) >
                    GRANULARITY_MAX_SPAN[value]
            ) {
                setCustomFromState(clampDateToMaxSpan(customTo, value, 'before'))
                notifyClamped(value)
            }
        },
        [customFrom, customTo, notifyClamped],
    )

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
