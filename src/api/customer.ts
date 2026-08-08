import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockCustomers } from '@/mocks/customer'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { Customer, CustomerPayload, CustomerSearchReq } from '@/types/customer'
import type { BaseListRes, SearchPagination } from '@/types/common'

/**
 * Service khách hàng — CHƯA có API thật (PLAN Phase 6), đọc từ mock khi `VITE_USE_MOCK=true`.
 * Chữ ký giống hệt service dùng API thật (`branchApi`…) để khi backend bổ sung endpoint,
 * chỉ cần đổi phần thân hàm, không đụng tới màn hình gọi nó.
 */
export const customerApi = {
    async search(
        body: CustomerSearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<Customer>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockCustomers,
                body,
                (item, keyword) =>
                    item.fullName.toLowerCase().includes(keyword) || item.phoneNumber.includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<Customer>>('/customer/search', body, pagination)
    },

    async getById(id: string): Promise<Customer> {
        if (useMock) {
            await mockDelay()
            const found = mockCustomers.find((c) => c.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy khách hàng ${id}`)
            return found
        }
        return apiClient.get<Customer>(`/customer/${id}`)
    },

    async create(payload: CustomerPayload): Promise<Customer> {
        if (useMock) {
            await mockDelay()
            const created: Customer = {
                id: `cus-mock-${Date.now()}`,
                code: `KH${String(mockCustomers.length + 1).padStart(3, '0')}`,
                fullName: payload.fullName,
                phoneNumber: payload.phoneNumber,
                email: payload.email ?? null,
                tier: 'NEW',
                orderCount: 0,
                totalSpent: 0,
                lastPurchaseDate: null,
                gender: payload.gender ?? null,
                dob: payload.dob ?? null,
                status: 1,
                createdDate: new Date().toISOString(),
            }
            mockCustomers.unshift(created)
            return created
        }
        return apiClient.post<Customer>('/customer', payload)
    },

    async update(id: string, payload: CustomerPayload): Promise<Customer> {
        if (useMock) {
            await mockDelay()
            const found = mockCustomers.find((c) => c.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy khách hàng ${id}`)
            Object.assign(found, payload)
            return found
        }
        return apiClient.put<Customer>(`/customer/${id}`, payload)
    },
}
