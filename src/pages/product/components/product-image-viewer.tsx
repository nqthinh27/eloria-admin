import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ProductImageViewerProps = {
    /** `null` = đóng. */
    name: string | null
    /** URL đã qua `imageSrc` — viewer không tự dựng đường dẫn ảnh. */
    images: string[]
    onOpenChange: (open: boolean) => void
}

/**
 * Xem ảnh sản phẩm cỡ lớn (~80% màn hình) trên nền mờ — hành động mặc định khi bấm card ở
 * màn Sản phẩm. Nhiều ảnh ⇒ chuyển bằng nút ‹ › hoặc phím ←/→.
 *
 * Dựng từ primitive thay vì `DialogContent`: `DialogContent` là hộp trắng có padding + trần
 * `max-w-lg`, không hợp cho ảnh tràn gần hết màn.
 */
export function ProductImageViewer({ name, images, onOpenChange }: ProductImageViewerProps) {
    const { t } = useTranslation('product')
    const [index, setIndex] = useState(0)
    const open = name !== null
    const count = images.length

    /* Mở sản phẩm khác ⇒ luôn bắt đầu từ ảnh đầu tiên. */
    useEffect(() => {
        if (open) setIndex(0)
    }, [open, name])

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
                    <DialogTitle className="sr-only">{name}</DialogTitle>

                    {count > 0 && (
                        <img
                            src={images[index]}
                            alt={name ?? ''}
                            className="max-h-[80vh] max-w-[80vw] rounded-md object-contain shadow-2xl"
                        />
                    )}

                    {count > 1 && (
                        <>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full"
                                aria-label={t('product.viewer.previous')}
                                onClick={() => go(-1)}>
                                <ChevronLeft className="size-5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute right-4 top-1/2 size-10 -translate-y-1/2 rounded-full"
                                aria-label={t('product.viewer.next')}
                                onClick={() => go(1)}>
                                <ChevronRight className="size-5" />
                            </Button>
                            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                                {index + 1} / {count}
                            </span>
                        </>
                    )}

                    <DialogPrimitive.Close asChild>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-4 right-4 size-10 rounded-full"
                            aria-label={t('product.viewer.close')}>
                            <X className="size-5" />
                        </Button>
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
