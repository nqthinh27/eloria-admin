import type { EGender, EntityStatus, SearchReq } from '@/types/common'

/**
 * Type domain sản phẩm — đồng bộ nguyên văn từ `/v3/api-docs/api` (khảo sát 2026-08-09)
 * và đối chiếu response thật của backend local.
 *
 * ⚠️ Khác hẳn bản dựng tạm ở Phase 6 (`ESkuLifecycle`, `totalStock`, `basePrice`,
 * `productCount`/`brandCount`/`collectionCount`… đều là tên tự đặt, **không tồn tại** ở backend).
 * Xem PLAN Phase 9 phần "Lệch so với mockup".
 */

/**
 * Chất liệu — **enum fix cứng phía backend**, không có API danh mục chất liệu.
 * FE fix cứng đúng 4 giá trị này (chốt cùng user 2026-08-09); thêm giá trị mới phải sửa backend trước.
 */
export const EMaterial = {
    COTTON: 'COTTON',
    LINEN: 'LINEN',
    SILK: 'SILK',
    WOOL: 'WOOL',
} as const
export type EMaterial = (typeof EMaterial)[keyof typeof EMaterial]

/** `CategoryRefResDTO` — dạng rút gọn của danh mục, nhúng trong `ProductResDTO.categories`. */
export type CategoryRef = {
    id: string
    code: string
    name: string
}

/**
 * `ProductResDTO` — sản phẩm cha.
 *
 * ⚠️ **`categories` luôn rỗng `[]` ở API danh sách** (`POST /product/search`), chỉ được backend
 * populate ở API chi tiết (`GET /product/{id}`) — xác nhận bằng dữ liệu thật 2026-08-09.
 * Không có `totalStock`/tồn kho (chưa có API kho) và không có ảnh mặc định.
 */
export type Product = {
    id: string
    code: string
    name: string
    slug: string
    price: number
    /**
     * Giá vốn — **field mới, backend bổ sung ở Phase 7 đợt 1 (2026-08-29)**, làm cơ sở cho báo cáo
     * lãi gộp sẽ ra ở đợt sau. `null` khi chưa nhập (toàn bộ dữ liệu hiện có đang `null`).
     *
     * ⚠️ **Số liệu nội bộ** — backend tự chụp (snapshot) vào đơn lúc tạo, **không** lộ ra
     * đơn/hoá đơn. FE chỉ hiển thị & cho sửa với **SUPER_ADMIN**, tuyệt đối không đưa sang
     * màn bán hàng/đơn hàng.
     */
    costPrice: number | null
    shortDescription: string | null
    description: string | null
    gender: EGender | null
    status: EntityStatus
    brandId: string | null
    brandName: string | null
    material: EMaterial | null
    /** Metadata tự do dạng chuỗi JSON — client tự định nghĩa cấu trúc. */
    metadata: string | null
    /** Nhóm size dùng để dựng ma trận SKU, ví dụ `Áo`, `Quần`. */
    sizeGroup: string | null
    images: string[]
    categories: CategoryRef[]
    createdDate: string
    lastModifiedDate: string
}

/** `ProductSearchReqDTO`. */
export type ProductSearchReq = SearchReq & {
    brandId?: string
    gender?: EGender
    /** Lọc theo danh mục — sản phẩm phải nằm trong danh mục này. */
    categoryId?: string
}

/** `CreateProductReqDTO` — `code` bắt buộc khi tạo, không sửa được về sau. */
export type CreateProductReq = {
    code: string
    name: string
    price: number
    /**
     * Giá vốn — tuỳ chọn, phải `>= 0` nếu gửi (backend `@DecimalMin(0)`, gửi số âm ⇒ 400).
     *
     * ⚠️ **Khi sửa (`PUT`): bỏ trống / gửi `undefined` ⇒ backend GIỮ NGUYÊN giá trị cũ**,
     * không xoá về `null` (hành vi partial-update chung của product) ⇒ **không có cách nào
     * xoá giá vốn đã nhập** qua API, chỉ đổi sang số khác.
     */
    costPrice?: number
    shortDescription?: string
    description?: string
    gender?: EGender
    brandId?: string
    material?: EMaterial
    metadata?: string
    sizeGroup?: string
    /** Thay thế **toàn bộ** danh sách danh mục cũ. */
    categoryIds?: string[]
}

