import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Monitor, Smartphone } from 'lucide-react'

import { toPreviewHtml } from '@/lib/cms-html'
import { resolveImageSrc } from '@/lib/image-spec'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Khung **"Xem trước"** dùng chung cho trang "Về chúng tôi" và bài viết — hiện đúng nội dung **đang soạn**
 * (chưa cần lưu), dựng gần giống storefront bằng CSS `.store-preview` ở `index.css` (bản sao
 * `.prose-content` + `.about-strip` của `35.3.eloria-client`). Đây là **mô phỏng**: font/khung trang không
 * giống tuyệt đối — bản chính xác xem bằng "Xem trên web" sau khi lưu.
 *
 * Nút Máy tính / Điện thoại đổi bề rộng khung (CSS dùng container query nên bố cục <640px dựng đúng).
 */

type Device = 'desktop' | 'mobile'

/** Tỉ lệ rộng so với ảnh giữa theo khoảng cách tới giữa — khớp `about-strip.tsx` của storefront. */
const SCALE_BY_DISTANCE = [1, 0.68, 0.46] as const

export function StorePreviewDialog({
    open,
    onOpenChange,
    title,
    children,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    children: ReactNode
}) {
    const { t } = useTranslation('common')
    const [device, setDevice] = useState<Device>('desktop')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[94vh] flex-col gap-3 sm:max-w-[min(1240px,96vw)]">
                <DialogHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pr-8">
                    <div>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription className="text-xs">{t('storePreview.note')}</DialogDescription>
                    </div>
                    <div className="flex gap-1" role="group" aria-label={t('storePreview.device')}>
                        <Button
                            type="button"
                            size="sm"
                            variant={device === 'desktop' ? 'secondary' : 'ghost'}
                            aria-pressed={device === 'desktop'}
                            onClick={() => setDevice('desktop')}>
                            <Monitor className="size-4" />
                            {t('storePreview.desktop')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={device === 'mobile' ? 'secondary' : 'ghost'}
                            aria-pressed={device === 'mobile'}
                            onClick={() => setDevice('mobile')}>
                            <Smartphone className="size-4" />
                            {t('storePreview.mobile')}
                        </Button>
                    </div>
                </DialogHeader>
                <div className="bg-muted/60 min-h-0 flex-1 overflow-y-auto rounded-md p-3">
                    {/* `key` theo thiết bị ⇒ đổi thiết bị là dựng lại, hiệu ứng ảnh rơi chạy lại. */}
                    <div
                        key={device}
                        className={cn('store-preview mx-auto shadow-sm', device === 'mobile' ? 'w-[390px] max-w-full' : 'w-full')}>
                        {children}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** Trang "Về chúng tôi": dải ảnh (đúng số ảnh web hiện) → tiêu đề + dòng giới thiệu → nội dung. */
export function AboutPreview({
    images,
    title,
    subtitle,
    content,
}: {
    /** Đã lọc đúng như web hiện (bỏ ô trống, số lẻ). */
    images: string[]
    title: string
    subtitle: string
    content: string
}) {
    const { t } = useTranslation('common')
    const center = Math.floor((images.length - 1) / 2)
    // Bố cục "xòe lá bài" ở khung Điện thoại (giống storefront): ảnh đang chọn + vuốt/kéo ngang để đổi.
    const [active, setActive] = useState(center)
    const start = useRef<number | null>(null)
    /** Vừa kéo xong ⇒ bỏ cú click đi kèm (không thì click chọn lại đúng lá vừa kéo, mất thao tác vuốt). */
    const swiped = useRef(false)
    const go = (index: number) => setActive(Math.min(images.length - 1, Math.max(0, index)))

    return (
        <div className="pb-12">
            {images.length > 0 && (
                <>
                    <div
                        className="sp-strip mt-6"
                        onPointerDown={(event) => {
                            start.current = event.clientX
                            swiped.current = false
                        }}
                        onPointerUp={(event) => {
                            const from = start.current
                            start.current = null
                            if (from === null || Math.abs(event.clientX - from) < 40) return
                            swiped.current = true
                            go(active + (event.clientX < from ? 1 : -1))
                        }}>
                        {images.map((url, index) => {
                            const distance = Math.abs(index - center)
                            const scale = SCALE_BY_DISTANCE[Math.min(distance, SCALE_BY_DISTANCE.length - 1)]
                            const offset = index - active
                            return (
                                <div
                                    key={`${url}-${index}`}
                                    className="sp-strip-item"
                                    data-front={offset === 0 ? '' : undefined}
                                    data-far={Math.abs(offset) > 2 ? '' : undefined}
                                    onClick={() => {
                                        if (swiped.current) {
                                            swiped.current = false
                                            return
                                        }
                                        go(index)
                                    }}
                                    style={
                                        {
                                            '--scale': scale,
                                            '--order': distance,
                                            '--offset': offset,
                                            '--abs': Math.abs(offset),
                                            '--z': 10 - Math.abs(offset),
                                        } as CSSProperties
                                    }>
                                    <div className="sp-strip-card">
                                        <img src={resolveImageSrc(url)} alt="" className="sp-strip-img" draggable={false} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {images.length > 1 && (
                        <div className="sp-dots">
                            {images.map((url, index) => (
                                <button
                                    key={`${url}-dot-${index}`}
                                    type="button"
                                    className={cn('sp-dot', index === active && 'is-active')}
                                    aria-label={`${index + 1}/${images.length}`}
                                    onClick={() => go(index)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
            <div className="sp-page pt-0">
                <h1 className="sp-title">{title || '—'}</h1>
                {subtitle && <p className="sp-subtitle">{subtitle}</p>}
                {content ? (
                    <div className="sp-prose" dangerouslySetInnerHTML={{ __html: toPreviewHtml(content) }} />
                ) : (
                    <p className="sp-empty text-center">{t('storePreview.empty')}</p>
                )}
            </div>
        </div>
    )
}

/** Chi tiết bài viết: nhãn loại → tiêu đề → tóm tắt → ảnh bìa → nội dung (bố cục `/tin-tuc/[slug]`). */
export function PostPreview({
    typeLabel,
    title,
    excerpt,
    coverUrl,
    coverFile,
    content,
}: {
    typeLabel: string
    title: string
    excerpt: string
    /** Ảnh bìa đã lưu (`/post/<file>`). */
    coverUrl: string | null
    /** Ảnh bìa chọn nhưng chưa tải lên (bài mới) — ưu tiên hơn `coverUrl`. */
    coverFile: File | null
    content: string
}) {
    const { t } = useTranslation('common')
    const [fileUrl, setFileUrl] = useState<string | null>(null)

    // Tạo + thu hồi blob URL trong cùng effect (an toàn với StrictMode).
    useEffect(() => {
        if (!coverFile) {
            setFileUrl(null)
            return
        }
        const url = URL.createObjectURL(coverFile)
        setFileUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [coverFile])

    const cover = fileUrl ?? (coverUrl ? resolveImageSrc(coverUrl) : null)
    return (
        <article className="sp-page">
            <p className="sp-eyebrow">{typeLabel}</p>
            <h1 className="sp-post-title">{title || '—'}</h1>
            {excerpt && <p className="sp-excerpt">{excerpt}</p>}
            {cover && <img src={cover} alt="" className="sp-cover" />}
            {content ? (
                <div className="sp-prose" dangerouslySetInnerHTML={{ __html: toPreviewHtml(content) }} />
            ) : (
                <p className="sp-empty">{t('storePreview.empty')}</p>
            )}
        </article>
    )
}
