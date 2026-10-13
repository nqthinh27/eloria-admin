import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { resolveImageSrc } from '@/lib/image-spec'

/** Ảnh hero 21:10 trong bảng; rỗng/tải lỗi ⇒ khung biểu tượng. */
export function BannerThumb({ url }: { url: string | null }) {
    const [failed, setFailed] = useState(false)
    useEffect(() => setFailed(false), [url])
    return url && !failed ? (
        <img
            src={resolveImageSrc(url)}
            alt=""
            className="aspect-[21/10] w-24 shrink-0 rounded-md border object-cover"
            onError={() => setFailed(true)}
        />
    ) : (
        <span className="bg-muted text-muted-foreground flex aspect-[21/10] w-24 shrink-0 items-center justify-center rounded-md border">
            <ImageIcon className="size-4" />
        </span>
    )
}
