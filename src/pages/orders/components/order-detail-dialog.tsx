import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Printer, ShoppingCart } from 'lucide-react'

import { orderApi } from '@/api/order'
import { formatDateTime, formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
    EOrderChannel,
    EOrderStatus,
    EPaymentMethod,
    EPaymentStatus,
    type Order,
} from '@/types/order'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { printInvoice } from './print-invoice'
import { QrPaymentDialog } from './qr-payment-dialog'

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

const PAY_METHODS: EPaymentMethod[] = [
    EPaymentMethod.CASH,
    EPaymentMethod.QR,
    EPaymentMethod.CARD,
    EPaymentMethod.COD,
]

/** Trạng thái đã đóng — backend chặn mọi thao tác (`error.order.alreadyClosed`). */
const CLOSED_STATUSES: EOrderStatus[] = [
    EOrderStatus.COMPLETED,
    EOrderStatus.CANCELLED,
    EOrderStatus.REJECTED,
]

type PendingAction = 'confirm' | 'pack' | 'ship' | 'complete' | 'cancel' | null

/**
 * Dialog chi tiết đơn theo `05-don-hang-chi-tiet.png` — **modal trên nền danh sách**, không phải
 * trang riêng. PLAN Phase 11.
 *
 * Gọi `GET /order/{id}` vì đó là **bản duy nhất có `lines` + `payments`**
 * (`POST /order/search` trả `null` cho cả hai).
 *
 * ⚠️ **Quy tắc UI bắt buộc** (xem CLAUDE.md "Mô hình thanh toán"):
 * - **Disable nút "Thu tiền" khi `paymentStatus === 'PAID'`** — đừng để bấm rồi mới nhận
 *   `error.order.alreadyPaid`.
 * - **Không dựng nút "Hoàn tiền"** — không có endpoint; hoàn tiền là hệ quả tự động của huỷ đơn.
 * - Khối thanh toán render tối đa 2 dòng (1 `PAID` + 1 `REFUNDED`).
 * - Gặp 409 (`error.concurrentModification` / `error.dataIntegrity.violation`) hoặc 500 ở luồng
 *   thanh toán ⇒ **tải lại đơn** để biết trạng thái thật, không coi là thất bại chắc chắn.
 * - **Hình thức `QR` đi qua dialog quét mã** (`QrPaymentDialog`) chứ không thu thẳng: khách phải
 *   quét chuyển khoản trước, nhân viên đối chiếu rồi mới xác nhận. Các hình thức còn lại
 *   (tiền mặt/thẻ/COD) vẫn thu thẳng như cũ.
 * - **Chỉ in được hoá đơn khi đơn đã `PAID`** (user chốt 2026-08-21) — nút in bị disable kèm
 *   giải thích, không phải bấm rồi mới báo lỗi.
 * - **Đơn `POS` không bày nút vòng đời nào** (backend 2026-08-22): thu tiền xong backend tự đặt
 *   `COMPLETED`. Chỉ đơn `ONLINE`/`OTHER` mới đi `confirm → pack → ship → complete`.
 */
