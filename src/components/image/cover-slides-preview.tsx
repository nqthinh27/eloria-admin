import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import { COVER_ROTATE_MS, IMAGE_SPEC, resolveImageSrc } from '@/lib/image-spec'
import { Button } from '@/components/ui/button'

type CoverSlidesPreviewProps = {
    /** `coverLink1..5` theo đúng thứ tự ô — ô trống được bỏ qua như backend làm (`compactCoverLinks`). */
    links: string[]
    /** Tên danh mục — web tự vẽ đè lên nửa trái ảnh, nên xem trước cũng vẽ để thấy chữ có đọc được không. */
    title?: string
    description?: string
    className?: string
}

/** Máy bật "giảm chuyển động" ⇒ đứng yên ở ảnh đầu, đúng như storefront. */
function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const onChange = () => setReduced(query.matches)
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [])
    return reduced
}

/**
 * Xem trước **dải ảnh bìa** trang Sản phẩm: khung 9:2, chuyển ảnh mỗi `COVER_ROTATE_MS` (4 giây), lặp vô
 * tận, fade chồng nhau như web khách. Có nút tạm dừng để soi từng ảnh. Chỉ `setInterval`, không thư viện.
 */
export function CoverSlidesPreview({ links, title, description, className }: CoverSlidesPreviewProps) {
    const { t } = useTranslation('image')
    const reduced = usePrefersReducedMotion()
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)

    const slides = useMemo(() => links.map((l) => l.trim()).filter(Boolean), [links])
    // `index` chỉ tăng mãi; lấy dư theo số ảnh hiện có nên bớt/thêm ô giữa chừng không bao giờ vượt biên.
    const count = slides.length
    const safeIndex = count > 0 ? index % count : 0
    const running = count > 1 && !paused && !reduced

    useEffect(() => {
        if (!running) return
        const timer = window.setInterval(() => setIndex((i) => i + 1), COVER_ROTATE_MS)
        return () => window.clearInterval(timer)
    }, [running, count])

    const ratio = IMAGE_SPEC.BANNER_WIDE.ratio

    return (
        <div className={cn('space-y-1.5', className)}>
            <div
                className="bg-muted relative w-full overflow-hidden rounded-md border"
                style={{ aspectRatio: String(ratio) }}>
                {count === 0 ? (
                    <span className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center text-xs">
                        <ImageIcon className="size-5" />
                        {t('slides.empty')}
                    </span>
                ) : (
                    <>
                        {slides.map((link, i) => (
                            <img
                                key={`${i}-${link}`}
                                src={resolveImageSrc(link)}
                                alt=""
                                className={cn(
                                    'absolute inset-0 size-full object-cover transition-opacity duration-700',
                                    i === safeIndex ? 'opacity-100' : 'opacity-0',
                                )}
                            />
                        ))}
                        {(title || description) && (
                            <div className="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center gap-0.5 bg-gradient-to-r from-black/45 to-transparent p-3 text-white">
                                {title && (
                                    <span className="truncate text-sm font-semibold sm:text-base">{title}</span>
                                )}
                                {description && (
                                    <span className="line-clamp-2 text-[11px] opacity-90">{description}</span>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {count > 0 && (
                <div className="flex items-center gap-2">
                    {count > 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-7 shrink-0"
                            disabled={reduced}
                            title={paused ? t('slides.play') : t('slides.pause')}
                            aria-label={paused ? t('slides.play') : t('slides.pause')}
                            onClick={() => setPaused((p) => !p)}>
                            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                        </Button>
                    )}
                    <p className="text-muted-foreground text-xs">
                        {count > 1
                            ? t('slides.counter', {
                                  current: safeIndex + 1,
                                  total: count,
                                  seconds: COVER_ROTATE_MS / 1000,
                              })
                            : t('slides.single')}
                    </p>
                </div>
            )}
            {reduced && count > 1 && (
                <p className="text-muted-foreground text-xs">{t('slides.reducedMotion')}</p>
            )}
        </div>
    )
}
