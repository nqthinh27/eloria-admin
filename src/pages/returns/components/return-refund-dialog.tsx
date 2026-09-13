import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { returnApi } from '@/api/return'
import { formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import { EPaymentMethod } from '@/types/order'
import type { ReturnRequest } from '@/types/return'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

/**
 * Hình thức quyết toán **được backend hỗ trợ ở Phase 11**.
 *
 * ⚠️ `EPaymentMethod` có 7 giá trị nhưng `STORE_CREDIT` · `POINT` · `VOUCHER` trả
 * `error.return.methodNotSupported` (đo thật 2026-09-12 — chưa có sổ quỹ tiền treo) ⇒ **không bày
 * ra**, để người dùng chọn rồi báo lỗi là đánh đố. Backend mở thêm thì bổ sung vào đây.
 */
const SUPPORTED_METHODS = [
    EPaymentMethod.CASH,
    EPaymentMethod.CARD,
    EPaymentMethod.QR,
    EPaymentMethod.COD,
] as const

/**
 * Dialog **quyết toán tiền** của phiếu đã duyệt — `[ADMIN]`.
 *
 * Gánh cả hai chiều tiền: **trả lại khách** (`refundAmount`) và **thu thêm của khách**
 * (`collectAmount`, chỉ phát sinh khi đổi sang hàng đắt hơn) — backend dùng **chung một endpoint**
 * `POST /return/{id}/refund`, chỉ khác con số nào khác 0.
 *
 * ⚠️ **Số tiền do backend quyết**, request chỉ chọn hình thức: ô số tiền ở đây là `readOnly`, để
 * người dùng đối chiếu chứ không nhập. Gửi kèm số tiền cũng bị bỏ qua (giống `amount` của
 * `POST /order/{id}/payment`).
 *
 * ⚠️ Quyết toán bằng **tiền mặt** sẽ được backend gắn vào **ca đang mở** của người bấm
 * (`shiftId`) và vào thẳng `expectedCash` lúc chốt ca — đã đo thật, nên dialog nói trước.
 */
export function ReturnRefundDialog({
    open,
    onOpenChange,
    request,
    onSettled,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: ReturnRequest | null
    onSettled: () => void
}) {
    const { t } = useTranslation(['return', 'common'])
    const [method, setMethod] = useState<EPaymentMethod>(EPaymentMethod.CASH)
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setMethod(EPaymentMethod.CASH)
        setDescription('')
    }, [open])

    /** Chiều tiền: thu thêm hay trả lại. Backend đảm bảo tối đa 1 trong 2 khác 0. */
    const collecting = (request?.collectAmount ?? 0) > 0
    const amount = collecting ? (request?.collectAmount ?? 0) : (request?.refundAmount ?? 0)

    const handleSubmit = async () => {
        if (!request || submitting) return
        setSubmitting(true)
        try {
            await returnApi.refund(request.id, {
                method,
                description: description.trim() || undefined,
            })
            toastSuccess('return.toast.refunded', { ns: 'return' })
            onSettled()
        } catch (error) {
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {collecting
                            ? t('return.refundDialog.titleCollect')
                            : t('return.refundDialog.titleRefund')}
                    </DialogTitle>
                    <DialogDescription>
                        {request ? t('return.detail.title', { code: request.code }) : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="return-refund-amount">
                            {t('return.refundDialog.amount')}
                        </Label>
                        {/*
                          `readOnly` là cố ý: backend đã tính sẵn số tiền lúc tạo phiếu và **bỏ qua**
                          mọi số gửi lên. Hiện ra để đối chiếu, không cho sửa.
                        */}
                        <Input
                            id="return-refund-amount"
                            value={formatVnd(amount)}
                            readOnly
                            className="font-semibold tabular-nums"
                        />
                        <p className="text-muted-foreground text-xs">
                            {t('return.refundDialog.amountHint')}
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="return-refund-method">
                            {t('return.refundDialog.method')}
                        </Label>
                        <Select
                            value={method}
                            onValueChange={(v) => setMethod(v as EPaymentMethod)}
                            disabled={submitting}
                        >
                            <SelectTrigger id="return-refund-method" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_METHODS.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {t(`order.paymentMethod.${m}`, { ns: 'order' })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground text-xs">
                            {t('return.refundDialog.unsupportedHint')}
                        </p>
                        {method === EPaymentMethod.CASH && (
                            <p className="text-muted-foreground text-xs">
                                {t('return.refundDialog.shiftHint')}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="return-refund-note">
                            {t('return.refundDialog.description')}
                        </Label>
                        <Textarea
                            id="return-refund-note"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder={t('return.refundDialog.descriptionPlaceholder')}
                            maxLength={500}
                            rows={2}
                            disabled={submitting}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t('common:action.cancel')}
                    </Button>
                    <Button onClick={() => void handleSubmit()} disabled={submitting}>
                        {submitting
                            ? t('common:action.submitting')
                            : t('return.refundDialog.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