export function OrderDetailDialog({
    orderId,
    onOpenChange,
    onChanged,
}: {
    orderId: string | null
    onOpenChange: (open: boolean) => void
    /** Gọi sau mỗi thay đổi để danh sách phía sau cập nhật theo. */
    onChanged?: () => void
}) {
    const { t } = useTranslation(['order', 'common'])

    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(false)
    const [pending, setPending] = useState<PendingAction>(null)
    const [payOpen, setPayOpen] = useState(false)
    const [qrOpen, setQrOpen] = useState(false)
    const [paying, setPaying] = useState(false)
    const [payMethod, setPayMethod] = useState<EPaymentMethod>(EPaymentMethod.CASH)
    const [cancelReason, setCancelReason] = useState('')
    const [note, setNote] = useState('')
    const [noteEditing, setNoteEditing] = useState(false)
    const [savingNote, setSavingNote] = useState(false)

    const load = useCallback(
        async (signal?: AbortSignal) => {
            if (!orderId) return
            setLoading(true)
            try {
                const result = await orderApi.getById(orderId, signal)
                setOrder(result)
                setNote(result.description ?? '')
            } catch {
                if (signal?.aborted) return
                setOrder(null)
            } finally {
                if (!signal?.aborted) setLoading(false)
            }
        },
        [orderId],
    )

    useEffect(() => {
        if (!orderId) {
            setOrder(null)
            setNoteEditing(false)
            setCancelReason('')
            return
        }
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [orderId, load])

    /**
     * Chạy một bước vòng đời rồi đồng bộ lại state.
     *
     * Khi lỗi vẫn **tải lại đơn**: race trên cùng một đơn có thể trả 409 — hoặc **500** do
     * InnoDB deadlock (vấn đề backend BE3 đã ghi nhận) — trong khi giao dịch **có thể đã thành
     * công**. Đọc lại từ server là cách duy nhất biết trạng thái thật.
     */
    const runAction = useCallback(
        async (action: () => Promise<Order>, successKey: string) => {
            try {
                const updated = await action()
                setOrder(updated)
                setNote(updated.description ?? '')
                toastSuccess(successKey, { ns: 'order' })
                onChanged?.()
            } catch (error) {
                toastError(error)
                await load()
                onChanged?.()
                throw error
            }
        },
        [load, onChanged],
    )

    const handlePrint = useCallback(async () => {
        if (!order) return
        try {
            /* `InvoiceResDTO` đã đủ mọi thứ cần in (kể cả `staffName`) ⇒ chỉ một lời gọi. */
            const invoice = await orderApi.invoice(order.id)
            printInvoice(invoice)
        } catch (error) {
            toastError(error)
        }
    }, [order])

    const handleSaveNote = useCallback(async () => {
        if (!order) return
        setSavingNote(true)
        try {
            const updated = await orderApi.note(order.id, { note })
            setOrder(updated)
            setNoteEditing(false)
            toastSuccess('order.toast.noteSaved', { ns: 'order' })
            onChanged?.()
        } catch (error) {
            toastError(error)
        } finally {
            setSavingNote(false)
        }
    }, [order, note, onChanged])

    /**
     * Ghi nhận thu tiền. Dùng chung cho cả nút "Thu tiền" (tiền mặt/thẻ/COD) lẫn nút xác nhận
     * trong dialog QR — cùng một `POST /order/{id}/payment`, chỉ khác điểm vào.
     */
    const submitPayment = useCallback(
        async (method: EPaymentMethod, closeDialog: () => void) => {
            if (!order) return
            setPaying(true)
            try {
                await runAction(() => orderApi.pay(order.id, { method }), 'order.toast.paid')
                closeDialog()
            } catch {
                // `runAction` đã tải lại đơn — trạng thái thật hiển thị ngay.
            } finally {
                setPaying(false)
            }
        },
        [order, runAction],
    )

    /**
     * Bấm "Thu tiền": **`QR` phải qua bước quét mã trước**, không thu thẳng — khách cần thấy mã
     * để chuyển khoản. Hình thức khác thu ngay như cũ.
     */
    const handlePayConfirm = useCallback(() => {
        if (payMethod === EPaymentMethod.QR) {
            setPayOpen(false)
            setQrOpen(true)
            return
        }
        void submitPayment(payMethod, () => setPayOpen(false))
    }, [payMethod, submitPayment])

    /* ---------------- Nút hành động khả dụng theo vòng đời ---------------- */
    const isClosed = order ? CLOSED_STATUSES.includes(order.status) : true
    const isPaid = order?.paymentStatus === EPaymentStatus.PAID
    /**
     * **Chỉ in được hoá đơn khi đã thu tiền** (user chốt 2026-08-21). Đơn hoàn tiền
     * (`REFUNDED`) cũng không in: hoá đơn khi đó không phản ánh đúng giao dịch.
     */
    const canPrint = isPaid

    /**
     * Bước vòng đời tiếp theo, hoặc `null` khi không còn nút nào để bày.
     *
     * ⚠️ **Đơn POS không có vòng đời giao vận** (backend 2026-08-22): thu tiền xong là khách cầm
     * hàng về ngay, nên `POST /order/{id}/payment` **tự đặt đơn thành `COMPLETED`** — bỏ qua cả
     * `confirm`/`pack`/`ship`. FE **không được bày nút vòng đời nào cho đơn POS**: bấm vào chỉ
     * nhận `error.order.invalidStatus`.
     *
     * Đơn `ONLINE`/`OTHER` vẫn đi đủ `confirm → pack → ship → complete` như cũ.
     */
    const nextAction = useMemo((): {
        action: Exclude<PendingAction, null>
        label: string
    } | null => {
        if (!order || isClosed) return null
        // Đơn tại quầy: mọi chuyển trạng thái do bước thu tiền lo, không có nút thủ công.
        if (order.channel === EOrderChannel.POS) return null
        switch (order.status) {
            case EOrderStatus.PENDING:
                return { action: 'confirm', label: t('order.action.confirm') }
            case EOrderStatus.CONFIRMED:
                return { action: 'pack', label: t('order.action.pack') }
            case EOrderStatus.PACKED:
                return { action: 'ship', label: t('order.action.ship') }
            case EOrderStatus.SHIPPING:
                // Backend yêu cầu đã thu đủ tiền mới hoàn tất được.
                return { action: 'complete', label: t('order.action.complete') }
            default:
                // `SHIPPED` không có endpoint chuyển tiếp nào ⇒ không bày nút.
                return null
        }
    }, [order, isClosed, t])

    const lineVariantLabel = useCallback(
        (size: string | null, color: string | null, quantity: number) => {
            if (size && color) return t('order.detail.lineVariant', { size, color, quantity })
            if (color) return t('order.detail.lineVariantNoSize', { color, quantity })
            if (size) return t('order.detail.lineVariantNoColor', { size, quantity })
            return t('order.detail.lineVariantPlain', { quantity })
        },
        [t],
    )

    const infoCells = order
        ? [
              { label: t('order.detail.customer'), value: order.customerName || t('order.pos.cart.guest') },
              { label: t('order.detail.channel'), value: t(`order.channel.${order.channel}`) },
              { label: t('order.detail.branch'), value: order.branchName ?? '—' },
              {
                  label: t('order.detail.createdDate'),
                  value: formatDateTime(order.createdDate),
              },
          ]
        : []

    return (
        <>
            <Dialog open={orderId !== null} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {t('order.detail.title', { code: order?.orderCode ?? '' })}
                        </DialogTitle>
                    </DialogHeader>

                    {loading && !order ? (
                        <div className="space-y-3">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : order ? (
                        <div className="space-y-4">
                            {/* ---- Lưới thông tin ---- */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                {infoCells.map((cell) => (
                                    <div key={cell.label} className="bg-muted/50 rounded-lg p-3">
                                        <p className="text-muted-foreground text-xs">{cell.label}</p>
                                        <p className="mt-0.5 text-sm font-medium">{cell.value}</p>
                                    </div>
                                ))}
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs">
                                        {t('order.detail.status')}
                                    </p>
                                    <div className="mt-1">
                                        <StatusBadge tone={STATUS_TONE[order.status]}>
                                            {t(`order.status.${order.status}`)}
                                        </StatusBadge>
                                    </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs">
                                        {t('order.detail.payment')}
                                    </p>
                                    <div className="mt-1">
                                        <StatusBadge
                                            tone={
                                                order.paymentStatus === EPaymentStatus.PAID
                                                    ? 'success'
                                                    : order.paymentStatus === EPaymentStatus.REFUNDED
                                                      ? 'muted'
                                                      : 'warning'
                                            }>
                                            {t(`order.paymentStatus.${order.paymentStatus}`)}
                                        </StatusBadge>
                                    </div>
                                </div>
                            </div>

                            {order.shippingAddress && (
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-muted-foreground text-xs">
                                        {t('order.detail.shippingAddress')}
                                    </p>
                                    <p className="mt-0.5 text-sm">{order.shippingAddress}</p>
                                </div>
                            )}

                            {/* ---- Sản phẩm trong đơn ---- */}
                            <div className="rounded-lg border">
                                <p className="bg-muted/50 border-b px-3 py-2 text-sm font-medium">
                                    {t('order.detail.lines')}
                                </p>
                                <ul className="divide-y">
                                    {(order.lines ?? []).map((line) => (
                                        <li
                                            key={line.id}
                                            className="flex items-center gap-3 px-3 py-2.5">
                                            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                                                <ShoppingCart className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {line.productName}
                                                </p>
                                                <p className="text-muted-foreground truncate text-xs">
                                                    {lineVariantLabel(
                                                        line.size,
                                                        line.color,
                                                        line.quantity,
                                                    )}
                                                </p>
                                            </div>
                                            <span className="text-sm tabular-nums">
                                                {formatVnd(line.lineTotal)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <dl className="space-y-1 border-t px-3 py-2.5 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">
                                            {t('order.detail.subtotal')}
                                        </dt>
                                        <dd className="tabular-nums">{formatVnd(order.subtotal)}</dd>
                                    </div>
                                    {Boolean(order.discountAmount) && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                {t('order.detail.discount')}
                                            </dt>
                                            <dd className="text-destructive tabular-nums">
                                                −{formatVnd(order.discountAmount ?? 0)}
                                            </dd>
                                        </div>
                                    )}
                                    {Boolean(order.shippingFee) && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">
                                                {t('order.detail.shippingFee')}
                                            </dt>
                                            <dd className="tabular-nums">
                                                {formatVnd(order.shippingFee ?? 0)}
                                            </dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-1.5 font-semibold">
                                        <dt>{t('order.detail.total')}</dt>
                                        <dd className="tabular-nums">
                                            {formatVnd(order.totalAmount)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {/* ---- Thanh toán: tối đa 2 dòng (PAID + REFUNDED) ---- */}
                            <div className="rounded-lg border">
                                <p className="bg-muted/50 border-b px-3 py-2 text-sm font-medium">
                                    {t('order.detail.payment')}
                                </p>
                                {(order.payments ?? []).length === 0 ? (
                                    <p className="text-muted-foreground px-3 py-2.5 text-sm">
                                        {t('order.detail.paymentEmpty')}
                                    </p>
                                ) : (
                                    <ul className="divide-y">
                                        {(order.payments ?? []).map((payment) => (
                                            <li
                                                key={payment.id}
                                                className="flex items-center justify-between px-3 py-2.5 text-sm">
                                                <div>
                                                    <p>
                                                        {payment.status === EPaymentStatus.REFUNDED
                                                            ? t('order.detail.refundedAt', {
                                                                  method: t(
                                                                      `order.paymentMethod.${payment.method}`,
                                                                  ),
                                                              })
                                                            : t('order.detail.paidAt', {
                                                                  method: t(
                                                                      `order.paymentMethod.${payment.method}`,
                                                                  ),
                                                              })}
                                                    </p>
                                                    {payment.createdBy && (
                                                        <p className="text-muted-foreground text-xs">
                                                            {t('order.detail.paidBy', {
                                                                name: payment.createdBy,
                                                            })}
                                                            {' · '}
                                                            {formatDateTime(payment.createdDate)}
                                                        </p>
                                                    )}
                                                </div>
                                                <span
                                                    className={cn(
                                                        'tabular-nums',
                                                        payment.status === EPaymentStatus.REFUNDED &&
                                                            'text-muted-foreground',
                                                    )}>
                                                    {formatVnd(payment.amount)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* ---- Ghi chú nội bộ (nền vàng theo mockup) ---- */}
                            <div className="border-warning bg-warning-muted rounded-lg border p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-warning text-sm font-medium">
                                        {t('order.detail.note')}
                                    </p>
                                    {/* Backend chặn ghi chú trên đơn đã đóng ⇒ ẩn nút sửa. */}
                                    {!isClosed && !noteEditing && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setNoteEditing(true)}>
                                            {t('order.detail.noteEdit')}
                                        </Button>
                                    )}
                                </div>

                                {noteEditing ? (
                                    <div className="mt-2 space-y-2">
                                        <Textarea
                                            value={note}
                                            onChange={(event) => setNote(event.target.value)}
                                            placeholder={t('order.detail.notePlaceholder')}
                                            rows={3}
                                            className="bg-card"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setNote(order.description ?? '')
                                                    setNoteEditing(false)
                                                }}>
                                                {t('common:action.cancel')}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={savingNote}
                                                onClick={() => void handleSaveNote()}>
                                                {savingNote && (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                )}
                                                {t('order.detail.noteSave')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm">
                                        {order.description || t('order.detail.noteEmpty')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2 sm:justify-between">
                        {/*
                          * Chưa thu tiền ⇒ khoá nút in kèm `title` giải thích, thay vì để bấm rồi
                          * mới nhận ra hoá đơn không hợp lệ.
                          */}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!canPrint}
                            title={canPrint ? undefined : t('order.detail.printBlocked')}
                            onClick={() => void handlePrint()}>
                            <Printer className="size-4" />
                            {t('order.detail.printInvoice')}
                        </Button>

                        <div className="flex flex-wrap gap-2">
                            {/* Thu tiền: ẩn khi đơn đã đóng, disable khi đã PAID. */}
                            {order && !isClosed && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isPaid}
                                    onClick={() => setPayOpen(true)}>
                                    {t('order.action.pay')}
                                </Button>
                            )}

                            {order && !isClosed && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="text-destructive"
                                    onClick={() => setPending('cancel')}>
                                    {t('order.action.cancel')}
                                </Button>
                            )}

                            {nextAction && (
                                <Button
                                    type="button"
                                    onClick={() => setPending(nextAction.action)}>
                                    {nextAction.label}
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}>
                                {t('order.detail.close')}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------------- Xác nhận từng bước vòng đời ---------------- */}
            <ConfirmDialog
                open={pending === 'confirm'}
                onOpenChange={(open) => !open && setPending(null)}
                title={t('order.action.confirmTitle', { code: order?.orderCode ?? '' })}
                description={t('order.action.confirmDescription')}
                onConfirm={() =>
                    runAction(() => orderApi.confirm(order!.id), 'order.toast.confirmed')
                }
            />
            <ConfirmDialog
                open={pending === 'pack'}
                onOpenChange={(open) => !open && setPending(null)}
                title={t('order.action.packTitle', { code: order?.orderCode ?? '' })}
                description={t('order.action.packDescription')}
                onConfirm={() => runAction(() => orderApi.pack(order!.id), 'order.toast.packed')}
            />
            <ConfirmDialog
                open={pending === 'ship'}
                onOpenChange={(open) => !open && setPending(null)}
                title={t('order.action.shipTitle', { code: order?.orderCode ?? '' })}
                description={t('order.action.shipDescription')}
                onConfirm={() => runAction(() => orderApi.ship(order!.id), 'order.toast.shipped')}
            />
            <ConfirmDialog
                open={pending === 'complete'}
                onOpenChange={(open) => !open && setPending(null)}
                title={t('order.action.completeTitle', { code: order?.orderCode ?? '' })}
                description={t('order.action.completeDescription')}
                onConfirm={() =>
                    runAction(() => orderApi.complete(order!.id), 'order.toast.completed')
                }
            />

            {/* Huỷ đơn — có ô lý do, backend lưu vào `description`. */}
            <Dialog
                open={pending === 'cancel'}
                onOpenChange={(open) => !open && setPending(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {t('order.action.cancelTitle', { code: order?.orderCode ?? '' })}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        {t('order.action.cancelDescription')}
                    </p>
                    <div className="space-y-1.5">
                        <Label>{t('order.action.cancelReason')}</Label>
                        <Textarea
                            value={cancelReason}
                            onChange={(event) => setCancelReason(event.target.value)}
                            placeholder={t('order.action.cancelReasonPlaceholder')}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPending(null)}>
                            {t('common:action.cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                void runAction(
                                    () =>
                                        orderApi.cancel(order!.id, {
                                            reason: cancelReason.trim() || undefined,
                                        }),
                                    'order.toast.cancelled',
                                )
                                    .then(() => {
                                        setPending(null)
                                        setCancelReason('')
                                    })
                                    .catch(() => {
                                        // Giữ dialog mở để người dùng đọc lỗi rồi thử lại.
                                    })
                            }}>
                            {t('order.action.cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Thu tiền — chỉ chọn hình thức, KHÔNG có ô nhập số tiền (backend thu đủ totalAmount). */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {t('order.action.payTitle', { code: order?.orderCode ?? '' })}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        {t('order.action.payDescription')}
                    </p>
                    <div className="space-y-1.5">
                        <Label>{t('order.pos.checkout.paymentMethod')}</Label>
                        <Select
                            value={payMethod}
                            onValueChange={(value) => setPayMethod(value as EPaymentMethod)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAY_METHODS.map((method) => (
                                    <SelectItem key={method} value={method}>
                                        {t(`order.paymentMethod.${method}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3 font-semibold">
                        <span>{t('order.action.payAmount')}</span>
                        <span className="tabular-nums">
                            {formatVnd(order?.totalAmount ?? 0)}
                        </span>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
                            {t('common:action.cancel')}
                        </Button>
                        <Button type="button" disabled={paying} onClick={handlePayConfirm}>
                            {paying && <Loader2 className="size-4 animate-spin" />}
                            {/* QR chưa thu ngay — bước tiếp theo là hiện mã cho khách quét. */}
                            {payMethod === EPaymentMethod.QR
                                ? t('order.qr.show')
                                : t('order.action.pay')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quét VietQR rồi xác nhận đã nhận tiền — xem `QrPaymentDialog`. */}
            <QrPaymentDialog
                open={qrOpen}
                onOpenChange={setQrOpen}
                orderId={order?.id ?? null}
                orderCode={order?.orderCode ?? ''}
                amount={order?.totalAmount ?? 0}
                confirming={paying}
                onConfirm={() =>
                    submitPayment(EPaymentMethod.QR, () => setQrOpen(false))
                }
            />
        </>
    )
}
