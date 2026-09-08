import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip as ChartTooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { AlertTriangle, DollarSign, Package, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react'

import { reportApi } from '@/api/report'
import { hasRole } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { useReportData } from '@/hooks/use-report-data'
import { useReportRange } from '@/hooks/use-report-range'
import type { ReportGranularity } from '@/lib/report-range'
import { formatNumber, formatVnd } from '@/lib/format'
import { ERole } from '@/types/common'
import { EOrderStatus } from '@/types/order'
import { EReportGroupBy, EReportScope } from '@/types/report'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { KpiCard } from '@/components/kpi-card'
import { PageHeader } from '@/components/page-header'
import { SectionCard } from '@/components/section-card'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { ReportRangePicker } from './report/components/report-range-picker'
import { ReportErrorState } from './report/components/report-error-state'
import { RecentOrdersCard } from './report/components/recent-orders-card'
import { StaleOrdersAlert } from './report/components/stale-orders-alert'
import { TopProductsCard } from './report/components/top-products-card'
import { BranchMonthChart } from './report/components/branch-month-chart'

/** Cùng bảng tông với `OrderListPage` để badge trạng thái không lệch nghĩa giữa 2 màn. */
const STATUS_TONE: Record<EOrderStatus, StatusTone> = {
    [EOrderStatus.PENDING]: 'warning',
    [EOrderStatus.CONFIRMED]: 'info',
    [EOrderStatus.PACKED]: 'info',
    [EOrderStatus.SHIPPING]: 'info',
    [EOrderStatus.SHIPPED]: 'info',
    [EOrderStatus.COMPLETED]: 'success',
    [EOrderStatus.CANCELLED]: 'danger',
    [EOrderStatus.REJECTED]: 'danger',
}

const ALL_BRANCHES = '__all__'

/**
 * Đơn vị thống kê của FE → `groupBy` của backend. Ánh xạ 1-1, không còn chỗ nào phải né.
 *
 * ✅ **`YEAR` đã chạy được từ 2026-08-30** (backend bổ sung theo
 * `docs/backend-request-year-granularity.md`) — đo thật `groupBy: "YEAR"` trả `code: 1`,
 * `rows[].key` dạng `yyyy`. Trước đó FE phải khoá lựa chọn này lại.
 */
const GRANULARITY_TO_GROUP_BY: Record<ReportGranularity, EReportGroupBy> = {
    DAY: EReportGroupBy.DAY,
    MONTH: EReportGroupBy.MONTH,
    YEAR: EReportGroupBy.YEAR,
}

/** Rút gọn tiền cho trục biểu đồ: `61.431.000đ` → `61,4tr`. */
function shortVnd(value: number): string {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`
    return String(value)
}

/** Ô số liệu mockup có vẽ nhưng backend **chưa có API** ⇒ hiện `—` kèm tooltip giải thích. */
function UnavailableStat({ label }: { label: string }) {
    const { t } = useTranslation('report')
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="bg-muted/40 flex cursor-help items-center justify-between rounded-lg px-3 py-2">
                    <span className="text-muted-foreground text-sm">{label}</span>
                    <span className="text-muted-foreground text-sm font-semibold">
                        {t('report.common.notAvailable')}
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent>{t('report.dashboard.unavailable.tooltip')}</TooltipContent>
        </Tooltip>
    )
}

/**
 * **Dashboard** — MỘT trang theo `01-dashboard-bao-cao.png` (PLAN Phase 12).
 *
 * Thứ tự khối bám đúng mockup: KPI · biểu đồ doanh thu theo ngày · tình trạng kho · số liệu phụ +
 * pipeline trạng thái đơn · so sánh chi nhánh theo tháng · đơn hàng gần đây · top sản phẩm.
 *
 * ⚠️ **Không có khối "Báo cáo" (4 tab chi tiết)** — user chốt 2026-08-29 **bỏ hẳn**, và 4 tab đó
 * (`SalesTab`/`ProfitTab`/`InventoryTab`/`BranchTab`) **đã bị xoá khỏi repo**. Bốn endpoint
 * `/report/*` vẫn còn nguyên ở `api/report.ts` + `types/report.ts`; trang này hiện chỉ dùng
 * `/dashboard/summary` và `/report/sales?groupBy=DAY`. Cần màn Báo cáo riêng thì dựng lại từ đó.
 *
 * Bộ chọn kỳ ở **đầu trang dùng chung cho mọi khối** — đổi kỳ một lần, không có cảnh mỗi khối một
 * kỳ rồi so số bị lệch.
 *
 * ## Phân quyền (PLAN B9, user chốt 2026-08-29)
 *
 * Cả trang là **ADMIN+** — route đã chặn ở `Router.tsx` (STAFF bị điều hướng thẳng sang `/pos`).
 * Backend *có* hỗ trợ STAFF gọi `/dashboard/summary` (`scope: STAFF_SELF`) nhưng FE **cố ý không
 * dùng** nhánh đó: dashboard là công cụ quản lý, nhân viên bán hàng không cần xem doanh thu chi nhánh.
 *
 * ## ⚠️ Lệch mockup có chủ đích — backend chưa có API
 *
 * User chốt: **giữ khối theo mockup nhưng hiển thị `—`** kèm tooltip, thay vì bỏ hẳn.
 * Chưa có nguồn dữ liệu: **Khách mới** · **Hàng chờ duyệt** · **Tình trạng kho** (tổng SKU đang
 * bán / tồn khả dụng / hết hàng / **chậm luân chuyển > 60 ngày** — `StockItem` không có ngày xuất
 * bán gần nhất, xem báo cáo Phase 10) · **nhập/xuất kho tuần này** · **% so với hôm qua** và
 * **mục tiêu doanh thu** (`DashboardSummaryResDTO` chỉ trả số liệu **một kỳ**, không có kỳ trước
 * để so, cũng không có bảng mục tiêu) · nút **Xuất dữ liệu** (backend ghi export là "đợt sau"
 * ⇒ dựng bây giờ là nút chết).
 */
export default function Dashboard() {
    const { t } = useTranslation(['report', 'order', 'menu'])
    const { user } = useAuth()
    /** Chỉ SUPER_ADMIN lọc được chi nhánh; role thấp hơn backend **bỏ qua trong im lặng**. */
    const canFilterBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const { branches, refresh: refreshBranches } = useBranch()

    const range = useReportRange('last30Days')
    const [branchId, setBranchId] = useState<string>(ALL_BRANCHES)

    useEffect(() => {
        if (!canFilterBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canFilterBranch, refreshBranches])

    const currentRange = range.range
    const scopedBranchId = canFilterBranch && branchId !== ALL_BRANCHES ? branchId : undefined

    const { data, loading, refreshing, error, reload } = useReportData(
        (signal) =>
            reportApi.dashboardSummary({ ...currentRange!, branchId: scopedBranchId }, signal),
        [currentRange?.fromDate, currentRange?.toDate, branchId, canFilterBranch],
        // Khoảng tuỳ chọn chưa hợp lệ ⇒ không gọi API, để picker tự báo lỗi tại chỗ.
        currentRange !== null,
    )

    /*
     * Biểu đồ "Doanh thu 13 ngày gần nhất" của mockup — `/dashboard/summary` chỉ trả **số tổng
     * của kỳ**, không có chuỗi theo ngày ⇒ phải lấy từ `/report/sales?groupBy=DAY`. Đây là lần
     * gọi API thứ hai của trang, cố ý tách vì hai endpoint trả hai thứ khác nhau.
     */
    const daily = useReportData(
        (signal) =>
            reportApi.sales(
                {
                    ...currentRange!,
                    groupBy: GRANULARITY_TO_GROUP_BY[range.granularity],
                    branchId: scopedBranchId,
                },
                signal,
            ),
        [
            currentRange?.fromDate,
            currentRange?.toDate,
            branchId,
            canFilterBranch,
            range.granularity,
        ],
        currentRange !== null,
    )

    const dailyRows = (daily.data?.rows ?? []).map((r) => ({
        name: r.label ?? r.key,
        value: r.netRevenue,
    }))

    const scopeLabel = data
        ? data.scope === EReportScope.CHAIN
            ? t('report.common.scopeChain')
            : data.scope === EReportScope.BRANCH
              ? t('report.common.scopeBranch')
              : t('report.common.scopeSelf')
        : undefined

    return (
        <>
            <PageHeader
                title={t('menu:menu.dashboard')}
                description={scopeLabel}
                actions={
                    <div className="flex flex-wrap items-end gap-2">
                        <ReportRangePicker
                            period={range.period}
                            onPeriodChange={range.setPeriod}
                            granularity={range.granularity}
                            onGranularityChange={range.setGranularity}
                            customFrom={range.customFrom}
                            customTo={range.customTo}
                            onCustomFromChange={range.setCustomFrom}
                            onCustomToChange={range.setCustomTo}
                            rangeError={range.rangeError}
                        />

                        {canFilterBranch && (
                            <Select value={branchId} onValueChange={setBranchId}>
                                <SelectTrigger aria-label={t('report.common.allBranches')} className="w-[190px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_BRANCHES}>
                                        {t('report.common.allBranches')}
                                    </SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button
                            variant="outline"
                            size="icon"
                            aria-label={t('report.common.retry')}
                            disabled={loading || refreshing}
                            onClick={reload}>
                            <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
                        </Button>
                    </div>
                }
            />

            {error && <ReportErrorState onRetry={reload} />}

            {loading && !data && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[132px] rounded-xl" />
                    ))}
                </div>
            )}

            {data && (
                <div className={refreshing ? 'space-y-4 opacity-60 transition-opacity' : 'space-y-4'}>
                    {/*
                     * Cảnh báo giá vốn thiếu — bắt buộc theo tài liệu backend: `missingCostQty > 0`
                     * nghĩa là COGS bị hụt ⇒ lãi gộp đang **cao hơn thực tế**.
                     */}
                    {/*
                     * Cảnh báo đơn treo giam tồn — độc lập với `data` (tự nạp `/order/search`)
                     * vì `/dashboard/summary` không trả số đơn treo. PLAN Phase 16 mục ①.
                     */}
                    <StaleOrdersAlert branchId={scopedBranchId} />

                    {data.missingCostQty > 0 && (
                        <Alert>
                            <AlertTriangle className="text-warning" />
                            <AlertTitle>{t('report.missingCost.title')}</AlertTitle>
                            <AlertDescription>
                                {t('report.missingCost.description', {
                                    count: data.missingCostQty,
                                })}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Hàng KPI — 4 thẻ như mockup, lấy đúng số backend có. */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={t('report.dashboard.revenue')}
                            value={formatVnd(data.revenue)}
                            icon={DollarSign}
                            iconClassName="bg-primary/10 text-primary"
                            description={t('report.dashboard.revenueHint')}
                        />
                        <KpiCard
                            label={t('report.dashboard.completedOrders')}
                            value={formatNumber(data.completedOrderCount)}
                            icon={ShoppingBag}
                            iconClassName="bg-success-muted text-success"
                            description={t('report.dashboard.completedOrdersHint')}
                        />
                        <KpiCard
                            label={t('report.dashboard.itemsSold')}
                            value={formatNumber(data.itemsSold)}
                            icon={Package}
                            iconClassName="bg-accent text-accent-foreground"
                            description={`${t('report.dashboard.avgOrderValue')}: ${formatVnd(
                                data.avgOrderValue,
                            )}`}
                        />
                        <KpiCard
                            label={t('report.dashboard.grossProfit')}
                            value={formatVnd(data.grossProfit)}
                            icon={TrendingUp}
                            iconClassName="bg-warning-muted text-warning"
                            description={`${t('report.dashboard.marginPercent')}: ${
                                data.marginPercent != null
                                    ? `${data.marginPercent}%`
                                    : t('report.common.notAvailable')
                            }`}
                        />
                    </div>

                    {/* Hàng 2 theo mockup: biểu đồ doanh thu (rộng) + tình trạng kho (hẹp). */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <SectionCard
                            className="lg:col-span-2"
                            title={t(`report.dashboard.revenueChart.${range.granularity}`)}>
                            {daily.loading ? (
                                <Skeleton className="h-[260px] w-full" />
                            ) : dailyRows.length === 0 ? (
                                <p className="text-muted-foreground py-20 text-center text-sm">
                                    {t('report.common.empty')}
                                </p>
                            ) : (
                                <div className="h-[260px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dailyRows}>
                                            <defs>
                                                <linearGradient
                                                    id="revenueFill"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1">
                                                    <stop
                                                        offset="5%"
                                                        stopColor="var(--color-primary)"
                                                        stopOpacity={0.25}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="var(--color-primary)"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-border"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis tick={{ fontSize: 11 }} tickFormatter={shortVnd} />
                                            <ChartTooltip
                                                formatter={(v) => formatVnd(Number(v))}
                                                contentStyle={{ fontSize: 12 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                name={t('report.dashboard.netRevenue')}
                                                stroke="var(--color-primary)"
                                                strokeWidth={2}
                                                fill="url(#revenueFill)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </SectionCard>

                        {/*
                         * "Tình trạng kho" của mockup — giữ khối theo thiết kế nhưng mọi dòng đều
                         * `—`: backend chưa có API nào trả các số này (user chốt 2026-08-29).
                         */}
                        <SectionCard
                            title={t('report.dashboard.unavailable.stockStatus')}
                            description={t('report.dashboard.unavailable.tooltip')}>
                            <div className="space-y-2">
                                <UnavailableStat label={t('report.dashboard.unavailable.totalSku')} />
                                <UnavailableStat
                                    label={t('report.dashboard.unavailable.availableStock')}
                                />
                                <UnavailableStat
                                    label={t('report.dashboard.unavailable.outOfStock')}
                                />
                                <UnavailableStat
                                    label={t('report.dashboard.unavailable.slowMoving')}
                                />
                                <UnavailableStat
                                    label={t('report.dashboard.unavailable.newCustomers')}
                                />
                                <UnavailableStat
                                    label={t('report.dashboard.unavailable.pendingApproval')}
                                />
                            </div>
                        </SectionCard>
                    </div>

                    {/* Số liệu phụ + pipeline — mockup không vẽ nhưng backend trả sẵn, bỏ thì phí. */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SectionCard title={t('report.dashboard.netRevenue')}>
                            <dl className="space-y-2 text-sm">
                                {(
                                    [
                                        [t('report.dashboard.netRevenue'), data.netRevenue],
                                        [t('report.dashboard.discountTotal'), data.discountTotal],
                                        [t('report.dashboard.shippingTotal'), data.shippingTotal],
                                        [t('report.dashboard.cogs'), data.cogs],
                                    ] as [string, number][]
                                ).map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">{label}</dt>
                                        <dd className="font-semibold">{formatVnd(value)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </SectionCard>

                        <SectionCard
                            title={t('report.dashboard.pipeline')}
                            description={t('report.dashboard.pipelineDescription')}>
                            {data.statusBreakdown.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    {t('report.common.empty')}
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {data.statusBreakdown.map((s) => (
                                        <li
                                            key={s.status}
                                            className="flex items-center justify-between gap-2">
                                            <StatusBadge tone={STATUS_TONE[s.status] ?? 'muted'}>
                                                {t(`order:order.status.${s.status}`)}
                                            </StatusBadge>
                                            <span className="text-sm font-semibold">
                                                {formatNumber(s.count)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </SectionCard>
                    </div>

                    {/* So sánh chi nhánh theo tháng — chỉ SUPER_ADMIN (khối này cần lọc `branchId`). */}
                    {canFilterBranch && <BranchMonthChart range={currentRange} branches={branches} />}

                    <RecentOrdersCard />

                    <TopProductsCard rows={data.topProducts} loading={loading} />
                </div>
            )}
        </>
    )
}
