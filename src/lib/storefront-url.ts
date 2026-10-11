import { storefrontUrl } from '@/config/app'

/**
 * URL trang chi tiết trên storefront (`35.3.eloria-client`: `/san-pham/[slug]`, `/danh-muc/[slug]`).
 * `slug` do backend sinh nên đã an toàn cho URL; vẫn `encodeURIComponent` để không phụ thuộc điều đó.
 */
export const productStorefrontUrl = (slug: string) =>
    `${storefrontUrl}/san-pham/${encodeURIComponent(slug)}`

export const categoryStorefrontUrl = (slug: string) =>
    `${storefrontUrl}/danh-muc/${encodeURIComponent(slug)}`
