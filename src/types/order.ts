import type { SearchReq } from '@/types/common'

/**
 * ⚠️ **FILE NÀY LÀ TYPE ĐOÁN TỪ PHASE 6 — SAI SO VỚI API THẬT. PHẢI VIẾT LẠI Ở PHASE 11.**
 *
 * Backend đã có domain đơn hàng đầy đủ (13 endpoint `/order/*`). Đối chiếu cho thấy lệch nặng:
 *
 * | Ở đây (đoán) | API thật |
 * |---|---|
 * | `EOrderChannel.IN_STORE` | **`POS`** (`ONLINE \| POS \| OTHER`) |
 * | `EOrderStatus` 5 giá trị (`PENDING_PAYMENT`, `PROCESSING`…) | **8 giá trị** `PENDING \| CONFIRMED \| PACKED \| SHIPPING \| SHIPPED \| COMPLETED \| CANCELLED \| REJECTED` |
 * | `Order.code` | **`orderCode`** |
 * | không có | `paymentStatus`, `paidAmount`, `payments[]`, `staffId`, `shiftId`, `type` |
 *
 * Khi làm Phase 11: **viết lại từ `/v3/api-docs/api`**, không sửa vá file này.
 * Xem CLAUDE.md mục "Domain Đơn hàng" + "Mô hình thanh toán" + "Mô hình tồn kho",
 * và tài liệu backend `35.1.eloria-backend/docs/api/ban-hang-p6.md`.
 */

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
