import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockShifts } from '@/mocks/shift'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type { CloseShiftPayload, OpenShiftPayload, Shift, ShiftSearchReq } from '@/types/shift'

/** Service ca bán hàng POS — CHƯA có API thật (PLAN Phase 6), theo `02-pos-mo-ca.png`. */
export const shiftApi = {
    async search(body: ShiftSearchReq, pagination?: SearchPagination): Promise<BaseListRes<Shift>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockShifts,
                body,
                (item, keyword) => item.staffName.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<Shift>>('/shift/search', body, pagination)
    },

    /** Ca đang mở của nhân viên hiện tại — dùng để quyết định vào thẳng POS hay hiện màn mở ca. */
    async getCurrent(): Promise<Shift | null> {
        if (useMock) {
            await mockDelay()
            return mockShifts.find((s) => s.status === 'OPEN') ?? null
        }
        return apiClient.get<Shift | null>('/shift/current')
    },

    async open(payload: OpenShiftPayload): Promise<Shift> {
        if (useMock) {
            await mockDelay()
            const created: Shift = {
                id: `shift-mock-${Date.now()}`,
                branchId: payload.branchId,
                staffId: 'mock-user',
                staffName: 'mock-user',
                openingCash: payload.openingCash,
                closingCash: null,
                cashVariance: null,
                note: payload.note ?? null,
                status: 'OPEN',
                openedAt: new Date().toISOString(),
                closedAt: null,
            }
            mockShifts.unshift(created)
            return created
        }
        return apiClient.post<Shift>('/shift/open', payload)
    },

    async close(id: string, payload: CloseShiftPayload): Promise<Shift> {
        if (useMock) {
            await mockDelay()
            const found = mockShifts.find((s) => s.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy ca ${id}`)
            found.closingCash = payload.closingCash
            found.cashVariance = payload.closingCash - found.openingCash
            found.note = payload.note ?? found.note
            found.status = 'CLOSED'
            found.closedAt = new Date().toISOString()
            return found
        }
        return apiClient.post<Shift>(`/shift/${id}/close`, payload)
    },
}
