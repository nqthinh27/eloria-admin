import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import { shiftApi } from '@/api/shift'
import { formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import type { WorkShift } from '@/types/shift'
import { MoneyInput } from '@/components/money-input'
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
import { CashCountResult } from './cash-count-result'

/**
 * Dialog **quản lý chốt ca hộ nhân viên** (`POST /work-shift/{id}/close`) — PLAN Phase 15,
 * `[ADMIN]`.
 *
 * Khác `CloseShiftDialog` ở màn POS (nhân viên **tự** chốt ca của mình, không truyền id) ở chỗ:
 * chốt theo **id ca cụ thể**, dùng khi nhân viên về mất mà quên chốt.
 * Phần hiển thị kết quả kiểm quỹ dùng chung `CashCountResult` để hai nơi không lệch nhau.
 *
 * ⚠️ Ca không ở `OPEN` ⇒ `error.workShift.invalidStatus` (nút chỉ hiện với ca `OPEN` nên chỉ
 * gặp khi ca vừa bị người khác chốt trước).
 */
export function ShiftCloseByIdDialog({
    open,
    onOpenChange,
    shift,
    onClosed,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    shift: WorkShift | null
    onClosed: () => void
}) {
    const { t } = useTranslation(['order', 'common'])

    const [closingCash, setClosingCash] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    /** Ca **đã chốt** (bước 2). `null` ⇒ đang ở bước nhập số. */
    const [result, setResult] = useState<WorkShift | null>(null)

    useEffect(() => {
        if (open) {
            setClosingCash('')
            setDescription('')
            setResult(null)
        }
    }, [open])

    /* `0` hợp lệ (két rỗng) ⇒ so `trim() === ''`, **không** dùng falsy check. */
    const canSubmit = closingCash.trim() !== ''

    const handleSubmit = async () => {
        if (!shift || !canSubmit || submitting) return
        setSubmitting(true)
        try {
            const closed = await shiftApi.closeById(shift.id, {
                closingCash: Number(closingCash),
                description: description.trim() || undefined,
            })
            toastSuccess('order.shift.toast.closed', { ns: 'order' })
            setResult(closed)
        } catch (error) {
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleFinish = () => {
        onOpenChange(false)
        onClosed()
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                /* Đã chốt rồi mà đóng bằng X/Esc thì vẫn phải báo cha tải lại bảng. */
                if (!next && result) {
                    handleFinish()
                    return
                }
                onOpenChange(next)
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {result
                            ? t('order.shift.close.doneTitle')
                            : t('order.shift.closeForStaff.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {result
                            ? t('order.shift.close.doneSubtitle', { code: result.code })
                            : shift
                              ? t('order.shift.closeForStaff.subtitle', {
                                    code: shift.code,
                                    staff: shift.staffName ?? '—',
                                })
                              : ''}
                    </DialogDescription>
                </DialogHeader>

                {result ? (
                    <CashCountResult shift={result} />
                ) : (
                    <form
                        id="close-by-id-form"
                        className="flex flex-col gap-4"
                        onSubmit={(event) => {
                            event.preventDefault()
                            void handleSubmit()
                        }}
                    >
                        {shift && (
                            <div className="bg-muted/40 flex items-center justify-between rounded-lg px-4 py-3 text-sm">
                                <span className="text-muted-foreground">
                                    {t('order.shift.field.openingCash')}
                                </span>
                                <span className="font-medium">{formatVnd(shift.openingCash)}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="close-by-id-cash">
                                {t('order.shift.close.closingCash')}
                            </Label>
                            <MoneyInput
                                id="close-by-id-cash"
                                value={closingCash}
                                onChange={setClosingCash}
                                placeholder={t('order.shift.close.closingCashPlaceholder')}
                                disabled={submitting}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="close-by-id-note">{t('order.shift.close.note')}</Label>
                            <Input
                                id="close-by-id-note"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder={t('order.shift.close.notePlaceholder')}
                                maxLength={500}
                                disabled={submitting}
                            />
                        </div>
                    </form>
                )}

                <DialogFooter>
                    {result ? (
                        <Button onClick={handleFinish}>
                            <Check className="size-4" />
                            {t('order.shift.close.finish')}
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={submitting}
                            >
                                {t('common:action.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                form="close-by-id-form"
                                disabled={!canSubmit || submitting}
                            >
                                {submitting
                                    ? t('common:action.submitting')
                                    : t('order.shift.close.submit')}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
