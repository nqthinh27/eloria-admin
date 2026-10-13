import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { resolveImageSrc } from '@/lib/image-spec'

/** Ảnh bìa 16:9 trong bảng; rỗng/tải lỗi ⇒ khung biểu tượng (không nháy ảnh vỡ). */
export function PostCover({ url }: { url: string | null }) {
    const [failed, setFailed] = useState(false)
    // Dòng được tái dùng khi ảnh đổi — không giữ trạng thái "lỗi" của ảnh cũ.
    useEffect(() => setFailed(false), [url])
    return url && !failed ? (
        <img
            src={resolveImageSrc(url)}
            alt=""
            className="aspect-video w-20 shrink-0 rounded-md border object-cover"
            onError={() => setFailed(true)}
        />
    ) : (
        <span className="bg-muted text-muted-foreground flex aspect-video w-20 shrink-0 items-center justify-center rounded-md border">
            <ImageIcon className="size-4" />
        </span>
    )
}
