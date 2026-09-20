import { useState } from 'react'

import type { Brand } from '@/types/product'

/** Logo thương hiệu; URL rỗng hoặc tải lỗi ⇒ chữ cái đầu của tên (không nháy ảnh vỡ). */
export function BrandLogo({ brand }: { brand: Brand }) {
    const [failed, setFailed] = useState(false)
    const initial = brand.name.charAt(0).toUpperCase()
    return brand.logoUrl && !failed ? (
        <img
            src={brand.logoUrl}
            alt=""
            className="size-9 shrink-0 rounded-md border object-contain"
            onError={() => setFailed(true)}
        />
    ) : (
        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium">
            {initial}
        </span>
    )
}
