import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockOrders } from '@/mocks/order'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type { Order, OrderSearchReq, UpdateOrderStatusPayload } from '@/types/order'

/** Service đơn hàng — CHƯA có API thật (PLAN Phase 6), theo `04-don-hang.png` / `05-…-chi-tiet.png`. */
export const orderApi = {
    async search(body: OrderSearchReq, pagination?: SearchPagination): Promise<BaseListRes<Order>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockOrders,
                body,
                (item, keyword) =>
                    item.code.toLowerCase().includes(keyword) ||
                    item.customerName.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<Order>>('/order/search', body, pagination)
    },

    async getById(id: string): Promise<Order> {
        if (useMock) {
            await mockDelay()
            const found = mockOrders.find((o) => o.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy đơn hàng ${id}`)
            return found
        }
        return apiClient.get<Order>(`/order/${id}`)
    },

    /** Xác nhận/huỷ đơn, ghi chú nội bộ — hành động nhạy cảm, backend ghi audit log. */
    async updateStatus(id: string, payload: UpdateOrderStatusPayload): Promise<Order> {
        if (useMock) {
            await mockDelay()
            const found = mockOrders.find((o) => o.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy đơn hàng ${id}`)
            found.status = payload.status
            if (payload.internalNote !== undefined) found.internalNote = payload.internalNote
            return found
        }
        return apiClient.post<Order>(`/order/${id}/update-status`, payload)
    },
}
