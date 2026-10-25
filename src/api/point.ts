import { apiClient, search } from '@/lib/api-client'
import type { SearchPagination } from '@/types/common'
import type {
    PointRules,
    PointTransactionList,
    PointTransactionSearchReq,
} from '@/types/point'

/** Điểm thưởng (backend Phase 16). */
export const pointApi = {
    /** `[STAFF] GET /points/rules`. */
    rules(signal?: AbortSignal) {
        return apiClient.get<PointRules>('/points/rules', { signal })
    },

    /**
     * `[STAFF] POST /customer/{customerId}/points/search` — lịch sử điểm. `sort` chỉ nhận
     * `createdDate` / `points` / `type` (khác ⇒ backend dùng mặc định mới nhất trước).
     */
    searchByCustomer(
        customerId: string,
        body: PointTransactionSearchReq,
        pagination?: SearchPagination,
        signal?: AbortSignal,
    ) {
        return search<PointTransactionList>(
            `/customer/${customerId}/points/search`,
            body,
            pagination,
            { signal },
        )
    },
}
