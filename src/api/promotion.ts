import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    CouponExportQuery,
    CouponGenerateReq,
    CreatePromotionReq,
    EPromotionStatus,
    Promotion,
    PromotionPreviewReq,
    PromotionResult,
    PromotionSearchReq,
    UpdatePromotionReq,
} from '@/types/promotion'

/**
 * Service khuyến mại & coupon — **API thật** (backend Phase 9, khảo sát 2026-09-07).
 * Nhánh mock của Phase 6 đã bị gỡ: `src/mocks/promotion.ts` hết vai trò, và các type mock
 * (`PromoCode`, `stackable`, `FLASH_SALE`…) **không tồn tại ở backend**.
 *
 * Phân quyền: **đọc `[STAFF]`, ghi `[ADMIN]`** (khác nhóm sản phẩm là `[SUPER_ADMIN]`).
 * Branch scope: non-SUPER_ADMIN đọc được KM toàn chuỗi + KM chi nhánh mình;
 * **ADMIN chỉ tạo/sửa cho chi nhánh mình** (truyền `branchId` khác ⇒ `error.promotion.branchForbidden`).
 */
export const promotionApi = {
    /** `[STAFF] POST /promotion/search` — lọc vòng đời bằng `promotionStatus`, không phải `status`. */
    search(body: PromotionSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<Promotion>>('/promotion/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /promotion/{id}`. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<Promotion>(`/promotion/${id}`, { signal })
    },

    /** `[ADMIN] POST /promotion` — backend **luôn tạo ở `DRAFT`**, phải `updateStatus` mới chạy. */
    create(payload: CreatePromotionReq) {
        return apiClient.post<Promotion>('/promotion', payload)
    },

    /** `[ADMIN] PUT /promotion/{id}` — cùng bộ field với create (sửa được cả `code`). */
    update(id: string, payload: UpdatePromotionReq) {
        return apiClient.put<Promotion>(`/promotion/${id}`, payload)
    },

    /**
     * `[ADMIN] POST /promotion/{id}/update-status` — chuyển vòng đời KM.
     *
     * ⚠️ **Trả `data: null`** dù api-docs khai `PromotionResDTO` (đo thật 2026-09-07). Trạng thái
     * **có lưu đúng**, nhưng caller **bắt buộc nạp lại danh sách/chi tiết** thay vì dùng giá trị
     * trả về. Vì vậy kiểu trả về khai là `null`, không phải `Promotion` — xem PLAN **BE18**.
     */
    updateStatus(id: string, status: EPromotionStatus) {
        return apiClient.post<null>(`/promotion/${id}/update-status`, { status })
    },

    /**
     * `[STAFF] POST /promotion/preview` — thử áp KM cho giỏ, **không tiêu thụ quota**.
     *
     * ⚠️ Mã coupon sai vẫn trả `200` với `applied: false` (không phân biệt được với "không nhập
     * mã") ⇒ caller phải tự báo "mã không hợp lệ". Xem `types/promotion.ts#PromotionResult`.
     */
    preview(body: PromotionPreviewReq, signal?: AbortSignal) {
        return apiClient.post<PromotionResult>('/promotion/preview', body, { signal })
    },
}

export const couponApi = {
    /**
     * `[ADMIN] POST /coupon/generate` — sinh hàng loạt, trả **mảng mã** đã sinh.
     * Mỗi mã là một dòng `promotion` riêng, sinh ra đã ở `RUNNING` (khác KM thường là `DRAFT`).
     */
    generate(payload: CouponGenerateReq) {
        return apiClient.post<BaseListRes<string>>('/coupon/generate', payload)
    },

    /**
     * `[ADMIN] GET /coupon/export` — **trả `text/csv` thuần, KHÔNG bọc `BaseResponse`**
     * ⇒ bắt buộc `getBlob()`; `get()` sẽ hỏng vì `unwrap` đọc `body.code`
     * (cùng kiểu với `sku/{id}/barcode` và `bank-account/order/{id}/qr`).
     *
     * Caller nhận `Blob` và tự lo tải file + `URL.revokeObjectURL`.
     */
    exportCsv(query: CouponExportQuery, signal?: AbortSignal) {
        return apiClient.getBlob('/coupon/export', { params: query, signal })
    },
}
