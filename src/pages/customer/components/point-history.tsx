import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { pointApi } from '@/api/point'
import { formatDateTime, formatNumber, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EPointTransactionType, type PointTransaction } from '@/types/point'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PointRulesNote } from '@/components/point-rules-note'
import { StatusBadge } from '@/components/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const PAGE_SIZE = 10
const FILTERS: (EPointTransactionType | undefined)[] = [
    undefined,
    EPointTransactionType.EARN,
    EPointTransactionType.REDEEM,
    EPointTransactionType.REVERT,
]

/**
 * Khối **Lịch sử điểm** của một khách (`point_transaction`, Phase 16): `POST /customer/{id}/points/search`.
 * Sort cố định `createdDate,desc` (backend chỉ nhận `createdDate`/`points`/`type`).
 * Kèm chú thích luật điểm cho nhân viên.
 */
export function PointHistory({ customerId }: { customerId: string }) {
    const { t } = useTranslation('point')
    const [type, setType] = useState<EPointTransactionType | undefined>(undefined)
    const [page, setPage] = useState(1)
    const [rows, setRows] = useState<PointTransaction[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const controller = new AbortController()
        setLoading(true)
        pointApi
            .searchByCustomer(
                customerId,
                { type },
                { page, size: PAGE_SIZE, sort: ['createdDate,desc'] },
                controller.signal,
            )
            .then((res) => {
                setRows(res.data ?? [])
                setTotal(res.total ?? 0)
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setRows([])
                    setTotal(0)
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [customerId, type, page])

    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <section className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t('point.history.tab')}</h3>
                <div className="flex gap-1">
                    {FILTERS.map((value) => (
                        <Button
                            key={value ?? 'ALL'}
                            type="button"
                            size="sm"
                            variant={type === value ? 'default' : 'outline'}
                            onClick={() => {
                                setType(value)
                                setPage(1)
                            }}>
                            {value ? t(`point.history.type.${value}`) : t('point.history.filterAll')}
                        </Button>
                    ))}
                </div>
            </div>

            <PointRulesNote />

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('point.history.column.date')}</TableHead>
                        <TableHead>{t('point.history.column.type')}</TableHead>
                        <TableHead className="text-right">{t('point.history.column.points')}</TableHead>
                        <TableHead className="text-right">{t('point.history.column.balanceAfter')}</TableHead>
                        <TableHead className="text-right">{t('point.history.column.amount')}</TableHead>
                        <TableHead>{t('point.history.column.order')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={6}>
                                <Skeleton className="h-6 w-full" />
                            </TableCell>
                        </TableRow>
                    ) : rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-muted-foreground text-center">
                                {t('point.history.empty')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell className="whitespace-nowrap">
                                    {formatDateTime(row.createdDate)}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge
                                        tone={
                                            row.type === EPointTransactionType.REDEEM
                                                ? 'danger'
                                                : row.type === EPointTransactionType.EARN
                                                  ? 'success'
                                                  : 'muted'
                                        }>
                                        {t(`point.history.type.${row.type}`)}
                                    </StatusBadge>
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        'text-right font-medium tabular-nums',
                                        row.points < 0 ? 'text-destructive' : 'text-success',
                                    )}>
                                    {row.points > 0 ? '+' : row.points < 0 ? '−' : ''}
                                    {formatNumber(Math.abs(row.points))}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNumber(row.balanceAfter)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatVnd(row.amount)}
                                </TableCell>
                                <TableCell>
                                    {row.orderId && row.orderCode ? (
                                        <Link
                                            to={`/orders?open=${row.orderId}`}
                                            className="text-primary hover:underline">
                                            {row.orderCode}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{t('point.history.total', { total })}</span>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((p) => p - 1)}>
                        {t('point.history.prev')}
                    </Button>
                    <span>{t('point.history.page', { page, pages })}</span>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={page >= pages || loading}
                        onClick={() => setPage((p) => p + 1)}>
                        {t('point.history.next')}
                    </Button>
                </div>
            </div>
        </section>
    )
}
