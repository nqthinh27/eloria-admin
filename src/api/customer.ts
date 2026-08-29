import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    CreateCustomerReq,
    Customer,
    CustomerDuplicate,
    CustomerSearchReq,
    UpdateCustomerReq,
} from '@/types/customer'

/**
 * Service khách hàng — **API thật** (backend bổ sung endpoint từ 2026-08-08, xác nhận lại
 * 2026-08-09). Không còn nhánh mock: `src/mocks/customer.ts` chỉ phục vụ Phase 6 và đã hết vai trò.
 *
 * ⚠️ **Phase 3b (2026-08-28) — khách hàng là TOÀN CỤC.** Backend đã **bỏ hẳn branch data-scope**
 * cho khách: mọi STAFF+ xem/sửa/gắn-vào-đơn được **mọi khách toàn chuỗi**, `branchId` chỉ còn là
 * filter tuỳ chọn ứng với *"chi nhánh đăng ký"* (có thể `null`). Ghi chú cũ ("STAFF/ADMIN chỉ thấy
 * khách chi nhánh mình; chỉ SUPER_ADMIN lọc được theo `branchId`") **không còn đúng**.
 * Xem CLAUDE.md mục "Phase 3b".
 */
export const customerApi = {
    /**
     * `[STAFF] POST /customer/search` — `page`/`size`/`sort` ở query param, `body` chỉ chứa filter.
     * Trả `BaseListRes` (chỉ `total` + `data[]`) — **không** có `activeTotal`/`inactiveTotal`
     * như `staff/search`, `branch/search`.
     */
    search(body: CustomerSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<Customer>>('/customer/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /customer/{id}`. */
    getById(id: string) {
        return apiClient.get<Customer>(`/customer/${id}`)
    },

    /**
     * `[STAFF] POST /customer` — tạo khách tại quầy, chỉ cần tên + SĐT.
     * `username`/`password` do backend tự sinh; `email` bỏ trống ⇒ `{phoneNumber}@example.com`.
     */
    create(payload: CreateCustomerReq) {
        return apiClient.post<Customer>('/customer', payload)
    },

    /** `[ADMIN] PUT /customer/{id}` — không đổi được SĐT/chi nhánh/trạng thái qua đây. */
    update(id: string, payload: UpdateCustomerReq) {
        return apiClient.put<Customer>(`/customer/${id}`, payload)
    },

    /**
     * `[ADMIN] GET /customer/duplicates?phone=` — cảnh báo trùng hồ sơ trước khi tạo mới.
     *
     * `skipErrorToast` vì đây là tra cứu ngầm khi người dùng nhập SĐT: STAFF gọi sẽ nhận 403
     * (endpoint là `[ADMIN]`) và đó là đường đi bình thường, không phải lỗi cần toast.
     */
    checkDuplicate(phone: string, signal?: AbortSignal) {
        return apiClient.get<CustomerDuplicate>('/customer/duplicates', {
            params: { phone },
            skipErrorToast: true,
            signal,
        })
    },
}
