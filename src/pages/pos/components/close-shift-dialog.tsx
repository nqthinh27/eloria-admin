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
import { CashCountResult } from '@/pages/shift/components/cash-count-result'

/**
 * Dialog **chốt ca (kiểm quỹ)** — PLAN Phase 15. Mockup `02-pos-mo-ca.png` chỉ vẽ màn mở ca,
 * phần chốt ca do FE thiết kế theo cùng ngôn ngữ giao diện.
 *
 * Hai bước trong **cùng một dialog**:
 *
 * 1. **Nhập tiền đếm được** trong két → gọi `POST /work-shift/close`.
 * 2. **Hiện kết quả đối soát** (tiền kỳ vọng · đã đếm · lệch quỹ).
 *
 * **Bước 2 hiện ngay kết quả** thay vì chỉ toast: nhân viên vừa đếm tiền xong cần biết ngay có
 * lệch quỹ không, bắt họ sang màn khác tra mới biết là thừa một bước. Vì vậy dialog **không tự
 * đóng** sau khi chốt.
 *
 * *(Trước 2026-09-09 lần 2 đây còn là **lần duy nhất** đọc được `expectedCash`/`cashDifference`
 * vì backend chưa có API tra cứu ca — nay đã có `POST /work-shift/search` + `GET /work-shift/{id}`
 * nên số liệu xem lại được ở màn Lịch sử ca.)*
 */
export function CloseShiftDialog({
    open,
    onOpenChange,
    shift,
    onClosed,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Ca **đang mở** — dùng để hiển thị tiền đầu ca làm mốc đối chiếu. */
    shift: WorkShift | null
    /** Gọi khi ca đã chốt xong **và** người dùng đã đọc kết quả (bấm "Xong"). */
    onClosed: () => void
}) {
    const { t } = useTranslation(['order', 'common'])

    const [closingCash, setClosingCash] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    /** Ca **đã chốt** (kết quả bước 2). `null` ⇒ đang ở bước 1. */
    const [result, setResult] = useState<WorkShift | null>(null)

    /* Mở lại dialog cho ca khác ⇒ về bước 1 với ô trống. */
    useEffect(() => {
        if (open) {
            setClosingCash('')
            setDescription('')
            setResult(null)
        }
    }, [open])

    /*
     * `0` là số hợp lệ (két rỗng cuối ca) ⇒ so `trim() === ''`, **không** dùng falsy check.
     */
    const canSubmit = closingCash.trim() !== ''

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return
        setSubmitting(true)
        try {
            const closed = await shiftApi.close({
                closingCash: Number(closingCash),
                description: description.trim() || undefined,
            })
            toastSuccess('order.shift.toast.closed', { ns: 'order' })
            setResult(closed)
        } catch (error) {
            /* Giữ dialog mở + giữ số đã nhập để người dùng đọc lỗi rồi thử lại. */
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
                /*
                 * Đã chốt xong mà đóng bằng nút X / phím Esc thì vẫn phải báo cho cha biết ca
                 * đã đóng — nếu không, màn POS vẫn tưởng ca còn mở.
                 */
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
                        {result ? t('order.shift.close.doneTitle') : t('order.shift.close.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {result
                            ? t('order.shift.close.doneSubtitle', { code: result.code })
                            : t('order.shift.close.subtitle')}
                    </DialogDescription>
                </DialogHeader>

                {result ? (
                    /* ---- Bước 2: kết quả đối soát (dùng chung với màn Ca làm việc) ---- */
                    <CashCountResult shift={result} />
                ) : (
                    /* ---- Bước 1: nhập tiền đếm được ---- */
                    <form
                        id="close-shift-form"
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
                            <Label htmlFor="shift-closing-cash">
                                {t('order.shift.close.closingCash')}
                            </Label>
                            <MoneyInput
                                id="shift-closing-cash"
                                value={closingCash}
                                onChange={setClosingCash}
                                placeholder={t('order.shift.close.closingCashPlaceholder')}
                                disabled={submitting}
                            />
                            <p className="text-muted-foreground text-xs">
                                {t('order.shift.close.closingCashHint')}
                            </p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="shift-close-note">{t('order.shift.close.note')}</Label>
                            <Input
                                id="shift-close-note"
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
                                form="close-shift-form"
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
