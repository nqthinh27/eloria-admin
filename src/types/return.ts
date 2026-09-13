import type { EPaymentMethod } from '@/types/order'

/**
 * Đổi / Trả / Hoàn tiền — **API thật** (backend Phase 11, khảo sát + kiểm thử 2026-09-12).
 *
 * ⚠️ Lớp mock đoán ở Phase 6 đã bị xoá: nó bịa `EXCHANGE_SAME_PRICE`/`EXCHANGE_DIFFERENT_PRICE`
 * là *loại phiếu*, `productSummary` là một chuỗi, `BANK_TRANSFER` là hình thức hoàn tiền — backend
 * **không có thứ nào như vậy**. Thực tế: `type` chỉ có `RETURN|EXCHANGE` (đổi ngang giá hay lệch
 * giá là **hai endpoint khác nhau**, không phải hai giá trị enum), hàng nằm ở `lines[]`, và hình
 * thức tiền dùng chung `EPaymentMethod` của đơn hàng.
 */

/** `EReturnType` — loại phiếu. Đổi ngang giá và đổi lệch giá **cùng** là `EXCHANGE`. */
export const EReturnType = {
    RETURN: 'RETURN',
    EXCHANGE: 'EXCHANGE',
} as const
export type EReturnType = (typeof EReturnType)[keyof typeof EReturnType]

/**
 * `EReturnStatus` — vòng đời phiếu:
 * `PENDING_APPROVAL → APPROVED → COMPLETED`, hoặc `PENDING_APPROVAL → REJECTED`.
 *
 * ⚠️ **`APPROVED → COMPLETED` là TỰ ĐỘNG**, không có endpoint "hoàn tất": backend chuyển khi đã
 * xong **cả hai** việc — quyết toán tiền (bỏ qua nếu phiếu không phát sinh tiền) **và** nhận hàng
 * vào kho. Gọi hai việc đó theo thứ tự nào cũng được (đo thật 2026-09-12).
 */
export const EReturnStatus = {
    PENDING_APPROVAL: 'PENDING_APPROVAL',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    COMPLETED: 'COMPLETED',
} as const
export type EReturnStatus = (typeof EReturnStatus)[keyof typeof EReturnStatus]

/** Loại dòng hàng trên phiếu: hàng khách trả về / hàng giao mới cho khách. */
export const EReturnLineType = {
    RETURNED: 'RETURNED',
    DELIVERED: 'DELIVERED',
} as const
export type EReturnLineType = (typeof EReturnLineType)[keyof typeof EReturnLineType]

/**
 * Tình trạng hàng nhận về kho.
 * `RESALABLE` ⇒ **cộng tồn** qua một phiếu kho `IN` tự sinh ở trạng thái `ACCEPTED`.
 * `DEFECTIVE` ⇒ **không** cộng tồn (muốn ghi nhận huỷ thì dùng `POST /stock-disposal` của Phase 10).
 */
export const EReturnCondition = {
    RESALABLE: 'RESALABLE',
    DEFECTIVE: 'DEFECTIVE',
} as const
export type EReturnCondition = (typeof EReturnCondition)[keyof typeof EReturnCondition]

/** `ReturnDetailResDTO` — một dòng hàng của phiếu. */
export type ReturnDetail = {
    id: string
    lineType: EReturnLineType
    /** Mã SKU (backend dùng mã làm id — xem CLAUDE.md mục BREAKING 2026-08-11). */
    skuId: string
    skuCode: string
    productName: string
    size: string | null
    color: string | null
    quantity: number
    /** Giá quyết toán **một đơn vị** — đã phân bổ chiết khấu/KM của đơn gốc. */
    unitAmount: number
    lineTotal: number
    /** Chỉ có ở dòng `RETURNED`, và chỉ sau khi đã nhận hàng vào kho. */
    conditionType: EReturnCondition | null
    reason: string | null
    orderDetailId: string | null
}

/**
 * `ReturnResDTO`.
 *
 * ⚠️ **`lines` là `null` ở `POST /return/search`**, chỉ được populate ở `GET /return/{id}`
 * (đo thật 2026-09-12) — giống hệt `lines` của phiếu kho và `categories` của sản phẩm.
 * ⇒ **Không dựng được cột SẢN PHẨM ở bảng danh sách** như mockup `06-doi-tra.png` vẽ.
 */
