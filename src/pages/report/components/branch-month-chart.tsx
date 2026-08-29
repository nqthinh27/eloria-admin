import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts'

import { reportApi } from '@/api/report'
import { formatVnd } from '@/lib/format'
import type { Branch } from '@/types/branch'
import type { ReportDateRange } from '@/types/report'
import { EReportGroupBy } from '@/types/report'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/section-card'

/** Rút gọn tiền cho trục biểu đồ: `61.431.000đ` → `61,4tr`. */
function shortVnd(value: number): string {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`
    return String(value)
}

/** Màu từng chi nhánh — dùng token trong `index.css`, không hardcode hex (CONVENTIONS). */
const SERIES_COLORS = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
]

type MonthRow = { month: string } & Record<string, number | string>

/**
 * "Doanh thu theo tháng — so sánh chi nhánh" của mockup `01`: cột nhóm, mỗi tháng một cụm,
 * mỗi chi nhánh một màu.
 *
 * ⚠️ **Backend không gom nhóm 2 chiều được**: `POST /report/sales` chỉ nhận **một** `groupBy`
 * (`MONTH` *hoặc* `BRANCH`, không có `MONTH × BRANCH`). Vì vậy khối này gọi **1 request cho mỗi
 * chi nhánh** với `groupBy: MONTH` + `branchId`, rồi ghép lại ở FE.
 *
 * An toàn vì: chỉ **SUPER_ADMIN** thấy khối này (role khác không truyền được `branchId` — backend
 * bỏ qua trong im lặng ⇒ 3 request sẽ ra 3 kết quả giống hệt nhau), và số chi nhánh nhỏ (hiện 3).
 * ⚠️ Nếu chuỗi mở rộng lên hàng chục chi nhánh thì **phải xin backend gom nhóm 2 chiều** thay vì
 * tăng số request — xem PLAN mục "Việc chờ backend".
 */
export function BranchMonthChart({
    range,
    branches,
}: {
    range: ReportDateRange | null
    branches: Branch[]
}) {
    const { t } = useTranslation('report')
    const [rows, setRows] = useState<MonthRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!range || branches.length === 0) return
        const controller = new AbortController()
        setLoading(true)

        Promise.all(
            branches.map((b) =>
                reportApi
                    .sales(
                        {
                            ...range,
                            groupBy: EReportGroupBy.MONTH,
                            branchId: b.id,
                        },
                        controller.signal,
                    )
                    .then((res) => ({ branch: b, rows: res.rows }))
                    /* Một chi nhánh lỗi thì vẫn vẽ các chi nhánh còn lại. */
                    .catch(() => ({ branch: b, rows: [] })),
            ),
        )
            .then((results) => {
                if (controller.signal.aborted) return
                /* Gộp theo tháng: mỗi tháng một dòng, mỗi chi nhánh một cột trong dòng đó. */
                const byMonth = new Map<string, MonthRow>()
                for (const { branch, rows: branchRows } of results) {
                    for (const r of branchRows) {
                        const existing = byMonth.get(r.key) ?? { month: r.key }
                        existing[branch.id] = r.netRevenue
                        byMonth.set(r.key, existing)
                    }
                }
                setRows([...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)))
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })

        return () => controller.abort()
        /*
         * Chỉ phụ thuộc **giá trị** của khoảng ngày, không phải danh tính object `range`
         * (object mới mỗi lần render cha ⇒ đưa thẳng vào deps sẽ gọi API vô hạn).
         */
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range?.fromDate, range?.toDate, branches])

    return (
        <SectionCard title={t('report.branch.chartTitle')}>
            {loading ? (
                <Skeleton className="h-[300px] w-full" />
            ) : rows.length === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-sm">
                    {t('report.common.empty')}
                </p>
            ) : (
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-border"
                                vertical={false}
                            />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={shortVnd} />
                            <ChartTooltip
                                formatter={(v) => formatVnd(Number(v))}
                                contentStyle={{ fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            {branches.map((b, i) => (
                                <Bar
                                    key={b.id}
                                    dataKey={b.id}
                                    name={b.name}
                                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                                    radius={[3, 3, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </SectionCard>
    )
}
