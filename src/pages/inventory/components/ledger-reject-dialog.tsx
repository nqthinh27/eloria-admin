import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { warehouseLedgerApi } from '@/api/inventory'
import { toastSuccess } from '@/lib/toast'
import type { WarehouseLedger } from '@/types/inventory'
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
 * Dialog từ chối phiếu kho (`POST /warehouse-ledger/{id}/reject`).
 * `reason` là **tuỳ chọn** ở backend (`RejectWarehouseLedgerReqDTO.reason` không `@NotBlank`),
 * nhưng bắt buộc ở FE vì từ chối mà không nêu lý do thì người tạo không biết phải sửa gì.
 */
export function LedgerRejectDialog({
    ledger,
    onOpenChange,
    onRejected,
}: {
    ledger: WarehouseLedger | null
    onOpenChange: (open: boolean) => void
    onRejected: () => Promise<void> | void
}) {
    const { t } = useTranslation(['inventory', 'common'])
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (ledger) {
            setReason('')
            setError('')
        }
    }, [ledger])

    async function handleSubmit() {
        if (!ledger) return
        if (!reason.trim()) {
            setError(t('inventory.reject.reasonPlaceholder'))
            return
        }

        setSubmitting(true)
        try {
            await warehouseLedgerApi.reject(ledger.id, { reason: reason.trim() })
            toastSuccess('inventory.toast.ledgerRejected', { ns: 'inventory' })
            await onRejected()
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi; giữ dialog mở.
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={ledger !== null} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {t('inventory.reject.title', { code: ledger?.code ?? '' })}
                    </DialogTitle>
                    <DialogDescription>{t('inventory.reject.reasonHint')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="reject-reason">
                        {t('inventory.reject.reason')} <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="reject-reason"
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value)
                            if (error) setError('')
                        }}
                        placeholder={t('inventory.reject.reasonPlaceholder')}
                        maxLength={255}
                        rows={3}
                    />
                    {error && <p className="text-destructive text-xs">{error}</p>}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        disabled={submitting}
                        onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button variant="destructive" disabled={submitting} onClick={handleSubmit}>
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {t('inventory.reject.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
