import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'

import { baseUrl } from '@/config/app'
import { formatCountdown } from '@/hooks/use-countdown'
import { cn } from '@/lib/utils'
import type { ZaloLinkInfo } from '@/types/auth'
import { Button } from '@/components/ui/button'

type ZaloLinkInstructionsProps = {
    info: ZaloLinkInfo
    /** Số giây còn lại của mã (cha đếm bằng `useCountdown`); 0 ⇒ hết hạn. */
    remaining: number
    /** Bấm "Lấy mã mới" — cha gọi lại API sinh mã. Không truyền ⇒ ẩn nút. */
    onNewCode?: () => void
    newCodeBusy?: boolean
    /** Số giây còn bị chặn lấy mã mới (cooldown backend); 0 ⇒ bấm được. */
    newCodeWait?: number
}

/**
 * Khối hướng dẫn liên kết Zalo bằng QR — dùng ở modal đăng nhập lần đầu (`ZaloLinkDialog`) và
 * modal "Đổi Zalo nhận OTP". Ảnh QR là **ảnh tĩnh PO cung cấp** (`public/zalo-bot-qr.png`) — backend
 * không sinh QR, không thêm thư viện QR. Thiếu file ảnh ⇒ ẩn ảnh, vẫn còn link + mã để làm tiếp.
 */
export function ZaloLinkInstructions({
    info,
    remaining,
    onNewCode,
    newCodeBusy = false,
    newCodeWait = 0,
}: ZaloLinkInstructionsProps) {
    const { t } = useTranslation('auth')
    const [qrFailed, setQrFailed] = useState(false)
    const [copied, setCopied] = useState(false)
    const codeRef = useRef<HTMLElement>(null)

    const expired = remaining <= 0
    const message = `/otp ${info.linkCode}`

    /** `navigator.clipboard` chỉ có ở ngữ cảnh an toàn (HTTPS/localhost) ⇒ lùi về chọn text để user tự Ctrl+C. */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
        } catch {
            const node = codeRef.current
            if (!node) return
            const range = document.createRange()
            range.selectNodeContents(node)
            const selection = window.getSelection()
            selection?.removeAllRanges()
            selection?.addRange(range)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
                {qrFailed ? (
                    <p className="text-muted-foreground bg-muted rounded-lg p-3 text-center text-xs">
                        {t('auth.zaloLink.qrMissing')}
                    </p>
                ) : (
                    <img
                        src={`${baseUrl}/zalo-bot-qr.png`}
                        alt={t('auth.zaloLink.qrAlt')}
                        className="size-44 rounded-lg border bg-white object-contain p-2"
                        onError={() => setQrFailed(true)}
                    />
                )}
                {info.botLink && (
                    <Button asChild variant="outline" size="sm">
                        <a href={info.botLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" />
                            {t('auth.zaloLink.openBot')}
                        </a>
                    </Button>
                )}
            </div>

            <p className="text-sm">{t('auth.zaloLink.step1')}</p>

            <div className="space-y-2">
                <p className="text-sm">{t('auth.zaloLink.step2')}</p>
                <div className="flex items-center gap-2">
                    <code
                        ref={codeRef}
                        className={cn(
                            'bg-muted flex-1 rounded-lg px-3 py-2 text-center font-mono text-xl font-semibold tracking-wider',
                            expired && 'opacity-40',
                        )}>
                        {message}
                    </code>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={expired}
                        onClick={handleCopy}>
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        {copied ? t('auth.zaloLink.copied') : t('auth.zaloLink.copy')}
                    </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p
                        className={cn(
                            'text-xs',
                            expired ? 'text-destructive' : 'text-muted-foreground',
                        )}
                        role="status">
                        {expired
                            ? t('auth.zaloLink.expired')
                            : t('auth.zaloLink.expiresIn', { time: formatCountdown(remaining) })}
                    </p>
                    {expired && onNewCode && (
                        <Button
                            type="button"
                            size="sm"
                            disabled={newCodeBusy || newCodeWait > 0}
                            onClick={onNewCode}>
                            {newCodeBusy && <Loader2 className="size-4 animate-spin" />}
                            {newCodeBusy
                                ? t('auth.zaloLink.gettingNewCode')
                                : newCodeWait > 0
                                  ? t('auth.zaloLink.newCodeWait', { seconds: newCodeWait })
                                  : t('auth.zaloLink.newCode')}
                        </Button>
                    )}
                </div>
            </div>

            <p className="text-sm">{t('auth.zaloLink.afterNote')}</p>
            <p className="text-muted-foreground text-xs">{t('auth.zaloLink.wrongNote')}</p>
        </div>
    )
}
