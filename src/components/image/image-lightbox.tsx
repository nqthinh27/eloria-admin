import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ImageLightboxProps = {
    /** `null` = đóng. */
    title: string | null
    /** URL đã qua `resolveImageSrc` — lightbox không tự dựng đường dẫn ảnh. */
    images: string[]
    /** Ảnh mở đầu tiên khi bấm vào một ảnh giữa nhóm (vd bấm ảnh thứ 3 trong lưới). */
    startIndex?: number
    onOpenChange: (open: boolean) => void
}

/**
 * Xem ảnh cỡ lớn (~80% màn hình) trên nền mờ — dùng chung cho **mọi nơi hiển thị ảnh** trong app
 * (grid, bảng, modal chi tiết, form) khi bấm vào ảnh (CONVENTIONS mục 5, chốt 2026-10-15). Nhiều
 * ảnh ⇒ chuyển bằng nút ‹ › hoặc phím ←/→. Gốc từ `product-image-viewer.tsx` (Phase 9, màn Sản
 * phẩm) — tổng quát hoá để dùng lại thay vì mỗi màn tự dựng dialog xem ảnh riêng.
 *
 * Dựng từ primitive thay vì `DialogContent`: `DialogContent` là hộp trắng có padding + trần
 * `max-w-lg`, không hợp cho ảnh tràn gần hết màn.
 */
export function ImageLightbox({ title, images, startIndex = 0, onOpenChange }: ImageLightboxProps) {
    const { t } = useTranslation('image')
    const [index, setIndex] = useState(startIndex)
    const open = title !== null
    const count = images.length

    /* Mở lại (ảnh/nhóm khác, hoặc bấm đúng ảnh thứ N) ⇒ luôn bắt đầu từ `startIndex`. */
    useEffect(() => {
        if (open) setIndex(startIndex)
    }, [open, title, startIndex])

    const go = (step: number) => setIndex((i) => (i + step + count) % count)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
                <DialogPrimitive.Content
                    className="fixed inset-0 z-50 flex items-center justify-center outline-none"
                    aria-describedby={undefined}
                    onKeyDown={(event) => {
                        if (count < 2) return
                        if (event.key === 'ArrowLeft') go(-1)
                        if (event.key === 'ArrowRight') go(1)
                    }}
                    /* Bấm vùng trống quanh ảnh ⇒ đóng, giống bấm nền. */
                    onClick={(event) => {
                        if (event.target === event.currentTarget) onOpenChange(false)
                    }}>
                    <DialogTitle className="sr-only">{title}</DialogTitle>

                    {count > 0 && (
                        <img
                            src={images[index]}
                            alt={title ?? ''}
                            className="max-h-[80vh] max-w-[80vw] rounded-md object-contain shadow-2xl"
                        />
                    )}

                    {count > 1 && (
                        <>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full"
                                aria-label={t('viewer.previous')}
                                onClick={() => go(-1)}>
                                <ChevronLeft className="size-5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute right-4 top-1/2 size-10 -translate-y-1/2 rounded-full"
                                aria-label={t('viewer.next')}
                                onClick={() => go(1)}>
                                <ChevronRight className="size-5" />
                            </Button>
                            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                                {t('viewer.counter', { current: index + 1, total: count })}
                            </span>
                        </>
                    )}

                    <DialogPrimitive.Close asChild>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-4 right-4 size-10 rounded-full"
                            aria-label={t('viewer.close')}>
                            <X className="size-5" />
                        </Button>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
