import type { EntityStatus, SearchReq } from '@/types/common'

/** Vòng đời SKU theo `11-san-pham.png`: New → Active → Markdown → Ngừng KD. */
export const ESkuLifecycle = {
    NEW: 'NEW',
    ACTIVE: 'ACTIVE',
    MARKDOWN: 'MARKDOWN',
    DISCONTINUED: 'DISCONTINUED',
} as const
export type ESkuLifecycle = (typeof ESkuLifecycle)[keyof typeof ESkuLifecycle]

/** `ProductCategoryResDTO` (chưa có API — `12-danh-muc-sp.png`, đa cấp cha/con). */
export type ProductCategory = {
    id: string
    code: string
    name: string
    parentId: string | null
    parentName: string | null
    productCount: number
    brandCount: number
    collectionCount: number
    status: EntityStatus
}

export type ProductCategorySearchReq = SearchReq & {
    parentId?: string
}

export type ProductCategoryPayload = {
    name: string
    parentId?: string
}

/** `ProductResDTO` — sản phẩm cha, theo `11-san-pham.png`. */
export type Product = {
    id: string
    code: string
    name: string
    categoryIds: string[]
    categoryNames: string[]
    brandName: string | null
    /** Giá bán tham chiếu (giá thấp nhất trong các SKU); giá thật theo kênh nằm ở từng SKU. */
    basePrice: number
    /** Tổng tồn thực cộng dồn mọi SKU — chỉ để hiển thị nhanh ở card danh sách. */
    totalStock: number
    imageUrl: string | null
    lifecycle: ESkuLifecycle
    status: EntityStatus
    createdDate: string
}

export type ProductSearchReq = SearchReq & {
    categoryId?: string
    lifecycle?: ESkuLifecycle
}

export type ProductPayload = {
    name: string
    categoryIds: string[]
    brandName?: string
}

/** `SkuResDTO` — 1 dòng trong ma trận màu × size của 1 sản phẩm. */
export type Sku = {
    id: string
    code: string
    productId: string
    productName: string
    color: string
    size: string
    barcode: string
    price: number
    imageUrl: string | null
    lifecycle: ESkuLifecycle
    status: EntityStatus
}
