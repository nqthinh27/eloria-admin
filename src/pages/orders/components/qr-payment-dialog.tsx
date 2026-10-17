import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, QrCode, TriangleAlert } from 'lucide-react'

import { bankAccountApi } from '@/api/bank-account'
import { orderApi } from '@/api/order'
import { useOrderRealtime } from '@/hooks/use-order-realtime'
import { formatVnd } from '@/lib/format'
import { isPaidEvent } from '@/lib/order-realtime'
import { EPaymentStatus } from '@/types/order'
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
 * Dialog **quét mã VietQR để chuyển khoản** — bước bắt buộc của hình thức thanh toán `QR`
 * (user chốt 2026-08-21).
 *
 * Luồng, theo `docs/api/fe-handoff-discount-qr.md` + Phase 18c phía backend:
 * ```
 * [Đơn đã tạo] → GET /bank-account/order/{id}/qr → hiện ảnh PNG cho khách quét
 *   → khách chuyển khoản bằng app ngân hàng
 *   → (A) webhook ngân hàng về ⇒ backend phát `ORDER_PAYMENT_CONFIRMED` qua WebSocket
 *         `/topic/admin/order/{id}` ⇒ dialog hiện "Đã nhận tiền" rồi gọi `onPaid`
 *   → (B) fallback khi webhook không chạy: NV tự đối chiếu app ngân hàng rồi bấm
 *         "Xác nhận đã nhận tiền" → `onConfirm` (POST /order/{id}/payment { method: 'QR' })
 * ```
 *
 * ⚠️ **Nút xác nhận tay giữ nguyên** làm đường dự phòng. Bấm đúng lúc webhook vừa về ⇒ backend trả
 * `error.order.alreadyPaid` — phía gọi (`onConfirm`) phải coi là **thành công**, không báo lỗi.
 * Đang `confirming` thì bỏ qua tin WebSocket (luồng bấm tay tự kết thúc, tránh báo hai lần).
 *
 * ⚠️ Tin WebSocket có thể lỡ khi mất kết nối ⇒ sau mỗi lần nối lại dialog GET đơn một lần để bù.
 *
 * ⚠️ **Ảnh QR là PNG thuần, không bọc `BaseResponse`** ⇒ tải bằng `getBlob()`. Object URL được
 * thu hồi khi đóng dialog để không rò bộ nhớ qua nhiều lần bán.
 *
 * ⚠️ Chưa cấu hình tài khoản nhận tiền ⇒ `error.bankAccount.noDefault`; hiện trạng thái lỗi kèm
 * hướng dẫn liên hệ quản trị viên thay vì để trống. *(Đã gặp thật: bảng `bank_account` chưa tồn
 * tại trên DB dev, backend trả `error.other` — nhánh lỗi này vì thế bắt mọi lỗi, không riêng
 * `noDefault`.)*
 */