export type ReturnRequest = {
    id: string
    code: string
    type: EReturnType
    status: EReturnStatus
    /** Tổng tiền hàng khách trả về (giá khách **thực trả**, không phải giá niêm yết). */
    returnedAmount: number
    /** Tổng tiền hàng giao mới — luôn `0` với phiếu trả thuần. */
    deliveredAmount: number
    /** Tiền phải **trả lại** khách (≥ 0). Tối đa 1 trong 2 (`refundAmount`, `collectAmount`) khác 0. */
    refundAmount: number
    /** Tiền phải **thu thêm** của khách (≥ 0) — chỉ khi đổi sang hàng đắt hơn. */
    collectAmount: number
    refundMethod: EPaymentMethod | null
    refundedAt: string | null
    stockReceivedAt: string | null
    approvedAt: string | null
    /** **Username** người duyệt (không phải id) — giống `createdBy` của phiếu kho. */
    approvedBy: string | null
    /** Lý do đổi/trả do người tạo nhập. Lý do **từ chối** nằm ở `description`, không phải ở đây. */
    reason: string | null
    /** Ghi chú. ⚠️ Khi phiếu bị từ chối, backend **ghi đè** lý do từ chối vào đây (`"Từ chối: …"`). */
    description: string | null
    orderId: string | null
    orderCode: string | null
    customerId: string | null
    customerName: string | null
    customerPhone: string | null
    staffId: string | null
    staffName: string | null
    branchId: string
    branchName: string | null
    /** Ca làm việc lúc quyết toán tiền — dùng để đối soát quỹ ca (Phase 15). `null` nếu quyết toán ngoài ca. */
    shiftId: string | null
    /** Phiếu kho `IN` tự sinh khi nhận hàng bán lại. `null` nếu mọi dòng đều `DEFECTIVE`. */
    warehouseLedgerId: string | null
    createdDate: string
    lastModifiedDate: string | null
    lines: ReturnDetail[] | null
}

/**
 * `ReturnSearchReqDTO`.
 *
 * ⚠️ **Không kế thừa `SearchReq`**: phiếu đổi/trả **không có** cột `status` 0/1 — `status` ở đây là
 * vòng đời, và tên field lọc là **`returnStatus`** (cùng pattern `ledgerStatus` của phiếu kho,
 * `promotionStatus` của khuyến mại).
 */
export type ReturnSearchReq = {
    /** Khớp mã phiếu · mã đơn gốc · tên hoặc SĐT khách (đã kiểm chứng cả 3). */
    keyword?: string
    returnStatus?: EReturnStatus
    type?: EReturnType
    /** Chỉ SUPER_ADMIN dùng được; STAFF/ADMIN gửi lên bị backend bỏ qua trong im lặng. */
    branchId?: string
    orderId?: string
    customerId?: string
    shiftId?: string
    fromDate?: string
    toDate?: string
}

/** Một dòng hàng khách trả về, dùng cho cả `POST /return` lẫn `returnLines` của phiếu đổi. */
export type ReturnLineReq = {
    /** **Bắt buộc khi có `orderId`** — id dòng trên đơn gốc (`OrderDetailResDTO.id`). */
    orderDetailId?: string
    /** **Bắt buộc khi KHÔNG có `orderId`** (trả hàng không hoá đơn). */
    skuId?: string
    quantity: number
    /**
     * Giá quyết toán một đơn vị — **chỉ dùng cho phiếu không hoá đơn** và khi đó là **bắt buộc**
     * (thiếu ⇒ `error.return.lineInvalid`). Phiếu có hoá đơn thì backend tự tính, gửi lên bị bỏ qua.
     */
    unitAmount?: number
    reason?: string
}

/** Một dòng hàng giao mới cho khách (chỉ có ở phiếu đổi). */
export type ReturnDeliverLineReq = {
    skuId: string
    quantity: number
}

/** Phần thông tin khách/chi nhánh dùng chung giữa phiếu trả và phiếu đổi. */
type ReturnPartyReq = {
    /** Bỏ trống ⇒ **trả/đổi hàng KHÔNG hoá đơn**, khi đó mỗi dòng trả phải tự khai `skuId`. */
    orderId?: string
    /** Chỉ SUPER_ADMIN truyền; STAFF/ADMIN luôn bị ép về chi nhánh mình. */
    branchId?: string
    customerId?: string
    customerName?: string
    customerPhone?: string
    reason?: string
    description?: string
}

/** `CreateReturnReqDTO` — `POST /return`. */
export type CreateReturnReq = ReturnPartyReq & {
    lines: ReturnLineReq[]
}

/** `CreateExchangeReqDTO` — dùng chung cho `POST /return/exchange` và `/return/exchange-diff`. */
export type CreateExchangeReq = ReturnPartyReq & {
    returnLines: ReturnLineReq[]
    deliverLines: ReturnDeliverLineReq[]
}

/**
 * `RefundReturnReqDTO` — **số tiền do backend quyết**, request chỉ chọn hình thức.
 * ⚠️ `STORE_CREDIT` · `POINT` · `VOUCHER` chưa hỗ trợ ⇒ `error.return.methodNotSupported`.
 */
export type RefundReturnReq = {
    method: EPaymentMethod
    description?: string
}

/** `ReceiveStockLineReqDTO`. */
export type ReceiveStockLineReq = {
    returnDetailId: string
    condition: EReturnCondition
}

/**
 * `ReceiveStockReqDTO` — **mọi dòng `RETURNED` phải có tình trạng**, thiếu ⇒
 * `error.return.conditionRequired`. `defaultCondition` áp cho các dòng không liệt kê trong `lines`.
 */
export type ReceiveStockReq = {
    lines?: ReceiveStockLineReq[]
    defaultCondition?: EReturnCondition
    description?: string
}
