import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { IMAGE_SPEC, resolveImageSrc, type ImageSpecKey } from '@/lib/image-spec'
import { ImageLightbox } from './image-lightbox'

type HoverSwapPreviewProps = {
    /** Ảnh mặc định (ô 1). */
    primary: string
    /** Ảnh hiện khi rê chuột (ô 2). */
    secondary: string
    /** Mã spec của khung — mặc định ô danh mục 4:5; ảnh sản phẩm truyền `PRODUCT` (cũng 4:5). */
    spec?: ImageSpecKey
    className?: string
}

/**
 * Xem trước ô 4:5 **đổi ảnh khi rê chuột** — cùng cơ chế với web khách: ảnh 2 phủ lên ảnh 1 và hiện
 * dần khi hover. Chỉ CSS (`group-hover`), không state, không thêm dependency.
 *
 * Chỉ có ảnh 1 ⇒ ghi chú "không có ảnh hover" thay vì để người nhập tưởng khung bị lỗi.
 *
 * Bấm vào ô ⇒ mở `ImageLightbox` xem toàn màn hình (CONVENTIONS mục 5, chốt 2026-10-15); có cả 2
 * ảnh thì lightbox cho chuyển qua lại — đúng nghĩa "ảnh chồng nhau" của ô này.
 */
export function HoverSwapPreview({
    primary,
    secondary,
    spec = 'CATEGORY_TILE',
    className,
}: HoverSwapPreviewProps) {
    const { t } = useTranslation('image')
    const [open, setOpen] = useState(false)
    const a = primary.trim()
    const b = secondary.trim()
    const ratio = IMAGE_SPEC[spec].ratio
    const gallery = [a, b].filter(Boolean).map(resolveImageSrc)

    return (
        <div className={cn('space-y-1.5', className)}>
            <button
                type="button"
                disabled={gallery.length === 0}
                onClick={() => setOpen(true)}
                title={gallery.length > 0 ? t('viewer.openHint') : undefined}
                className="group bg-muted relative block w-full overflow-hidden rounded-md border disabled:cursor-default"
                style={{ aspectRatio: String(ratio) }}>
                {a ? (
                    <img
                        src={resolveImageSrc(a)}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                    />
                ) : (
                    <span className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs">
                        <ImageIcon className="size-5" />
                        {t('hover.empty')}
                    </span>
                )}
                {a && b && (
                    <img
                        src={resolveImageSrc(b)}
                        alt=""
                        className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                )}
            </button>
            <p className="text-muted-foreground text-xs leading-relaxed">
                {!a && !b ? t('hover.noImages') : a && b ? t('hover.hint') : t('hover.noHover')}
            </p>
            <ImageLightbox
                title={open ? t('hover.primary') : null}
                images={gallery}
                onOpenChange={setOpen}
            />
        </div>
    )
}
