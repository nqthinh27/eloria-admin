import type { EntityStatus } from './common'

/**
 * DTO Content/CMS (backend Phase 15) — đồng bộ từ source Java `PostResDTO`, `PostListItemResDTO`,
 * `BannerResDTO` + `docs/api/fe-handoff-phase15-admin.md` (đo thật 2026-10-13). Mọi endpoint chỉ
 * `[SUPER_ADMIN]`.
 */

/** `EPostType` — chủ đề bài viết (P15.1 đã bỏ `PAGE`: trang tĩnh viết cứng ở storefront). */
export const POST_TYPES = ['NEWS', 'PRODUCT_STORY', 'BRAND_STORY', 'CAMPAIGN'] as const
export type PostType = (typeof POST_TYPES)[number]

/** `EPostStatus` — lifecycle riêng, **không** dùng `EntityStatus`. */
export const POST_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED'] as const
export type PostStatus = (typeof POST_STATUSES)[number]

/** `PostListItemResDTO` — dòng danh sách, **không** có `content`. `Instant` ⇒ chuỗi ISO. */
export type PostListItem = {
    id: string
    slug: string
    title: string
    excerpt: string | null
    /** Đường dẫn tương đối `/post/<file>` — phải đi qua `resolveImageSrc`. */
    coverUrl: string | null
    type: PostType
    postStatus: PostStatus
    publishedAt: string | null
    createdDate: string
    lastModifiedDate: string
}

/** `PostResDTO` — chi tiết đủ, `content` đã được backend sanitize. */
export type Post = PostListItem & {
    content: string | null
    metaTitle: string | null
    metaDescription: string | null
    productIds: string[]
    createdBy: string | null
}

/** `PostSearchReqDTO` — `status` của base **không dùng**, lọc bằng `postStatus`. */
export type PostSearchReq = {
    keyword?: string
    type?: PostType
    postStatus?: PostStatus
}

/**
 * `CreatePostReqDTO` = `UpdatePostReqDTO`. ⚠️ KHÔNG có `coverUrl`/`status`/`postStatus`/`ogImage`
 * (gửi ⇒ 400). `productIds`: bỏ trống/null = giữ nguyên, `[]` = gỡ hết (chỉ PUT).
 */
export type PostPayload = {
    /** Bỏ trống: tạo ⇒ backend sinh từ tiêu đề; sửa ⇒ giữ slug hiện tại (P15.1). */
    slug?: string
    title: string
    excerpt?: string
    content?: string
    type: PostType
    metaTitle?: string
    metaDescription?: string
    productIds?: string[]
}

/** `UpdatePostStatusReqDTO`. `SCHEDULED` bắt buộc `publishedAt` ở tương lai (ISO). */
export type PostStatusPayload = {
    id: string
    postStatus: PostStatus
    publishedAt?: string
}

/** `EBannerPosition` — v1 chỉ có `HOME_HERO`. */
export type BannerPosition = 'HOME_HERO'

/** `BannerResDTO`. `status` 0/1 (xoá mềm không bao giờ về FE). */
export type Banner = {
    id: string
    position: BannerPosition
    imageUrl: string | null
    title: string
    subtitle: string | null
    ctaLabel: string | null
    ctaUrl: string | null
    sortOrder: number | null
    effectiveFrom: string | null
    effectiveTo: string | null
    status: EntityStatus
    createdDate: string
    lastModifiedDate: string
}

export type BannerSearchReq = {
    keyword?: string
    status?: EntityStatus
    position?: BannerPosition
}

/**
 * `CreateBannerReqDTO` = `UpdateBannerReqDTO`. ⚠️ KHÔNG có `imageUrl`/`status`.
 * ⚠️ `PUT` **thay toàn bộ** (đo 2026-10-13): field bỏ trống ⇒ `null` (`sortOrder` ⇒ 0). `ctaUrl: ""` ⇒ 400 —
 * muốn xoá phải **bỏ field**, không gửi chuỗi rỗng.
 */
export type BannerPayload = {
    position?: BannerPosition
    title: string
    subtitle?: string
    ctaLabel?: string
    ctaUrl?: string
    sortOrder?: number
    effectiveFrom?: string
    effectiveTo?: string
}
