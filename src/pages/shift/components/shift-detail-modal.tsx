import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { orderApi } from '@/api/order'
import { formatDateTime, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/order'
import { EShiftStatus, type WorkShift } from '@/types/shift'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_TONE: Record<EShiftStatus, StatusTone> = {
    INCOMING: 'muted',
    WAITING_APPROVAL: 'warning',
    OPEN: 'success',
    CLOSED: 'muted',
    REJECTED: 'danger',
}

/** Số đơn nạp tối đa cho khối "đơn trong ca" — đủ cho một ca bán hàng bình thường. */
const MAX_ORDERS = 100

/**
 * Modal **chi tiết ca làm việc** — PLAN Phase 15.
 *
 * Chỉ đọc: ca là **bản ghi lịch sử, không sửa/không xoá** (backend không có `PUT`/`DELETE`),
 * nên dùng `Dialog` thuần thay vì `DetailModal` (component đó dựng quanh form sửa).
 *
 * Ngoài thông tin ca, modal nạp **danh sách đơn thuộc ca** qua
 * `POST /order/search` với `{ shiftId }` — filter này backend mới bổ sung 2026-09-09 (lần 2)
 * theo yêu cầu ở `docs/backend-request-shift-history.md` phần B.
 */
export function ShiftDetailModal({
    open,
    onOpenChange,
    shift,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    shift: WorkShift | null
}) {
    const { t } = useTranslation(['order', 'common'])

    const [orders, setOrders] = useState<Order[]>([])
    const [orderTotal, setOrderTotal] = useState(0)
    const [loadingOrders, setLoadingOrders] = useState(false)
    const [orderError, setOrderError] = useState(false)

    /*
     * Nạp đơn của ca mỗi lần mở modal cho một ca khác.
     *
     * ⚠️ `POST /order/search` trả **`paidAmount = null`** (cố ý tránh N+1, giống `lines`/`payments`)
     * ⇒ **không cộng tiền ở đây**; số tiền chuẩn của ca là `expectedCash` do backend tính.
     * Khối này chỉ để **đối chiếu xem ca gồm những đơn nào**.
     */
    useEffect(() => {
        if (!open || !shift) {
            setOrders([])
            setOrderTotal(0)
            setOrderError(false)
            return
        }
        const controller = new AbortController()
        setLoadingOrders(true)
        setOrderError(false)
        orderApi
            .search({ shiftId: shift.id }, { page: 1, size: MAX_ORDERS }, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return
                setOrders(result.data)
                setOrderTotal(result.total)
            })
            .catch(() => {
                if (!controller.signal.aborted) setOrderError(true)
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoadingOrders(false)
            })
        return () => controller.abort()
    }, [open, shift])

    if (!shift) return null

    const difference = shift.cashDifference
    const diffTone =
        difference === null || difference === 0
            ? undefined
            : difference < 0
              ? 'text-destructive'
              : 'text-warning'

    const money = (value: number | null) =>
        value === null ? <span className="text-muted-foreground">—</span> : formatVnd(value)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="font-mono">{shift.code}</span>
                        <StatusBadge tone={STATUS_TONE[shift.status]}>
                            {t(`order.shift.status.${shift.status}`)}
                        </StatusBadge>
                    </DialogTitle>
                    <DialogDescription>
                        {shift.staffName ?? '—'}
                        {shift.branchName ? ` · ${shift.branchName}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <dl className="bg-muted/40 flex flex-col gap-2 rounded-lg p-4 text-sm">
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                            {t('order.shift.field.openedAt')}
                        </dt>
                        <dd>{formatDateTime(shift.openedAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                            {t('order.shift.field.closedAt')}
                        </dt>
                        <dd>
                            {shift.closedAt ? (
                                formatDateTime(shift.closedAt)
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                            {t('order.shift.field.openingCash')}
                        </dt>
                        <dd className="font-medium">{formatVnd(shift.openingCash)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                            {t('order.shift.field.expectedCash')}
                        </dt>
                        <dd className="font-medium">{money(shift.expectedCash)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                            {t('order.shift.field.closingCash')}
                        </dt>
                        <dd className="font-medium">{money(shift.closingCash)}</dd>
                    </div>
                    <div className="border-border mt-1 flex items-center justify-between border-t pt-2">
                        <dt className="font-medium">{t('order.shift.field.cashDifference')}</dt>
                        <dd className={cn('text-base font-semibold', diffTone)}>
                            {money(difference)}
                        </dd>
                    </div>
                </dl>

                {shift.description && (
                    <div className="text-sm">
                        <p className="text-muted-foreground mb-1">
                            {/* Ca bị từ chối ⇒ backend ghi lý do vào chính `description`. */}
                            {shift.status === EShiftStatus.REJECTED
                                ? t('order.shift.field.rejectReason')
                                : t('order.shift.field.note')}
                        </p>
                        <p className="whitespace-pre-wrap">{shift.description}</p>
                    </div>
                )}

                {/* ---- Đơn thuộc ca ---- */}
                <div className="text-sm">
                    <p className="mb-2 font-medium">
                        {t('order.shift.detail.orders', { count: orderTotal })}
                    </p>

                    {loadingOrders ? (
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : orderError ? (
                        <p className="text-muted-foreground">{t('common:dataTable.error')}</p>
                    ) : orders.length === 0 ? (
                        <p className="text-muted-foreground">{t('order.shift.detail.noOrders')}</p>
                    ) : (
                        <ul className="divide-border divide-y rounded-lg border">
                            {orders.map((order) => (
                                <li
                                    key={order.id}
                                    className="flex items-center justify-between gap-3 px-3 py-2"
                                >
                                    <span className="font-mono text-xs">{order.orderCode}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {t(`order.paymentMethod.${order.paymentMethod ?? 'CASH'}`)}
                                    </span>
                                    <span className="tabular-nums text-xs font-medium">
                                        {formatVnd(order.totalAmount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Nạp trần `MAX_ORDERS` ⇒ nói rõ khi bị cắt, đừng để người dùng tưởng đã đủ. */}
                    {orderTotal > orders.length && !loadingOrders && !orderError && (
                        <p className="text-warning mt-2 text-xs">
                            {t('order.shift.detail.ordersTruncated', {
                                shown: orders.length,
                                total: orderTotal,
                            })}
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
