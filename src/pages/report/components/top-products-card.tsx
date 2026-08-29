import { useTranslation } from 'react-i18next'

import { formatNumber, formatVnd } from '@/lib/format'
import type { TopProductRow } from '@/types/report'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SectionCard } from '@/components/section-card'

/**
 * Khối "Top sản phẩm bán chạy" của mockup `01` — dữ liệu từ `dashboardSummary.topProducts`
 * (backend đã sắp sẵn, tối đa 5 dòng; FE **không sắp lại**).
 *
 * ⚠️ **Lệch mockup có chủ đích:**
 * - Cột **DANH MỤC**: `TopProductRow` chỉ có `{skuId, skuCode, productName, itemsSold, netRevenue}`
 *   — **không có danh mục**. Tra thêm qua `/product/search` cũng không được vì `categories` **luôn
 *   rỗng** ở API danh sách (chỉ populate ở `GET /product/{id}`) ⇒ sẽ phải gọi 5 request chi tiết
 *   cho một khối phụ. Hiển thị `—` kèm tooltip (user chốt 2026-08-29).
 * - Cột **TỶ LỆ TỔNG**: backend không trả, nhưng **tính được** = `netRevenue` dòng ÷ tổng
 *   `netRevenue` của 5 dòng đang hiện. ⚠️ Đây là **tỷ trọng trong nhóm top 5**, *không phải*
 *   tỷ trọng trên toàn doanh thu — nhãn và tooltip đã nói rõ để không hiểu nhầm.
 * - Cột **ảnh sản phẩm**: `topProducts` không có `imageUrl`; bỏ, không dựng ô ảnh rỗng.
 */
export function TopProductsCard({
    rows,
    loading,
}: {
    rows: TopProductRow[]
    loading?: boolean
}) {
    const { t } = useTranslation('report')

    /* Mẫu số là tổng của **các dòng đang hiện**, không phải doanh thu toàn kỳ — xem ghi chú trên. */
    const topTotal = rows.reduce((sum, r) => sum + r.netRevenue, 0)

    return (
        <SectionCard
            title={t('report.dashboard.topProducts')}
            description={t('report.dashboard.topProductsDescription')}>
            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                    {t('report.common.empty')}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted-foreground border-b text-left text-xs">
                                <th className="w-8 py-2 pr-3 font-medium">#</th>
                                <th className="py-2 pr-3 font-medium">
                                    {t('report.dashboard.column.product')}
                                </th>
                                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                                    {t('report.dashboard.column.category')}
                                </th>
                                <th className="py-2 pr-3 text-right font-medium whitespace-nowrap">
                                    {t('report.dashboard.column.itemsSold')}
                                </th>
                                <th className="py-2 pr-3 text-right font-medium whitespace-nowrap">
                                    {t('report.dashboard.column.netRevenue')}
                                </th>
                                <th className="py-2 font-medium whitespace-nowrap">
                                    {t('report.dashboard.column.share')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((p, i) => {
                                const share = topTotal > 0 ? (p.netRevenue / topTotal) * 100 : 0
                                return (
                                    <tr key={p.skuId} className="border-b last:border-0">
                                        <td className="text-muted-foreground py-2 pr-3">
                                            {i + 1}
                                        </td>
                                        <td className="py-2 pr-3">
                                            <div className="font-medium">
                                                {p.productName ??
                                                    t('report.common.notAvailable')}
                                            </div>
                                            <div className="text-muted-foreground font-mono text-xs">
                                                {p.skuCode}
                                            </div>
                                        </td>
                                        <td className="text-muted-foreground py-2 pr-3">
                                            <Tooltip>
                                                <TooltipTrigger className="cursor-help">
                                                    {t('report.common.notAvailable')}
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {t('report.dashboard.categoryUnavailable')}
                                                </TooltipContent>
                                            </Tooltip>
                                        </td>
                                        <td className="py-2 pr-3 text-right tabular-nums">
                                            {formatNumber(p.itemsSold)}
                                        </td>
                                        <td className="py-2 pr-3 text-right font-medium tabular-nums">
                                            {formatVnd(p.netRevenue)}
                                        </td>
                                        <td className="py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-muted h-1.5 w-full min-w-[80px] overflow-hidden rounded-full">
                                                    <div
                                                        className="bg-primary h-full rounded-full"
                                                        style={{ width: `${share}%` }}
                                                    />
                                                </div>
                                                <span className="text-muted-foreground w-11 shrink-0 text-right text-xs tabular-nums">
                                                    {share.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    )
}