/** `UpdateProductReqDTO` — giống create nhưng **không có `code`**. */
export type UpdateProductReq = Omit<CreateProductReq, 'code'>

/** `GenerateSkuReqDTO` — sinh ma trận SKU (màu × size). Idempotent: ô đã có SKU thì bỏ qua. */
export type GenerateSkuReq = {
    colorIds: string[]
    sizeIds: string[]
}

/**
 * `SkuResDTO` — 1 SKU = (Product × Color × Size).
 *
 * `status` theo **quy ước 3 giá trị chung toàn hệ thống** (CONVENTIONS mục 3.3):
 * bật/tắt `0`/`1` qua `POST /sku/update-status`, còn `-1` (xoá mềm) chỉ đặt được qua
 * `DELETE /sku/{id}` — **hai API tách biệt, không dùng chung**. Bản ghi `-1` bị ẩn khỏi mọi
 * truy vấn nên FE không bao giờ nhận được ⇒ kiểu ở đây chỉ mô tả 0/1.
 *
 * Vòng đời New/Markdown/Ngừng KD trong mockup **chưa có** ở backend (ghi chú `Sku.java`:
 * "để dành cho sau") — đừng nhầm với `status`.
 */
export type Sku = {
    /**
     * ⚠️ **MÃ SKU, KHÔNG phải UUID** *(breaking 2026-08-11)* — ví dụ `SP001-BK-AO-L`
     * (`{productCode}-{colorCode}-{sizeCode}`; phần cuối là `code` của size, không phải `label`).
     * **Luôn bằng `skuCode`** ⇒ hiển thị thẳng cho người dùng được, không cần cột `skuCode` riêng.
     * Dùng làm path param (`GET /sku/SP001-BK-AO-L`) — nhớ `encodeURIComponent`.
     */
    id: string
    /** Bằng đúng `id` — giữ lại vì backend vẫn trả, nhưng không cần hiển thị cả hai. */
    skuCode: string
    /** Mã vạch EAN-13 — **field riêng, không đổi theo `id`**. */
    ean: string | null
    status: EntityStatus
    productId: string
    productName: string | null
    /**
     * Giá riêng của biến thể — **field mới, backend bổ sung cùng domain đơn hàng (2026-08-11)**.
     * Hiện **luôn `null`** với dữ liệu đang có (không có API nào đặt giá theo SKU; `POST /product`
     * và `generate-sku` đều không nhận field này) ⇒ nơi cần giá phải fallback về `Product.price`.
     */
    unitPrice: number | null
    colorId: string | null
    colorName: string | null
    sizeId: string | null
    sizeLabel: string | null
    createdDate: string
}

/** `SkuSearchReqDTO`. */
export type SkuSearchReq = SearchReq & {
    productId?: string
    colorId?: string
    sizeId?: string
}

/**
 * `CategoryResDTO` — danh mục sản phẩm, cây đa cấp qua `parentId`.
 * `level` 0 = danh mục gốc.
 */
export type Category = {
    id: string
    code: string
    name: string
    slug: string
    level: number
    sortOrder: number | null
    imageUrl: string | null
    status: EntityStatus
    parentId: string | null
    parentName: string | null
    createdDate: string
    lastModifiedDate: string
}

/** `CategorySearchReqDTO` — `parentId` lọc theo danh mục cha **trực tiếp**. */
export type CategorySearchReq = SearchReq & {
    parentId?: string
}

/**
 * `CreateCategoryReqDTO` / `UpdateCategoryReqDTO` — hai DTO có **cùng bộ field**
 * (khác `product`: `UpdateProductReqDTO` bỏ `code`, còn danh mục vẫn sửa được `code`).
 */
export type CategoryPayload = {
    code: string
    name: string
    /** Bỏ trống = danh mục gốc (level 0). Không được chọn chính nó hoặc con cháu của nó. */
    parentId?: string
    sortOrder?: number
    imageUrl?: string
}

/** `BrandResDTO`. */
export type Brand = {
    id: string
    code: string
    name: string
    address: string | null
    logoUrl: string | null
    description: string | null
    status: EntityStatus
    createdDate: string
    lastModifiedDate: string
}

/** `ColorResDTO`. */
export type Color = {
    id: string
    code: string
    name: string
    hexCode: string | null
}

/** `SizeResDTO`. */
export type Size = {
    id: string
    code: string
    label: string
    sizeGroup: string
    sortOrder: number | null
}
