import type { SearchReq } from '@/types/common'

/** Loại yêu cầu theo PLAN Phase 13: đổi cùng giá, đổi khác giá, trả hàng hoàn tiền. */
export const EReturnType = {
    EXCHANGE_SAME_PRICE: 'EXCHANGE_SAME_PRICE',
    EXCHANGE_DIFFERENT_PRICE: 'EXCHANGE_DIFFERENT_PRICE',
    REFUND: 'REFUND',
} as const
export type EReturnType = (typeof EReturnType)[keyof typeof EReturnType]

/** Trạng thái theo `06-doi-tra.png`: Chờ duyệt / Đã duyệt / Hoàn tất. */
export const EReturnStatus = {
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    COMPLETED: 'COMPLETED',
    REJECTED: 'REJECTED',
} as const
export type EReturnStatus = (typeof EReturnStatus)[keyof typeof EReturnStatus]

/** Hình thức hoàn tiền — PLAN Phase 13. */
export const ERefundMethod = {
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    STORE_CREDIT: 'STORE_CREDIT',
} as const
export type ERefundMethod = (typeof ERefundMethod)[keyof typeof ERefundMethod]

/** `ReturnResDTO` — chưa có API (PLAN Phase 6), theo `06-doi-tra.png`. */
export type ReturnRequest = {
    id: string
    code: string
    originalOrderId: string
    originalOrderCode: string
    customerId: string | null
    customerName: string
    productSummary: string
    reason: string
    type: EReturnType
    refundMethod: ERefundMethod | null
    refundAmount: number
    status: EReturnStatus
    createdByStaffId: string
    createdByStaffName: string
    approvedByStaffId: string | null
    createdDate: string
}

export type ReturnSearchReq = SearchReq & {
    returnStatus?: EReturnStatus
    returnType?: EReturnType
}

export type CreateReturnPayload = {
    originalOrderId: string
    type: EReturnType
    reason: string
    refundMethod?: ERefundMethod
    /** SKU đổi tới, chỉ áp dụng với `EXCHANGE_*`. */
    exchangeToSkuId?: string
}

export type ApproveReturnPayload = {
    approved: boolean
    /** Bắt buộc khi `approved = false`. */
    rejectReason?: string
}
