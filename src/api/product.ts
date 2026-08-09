import { apiClient, search } from '@/lib/api-client'
import type {
    BaseListRes,
    BaseListResStatus,
    EntityStatus,
    SearchPagination,
} from '@/types/common'
import type {
    Brand,
    Category,
    CategoryPayload,
    CategorySearchReq,
    Color,
    CreateProductReq,
    GenerateSkuReq,
    Product,
    ProductSearchReq,
    Size,
    Sku,
    SkuSearchReq,
    UpdateProductReq,
} from '@/types/product'

/**
 * Service domain sản phẩm — **API thật** (backend bổ sung từ 2026-08-08, khảo sát lại 2026-08-09).
 * Không còn nhánh mock: `src/mocks/product.ts` chỉ phục vụ Phase 6 và đã hết vai trò.
 *
 * Phân quyền: **đọc `[STAFF]`, ghi `[SUPER_ADMIN]`** cho toàn bộ nhóm này (khác staff/customer
 * là `[ADMIN]`) — ADMIN gọi API ghi cũng nhận 403, đã kiểm chứng bằng tài khoản thật.
 */
export const productApi = {
    /** `[STAFF] POST /product/search` — ⚠️ `categories` trong kết quả luôn rỗng, xem `types/product.ts`. */
    search(body: ProductSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Product>>('/product/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /product/{id}` — bản duy nhất có `categories` được populate. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<Product>(`/product/${id}`, { signal })
    },

    /** `[SUPER_ADMIN] POST /product`. */
    create(payload: CreateProductReq) {
        return apiClient.post<Product>('/product', payload)
    },

    /** `[SUPER_ADMIN] PUT /product/{id}` — không đổi được `code`. */
    update(id: string, payload: UpdateProductReq) {
        return apiClient.put<Product>(`/product/${id}`, payload)
    },

    /**
     * `[SUPER_ADMIN] POST /product/{id}/generate-sku` — sinh ma trận màu × size.
     * Idempotent: ô đã có SKU thì bỏ qua, trả về **toàn bộ** SKU hiện có của sản phẩm.
     */
    generateSku(id: string, payload: GenerateSkuReq) {
        return apiClient.post<Sku[]>(`/product/${id}/generate-sku`, payload)
    },

    /**
     * `[SUPER_ADMIN] POST /product/{id}/images` — multipart, thay **toàn bộ** gallery
     * (tối đa 10 ảnh) theo đúng thứ tự file truyền lên.
     */
    uploadImages(id: string, files: File[]) {
        const form = new FormData()
        files.forEach((file) => form.append('files', file))
        return apiClient.post<Product>(`/product/${id}/images`, form)
    },
}

export const skuApi = {
    /** `[STAFF] POST /sku/search` — lọc theo `productId` để lấy bảng SKU của 1 sản phẩm. */
    search(body: SkuSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Sku>>('/sku/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /sku/{id}`. */
    getById(id: string) {
        return apiClient.get<Sku>(`/sku/${id}`)
    },

    /** `[STAFF] GET /sku/by-ean/{ean}` — quét barcode. */
    getByEan(ean: string) {
        return apiClient.get<Sku>(`/sku/by-ean/${ean}`)
    },

    /**
     * `[STAFF] GET /sku/{id}/barcode` — ảnh mã vạch **EAN-13 dạng PNG** để hiển thị/in tem.
     * Trả `Blob`; caller tự tạo object URL và **phải** `URL.revokeObjectURL` khi đóng để không rò bộ nhớ.
     */
    getBarcode(id: string, signal?: AbortSignal) {
        return apiClient.getBlob(`/sku/${id}/barcode`, { signal })
    },

    /** `[SUPER_ADMIN] DELETE /sku/{id}` — xoá mềm (backend set `status = -1`). */
    remove(id: string) {
        return apiClient.delete<null>(`/sku/${id}`)
    },

    /** `[SUPER_ADMIN] POST /sku/update-status` — chỉ nhận 0/1, xem ghi chú `Sku` trong types. */
    updateStatus(id: string, status: EntityStatus) {
        return apiClient.post<null>('/sku/update-status', { id, status })
    },
}

export const categoryApi = {
    /** `[STAFF] POST /category/search`. */
    search(body: CategorySearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Category>>('/category/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /category/{id}`. */
    getById(id: string) {
        return apiClient.get<Category>(`/category/${id}`)
    },

    /** `[SUPER_ADMIN] POST /category`. */
    create(payload: CategoryPayload) {
        return apiClient.post<Category>('/category', payload)
    },

    /** `[SUPER_ADMIN] PUT /category/{id}`. */
    update(id: string, payload: CategoryPayload) {
        return apiClient.put<Category>(`/category/${id}`, payload)
    },

    /** `[SUPER_ADMIN] POST /category/update-status`. */
    updateStatus(id: string, status: EntityStatus) {
        return apiClient.post<null>('/category/update-status', { id, status })
    },

    /** `[SUPER_ADMIN] DELETE /category/{id}` — xoá mềm, chặn nếu còn danh mục con hoặc sản phẩm gán vào. */
    remove(id: string) {
        return apiClient.delete<null>(`/category/${id}`)
    },
}

/**
 * Danh mục nền dùng để dựng form sản phẩm (chọn thương hiệu, sinh ma trận SKU).
 * Chưa có màn CRUD riêng cho brand/color/size — ngoài phạm vi Phase 9 (mockup không vẽ, menu không có mục).
 */
export const brandApi = {
    /** `[STAFF] POST /brand/search`. */
    search(body: { keyword?: string; status?: EntityStatus }, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Brand>>('/brand/search', body, pagination, { signal })
    },
}

export const colorApi = {
    /** `[STAFF] POST /color/search` — `BaseListRes` (không có `activeTotal`). */
    search(body: { keyword?: string; status?: EntityStatus }, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<Color>>('/color/search', body, pagination, { signal })
    },
}

export const sizeApi = {
    /** `[STAFF] POST /size/search` — `sizeGroup` lọc theo nhóm size (`Áo`, `Quần`…). */
    search(
        body: { keyword?: string; status?: EntityStatus; sizeGroup?: string },
        pagination?: SearchPagination,
        signal?: AbortSignal,
    ) {
        return search<BaseListRes<Size>>('/size/search', body, pagination, { signal })
    },
}
