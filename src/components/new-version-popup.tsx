import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'

import { CURRENT_VERSION, fetchServerVersion } from '@/lib/app-version'
import { Button } from '@/components/ui/button'

/** Chu kỳ kiểm tra khi tab đang mở (ngoài lần kiểm khi tab được focus lại). */
const CHECK_INTERVAL_MS = 10 * 60 * 1000

/**
 * Popup góc màn hình *"Đã có phiên bản mới — Tải lại"* (PLAN Phase 24 mục 5).
 *
 * ⚠️ **Không tự reload** — admin có thể đang nhập POS/form dài, tự reload sẽ mất dữ liệu; chỉ nhắc,
 * người dùng tự quyết lúc nào bấm. Dùng `<dialog>` **không modal** (`show()`, không phải
 * `showModal()`): không che nền, không khoá tương tác ⇒ form đang mở vẫn gõ tiếp được.
 *
 * Bấm "Đóng" chỉ ẩn popup tới khi server có bản **mới hơn nữa** (hoặc người dùng tải lại trang).
 */
export function NewVersionPopup() {
    const { t } = useTranslation('common')
    const dialogRef = useRef<HTMLDialogElement>(null)
    /** Mã phiên bản server mà người dùng đã bấm "Đóng" — không nhắc lại đúng mã đó. */
    const dismissedRef = useRef<string | null>(null)
    const [pendingVersion, setPendingVersion] = useState<string | null>(null)

    useEffect(() => {
        // Dev server không có `version.json`; chỉ có nghĩa với bản build.
        if (import.meta.env.DEV) return

        let controller: AbortController | null = null
        const check = async () => {
            controller?.abort()
            controller = new AbortController()
            const serverVersion = await fetchServerVersion(controller.signal)
            if (!serverVersion || serverVersion === CURRENT_VERSION) return
            if (serverVersion === dismissedRef.current) return
            setPendingVersion(serverVersion)
        }

        const onVisible = () => {
            if (document.visibilityState === 'visible') void check()
        }
        document.addEventListener('visibilitychange', onVisible)
        const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
        void check()

        return () => {
            controller?.abort()
            document.removeEventListener('visibilitychange', onVisible)
            window.clearInterval(timer)
        }
    }, [])

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (pendingVersion && !dialog.open) dialog.show()
        if (!pendingVersion && dialog.open) dialog.close()
    }, [pendingVersion])

    const dismiss = () => {
        dismissedRef.current = pendingVersion
        setPendingVersion(null)
    }

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="new-version-title"
            className="bg-card text-card-foreground fixed right-4 bottom-4 left-auto z-[60] m-0 w-80 max-w-[calc(100vw-2rem)] rounded-lg border p-4 shadow-lg">
            <p id="new-version-title" className="text-sm font-semibold">
                {t('newVersion.title')}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{t('newVersion.message')}</p>
            <div className="mt-3 flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={dismiss}>
                    {t('action.close')}
                </Button>
                <Button type="button" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCw className="size-4" />
                    {t('newVersion.reload')}
                </Button>
            </div>
        </dialog>
    )
}
