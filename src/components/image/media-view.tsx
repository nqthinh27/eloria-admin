import { useEffect, useRef, type ReactEventHandler } from 'react'

import { isVideoUrl } from '@/lib/image-spec'

type MediaViewProps = {
    /** URL đã qua `resolveImageSrc`, hoặc `mediaPreviewSrc` của file chờ gửi (blob + `#.mp4`). */
    src: string
    alt?: string
    className?: string
    /**
     * Video tự phát — chỉ cho khung **chính đang hiển thị** (lightbox, khung xem trước, slide đang tới lượt).
     * Mặc định `false`: thumbnail/lớp ẩn chỉ tải metadata (khung đầu), rê chuột mới phát — tránh tải trọn
     * mọi video trên trang và ăn trần rate limit `/image`.
     */
    autoPlay?: boolean
    /** Hiện thanh điều khiển (lightbox) — còn lại phát lặp không tiếng như storefront. */
    controls?: boolean
    onError?: ReactEventHandler<HTMLImageElement | HTMLVideoElement>
}

/**
 * Một ô media: đuôi video (`.mp4/.webm/.mov` — handoff BE 2026-10-31, nhận biết bằng `isVideoUrl`) ⇒
 * `<video muted loop playsinline>`, còn lại `<img>`. Dùng thay `<img>` ở mọi chỗ hiển thị ảnh sản phẩm ·
 * banner · danh mục.
 */
export function MediaView({ src, alt = '', className, autoPlay = false, controls, onError }: MediaViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const isVideo = isVideoUrl(src)

    // `autoPlay` đổi sau khi đã tải (slide tới lượt / hết lượt) ⇒ thuộc tính HTML không tự phát/dừng lại.
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        if (autoPlay) void video.play().catch(() => {})
        else video.pause()
    }, [autoPlay, src])

    if (isVideo) {
        return (
            <video
                ref={videoRef}
                src={src}
                aria-label={alt || undefined}
                className={className}
                muted
                loop
                playsInline
                autoPlay={autoPlay}
                preload="metadata"
                controls={controls}
                onMouseEnter={autoPlay ? undefined : (event) => void event.currentTarget.play().catch(() => {})}
                onMouseLeave={autoPlay ? undefined : (event) => event.currentTarget.pause()}
                onError={onError}
            />
        )
    }
    return <img src={src} alt={alt} className={className} onError={onError} />
}
