import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    /** Hành động ghi vào audit log (xoá, khoá, gán role…) hiện thêm dòng ghi chú theo CONVENTIONS. */
    auditLogged?: boolean
    /** `destructive` cho hành động phá huỷ (xoá); mặc định nút xác nhận màu primary. */
    variant?: 'default' | 'destructive'
    confirmLabel?: ReactNode
    onConfirm: () => void | Promise<void>
}

/** Dialog xác nhận dùng chung cho mọi hành động nhạy cảm (PLAN Phase 5). */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    auditLogged = false,
    variant = 'default',
    confirmLabel,
    onConfirm,
}: ConfirmDialogProps) {
    const { t } = useTranslation('common')
    const [loading, setLoading] = useState(false)

    async function handleConfirm() {
        setLoading(true)
        try {
            await onConfirm()
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {auditLogged && (
                    <p className="text-muted-foreground text-xs">
                        {t('confirmDialog.auditNotice')}
                    </p>
                )}

                <DialogFooter>
                    <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
                        {t('action.cancel')}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        disabled={loading}
                        onClick={handleConfirm}>
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        {confirmLabel ?? t('action.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
