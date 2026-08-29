import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { orderApi } from '@/api/order'
import { formatDateTime, formatVnd } from '@/lib/format'
import { EOrderStatus, type Order } from '@/types/order'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionCard } from '@/components/section-card'
import { StatusBadge, type StatusTone } from '@/components/status-badge'

/** Cùng bảng tông với `OrderListPage` để badge không lệch nghĩa giữa các màn. */
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

const CHANNEL_TONE: Record<string, StatusTone> = {
    ONLINE: 'info',
    POS: 'muted',
    OTHER: 'muted',
}

/**
 * Khối "Đơn hàng gần đây" của mockup `01`.
 *
 * ⚠️ **Không lấy từ báo cáo** — 5 endpoint báo cáo đều trả số **đã gom nhóm**, không có danh sách
 * đơn. Khối này dùng `POST /order/search` (sắp `createdDate,DESC`, lấy 6 dòng) — cùng nguồn với
 * màn Đơn hàng nên số liệu không thể lệch nhau.
 *
 * ⚠️ **Cố ý KHÔNG lọc theo kỳ báo cáo**: "gần đây" nghĩa là mới nhất tính đến bây giờ. Nếu lọc
 * theo kỳ thì chọn "Tháng trước" sẽ ra danh sách đơn cũ mà tiêu đề vẫn ghi "gần đây" — dễ hiểu
 * nhầm. Đây là khối theo dõi vận hành, không phải số liệu của kỳ.
 */
export function RecentOrdersCard() {
    const { t } = useTranslation(['report', 'order'])
    const [orders, setOrders] = useState<Order[] | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const controller = new AbortController()
        orderApi
            .search({}, { page: 1, size: 6, sort: ['createdDate,DESC'] }, controller.signal)
            .then((res) => setOrders(res.data))
            .catch(() => {
                /* api-client đã toast; khối phụ này lỗi thì không chặn cả dashboard. */
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [])

    const rows = useMemo(() => orders ?? [], [orders])

    return (
        <SectionCard
            title={t('report.recentOrders.title')}
            actions={
                <Button variant="ghost" size="sm" asChild>
                    <Link to="/orders">
                        {t('report.recentOrders.viewAll')}
                        <ChevronRight />
                    </Link>
                </Button>
            }>
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
                                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.code')}
                                </th>
                                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.customer')}
                                </th>
                                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.channel')}
                                </th>
                                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.branch')}
                                </th>
                                <th className="py-2 pr-3 text-right font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.total')}
                                </th>
                                <th className="py-2 pr-3 font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.status')}
                                </th>
                                <th className="py-2 font-medium whitespace-nowrap">
                                    {t('report.recentOrders.column.time')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((o) => (
                                <tr key={o.id} className="border-b last:border-0">
                                    <td className="text-primary py-2 pr-3 font-mono text-xs whitespace-nowrap">
                                        {o.orderCode}
                                    </td>
                                    <td className="py-2 pr-3">
                                        {/* Khách vãng lai không có hồ sơ ⇒ backend trả null. */}
                                        {o.customerName ?? t('report.recentOrders.guest')}
                                    </td>
                                    <td className="py-2 pr-3">
                                        <StatusBadge tone={CHANNEL_TONE[o.channel] ?? 'muted'}>
                                            {t(`order:order.channel.${o.channel}`)}
                                        </StatusBadge>
                                    </td>
                                    <td className="py-2 pr-3 whitespace-nowrap">
                                        {o.branchName ?? t('report.common.notAvailable')}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                                        {formatVnd(o.totalAmount)}
                                    </td>
                                    <td className="py-2 pr-3">
                                        <StatusBadge tone={STATUS_TONE[o.status] ?? 'muted'}>
                                            {t(`order:order.status.${o.status}`)}
                                        </StatusBadge>
                                    </td>
                                    <td className="text-muted-foreground py-2 text-xs whitespace-nowrap">
                                        {formatDateTime(o.createdDate)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    )
}
