import { useEffect, useState } from 'react'

import { resolveImageSrc } from '@/lib/image-spec'
import type { Brand } from '@/types/product'
import { ClickableImage } from '@/components/image/clickable-image'

/** Logo thương hiệu; URL rỗng hoặc tải lỗi ⇒ chữ cái đầu của tên (không nháy ảnh vỡ). */
export function BrandLogo({ brand }: { brand: Brand }) {
    const [failed, setFailed] = useState(false)
    // Dòng được tái dùng khi logo đổi (upload/xoá) — không giữ trạng thái "lỗi" của ảnh cũ.
    useEffect(() => setFailed(false), [brand.logoUrl])
    const initial = brand.name.charAt(0).toUpperCase()
    return brand.logoUrl && !failed ? (
        <ClickableImage
            src={resolveImageSrc(brand.logoUrl)}
            alt={brand.name}
            className="size-9 shrink-0 rounded-md border object-contain"
            onError={() => setFailed(true)}
        />
    ) : (
        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium">
            {initial}
        </span>
    )
}
