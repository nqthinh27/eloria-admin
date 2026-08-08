import type { SearchReq } from '@/types/common'

/** Kênh bán theo `04-don-hang.png`: "Online" / "Tại quầy". */
export const EOrderChannel = {
    ONLINE: 'ONLINE',
    IN_STORE: 'IN_STORE',
} as const
export type EOrderChannel = (typeof EOrderChannel)[keyof typeof EOrderChannel]

/** Trạng thái đơn theo cột "TRẠNG THÁI" của `04-don-hang.png`. */
export const EOrderStatus = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PROCESSING: 'PROCESSING',
    SHIPPING: 'SHIPPING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const
export type EOrderStatus = (typeof EOrderStatus)[keyof typeof EOrderStatus]

export type OrderItem = {
    skuId: string
    productName: string
    size: string
    color: string
    quantity: number
    unitPrice: number
    lineTotal: number
}

/** `OrderResDTO` — chưa có API (PLAN Phase 6), tên field bám quy ước BE. */
export type Order = {
    id: string
    code: string
    customerId: string | null
    customerName: string
    channel: EOrderChannel
    branchId: string
    branchName: string
    /** `null` với đơn online chưa gán nhân viên xử lý. */
    staffId: string | null
    staffName: string | null
    items: OrderItem[]
    itemCount: number
    totalAmount: number
    status: EOrderStatus
    internalNote: string | null
    createdDate: string
}

export type OrderSearchReq = SearchReq & {
    channel?: EOrderChannel
    orderStatus?: EOrderStatus
    branchId?: string
}

export type UpdateOrderStatusPayload = {
    status: EOrderStatus
    internalNote?: string
}
