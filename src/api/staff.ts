import { apiClient, search } from '@/lib/api-client'
import type { BaseListResStatus, EntityStatus, SearchPagination } from '@/types/common'
import type {
    AssignRoleReq,
    CreateStaffReq,
    ResetStaffPasswordRes,
    Staff,
    StaffSearchReq,
    UpdateStaffReq,
} from '@/types/staff'

/**
 * Service nhân viên — API thật (không mock).
 *
 * Backend tự giới hạn phạm vi: ADMIN chỉ thấy/tạo nhân viên chi nhánh mình và chỉ gán được
 * role STAFF; điều chuyển chi nhánh chỉ SUPER_ADMIN. FE vẫn phải chặn ở UI (CONVENTIONS mục 6.4)
 * nhưng không coi đó là lớp bảo mật duy nhất.
 */
export const staffApi = {
    /** `[ADMIN] POST /staff/search` — `page`/`size`/`sort` ở query param, `body` chỉ chứa filter. */
    search(body: StaffSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Staff>>('/staff/search', body, pagination, { signal })
    },

    /** `[ADMIN] GET /staff/{id}`. */
    getById(id: string) {
        return apiClient.get<Staff>(`/staff/${id}`)
    },

    /** `[ADMIN] POST /staff`. */
    create(payload: CreateStaffReq) {
        return apiClient.post<Staff>('/staff', payload)
    },

    /** `[ADMIN] PUT /staff/{id}` — không đổi được `username`/`password`/`role` qua đây. */
    update(id: string, payload: UpdateStaffReq) {
        return apiClient.put<Staff>(`/staff/${id}`, payload)
    },

    /** `[ADMIN] POST /staff/assign-role` — đổi role phải qua API riêng này. */
    assignRole(payload: AssignRoleReq) {
        return apiClient.post<null>('/staff/assign-role', payload)
    },

    /** `[ADMIN] POST /staff/update-status` — khoá/mở tài khoản. */
    updateStatus(id: string, status: EntityStatus) {
        return apiClient.post<null>('/staff/update-status', { id, status })
    },

    /**
     * `[ADMIN] POST /staff/{id}/reset-password`.
     * `temporaryPassword` trong response chỉ hiển thị được đúng một lần — không cache/refetch lại.
     */
    resetPassword(id: string) {
        return apiClient.post<ResetStaffPasswordRes>(`/staff/${id}/reset-password`)
    },

    /** `[ADMIN] DELETE /staff/{id}` — xoá mềm. */
    remove(id: string) {
        return apiClient.delete<null>(`/staff/${id}`)
    },
}
