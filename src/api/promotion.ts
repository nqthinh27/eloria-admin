import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockPromotions } from '@/mocks/promotion'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    GeneratePromoCodesPayload,
    PromoCode,
    Promotion,
    PromotionPayload,
    PromotionSearchReq,
} from '@/types/promotion'

/** Service khuyến mại — CHƯA có API thật (PLAN Phase 6), theo `16-khuyen-mai.png`. */
export const promotionApi = {
    async search(
        body: PromotionSearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<Promotion>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockPromotions,
                body,
                (item, keyword) =>
                    item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<Promotion>>('/promotion/search', body, pagination)
    },

    async create(payload: PromotionPayload): Promise<Promotion> {
        if (useMock) {
            await mockDelay()
            const created: Promotion = {
                id: `promo-mock-${Date.now()}`,
                code: `KM${String(mockPromotions.length + 1).padStart(3, '0')}`,
                name: payload.name,
                type: payload.type,
                discountValue: payload.discountValue ?? null,
                channel: payload.channel,
                startDate: payload.startDate,
                endDate: payload.endDate,
                usageCount: 0,
                stackable: payload.stackable,
                priority: payload.priority,
                status: 'UPCOMING',
            }
            mockPromotions.unshift(created)
            return created
        }
        return apiClient.post<Promotion>('/promotion', payload)
    },

    async update(id: string, payload: PromotionPayload): Promise<Promotion> {
        if (useMock) {
            await mockDelay()
            const found = mockPromotions.find((p) => p.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy khuyến mại ${id}`)
            Object.assign(found, payload)
            return found
        }
        return apiClient.put<Promotion>(`/promotion/${id}`, payload)
    },

    async remove(id: string): Promise<null> {
        if (useMock) {
            await mockDelay()
            const index = mockPromotions.findIndex((p) => p.id === id)
            if (index >= 0) mockPromotions.splice(index, 1)
            return null
        }
        return apiClient.delete<null>(`/promotion/${id}`)
    },

    /** Sinh mã giảm giá hàng loạt (PLAN Phase 14 "Quản lý mã giảm giá"). */
    async generateCodes(payload: GeneratePromoCodesPayload): Promise<PromoCode[]> {
        if (useMock) {
            await mockDelay()
            return Array.from({ length: payload.quantity }, (_, i) => ({
                id: `code-mock-${Date.now()}-${i}`,
                promotionId: payload.promotionId,
                code: `${payload.promotionId.slice(-4).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
                usageLimit: payload.usageLimit,
                usedCount: 0,
                expiryDate: payload.expiryDate,
            }))
        }
        return apiClient.post<PromoCode[]>('/promotion/generate-codes', payload)
    },
}
