import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { toastError } from '@/lib/toast'
import {
    EPromotionStatus,
    PROMOTION_STATUS_TRANSITIONS,
    type Promotion,
} from '@/types/promotion'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Dialog chuyển vòng đời khuyến mại.
 *
 * ⚠️ Chỉ liệt kê **những trạng thái backend cho phép chuyển tới** từ trạng thái hiện tại
 * (`PROMOTION_STATUS_TRANSITIONS`) — bấm sai sẽ nhận `error.promotion.invalidStatus`, nên chặn
 * trước ở UI thay vì để người dùng thử rồi mới báo lỗi.
 *
 * ⚠️ Backend **không có xoá mềm** cho khuyến mại: `ENDED` là đường kết thúc duy nhất và
 * **không quay lại được** — vì vậy có cảnh báo riêng khi chọn nó.
 */
export function PromotionStatusDialog({
    open,
    onOpenChange,
    promotion,
    onConfirm,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    promotion: Promotion | null
    onConfirm: (id: string, status: EPromotionStatus) => Promise<void>
}) {
    const { t } = useTranslation(['promotion', 'common'])
    const [nextStatus, setNextStatus] = useState<EPromotionStatus | ''>('')
    const [submitting, setSubmitting] = useState(false)

    const options = promotion ? PROMOTION_STATUS_TRANSITIONS[promotion.status] : []

    /* Mở lại dialog cho bản ghi khác ⇒ xoá lựa chọn cũ để không "kế thừa" nhầm. */
    useEffect(() => {
        if (open) setNextStatus('')
    }, [open, promotion])

    const handleConfirm = async () => {
        if (!promotion || !nextStatus) return
        setSubmitting(true)
        try {
            await onConfirm(promotion.id, nextStatus)
            onOpenChange(false)
        } catch (error) {
            /*
             * Dialog này không có form nên không gắn lỗi vào field được — hiện toast rồi giữ
             * dialog mở để người dùng chọn lại trạng thái khác.
             */
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('promotion.statusDialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('promotion.statusDialog.description', {
                            name: promotion?.name ?? '',
                            current: promotion ? t(`promotion.status.${promotion.status}`) : '',
                        })}
                    </DialogDescription>
                </DialogHeader>

                {options.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        {t('promotion.statusDialog.noTransition')}
                    </p>
                ) : (
                    <div className="space-y-3">
                        <Label htmlFor="promotion-next-status">
                            {t('promotion.list.column.status')}
                        </Label>
                        <Select
                            value={nextStatus}
                            onValueChange={(value) => setNextStatus(value as EPromotionStatus)}>
                            <SelectTrigger id="promotion-next-status" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {t(`promotion.status.${status}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {nextStatus === EPromotionStatus.ENDED && (
                            <p className="text-warning flex items-start gap-2 text-xs">
                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                {t('promotion.statusDialog.endedWarning')}
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => onOpenChange(false)}>
                        {t('promotion.statusDialog.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={submitting || !nextStatus}
                        onClick={handleConfirm}>
                        {submitting && <Loader2 className="animate-spin" />}
                        {t('promotion.statusDialog.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
