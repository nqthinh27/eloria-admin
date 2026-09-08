import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, Printer, TriangleAlert } from 'lucide-react'

import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EPaymentStatus, type Invoice, type Order } from '@/types/order'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Modal **xem trước phiếu** sau khi tạo đơn ở POS (user chốt 2026-08-29).
 *
 * Thay cho hộp thoại "Đã tạo đơn {{code}}" chỉ có mỗi dòng chữ trước đây: giờ hiện **nội dung
 * phiếu thật** (lấy từ `GET /order/{id}/invoice` — đúng dữ liệu sẽ in ra), kèm 4 hành động:
 * *Xác nhận đã thanh toán · Xem đơn hàng · Tạo đơn mới · In hoá đơn*.
 *
 * ⚠️ **Nút In bị khoá cho tới khi đơn `PAID`** (user chốt 2026-08-21, giữ nguyên): thu tiền xong
 * mới in được. Vì vậy "Xác nhận đã thanh toán" và "In hoá đơn" là **hai bước nối tiếp**, không
 * phải hai lựa chọn song song.
 *
 * ⚠️ Đơn đã tồn tại và **tồn đã bị trừ** ngay từ lúc tạo (xem CLAUDE.md mục "Mô hình tồn kho").
 * Đóng modal khi chưa thu tiền **không huỷ đơn** — nhân viên phải vào màn Đơn hàng thu lại.
 */
