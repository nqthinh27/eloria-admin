import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { IMAGE_SPEC, resolveImageSrc, type ImageSpecKey } from '@/lib/image-spec'

/** Chiều rộng mô phỏng (CSS px) của hai khung mà storefront dựng — chỉ để ghi nhãn. */
const DESKTOP_PX = 768
const MOBILE_PX = 390

type ImageFramePreviewProps = {
    spec: ImageSpecKey
    /** Giá trị lưu trong DB (link hoặc đường dẫn nội bộ); rỗng ⇒ khung trống. */
    value: string
    /** Tắt overlay vùng an toàn (mặc định bật nếu spec có `safeZone`). */
    showSafeZone?: boolean
    /** Dòng cảnh báo phụ đặt dưới khung (vd cảnh báo chữ đè lên nửa trái ảnh bìa). */
    extraNote?: string
    className?: string
}

function Frame({
    ratio,
    fit,
    src,
    label,
    safe,
    className,
}: {
    ratio: number
    fit: 'cover' | 'contain'
    src: string | null
    label: string
    safe?: { w: number; h: number } | null
    className?: string
}) {
    const { t } = useTranslation('image')
    return (
        <figure className={cn('min-w-0 space-y-1', className)}>
            <div
                className="bg-muted relative w-full overflow-hidden rounded-md border"
                style={{ aspectRatio: String(ratio) }}>
                {src ? (
                    <img
                        src={src}
                        alt=""
                        className={cn(
                            'absolute inset-0 size-full',
                            fit === 'cover' ? 'object-cover' : 'object-contain',
                        )}
                    />
                ) : (
                    <span className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs">
                        <ImageIcon className="size-5" />
                        {t('frame.empty')}
                    </span>
                )}
                {src && safe && (
                    // Phần ngoài khung sáng được phủ tối bằng một bóng đổ khổng lồ — không cần SVG mask.
                    <span
                        aria-hidden
                        className="border-primary pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]"
                        style={{ width: `${safe.w}%`, height: `${safe.h}%` }}
                    />
                )}
            </div>
            <figcaption className="text-muted-foreground text-center text-[11px]">{label}</figcaption>
        </figure>
    )
}

/**
 * Xem trước ảnh **đúng khung storefront** dựng, dùng chính `aspect-ratio` của `IMAGE_SPEC`.
 *
 * - Spec full-bleed (`HOME_HERO`, `BANNER_WIDE`) có 2 khung: desktop (phủ overlay vùng an toàn) và
 *   mobile (cắt thật theo tỉ lệ khung điện thoại).
 * - Spec còn lại một khung duy nhất; `OG_IMAGE`/`LOGO_SQUARE` cũng phủ vùng an toàn.
 */
export function ImageFramePreview({
    spec,
    value,
    showSafeZone = true,
    extraNote,
    className,
}: ImageFramePreviewProps) {
    const { t } = useTranslation('image')
    const s = IMAGE_SPEC[spec]
    const src = value.trim() ? resolveImageSrc(value.trim()) : null

    // Vùng an toàn tính theo % của ảnh ở kích thước khuyến nghị — ảnh đúng tỉ lệ thì khớp tuyệt đối.
    const safe =
        showSafeZone && s.safeZone
            ? {
                  w: Math.min(100, (s.safeZone.w / s.recommended.w) * 100),
                  h: Math.min(100, (s.safeZone.h / s.recommended.h) * 100),
              }
            : null
    const safeNoteKey =
        spec === 'OG_IMAGE' || spec === 'LOGO_SQUARE' ? `frame.safe.${spec}` : 'frame.safe.default'

    return (
        <div className={cn('space-y-2', className)}>
            {s.mobile ? (
                <div className="flex items-end gap-3">
                    <Frame
                        className="flex-1"
                        ratio={s.ratio}
                        fit={s.fit}
                        src={src}
                        safe={safe}
                        label={t('frame.desktop', { px: DESKTOP_PX })}
                    />
                    <Frame
                        className="w-[22%] shrink-0"
                        ratio={s.mobile.ratio}
                        fit={s.fit}
                        src={src}
                        label={t('frame.mobile', { px: MOBILE_PX })}
                    />
                </div>
            ) : (
                <Frame
                    ratio={s.ratio}
                    fit={s.fit}
                    src={src}
                    safe={safe}
                    label={t('frame.single')}
                />
            )}
            {safe && src && (
                <p className="text-muted-foreground text-xs leading-relaxed">{t(safeNoteKey)}</p>
            )}
            {extraNote && <p className="text-muted-foreground text-xs leading-relaxed">{extraNote}</p>}
        </div>
    )
}
