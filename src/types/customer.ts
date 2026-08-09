import type { EGender, EntityStatus, SearchReq } from '@/types/common'

/**
 * `CustomerResDTO` — đồng bộ nguyên văn từ `/v3/api-docs/api` (khảo sát 2026-08-09) và đối chiếu
 * response thật của backend local.
 *
 * ⚠️ Khác hẳn bản dựng tạm ở Phase 6: backend **không** trả `code`/`tier`/`orderCount`/
 * `totalSpent`/`lastPurchaseDate` (4 cột chính của `10-khach-hang.png`). Hồ sơ khách map từ
 * `SysUser`, và backend **chưa có entity đơn hàng nào** ⇒ không có nguồn dữ liệu để tính các
 * chỉ số đó. Xem PLAN Phase 8 phần "Lệch so với mockup".
 *
 * `activated` có trong DTO phía Java nhưng **không xuất hiện trong JSON thật** (bị bỏ khi
 * serialize) ⇒ không khai ở đây để tránh field ma.
 */
export type Customer = {
    id: string
    fullName: string
    phoneNumber: string
    email: string | null
    dob: string | null
    gender: EGender | null
    branchId: string | null
    /** Điểm tích luỹ, backend mặc định 0. */
    membershipPoint: number | null
    status: EntityStatus
    createdDate: string
    /** Backend enrich thêm ở service, không thuộc mapping cơ bản. */
    branchName: string | null
}

/**
 * `CustomerSearchReqDTO` — chỉ có `keyword`/`status`/`branchId`.
 * `branchId` chỉ có tác dụng với SUPER_ADMIN (STAFF/ADMIN bị backend ép về chi nhánh của mình).
 */
export type CustomerSearchReq = SearchReq & {
    branchId?: string
}

/**
 * `CreateCustomerReqDTO` — bắt buộc `fullName` + `phoneNumber`.
 * `email` bỏ trống ⇒ backend tự sinh `{phoneNumber}@example.com`.
 * `branchId`: STAFF/ADMIN luôn bị ép về chi nhánh của mình; **SUPER_ADMIN bắt buộc truyền**
 * (thiếu ⇒ lỗi `error.branch.required`).
 */
export type CreateCustomerReq = {
    fullName: string
    phoneNumber: string
    email?: string
    dob?: string
    gender?: EGender
    branchId?: string
}

/**
 * `UpdateCustomerReqDTO` — **không có `phoneNumber`/`branchId`/`status`**
 * (mapper backend `@Mapping(ignore)` các field này), nên form sửa phải khoá chúng.
 */
export type UpdateCustomerReq = {
    fullName: string
    email?: string
    dob?: string
    gender?: EGender
}

/**
 * `CustomerDuplicateResDTO` — kết quả tra trùng theo SĐT (`[ADMIN]`).
 * Khách ngoài chi nhánh chỉ báo `exists: true, viewable: false, customer: null`
 * (không lộ hồ sơ) — UI phải xử lý riêng trường hợp này.
 */
export type CustomerDuplicate = {
    exists: boolean
    viewable: boolean
    customer: Customer | null
}
