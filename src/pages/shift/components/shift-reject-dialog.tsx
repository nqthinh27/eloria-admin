import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { shiftApi } from '@/api/shift'
import { formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import type { WorkShift } from '@/types/shift'
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
 * Dialog **từ chối yêu cầu mở ca** (`WAITING_APPROVAL → REJECTED`) — PLAN Phase 15, `[ADMIN]`.
 *
 * Tách riêng khỏi nút "Duyệt" (duyệt bấm phát ăn ngay) vì từ chối **cần lý do**: backend lưu
 * `reason` vào `description` của ca, và đó là thứ duy nhất nhân viên đọc được để biết vì sao
 * ca bị chặn.
 *
 * ⚠️ Ca `REJECTED` là **ngõ cụt** — không duyệt lại được (`error.workShift.invalidStatus`),
 * nhân viên phải mở ca mới. Vì vậy dialog nói rõ hành động không quay lại được.
 */
export function ShiftRejectDialog({
    open,
    onOpenChange,
    shift,
    onRejected,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    shift: WorkShift | null
    onRejected: () => void
}) {
    const { t } = useTranslation(['order', 'common'])
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    /* Mở dialog cho ca khác ⇒ xoá lý do cũ, tránh gửi nhầm. */
    useEffect(() => {
        if (open) setReason('')
    }, [open])

    const handleSubmit = async () => {
        if (!shift || submitting) return
        setSubmitting(true)
        try {
            await shiftApi.reject(shift.id, { reason: reason.trim() || undefined })
            toastSuccess('order.shift.toast.rejected', { ns: 'order' })
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
                    <DialogTitle>{t('order.shift.reject.title')}</DialogTitle>
                    <DialogDescription>
                        {shift
                            ? t('order.shift.reject.subtitle', {
                                  code: shift.code,
                                  staff: shift.staffName ?? '—',
                                  amount: formatVnd(shift.openingCash),
                              })
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="shift-reject-reason">{t('order.shift.reject.reason')}</Label>
                    <Textarea
                        id="shift-reject-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={t('order.shift.reject.reasonPlaceholder')}
                        maxLength={500}
                        rows={3}
                        disabled={submitting}
                    />
                    <p className="text-muted-foreground text-xs">
                        {t('order.shift.reject.hint')}
                    </p>
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
                        disabled={submitting}
                    >
                        {submitting
                            ? t('common:action.submitting')
                            : t('order.shift.reject.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
