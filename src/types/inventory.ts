import type { SearchReq } from '@/types/common'

/** Trạng thái tồn theo `13-kho-hang-ton-kho.png`. */
export const EStockStatus = {
    NORMAL: 'NORMAL',
    /** Tồn khả dụng dưới `minStock` — "Cảnh báo". */
    LOW: 'LOW',
    /** Tồn khả dụng = 0 — "Hết hàng". */
    OUT_OF_STOCK: 'OUT_OF_STOCK',
} as const
export type EStockStatus = (typeof EStockStatus)[keyof typeof EStockStatus]

/** `StockResDTO` — 1 dòng tồn kho theo SKU × chi nhánh, chưa có API (PLAN Phase 6). */
export type Stock = {
    skuId: string
    skuCode: string
    productName: string
    size: string
    color: string
    branchId: string
    /** Tồn thực trong kho. */
    onHand: number
    /** Đang giữ cho đơn chưa xuất (giỏ hàng giữ chỗ, đơn chờ đóng gói…). */
    reserved: number
    /** Tồn khả dụng = `onHand - reserved` — backend tính sẵn, FE không tự trừ lại. */
    available: number
    minStock: number
    status: EStockStatus
    /** Số ngày kể từ lần xuất kho gần nhất — dùng cho cảnh báo "chậm luân chuyển". */
    daysSinceLastSale: number | null
}

export type StockSearchReq = SearchReq & {
    branchId?: string
    stockStatus?: EStockStatus
}

/** `StockAdjustmentReqDTO` — điều chỉnh tồn thủ công, ghi audit log. */
export type StockAdjustmentPayload = {
    skuId: string
    branchId: string
    /** Số lượng điều chỉnh, có thể âm. */
    quantityDelta: number
    reason: string
}

/* ------------------------------------------------------------------ *
 * Phiếu nhập kho (PO → nhập theo ma trận size × màu)
 * ------------------------------------------------------------------ */

export const EGoodsReceiptStatus = {
    DRAFT: 'DRAFT',
    RECEIVED: 'RECEIVED',
    CANCELLED: 'CANCELLED',
} as const
export type EGoodsReceiptStatus = (typeof EGoodsReceiptStatus)[keyof typeof EGoodsReceiptStatus]

export type GoodsReceiptLine = {
    skuId: string
    skuCode: string
    quantity: number
    unitCost: number
}

/** `GoodsReceiptResDTO`. */
export type GoodsReceipt = {
    id: string
    code: string
    branchId: string
    branchName: string
    supplierName: string | null
    status: EGoodsReceiptStatus
    lines: GoodsReceiptLine[]
    totalQuantity: number
    totalCost: number
    createdBy: string
    createdDate: string
}

export type GoodsReceiptSearchReq = SearchReq & {
    branchId?: string
    receiptStatus?: EGoodsReceiptStatus
}

export type GoodsReceiptPayload = {
    branchId: string
    supplierName?: string
    lines: GoodsReceiptLine[]
}

/* ------------------------------------------------------------------ *
 * Kiểm kê kho
 * ------------------------------------------------------------------ */

export const EStockCountType = {
    FULL: 'FULL',
    PARTIAL: 'PARTIAL',
} as const
export type EStockCountType = (typeof EStockCountType)[keyof typeof EStockCountType]

export const EStockCountStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
} as const
export type EStockCountStatus = (typeof EStockCountStatus)[keyof typeof EStockCountStatus]

export type StockCountLine = {
    skuId: string
    skuCode: string
    systemQuantity: number
    countedQuantity: number
    /** `countedQuantity - systemQuantity`, backend tính sẵn. */
    variance: number
}

/** `StockCountResDTO` — phiên kiểm kê, tự sinh phiếu điều chỉnh chênh lệch khi hoàn tất. */
export type StockCount = {
    id: string
    code: string
    branchId: string
    branchName: string
    type: EStockCountType
    status: EStockCountStatus
    lines: StockCountLine[]
    createdBy: string
    createdDate: string
    completedDate: string | null
}

export type StockCountSearchReq = SearchReq & {
    branchId?: string
    countType?: EStockCountType
}

export type StockCountPayload = {
    branchId: string
    type: EStockCountType
    skuIds: string[]
}
