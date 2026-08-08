import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockReturns } from '@/mocks/return'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    ApproveReturnPayload,
    CreateReturnPayload,
    ReturnRequest,
    ReturnSearchReq,
} from '@/types/return'

/** Service Đổi/Trả — CHƯA có API thật (PLAN Phase 6), theo `06-doi-tra.png`. */
export const returnApi = {
    async search(
        body: ReturnSearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<ReturnRequest>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockReturns,
                body,
                (item, keyword) =>
                    item.code.toLowerCase().includes(keyword) ||
                    item.customerName.toLowerCase().includes(keyword) ||
                    item.originalOrderCode.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<ReturnRequest>>('/return/search', body, pagination)
    },

    async create(payload: CreateReturnPayload): Promise<ReturnRequest> {
        if (useMock) {
            await mockDelay()
            const created: ReturnRequest = {
                id: `ret-mock-${Date.now()}`,
                code: `TH${String(mockReturns.length + 1).padStart(3, '0')}`,
                originalOrderId: payload.originalOrderId,
                originalOrderCode: payload.originalOrderId,
                customerId: null,
                customerName: '',
                productSummary: '',
                reason: payload.reason,
                type: payload.type,
                refundMethod: payload.refundMethod ?? null,
                refundAmount: 0,
                status: 'PENDING_APPROVAL',
                createdByStaffId: 'mock-user',
                createdByStaffName: 'mock-user',
                approvedByStaffId: null,
                createdDate: new Date().toISOString(),
            }
            mockReturns.unshift(created)
            return created
        }
        return apiClient.post<ReturnRequest>('/return', payload)
    },

    /** Duyệt/từ chối — chỉ ADMIN+ (PLAN Phase 13 "STAFF tạo — chờ ADMIN duyệt"). */
    async approve(id: string, payload: ApproveReturnPayload): Promise<ReturnRequest> {
        if (useMock) {
            await mockDelay()
            const found = mockReturns.find((r) => r.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy phiếu đổi/trả ${id}`)
            found.status = payload.approved ? 'APPROVED' : 'REJECTED'
            return found
        }
        return apiClient.post<ReturnRequest>(`/return/${id}/approve`, payload)
    },
}
