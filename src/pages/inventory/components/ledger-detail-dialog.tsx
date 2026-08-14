import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { warehouseLedgerApi } from '@/api/inventory'
import { formatDateTime } from '@/lib/format'
import { EWarehouseLedgerType, type WarehouseLedger } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, type StatusTone } from '@/components/status-badge'

const STATUS_TONE: Record<string, StatusTone> = {
    DRAFT: 'muted',
    WAITING_APPROVAL: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'danger',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">{label}</p>
            <div className="mt-1 text-sm font-medium">{children}</div>
        </div>
    )
}

/**
 * Dialog chi tiết phiếu kho. **Luôn gọi lại `GET /warehouse-ledger/{id}`** thay vì dùng object
 * từ bảng: bảng có `lines` nhưng đây là dữ liệu đã nạp từ trước, người khác có thể vừa duyệt/
 * từ chối phiếu — mở chi tiết là lúc cần dữ liệu mới nhất.
 */
export function LedgerDetailDialog({
    ledgerId,
    onOpenChange,
}: {
    ledgerId: string | null
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation(['inventory', 'common'])
    const [ledger, setLedger] = useState<WarehouseLedger | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!ledgerId) {
            setLedger(null)
            return
        }
        const controller = new AbortController()
        setLoading(true)
        warehouseLedgerApi
            .getById(ledgerId, controller.signal)
            .then((result) => setLedger(result))
            .catch(() => {
                // api-client đã toast lỗi.
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })
        return () => controller.abort()
    }, [ledgerId])

    /** `GET /{id}` luôn trả `lines`, nhưng vẫn phòng null vì type cho phép (xem `types/inventory.ts`). */
    const lines = ledger?.lines ?? []
    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)

    return (
        <Dialog open={ledgerId !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {t('inventory.detail.title', { code: ledger?.code ?? '' })}
                    </DialogTitle>
                </DialogHeader>

                {loading || !ledger ? (
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label={t('inventory.detail.type')}>
                                {t(`inventory.ledger.type.${ledger.type}`)}
                            </Field>
                            <Field label={t('inventory.detail.status')}>
                                <StatusBadge tone={STATUS_TONE[ledger.status]}>
                                    {t(`inventory.ledger.status.${ledger.status}`)}
                                </StatusBadge>
                            </Field>
                            <Field label={t('inventory.detail.branch')}>{ledger.branchName}</Field>

                            {ledger.type === EWarehouseLedgerType.TRANSFER && (
                                <Field label={t('inventory.detail.toBranch')}>
                                    {ledger.toBranchName ?? '—'}
                                </Field>
                            )}
                            {ledger.type === EWarehouseLedgerType.IN && (
                                <Field label={t('inventory.detail.receiveFrom')}>
                                    {ledger.receiveFrom ?? '—'}
                                </Field>
                            )}
                            {ledger.type === EWarehouseLedgerType.OUT && (
                                <Field label={t('inventory.detail.sendTo')}>
                                    {ledger.sendTo ?? '—'}
                                </Field>
                            )}

                            <Field label={t('inventory.detail.createdBy')}>{ledger.createdBy}</Field>
                            <Field label={t('inventory.detail.createdDate')}>
                                {formatDateTime(ledger.createdDate)}
                            </Field>
                        </div>

                        {/* Bảng dòng hàng */}
                        <div className="rounded-lg border">
                            <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-2">
                                <p className="text-sm font-medium">{t('inventory.detail.lines')}</p>
                                <p className="text-muted-foreground text-xs">
                                    {t('inventory.detail.totalQuantity')}:{' '}
                                    <span className="text-foreground font-semibold">
                                        {totalQuantity}
                                    </span>
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground border-b text-xs">
                                            <th className="px-4 py-2 text-left font-medium">
                                                {t('inventory.detail.lineColumn.sku')}
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium">
                                                {t('inventory.detail.lineColumn.product')}
                                            </th>
                                            <th className="px-4 py-2 text-left font-medium">
                                                {t('inventory.detail.lineColumn.variant')}
                                            </th>
                                            <th className="px-4 py-2 text-right font-medium">
                                                {t('inventory.detail.lineColumn.quantity')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line) => (
                                            <tr key={line.id} className="border-b last:border-0">
                                                <td className="text-muted-foreground px-4 py-2 font-mono text-xs">
                                                    {line.skuCode}
                                                </td>
                                                <td className="px-4 py-2">{line.productName}</td>
                                                <td className="text-muted-foreground px-4 py-2">
                                                    {[line.colorName, line.sizeLabel]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold">
                                                    {line.quantity}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-warning-muted rounded-lg p-3">
                            <p className="text-xs font-medium">
                                {t('inventory.detail.description')}:{' '}
                                <span className="font-normal">
                                    {ledger.description ?? t('inventory.detail.noDescription')}
                                </span>
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common:action.close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
