import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { orderApi } from '@/api/order'
import { cn } from '@/lib/utils'
import type { BranchAvailability } from '@/types/order'
import { StatusBadge } from '@/components/status-badge'
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
 * Duyệt **đơn online chưa gán chi nhánh** (backend S36, 2026-10-15): chọn chi nhánh xuất hàng rồi
 * `POST /order/{id}/confirm {branchId}` — backend gán chi nhánh + trừ kho tại đó.
 *
 * - Danh sách lấy từ `GET /order/{id}/branch-availability` (đủ hàng xếp trước). **Chỉ chọn được
 *   `enough && selectable`**; chi nhánh thiếu hàng hiện `còn / cần` từng SKU thiếu.
 * - Số liệu là ảnh chụp: `confirm` lỗi (vd `error.stock.insufficient` vì vừa bán mất) ⇒ **tải lại
 *   tồn** để thấy chi nhánh nào hết đủ — không đọc `logInfo` (CONVENTIONS mục 3: chỉ để debug).
 */
export function ConfirmBranchDialog({
    open,
    onOpenChange,
    orderId,
    orderCode,
    onConfirm,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderId: string | null
    orderCode: string
    /** Ném lỗi khi duyệt thất bại (api-client đã toast) ⇒ dialog giữ mở và nạp lại tồn. */
    onConfirm: (branchId: string) => Promise<void>
}) {
    const { t } = useTranslation(['order', 'common'])
    const [branches, setBranches] = useState<BranchAvailability[] | null>(null)
    const [selected, setSelected] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const load = useCallback(
        async (signal?: AbortSignal) => {
            if (!orderId) return
            setBranches(null)
            try {
                const result = await orderApi.branchAvailability(orderId, signal)
                setBranches(result)
                setSelected((current) => {
                    const pickable = result.filter((b) => b.enough && b.selectable)
                    if (current && pickable.some((b) => b.branchId === current)) return current
                    return pickable[0]?.branchId ?? null
                })
            } catch {
                if (signal?.aborted) return
                setBranches([])
            }
        },
        [orderId],
    )

    useEffect(() => {
        if (!open) {
            setSelected(null)
            return
        }
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [open, load])

    const handleSubmit = async () => {
        if (!selected) return
        setSubmitting(true)
        try {
            await onConfirm(selected)
            onOpenChange(false)
        } catch {
            void load()
        } finally {
            setSubmitting(false)
        }
    }

    const hasPickable = (branches ?? []).some((b) => b.enough && b.selectable)

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('order.action.confirmTitle', { code: orderCode })}</DialogTitle>
                    <DialogDescription>{t('order.action.confirmBranch.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <p className="text-sm font-medium">{t('order.action.confirmBranch.label')}</p>
                    {branches === null ? (
                        <div className="space-y-2">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                    ) : branches.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('order.action.confirmBranch.empty')}
                        </p>
                    ) : (
                        <div role="radiogroup" className="max-h-80 space-y-2 overflow-y-auto">
                            {branches.map((branch) => {
                                const pickable = branch.enough && branch.selectable
                                const isSelected = selected === branch.branchId
                                const shortLines = branch.lines.filter(
                                    (line) => line.available < line.required,
                                )
                                return (
                                    <button
                                        key={branch.branchId}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        disabled={!pickable || submitting}
                                        onClick={() => setSelected(branch.branchId)}
                                        className={cn(
                                            'w-full rounded-md border px-3 py-2 text-left transition-colors',
                                            pickable && 'hover:bg-muted/50 cursor-pointer',
                                            !pickable && 'cursor-not-allowed opacity-60',
                                            isSelected && 'border-primary ring-primary/30 ring-2',
                                        )}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                {branch.branchName}
                                            </span>
                                            {!branch.selectable ? (
                                                <StatusBadge tone="muted">
                                                    {t('order.action.confirmBranch.notSelectable')}
                                                </StatusBadge>
                                            ) : branch.enough ? (
                                                <StatusBadge tone="success">
                                                    {t('order.action.confirmBranch.enough')}
                                                </StatusBadge>
                                            ) : (
                                                <StatusBadge tone="danger">
                                                    {t('order.action.confirmBranch.notEnough')}
                                                </StatusBadge>
                                            )}
                                        </div>
                                        {shortLines.length > 0 && (
                                            <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                                                {shortLines.map((line) => (
                                                    <li key={line.skuId}>
                                                        {t('order.action.confirmBranch.shortLine', {
                                                            sku: line.skuCode,
                                                            available: line.available,
                                                            required: line.required,
                                                        })}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {branches !== null && branches.length > 0 && !hasPickable && (
                        <p className="text-destructive text-sm">
                            {t('order.action.confirmBranch.noneEnough')}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={!selected || submitting}
                        onClick={() => void handleSubmit()}>
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {t('order.action.confirmBranch.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
