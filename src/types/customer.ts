import type { EGender, EntityStatus, SearchReq } from '@/types/common'

/** Phân hạng khách hàng theo `10-khach-hang.png`. Chưa có API thật — tên field tự đặt bám BE. */
export const ECustomerTier = {
    NEW: 'NEW',
    REGULAR: 'REGULAR',
    VIP: 'VIP',
    DORMANT: 'DORMANT',
} as const
export type ECustomerTier = (typeof ECustomerTier)[keyof typeof ECustomerTier]

/** `CustomerResDTO` (chưa có API — PLAN Phase 6, đặt tên bám quy ước BE). */
export type Customer = {
    id: string
    code: string
    fullName: string
    phoneNumber: string
    email: string | null
    tier: ECustomerTier
    orderCount: number
    totalSpent: number
    lastPurchaseDate: string | null
    gender: EGender | null
    dob: string | null
    status: EntityStatus
    createdDate: string
}

/** `CustomerSearchReqDTO`. */
export type CustomerSearchReq = SearchReq & {
    tier?: ECustomerTier
}

/** `CreateCustomerReqDTO` / `UpdateCustomerReqDTO`. */
export type CustomerPayload = {
    fullName: string
    phoneNumber: string
    email?: string
    gender?: EGender
    dob?: string
}
