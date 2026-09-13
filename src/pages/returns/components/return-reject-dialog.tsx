import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { returnApi } from '@/api/return'
import { toastError, toastSuccess } from '@/lib/toast'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Dialog **từ chối yêu cầu đổi/trả** (`PENDING_APPROVAL → REJECTED`) — `[ADMIN]`.
 *
 * Tách riêng khỏi nút "Duyệt" vì từ chối **bắt buộc có lý do** (`RejectReturnReqDTO.reason` là
 * field required của backend).
 *
 * ⚠️ Phiếu `REJECTED` là **ngõ cụt** — duyệt lại trả `error.return.invalidStatus`, sai thì phải
 * tạo phiếu mới. Dialog nói rõ điều đó trước khi bấm.
 */
export function ReturnRejectDialog({
    open,
    onOpenChange,
    request,
    onRejected,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: ReturnRequest | null
    onRejected: () => void
}) {
    const { t } = useTranslation(['return', 'common'])
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    /* Mở cho phiếu khác ⇒ xoá lý do cũ, tránh gửi nhầm nội dung của phiếu trước. */
    useEffect(() => {
        if (open) setReason('')
    }, [open])

    const trimmed = reason.trim()

    const handleSubmit = async () => {
        if (!request || submitting || !trimmed) return
        setSubmitting(true)
        try {
            await returnApi.reject(request.id, trimmed)
            toastSuccess('return.toast.rejected', { ns: 'return' })
            onRejected()
        } catch (error) {
            /* Giữ dialog mở + giữ lý do đã gõ để người dùng đọc lỗi rồi thử lại. */
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('return.rejectDialog.title')}</DialogTitle>
                    <DialogDescription>
                        {request ? t('return.detail.title', { code: request.code }) : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="return-reject-reason">{t('return.rejectDialog.reason')}</Label>
                    <Textarea
                        id="return-reject-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={t('return.rejectDialog.reasonPlaceholder')}
                        maxLength={500}
                        rows={3}
                        disabled={submitting}
                    />
                    <p className="text-muted-foreground text-xs">{t('return.rejectDialog.hint')}</p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => void handleSubmit()}
                        /* Lý do là field bắt buộc của backend ⇒ khoá nút thay vì để 400 dội về. */
                        disabled={submitting || !trimmed}
                    >
                        {submitting
                            ? t('common:action.submitting')
                            : t('return.rejectDialog.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
