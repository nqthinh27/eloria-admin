import { useTranslation } from 'react-i18next'

import type { ZaloLinkInfo } from '@/types/auth'
import { ZaloLinkInstructions } from '@/components/zalo/zalo-link-instructions'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

type ZaloLinkDialogProps = {
    open: boolean
    info: ZaloLinkInfo | null
    /** Giây còn lại của mã liên kết. */
    remaining: number
    onNewCode: () => void
    newCodeBusy: boolean
    /** Giây còn bị chặn lấy mã mới (cooldown gửi OTP của backend). */
    newCodeWait: number
    /** Đóng modal; `received = true` khi bấm "Tôi đã nhận OTP" ⇒ cha focus ô OTP. */
    onClose: (received: boolean) => void
}

/**
 * Modal liên kết Zalo ở màn đăng nhập — hiện khi `send-otp` trả `ZALO_LINK_REQUIRED`.
 * **Không poll** backend: bot gửi OTP thẳng qua Zalo, người dùng tự nhập vào ô Mã OTP.
 */
export function ZaloLinkDialog({
    open,
    info,
    remaining,
    onNewCode,
    newCodeBusy,
    newCodeWait,
    onClose,
}: ZaloLinkDialogProps) {
    const { t } = useTranslation(['auth', 'common'])

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose(false)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('auth:auth.zaloLink.title')}</DialogTitle>
                    <DialogDescription>{t('auth:auth.zaloLink.description')}</DialogDescription>
                </DialogHeader>

                {info && (
                    <ZaloLinkInstructions
                        info={info}
                        remaining={remaining}
                        onNewCode={onNewCode}
                        newCodeBusy={newCodeBusy}
                        newCodeWait={newCodeWait}
                    />
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onClose(false)}>
                        {t('common:action.close')}
                    </Button>
                    <Button onClick={() => onClose(true)}>{t('auth:auth.zaloLink.received')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
