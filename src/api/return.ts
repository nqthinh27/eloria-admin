import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    CreateExchangeReq,
    CreateReturnReq,
    ReceiveStockReq,
    RefundReturnReq,
    ReturnRequest,
    ReturnSearchReq,
} from '@/types/return'

/**
 * Service Đổi / Trả / Hoàn tiền — **API thật** (backend Phase 11, kiểm thử 2026-09-12).
 *
 * Phân quyền: **đọc + tạo là `[STAFF]`; duyệt · từ chối · quyết toán · nhận kho là `[ADMIN]`**.
 * Branch scope: STAFF/ADMIN chỉ chi nhánh mình, SUPER_ADMIN toàn chuỗi (+ lọc `branchId`).
 * ⚠️ Khác màn Ca làm việc: **STAFF thấy mọi phiếu của chi nhánh**, không chỉ phiếu mình tạo
 * (đo thật: STAFF và ADMIN cùng trả về 4/4 phiếu).
 *
 * ⚠️ **Backend KHÔNG chặn tự duyệt** — ADMIN tạo phiếu rồi tự duyệt được (đo thật), khác hẳn
 * phiếu kho Phase 10 vốn trả `error.warehouseLedger.cannotApproveOwn`. Đừng khoá nút ở FE.
 */
export const returnApi = {
    /**
     * `[STAFF] POST /return/search`.
     *
     * ⚠️ Trả **`lines: null`** ở mọi dòng (cố ý, tránh N+1) ⇒ bảng danh sách không hiển thị được
     * hàng hoá; muốn xem hàng phải `getById`.
     */
    search(body: ReturnSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<ReturnRequest>>('/return/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /return/{id}` — bản duy nhất có `lines`. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<ReturnRequest>(`/return/${id}`, { signal })
    },

    /** `[STAFF] POST /return` — tạo yêu cầu **trả hàng** (có hoặc không hoá đơn) → `PENDING_APPROVAL`. */
    create(payload: CreateReturnReq) {
        return apiClient.post<ReturnRequest>('/return', payload)
    },

    /**
     * `[STAFF] POST /return/exchange` — đổi **ngang giá** (size/màu).
     * ⚠️ Lệch tiền dù chỉ 1 đồng ⇒ `error.return.exchangePriceDiff`, phải chuyển sang `exchangeDiff`.
     */
    exchange(payload: CreateExchangeReq) {
        return apiClient.post<ReturnRequest>('/return/exchange', payload)
    },

    /** `[STAFF] POST /return/exchange-diff` — đổi **khác giá**, backend tự tính thu thêm/trả lại. */
    exchangeDiff(payload: CreateExchangeReq) {
        return apiClient.post<ReturnRequest>('/return/exchange-diff', payload)
    },

    /**
     * `[ADMIN] POST /return/{id}/approve` — **không có body**.
     * ⚠️ Phiếu đổi: đây là lúc **trừ tồn** hàng giao mới (hết hàng ⇒ `error.stock.insufficient`).
     */
    approve(id: string) {
        return apiClient.post<ReturnRequest>(`/return/${id}/approve`, {})
    },

    /**
     * `[ADMIN] POST /return/{id}/reject` — chỉ được khi còn `PENDING_APPROVAL`.
     * ⚠️ Backend ghi lý do vào **`description`** (dạng `"Từ chối: …"`), **không** vào `reason`
     * (`reason` giữ nguyên lý do khách trả hàng) — màn chi tiết phải hiện đúng chỗ.
     */
    reject(id: string, reason: string) {
        return apiClient.post<ReturnRequest>(`/return/${id}/reject`, { reason })
    },

    /**
     * `[ADMIN] POST /return/{id}/refund` — quyết toán tiền. **Số tiền do backend quyết**,
     * request chỉ chọn hình thức (khác hẳn `POST /order/{id}/payment` cũng bỏ qua `amount`).
     *
     * ⚠️ Phiếu **đổi ngang giá** không phát sinh tiền ⇒ gọi vào sẽ trả `error.return.nothingToSettle`;
     * FE phải tự ẩn nút thay vì để bấm rồi mới báo lỗi.
     * ⚠️ Tự gắn `shiftId` = ca đang mở của người quyết toán ⇒ vào thẳng `expectedCash` khi chốt ca.
     */
    refund(id: string, payload: RefundReturnReq) {
        return apiClient.post<ReturnRequest>(`/return/${id}/refund`, payload)
    },

    /**
     * `[ADMIN] POST /return/{id}/receive-stock` — nhận hàng trả vào kho.
     *
     * Mọi dòng `RETURNED` phải có tình trạng: hoặc liệt kê trong `lines`, hoặc dựa vào
     * `defaultCondition`; thiếu ⇒ `error.return.conditionRequired`.
     */
    receiveStock(id: string, payload: ReceiveStockReq) {
        return apiClient.post<ReturnRequest>(`/return/${id}/receive-stock`, payload)
    },
}
