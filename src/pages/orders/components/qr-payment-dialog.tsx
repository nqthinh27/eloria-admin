import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, QrCode, TriangleAlert } from 'lucide-react'

import { bankAccountApi } from '@/api/bank-account'
import { formatVnd } from '@/lib/format'
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
 * Luồng, theo `docs/api/fe-handoff-discount-qr.md` phía backend:
 * ```
 * [Đơn đã tạo] → GET /bank-account/order/{id}/qr → hiện ảnh PNG cho khách quét
 *   → khách chuyển khoản bằng app ngân hàng
 *   → NV tự đối chiếu tiền về rồi bấm "Xác nhận đã nhận tiền"
 *   → POST /order/{id}/payment { method: 'QR' } → đơn thành PAID
 * ```
 *
 * ⚠️ **Xác nhận là thủ công, không tự động.** Backend **chưa có webhook banking** ⇒ FE không thể
 * biết tiền đã về; nhân viên phải tự kiểm tra app ngân hàng. Vì vậy nút xác nhận đi kèm cảnh báo
 * rõ ràng thay vì hứa hẹn đối soát tự động. Khi backend có webhook thì thay chỗ này bằng
 * polling/websocket, phần còn lại của luồng giữ nguyên.
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
}) {
    const { t } = useTranslation(['order', 'common'])

    const [qrUrl, setQrUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)
    /** Tăng lên để ép tải lại ảnh khi người dùng bấm "Thử lại". */
    const [attempt, setAttempt] = useState(0)

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
                    {loading ? (
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

                    <p className="text-muted-foreground w-full text-xs">
                        {t('order.qr.confirmHint')}
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={confirming}
                        onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={confirming}
                        onClick={() => void onConfirm()}>
                        {confirming && <Loader2 className="size-4 animate-spin" />}
                        {t('order.qr.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