export function OrderReceiptDialog({
    open,
    onOpenChange,
    order,
    invoice,
    loadingInvoice,
    paymentFailed,
    confirming,
    onConfirmPayment,
    onViewOrders,
    onNewOrder,
    onPrint,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    order: Order | null
    /** `null` khi chưa tải xong hoặc tải lỗi — vẫn hiện modal, chỉ thiếu phần xem trước. */
    invoice: Invoice | null
    loadingInvoice: boolean
    /** Đơn đã tạo nhưng bước thu tiền lỗi ⇒ đổi tone cảnh báo. */
    paymentFailed: boolean
    confirming: boolean
    /** Ghi nhận đã thu tiền. `null` ⇒ ẩn nút (đơn COD, hoặc đơn đã `PAID`). */
    onConfirmPayment: (() => void) | null
    onViewOrders: () => void
    onNewOrder: () => void
    onPrint: () => void
}) {
    const { t } = useTranslation(['order', 'common'])

    const paid = order?.paymentStatus === EPaymentStatus.PAID
    /** Chỉ in được khi đã thu tiền — chặn ở đây **và** ở dialog chi tiết đơn. */
    const canPrint = paid

    return (
        <Dialog open={open} onOpenChange={(next) => !confirming && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {paymentFailed ? (
                            <TriangleAlert className="text-warning size-5" />
                        ) : (
                            <CheckCircle2 className="text-success size-5" />
                        )}
                        {t('order.pos.success.title', { code: order?.orderCode ?? '' })}
                    </DialogTitle>
                    <DialogDescription>
                        {paymentFailed
                            ? t('order.pos.success.paymentFailed')
                            : paid
                              ? t('order.pos.success.paid')
                              : t('order.pos.success.unpaid')}
                    </DialogDescription>
                </DialogHeader>

                {/* ---------- Xem trước phiếu ---------- */}
                <div className="bg-muted/40 space-y-3 rounded-lg border p-4 text-sm">
                    {loadingInvoice ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : invoice ? (
                        <>
                            <div className="space-y-0.5 text-center">
                                <p className="font-semibold">{invoice.branchName}</p>
                                {invoice.branchAddress && (
                                    <p className="text-muted-foreground text-xs">
                                        {invoice.branchAddress}
                                    </p>
                                )}
                            </div>

                            <dl className="text-muted-foreground space-y-1 border-t pt-2 text-xs">
                                <div className="flex justify-between gap-2">
                                    <dt>{t('order.invoice.orderCode')}</dt>
                                    <dd className="text-foreground font-medium">
                                        {invoice.orderCode}
                                    </dd>
                                </div>
                                {invoice.customerName && (
                                    <div className="flex justify-between gap-2">
                                        <dt>{t('order.invoice.customer')}</dt>
                                        <dd className="text-foreground">
                                            {invoice.customerName}
                                            {invoice.customerPhone
                                                ? ` · ${invoice.customerPhone}`
                                                : ''}
                                        </dd>
                                    </div>
                                )}
                                {invoice.staffName && (
                                    <div className="flex justify-between gap-2">
                                        <dt>{t('order.invoice.staff')}</dt>
                                        <dd className="text-foreground">{invoice.staffName}</dd>
                                    </div>
                                )}
                            </dl>

                            {/* Dòng hàng — cùng cách tính với hoá đơn in (`print-invoice.ts`). */}
                            <ul className="space-y-1.5 border-t pt-2">
                                {(invoice.lines ?? []).map((line) => (
                                    <li key={line.skuId} className="flex justify-between gap-2">
                                        <span className="min-w-0">
                                            <span className="block truncate">
                                                {line.productName}
                                            </span>
                                            <span className="text-muted-foreground text-xs">
                                                {formatVnd(line.unitAmount)} × {line.quantity}
                                            </span>
                                        </span>
                                        <span className="shrink-0 tabular-nums">
                                            {formatVnd(line.lineTotal)}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <dl className="space-y-1 border-t pt-2">
                                <div className="text-muted-foreground flex justify-between gap-2">
                                    <dt>{t('order.detail.subtotal')}</dt>
                                    <dd className="tabular-nums">{formatVnd(invoice.subtotal)}</dd>
                                </div>
                                {!!invoice.discountAmount && (
                                    <div className="text-muted-foreground flex justify-between gap-2">
                                        <dt>{t('order.detail.discount')}</dt>
                                        <dd className="text-destructive tabular-nums">
                                            −{formatVnd(invoice.discountAmount)}
                                        </dd>
                                    </div>
                                )}
                                {/*
                                  Diễn giải KM đã áp — số tiền đã nằm trong `discountAmount` ở trên,
                                  dòng này chỉ nói **giảm vì đâu** (backend bổ sung 2026-09-08).
                                */}
                                {invoice.promotionName && (
                                    <div className="text-muted-foreground flex justify-between gap-2">
                                        <dt>{t('order.invoice.promotion')}</dt>
                                        <dd className="truncate text-right">
                                            {invoice.promotionCode
                                                ? `${invoice.promotionName} (${invoice.promotionCode})`
                                                : invoice.promotionName}
                                        </dd>
                                    </div>
                                )}
                                {!!invoice.shippingFee && (
                                    <div className="text-muted-foreground flex justify-between gap-2">
                                        <dt>{t('order.detail.shippingFee')}</dt>
                                        <dd className="tabular-nums">
                                            {formatVnd(invoice.shippingFee)}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2 border-t pt-1.5 text-base font-semibold">
                                    <dt>{t('order.detail.total')}</dt>
                                    <dd className="tabular-nums">
                                        {formatVnd(invoice.totalAmount)}
                                    </dd>
                                </div>
                            </dl>
                        </>
                    ) : (
                        /* Tải phiếu lỗi vẫn không chặn luồng — đơn đã tạo, các nút vẫn dùng được. */
                        <p className="text-muted-foreground text-center text-xs">
                            {t('order.pos.success.previewUnavailable')}
                        </p>
                    )}
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                    {/*
                     * Hai bước NỐI TIẾP: thu tiền xong mới in được. Xếp dọc và cho nút đang tới
                     * lượt nổi bật (`default`) để nhân viên không phải đoán bấm cái nào trước.
                     */}
                    {onConfirmPayment && (
                        <Button
                            type="button"
                            className="w-full"
                            disabled={confirming}
                            onClick={onConfirmPayment}>
                            {confirming && <Loader2 className="size-4 animate-spin" />}
                            {t('order.pos.success.confirmPayment')}
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant={canPrint ? 'default' : 'outline'}
                        className="w-full"
                        disabled={!canPrint}
                        title={canPrint ? undefined : t('order.pos.success.printBlocked')}
                        onClick={onPrint}>
                        <Printer className="size-4" />
                        {t('order.pos.success.printInvoice')}
                    </Button>

                    <div className={cn('flex w-full gap-2')}>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            disabled={confirming}
                            onClick={onViewOrders}>
                            {t('order.pos.success.viewOrder')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            disabled={confirming}
                            onClick={onNewOrder}>
                            {t('order.pos.success.newOrder')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
