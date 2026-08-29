import { apiClient, search } from '@/lib/api-client'
import type { BaseListResStatus, SearchPagination } from '@/types/common'
import type {
    BankAccount,
    BankAccountSearchReq,
    CreateBankAccountReq,
    UpdateBankAccountReq,
} from '@/types/bank-account'

/**
 * Service domain **Tài khoản ngân hàng & VietQR** — API thật (8 endpoint `/bank-account/*`,
 * khảo sát `/v3/api-docs/api` **2026-08-21**).
 *
 * Phân quyền: **đọc + sinh QR là `[STAFF]`**, mọi thao tác ghi là `[SUPER_ADMIN]`.
 * Không có branch data-scope — tài khoản dùng chung toàn chuỗi.
 */
export const bankAccountApi = {
    /** `[STAFF] POST /bank-account/search`. */
    search(body: BankAccountSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<BankAccount>>('/bank-account/search', body, pagination, {
            signal,
        })
    },

    /**
     * `[STAFF] GET /bank-account/default` — tài khoản đang dùng để sinh QR.
     *
     * Chưa cấu hình ⇒ `error.bankAccount.noDefault` (HTTP 400) ⇒ **ẩn nút QR** và báo nhân viên
     * liên hệ SUPER_ADMIN.
     */
    getDefault(signal?: AbortSignal) {
        return apiClient.get<BankAccount>('/bank-account/default', { signal })
    },

    /** `[STAFF] GET /bank-account/{id}`. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<BankAccount>(`/bank-account/${id}`, { signal })
    },

    /**
     * `[STAFF] GET /bank-account/order/{orderId}/qr` — **ảnh VietQR (PNG) của một đơn**.
     *
     * ⚠️ **Trả PNG thuần, KHÔNG bọc `BaseResponse`** ⇒ bắt buộc dùng `getBlob()`;
     * `apiClient.get()` sẽ hỏng vì `unwrap` đọc `body.code` (cùng pattern `GET /sku/{id}/barcode`).
     *
     * Số tiền và nội dung chuyển khoản (`ELORIA` + mã đơn) đã **nhúng cứng trong ảnh** — FE
     * không tự dựng, cũng không sửa được. Đơn bị **branch data-scope**: STAFF/ADMIN chỉ lấy được
     * QR của đơn thuộc chi nhánh mình (`error.forbidden`).
     *
     * ⚠️ Caller **phải tự `URL.revokeObjectURL`** object URL tạo từ blob này.
     */
    orderQr(orderId: string, signal?: AbortSignal) {
        return apiClient.getBlob(`/bank-account/order/${orderId}/qr`, { signal })
    },

    /** `[SUPER_ADMIN] POST /bank-account`. */
    create(payload: CreateBankAccountReq) {
        return apiClient.post<BankAccount>('/bank-account', payload)
    },

    /** `[SUPER_ADMIN] PUT /bank-account/{id}` — **không đổi được cờ mặc định** ở đây. */
    update(id: string, payload: UpdateBankAccountReq) {
        return apiClient.put<BankAccount>(`/bank-account/${id}`, payload)
    },

    /** `[SUPER_ADMIN] POST /bank-account/{id}/set-default` — backend tự bỏ cờ tài khoản khác. */
    setDefault(id: string) {
        return apiClient.post<BankAccount>(`/bank-account/${id}/set-default`)
    },

    /** `[SUPER_ADMIN] POST /bank-account/update-status` — bật/tắt (0/1). Xoá dùng `remove()`. */
    updateStatus(id: string, status: number) {
        return apiClient.post<BankAccount>('/bank-account/update-status', { id, status })
    },

    /** `[SUPER_ADMIN] DELETE /bank-account/{id}` — xoá mềm (`status = -1`). */
    remove(id: string) {
        return apiClient.delete<void>(`/bank-account/${id}`)
    },
}
