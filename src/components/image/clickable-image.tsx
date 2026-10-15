import { useState, type ReactEventHandler } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { ImageLightbox } from './image-lightbox'

type ClickableImageProps = {
    src: string
    alt: string
    /** Class áp cho thẻ `<img>` hiển thị (không ảnh hưởng ảnh trong lightbox). */
    className?: string
    /** Cả nhóm ảnh để chuyển qua lại trong lightbox — bỏ trống ⇒ chỉ 1 ảnh (`[src]`). */
    images?: string[]
    /** Tên hiển thị trong lightbox (sr-only). Bỏ trống ⇒ dùng `alt`. */
    title?: string
    /** Chuyển thẳng cho `<img>` — dùng khi màn tự xử lý ảnh lỗi (vd logo thương hiệu). */
    onError?: ReactEventHandler<HTMLImageElement>
}

/**
 * Bọc một `<img>` sẵn có để bấm vào là bật `ImageLightbox` xem toàn màn hình — chuẩn dùng chung
 * cho **mọi nơi hiển thị ảnh** (grid/bảng/modal chi tiết/form), CONVENTIONS mục 5, chốt 2026-10-15.
 * Dùng khi chỉ cần thay `<img>` bằng component khác, không cần tự quản lý state mở/đóng.
 *
 * Nhiều ảnh chồng nhau (vd card hover-swap, lưới ảnh sản phẩm) ⇒ truyền `images` đủ cả nhóm, lightbox
 * tự mở đúng ảnh đang bấm và cho chuyển `‹ ›`/phím mũi tên qua các ảnh còn lại.
 */
export function ClickableImage({ src, alt, className, images, title, onError }: ClickableImageProps) {
    const { t } = useTranslation('image')
    const [open, setOpen] = useState(false)
    const gallery = images && images.length > 0 ? images : [src]
    const startIndex = Math.max(0, gallery.indexOf(src))

    return (
        <>
            <button
                type="button"
                className="block cursor-zoom-in"
                title={t('viewer.openHint')}
                aria-label={t('viewer.openHint')}
                onClick={() => setOpen(true)}>
                <img src={src} alt={alt} className={cn(className)} onError={onError} />
            </button>
            <ImageLightbox
                title={open ? (title ?? alt) : null}
                images={gallery}
                startIndex={startIndex}
                onOpenChange={setOpen}
            />
        </>
    )
}
