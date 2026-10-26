import type { EGender, EntityStatus, SearchReq } from '@/types/common'

/**
 * Type domain sản phẩm — đồng bộ nguyên văn từ `/v3/api-docs/api` (khảo sát 2026-08-09)
 * và đối chiếu response thật của backend local.
 *
 * ⚠️ Khác hẳn bản dựng tạm ở Phase 6 (`ESkuLifecycle`, `totalStock`, `basePrice`,
 * `productCount`/`brandCount`/`collectionCount`… đều là tên tự đặt, **không tồn tại** ở backend).
 * Xem PLAN Phase 9 phần "Lệch so với mockup".
 */

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
    /** Nhập tay tự do (PO 2026-10-27, trước là enum cố định). */
    material: string | null
    /** Metadata tự do dạng chuỗi JSON — client tự định nghĩa cấu trúc. */
    metadata: string | null
    /** Nhóm size dùng để dựng ma trận SKU, ví dụ `Áo`, `Quần`. */
    sizeGroup: string | null
    images: string[]
    categories: CategoryRef[]
    /** SEO tuỳ chọn (backend P13) — `null`/rỗng ⇒ storefront tự sinh từ tên/mô tả. Tối đa 150. */
    metaTitle: string | null
    /** Tối đa 300. */
    metaDescription: string | null
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
    /** Chất liệu — nhập tay tự do, tối đa 255 ký tự (PO 2026-10-27, trước là enum fix cứng). */
    material?: string
    metadata?: string
    sizeGroup?: string
    /** Thay thế **toàn bộ** danh sách danh mục cũ. */
    categoryIds?: string[]
    /**
     * SEO (tối đa 150). Khi sửa: **bỏ field ⇒ giữ nguyên; `""` ⇒ xoá** (đo thật 2026-10-11).
     * ⚠️ Backend **không trim/chuẩn hoá** ở sản phẩm: `""`/`"  "` được lưu nguyên chuỗi, không về `null`
     * như danh mục (BE32) ⇒ form phải tự `trim`. `ogImage` đã bị gỡ (P13.3) — gửi ⇒ HTTP 400.
     */
    metaTitle?: string
    /** SEO (tối đa 300) — cùng ngữ nghĩa với `metaTitle`. */
    metaDescription?: string
}

/**
 * `UpdateProductReqDTO` — giống create nhưng **không có `code`**.
 * `material` giờ là text tự do: kế thừa thẳng từ `CreateProductReq` (vắng = giữ nguyên, `""` = xoá —
 * cùng quy ước `metadata`/`sizeGroup`, khác hẳn `gender` vẫn là enum tuỳ chọn dùng `JsonNullable`).
 */
export type UpdateProductReq = Omit<CreateProductReq, 'code' | 'gender'> & {
    /** Vắng = giữ nguyên · `null` = xoá · giá trị = ghi (backend `JsonNullable`). */
    gender?: EGender | null
}

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
    status: EntityStatus
    parentId: string | null
    parentName: string | null
    /** Mô tả hiển thị dưới tên danh mục trên web khách (≤500). Khác `metaDescription` (SEO). */
    description: string | null
    /** SEO tuỳ chọn (tối đa 150) — `null` ⇒ storefront tự sinh từ tên/mô tả. */
    metaTitle: string | null
    /** SEO tuỳ chọn (tối đa 300). */
    metaDescription: string | null
    /** Ảnh ô danh mục ở lưới "Shop by category" Trang chủ — tỉ lệ 4:5. */
    imageLink1: string | null
    /** Ảnh hiện khi khách rê chuột lên ô danh mục; trống ⇒ giữ nguyên `imageLink1`. */
    imageLink2: string | null
    /** 5 ô cover slideshow đầu trang Sản phẩm — có thể thủng lỗ chỗ, backend tự bỏ ô trống. */
    coverLink1: string | null
    coverLink2: string | null
    coverLink3: string | null
    coverLink4: string | null
    coverLink5: string | null
    /** Toàn bảng chỉ 0 hoặc 1 dòng `true`. */
    isDefault: boolean | null
    createdDate: string
    lastModifiedDate: string
}

/** `CategorySearchReqDTO` — `parentId` lọc theo danh mục cha **trực tiếp**; `isDefault` null ⇒ không lọc. */
export type CategorySearchReq = SearchReq & {
    parentId?: string
    isDefault?: boolean
}

/** Tên slot multipart của `POST /category/{id}/images` · `DELETE /category/{id}/images/{slot}` (BE31). */
export type CategoryImageSlot = 'image1' | 'image2' | 'cover1' | 'cover2' | 'cover3' | 'cover4' | 'cover5'

/**
 * `CreateCategoryReqDTO` / `UpdateCategoryReqDTO` — hai DTO có **cùng bộ field**
 * (khác `product`: `UpdateProductReqDTO` bỏ `code`, còn danh mục vẫn sửa được `code`).
 */
export type CategoryPayload = {
    code: string
    name: string
    /**
     * ⚠️ **Full-update**: bỏ field (hoặc `null`) ⇒ backend hiểu là "chuyển thành danh mục gốc" và set
     * `level = 0` (khác các field nội dung bên dưới). Form sửa **luôn** phải gửi cha hiện tại.
     * Không được chọn chính nó hoặc con cháu của nó.
     */
    parentId?: string
    sortOrder?: number
    /**
     * Mô tả: bỏ hẳn ⇒ giữ nguyên, `""` ⇒ xoá (backend chuẩn hoá về `null` — BE32).
     * ⚠️ Ảnh (`imageLink1/2`, `coverLink1..5`) **không còn** trong payload (P13.3): gửi ⇒ HTTP 400
     * `error.input.invalid`. Ảnh chỉ ghi qua `categoryApi.uploadImages` / `deleteImage`.
     */
    description?: string
    /**
     * SEO: bỏ field ⇒ giữ nguyên, `""`/khoảng trắng ⇒ xoá (backend `trim` rồi về `null` — đo thật
     * 2026-10-11). Tối đa 150 / 300 ký tự.
     */
    metaTitle?: string
    metaDescription?: string
    /** Bật cho B khi A đang giữ ⇒ chỉ cần 1 request, server tự gỡ A. Bỏ field ⇒ giữ nguyên. */
    isDefault?: boolean
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

/** `CreateBrandReqDTO` = `UpdateBrandReqDTO` (cùng bộ field). `code` tối đa 50, `name` 150, `address` 255, `description` 1000 (PO 2026-10-27, trước là 500). ⚠️ Không còn `logoUrl` (P13.3 — gửi ⇒ 400): logo qua `brandApi.uploadLogo`. */
export type BrandPayload = {
    code: string
    name: string
    address?: string
    description?: string
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
