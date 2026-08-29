import { apiClient, search } from '@/lib/api-client'
import type { AuditLog, AuditLogSearchReq } from '@/types/audit-log'
import type { BaseListRes, SearchPagination } from '@/types/common'

/** Service audit log — API thật (không mock). Không có `activeTotal`/`inactiveTotal`. */
export const auditLogApi = {
    /** `[ADMIN] POST /audit-log/search` — `page`/`size`/`sort` ở query param, `body` chỉ chứa filter. */
    search(body: AuditLogSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<AuditLog>>('/audit-log/search', body, pagination, { signal })
    },

    /** `[ADMIN] GET /audit-log/{id}`. */
    getById(id: number) {
        return apiClient.get<AuditLog>(`/audit-log/${id}`)
    },
}
