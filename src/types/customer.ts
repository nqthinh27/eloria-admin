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
 * **Cập nhật 2026-08-11:** `activated` **đã xuất hiện trong JSON thật** — ghi chú cũ ("không
 * xuất hiện, đừng khai") **không còn đúng**, đã khai lại bên dưới.
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
    /**
     * ⚠️ **Khác `status`** — đừng gộp hai thứ này:
     * `status` = admin khoá/mở bản ghi · `activated` = khách đã tự kích hoạt tài khoản chưa.
     * Khách tạo tại quầy luôn `activated: false` ⇒ **chưa đăng nhập storefront được**
     * cho tới khi tự kích hoạt (luồng kích hoạt làm ở storefront, không thuộc web quản trị).
     */
    activated: boolean
    createdDate: string
    /** Backend enrich thêm ở service, không thuộc mapping cơ bản. */
    branchName: string | null
}

/**
 * `CustomerSearchReqDTO` — chỉ có `keyword`/`status`/`branchId`.
 *
 * ⚠️ **Phase 3b (2026-08-28)**: `branchId` nay là **filter tuỳ chọn cho MỌI role**. Ghi chú cũ
 * ("chỉ có tác dụng với SUPER_ADMIN, STAFF/ADMIN bị ép về chi nhánh mình") **không còn đúng** —
 * backend đã bỏ hẳn branch data-scope cho khách hàng. Xem CLAUDE.md mục "Phase 3b".
 */
export type CustomerSearchReq = SearchReq & {
    /** Lọc theo **chi nhánh đăng ký** của khách. Tuỳ chọn, dùng được với mọi role. */
    branchId?: string
}

/**
 * `CreateCustomerReqDTO` — bắt buộc `fullName` + `phoneNumber`.
 * `email` bỏ trống ⇒ backend tự sinh `{phoneNumber}@example.com`.
 *
 * ⚠️ **Phase 3b (2026-08-28)**: `branchId` **tuỳ chọn với mọi role** — bỏ trống thì backend mặc
 * định lấy chi nhánh của người tạo, và **được phép `null`** (SUPER_ADMIN chưa gán chi nhánh).
 * Ghi chú cũ ("SUPER_ADMIN bắt buộc truyền, thiếu ⇒ `error.branch.required`") **không còn đúng**.
 */
export type CreateCustomerReq = {
    fullName: string
    phoneNumber: string
    email?: string
    dob?: string
    gender?: EGender
    /** **Chi nhánh đăng ký** — chỉ để đánh dấu khách được tạo ở đâu, không ràng buộc quyền xem. */
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
 *
 * ⚠️ **Phase 3b (2026-08-28)**: `viewable` **luôn `true` khi `exists`** — khách là toàn cục nên
 * không còn chuyện "trùng SĐT nhưng không được xem hồ sơ". Backend giữ field chỉ để tương thích
 * client cũ ⇒ **đừng dựng nhánh UI cho `viewable === false`**, nó không bao giờ xảy ra nữa.
 */
export type CustomerDuplicate = {
    exists: boolean
    /** @deprecated Luôn `true` khi `exists` kể từ Phase 3b — giữ để khớp DTO backend. */
    viewable: boolean
    customer: Customer | null
}