export function QrPaymentDialog({
    open,
    onOpenChange,
    orderId,
    orderCode,
    amount,
    onConfirm,
    confirming,
    onPaid,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderId: string | null
    orderCode: string
    /** `totalAmount` của đơn — chỉ để hiển thị; số tiền thật đã nhúng trong ảnh QR. */
    amount: number
    /** Ghi nhận đã thu tiền (`POST /order/{id}/payment` với `method: 'QR'`). */
    onConfirm: () => void | Promise<void>
    confirming?: boolean
    /**
     * Tiền đã về (webhook / tin WebSocket / GET bù sau nối lại): phía gọi tải lại đơn, đóng dialog
     * và đi tiếp **y hệt** luồng sau khi bấm xác nhận tay. Chạy sau ~1,2s để nhân viên kịp thấy
     * trạng thái "Đã nhận tiền".
     */
    onPaid: () => void | Promise<void>
}) {
    const { t } = useTranslation(['order', 'common'])

    const [qrUrl, setQrUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)
    /** Tăng lên để ép tải lại ảnh khi người dùng bấm "Thử lại". */
    const [attempt, setAttempt] = useState(0)
    /** Đã nhận tiền (qua WebSocket) — chuyển dialog sang trạng thái thành công. */
    const [received, setReceived] = useState(false)
    const receivedRef = useRef(false)
    /** `onPaid` đã được gọi cho lần nhận tiền này (timer HOẶC lúc đóng dialog) — chỉ gọi một lần. */
    const paidFiredRef = useRef(false)
    const onPaidRef = useRef(onPaid)
    useEffect(() => {
        onPaidRef.current = onPaid
    })

    useEffect(() => {
        receivedRef.current = false
        paidFiredRef.current = false
        setReceived(false)
    }, [open, orderId])

    /*
     * Đóng dialog (Esc/overlay) hoặc đổi đơn khi đã hiện "Đã nhận tiền" nhưng timer 1,2s chưa kịp
     * nổ ⇒ vẫn phải báo cho phía gọi, nếu không POS giữ nguyên trạng thái "chưa thu".
     */
    useEffect(() => {
        if (!open) return
        return () => {
            if (receivedRef.current && !paidFiredRef.current) {
                paidFiredRef.current = true
                void onPaidRef.current()
            }
        }
    }, [open, orderId])

    const handleRemotePaid = useCallback(() => {
        if (confirming || receivedRef.current) return
        receivedRef.current = true
        setReceived(true)
    }, [confirming])

    useEffect(() => {
        if (!received) return
        const timer = setTimeout(() => {
            if (paidFiredRef.current) return
            paidFiredRef.current = true
            void onPaidRef.current()
        }, 1200)
        return () => clearTimeout(timer)
    }, [received])

    useOrderRealtime(
        open ? orderId : null,
        (_type, data) => {
            if (isPaidEvent(data)) handleRemotePaid()
        },
        () => {
            if (!orderId) return
            orderApi
                .getById(orderId)
                .then((order) => {
                    if (order.paymentStatus === EPaymentStatus.PAID) handleRemotePaid()
                })
                .catch(() => undefined)
        },
    )

    useEffect(() => {
        if (!open || !orderId) return

        const controller = new AbortController()
        let objectUrl: string | null = null

        setLoading(true)
        setFailed(false)

        bankAccountApi
            .orderQr(orderId, controller.signal)
            .then((blob) => {
                if (controller.signal.aborted) return
                objectUrl = URL.createObjectURL(blob)
                setQrUrl(objectUrl)
            })
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true)
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })

        return () => {
            controller.abort()
            // Thu hồi ngay khi đóng/đổi đơn — mỗi lần bán tạo một blob mới.
            if (objectUrl) URL.revokeObjectURL(objectUrl)
            setQrUrl(null)
        }
    }, [open, orderId, attempt])

    const handleRetry = useCallback(() => setAttempt((value) => value + 1), [])

    return (
        <Dialog open={open} onOpenChange={(next) => !confirming && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCode className="size-5" />
                        {t('order.qr.title')}
                    </DialogTitle>
                    <DialogDescription>{t('order.qr.description')}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-3">
                    {received ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <span className="bg-success-muted text-success flex size-14 items-center justify-center rounded-full">
                                <CheckCircle2 className="size-8" />
                            </span>
                            <p className="text-lg font-semibold">{t('order.qr.received')}</p>
                            <p className="text-muted-foreground max-w-xs text-sm">
                                {t('order.qr.receivedHint')}
                            </p>
                        </div>
                    ) : loading ? (
                        <>
                            <Skeleton className="size-56 rounded-lg" />
                            <p className="text-muted-foreground text-sm">{t('order.qr.loading')}</p>
                        </>
                    ) : failed ? (
                        /* Không có QR thì vẫn cho đóng dialog — nhân viên chuyển sang tiền mặt. */
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <span className="bg-warning-muted text-warning flex size-12 items-center justify-center rounded-full">
                                <TriangleAlert className="size-6" />
                            </span>
                            <p className="font-medium">{t('order.qr.unavailable')}</p>
                            <p className="text-muted-foreground max-w-xs text-sm">
                                {t('order.qr.unavailableHint')}
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-1"
                                onClick={handleRetry}>
                                {t('order.qr.retry')}
                            </Button>
                        </div>
                    ) : qrUrl ? (
                        <img
                            src={qrUrl}
                            alt={t('order.qr.title')}
                            className="bg-card size-56 rounded-lg border object-contain p-2"
                        />
                    ) : null}

                    <div className="w-full border-t pt-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {t('order.detail.title', { code: orderCode })}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-base font-semibold">
                            <span>{t('order.qr.amount')}</span>
                            <span className="tabular-nums">{formatVnd(amount)}</span>
                        </div>
                    </div>

                    {!received && (
                        <p className="text-muted-foreground w-full text-xs">
                            {t('order.qr.confirmHint')}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={confirming || received}
                        onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={confirming || received}
                        onClick={() => void onConfirm()}>
                        {confirming && <Loader2 className="size-4 animate-spin" />}
                        {t('order.qr.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
