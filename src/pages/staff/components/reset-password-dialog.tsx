import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Copy, Loader2 } from 'lucide-react'

import type { Staff } from '@/types/staff'
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

type ResetPasswordDialogProps = {
    staff: Staff | null
    onOpenChange: (open: boolean) => void
    onConfirm: () => Promise<string>
}

/**
 * Reset mật khẩu — 2 bước: xác nhận rồi hiện `temporaryPassword`.
 *
 * `ResetStaffPasswordResDTO.temporaryPassword` CHỈ trả về đúng một lần tại thời điểm gọi API,
 * không có endpoint xem lại (xác nhận từ api-docs) ⇒ phải giữ trong state cục bộ của dialog này,
 * không được phép đóng dialog rồi mở lại để xem tiếp.
 */
export function ResetPasswordDialog({ staff, onOpenChange, onConfirm }: ResetPasswordDialogProps) {
    const { t } = useTranslation(['staff', 'common'])
    const [loading, setLoading] = useState(false)
    const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!staff) {
            setTemporaryPassword(null)
            setCopied(false)
        }
    }, [staff])

    const handleConfirm = async () => {
        setLoading(true)
        try {
            const password = await onConfirm()
            setTemporaryPassword(password)
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!temporaryPassword) return
        await navigator.clipboard.writeText(temporaryPassword)
        setCopied(true)
    }

    const handleClose = (next: boolean) => {
        if (loading) return
        onOpenChange(next)
    }

    return (
        <Dialog open={staff !== null} onOpenChange={handleClose}>
            <DialogContent>
                {temporaryPassword ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t('staff.resetPassword.resultTitle')}</DialogTitle>
                        </DialogHeader>

                        <div className="bg-warning-muted text-warning flex items-start gap-2 rounded-lg p-3 text-sm">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <p>{t('staff.resetPassword.resultWarning')}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Input readOnly value={temporaryPassword} className="font-mono" />
                            <Button type="button" variant="outline" onClick={handleCopy}>
                                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                {copied ? t('staff.resetPassword.copied') : t('staff.resetPassword.copy')}
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}>
                                {t('staff.resetPassword.close')}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t('staff.resetPassword.confirmTitle')}</DialogTitle>
                            <DialogDescription>
                                {t('staff.resetPassword.confirmDescription', {
                                    name: staff?.fullName ?? '',
                                })}
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                disabled={loading}
                                onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button disabled={loading} onClick={handleConfirm}>
                                {loading && <Loader2 className="size-4 animate-spin" />}
                                {t('staff.resetPassword.confirmSubmit')}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
