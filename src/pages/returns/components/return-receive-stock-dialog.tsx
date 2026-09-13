import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { returnApi } from '@/api/return'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
    EReturnCondition,
    EReturnLineType,
    type ReturnDetail,
    type ReturnRequest,
} from '@/types/return'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

/**
 * Dialog **nhận hàng trả vào kho** — `[ADMIN]`, bước cuối của phiếu.
 *
 * Mỗi dòng `RETURNED` phải được gán **một tình trạng**:
 * - `RESALABLE` ⇒ backend **cộng tồn** qua một phiếu kho `IN` tự sinh ở trạng thái `ACCEPTED`
 *   (không đi qua submit/approve của Phase 10 — ADMIN đã duyệt phiếu trả rồi).
 * - `DEFECTIVE` ⇒ **không** cộng tồn. Muốn ghi nhận huỷ thì dùng riêng `POST /stock-disposal`.
 *
 * ⚠️ **Chỉ dòng `RETURNED` mới được liệt kê.** Dòng `DELIVERED` (hàng giao mới cho khách) đã bị
 * trừ tồn từ lúc duyệt, đưa vào đây là sai nghiệp vụ và backend cũng từ chối.
 *
 * ⚠️ Backend cho phép bỏ trống `lines` và chỉ gửi `defaultCondition`, nhưng FE **luôn gửi đủ từng
 * dòng**: nhân viên kho cần nhìn thấy mình đang phân loại cái gì, và như vậy không bao giờ dính
 * `error.return.conditionRequired`.
 */
export function ReturnReceiveStockDialog({
    open,
    onOpenChange,
    request,
    onReceived,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Phải là bản đã nạp `GET /return/{id}` — danh sách ở `search` trả `lines: null`. */
    request: ReturnRequest | null
    onReceived: () => void
}) {
    const { t } = useTranslation(['return', 'common'])
    const [conditions, setConditions] = useState<Record<string, EReturnCondition>>({})
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const returnedLines = useMemo<ReturnDetail[]>(
        () => (request?.lines ?? []).filter((l) => l.lineType === EReturnLineType.RETURNED),
        [request],
    )

    /* Mở dialog ⇒ mặc định mọi dòng là "bán lại được" (trường hợp phổ biến nhất). */
    useEffect(() => {
        if (!open) return
        setDescription('')
        setConditions(
            Object.fromEntries(returnedLines.map((l) => [l.id, EReturnCondition.RESALABLE])),
        )
    }, [open, returnedLines])

    const applyAll = (condition: EReturnCondition) =>
        setConditions(Object.fromEntries(returnedLines.map((l) => [l.id, condition])))

    const handleSubmit = async () => {
        if (!request || submitting || returnedLines.length === 0) return
        setSubmitting(true)
        try {
            await returnApi.receiveStock(request.id, {
                lines: returnedLines.map((l) => ({
                    returnDetailId: l.id,
                    condition: conditions[l.id] ?? EReturnCondition.RESALABLE,
                })),
                description: description.trim() || undefined,
            })
            toastSuccess('return.toast.stockReceived', { ns: 'return' })
            onReceived()
        } catch (error) {
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('return.receiveDialog.title')}</DialogTitle>
                    <DialogDescription>
                        {request ? t('return.detail.title', { code: request.code }) : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-muted-foreground text-xs">{t('return.receiveDialog.hint')}</p>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                            {t('return.receiveDialog.applyAll')}
                        </span>
                        {[EReturnCondition.RESALABLE, EReturnCondition.DEFECTIVE].map((c) => (
                            <Button
                                key={c}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={submitting}
                                onClick={() => applyAll(c)}
                            >
                                {t(`return.condition.${c}`)}
                            </Button>
                        ))}
                    </div>

                    <div className="divide-y rounded-lg border">
                        {returnedLines.map((line) => (
                            <div
                                key={line.id}
                                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {line.productName}
                                    </p>
                                    <p className="text-muted-foreground font-mono text-xs">
                                        {line.skuCode} · ×{line.quantity}
                                    </p>
                                </div>
                                <Select
                                    value={conditions[line.id] ?? EReturnCondition.RESALABLE}
                                    onValueChange={(v) =>
                                        setConditions((prev) => ({
                                            ...prev,
                                            [line.id]: v as EReturnCondition,
                                        }))
                                    }
                                    disabled={submitting}
                                >
                                    <SelectTrigger
                                        aria-label={line.skuCode}
                                        className={cn(
                                            'w-full shrink-0 sm:w-44',
                                            conditions[line.id] === EReturnCondition.DEFECTIVE &&
                                                'text-destructive',
                                        )}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            EReturnCondition.RESALABLE,
                                            EReturnCondition.DEFECTIVE,
                                        ].map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {t(`return.condition.${c}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="return-receive-note">
                            {t('return.refundDialog.description')}
                        </Label>
                        <Textarea
                            id="return-receive-note"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
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
                    <Button
                        onClick={() => void handleSubmit()}
                        disabled={submitting || returnedLines.length === 0}
                    >
                        {submitting
                            ? t('common:action.submitting')
                            : t('return.receiveDialog.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
