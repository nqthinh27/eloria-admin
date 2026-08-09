import { apiClient, search } from '@/lib/api-client'
import type { Branch, BranchPayload, BranchSearchReq } from '@/types/branch'
import type { BaseListResStatus, EntityStatus, SearchPagination } from '@/types/common'

/**
 * Service chi nhánh — API thật (không mock).
 *
 * Backend tự giới hạn phạm vi: STAFF/ADMIN chỉ thấy chi nhánh được gán,
 * SUPER_ADMIN thấy toàn chuỗi. FE không cần lọc lại.
 */
export const branchApi = {
    /** `[STAFF] POST /branch/search` — `page`/`size`/`sort` ở query param, `body` chỉ chứa filter. */
    search(body: BranchSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Branch>>('/branch/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /branch/{id}`. */
    getById(id: string) {
        return apiClient.get<Branch>(`/branch/${id}`)
    },

    /** `[SUPER_ADMIN] POST /branch`. */
    create(payload: BranchPayload) {
        return apiClient.post<Branch>('/branch', payload)
    },

    /** `[ADMIN] PUT /branch/{id}` — ADMIN chỉ sửa được chi nhánh của mình. */
    update(id: string, payload: BranchPayload) {
        return apiClient.put<Branch>(`/branch/${id}`, payload)
    },

    /** `[SUPER_ADMIN] POST /branch/update-status`. */
    updateStatus(id: string, status: EntityStatus) {
        return apiClient.post<null>('/branch/update-status', { id, status })
    },

    /** `[SUPER_ADMIN] DELETE /branch/{id}` — xoá mềm. */
    remove(id: string) {
        return apiClient.delete<null>(`/branch/${id}`)
    },
}
