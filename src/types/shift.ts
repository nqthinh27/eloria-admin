import type { SearchReq } from '@/types/common'

export const EShiftStatus = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
} as const
export type EShiftStatus = (typeof EShiftStatus)[keyof typeof EShiftStatus]

/** `ShiftResDTO` — ca bán hàng POS, chưa có API (PLAN Phase 6), theo `02-pos-mo-ca.png`. */
export type Shift = {
    id: string
    branchId: string
    staffId: string
    staffName: string
    openingCash: number
    /** `null` cho tới khi chốt ca. */
    closingCash: number | null
    /** `closingCash - (openingCash + tổng thu tiền mặt trong ca)` — backend tính sẵn khi chốt ca. */
    cashVariance: number | null
    note: string | null
    status: EShiftStatus
    openedAt: string
    closedAt: string | null
}

export type ShiftSearchReq = SearchReq & {
    branchId?: string
    staffId?: string
}

/** Mở ca — theo `02-pos-mo-ca.png`: "Tiền mặt đầu ca" + "Ghi chú". */
export type OpenShiftPayload = {
    branchId: string
    openingCash: number
    note?: string
}

/** Chốt ca — kiểm quỹ, chưa có mockup (PLAN Phase 11). */
export type CloseShiftPayload = {
    closingCash: number
    note?: string
}
