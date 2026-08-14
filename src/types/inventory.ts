import type { SearchReq } from '@/types/common'

/**
 * Domain Kho & Tồn kho — **API thật**, đồng bộ từ `/v3/api-docs/api` khảo sát **2026-08-10**
 * (PLAN Phase 10). File này đã **thay thế hoàn toàn** bản đoán ở Phase 6: backend không có
 * `GoodsReceipt`/`StockCount` là entity riêng như từng suy đoán — kiểm kê và nhập kho đều
 * quy về **một** entity `WarehouseLedger` (phiếu kho) với `type` khác nhau.
 */

/* ------------------------------------------------------------------ *
 * Tồn kho (StockItem)
 * ------------------------------------------------------------------ */

/**
 * `StockItemResDTO` — 1 dòng tồn theo **SKU × chi nhánh**.
 *
 * ⚠️ `minStock` **không còn nullable** *(breaking 2026-08-11)* — backend luôn trả số, mặc định `0`.
 * Nhưng **vẫn chưa có API nào để đặt ngưỡng** ⇒ thực tế mọi dòng đều `0`, nghĩa là cảnh báo
 * "tồn dưới ngưỡng" hiện trùng nghĩa với "hết hàng". Xem ghi chú ở `StockTab`.
 */
export type StockItem = {
    id: string
    /** ⚠️ **MÃ SKU** (`SP001-BK-AO-L`), không phải UUID — breaking 2026-08-11. */
    skuId: string
    skuCode: string
    productName: string
    colorName: string
    sizeLabel: string
    branchId: string
    branchName: string
    /** Tồn thực trong kho. */
    total: number
    /**
     * ⚠️ **Luôn bằng `total`** kể từ 2026-08-14 — backend **bỏ hẳn cơ chế giữ chỗ** và đã xoá cột
     * `reserved` khỏi cả API lẫn DB. Không còn phép trừ `total - reserved`.
     *
     * Giữ lại field này vì backend vẫn trả, nhưng **đừng dựng UI ngụ ý "khả dụng khác tồn thực"**
     * (cột "Đang giữ" đã gỡ). Xem CLAUDE.md mục "Mô hình tồn kho".
     */
    available: number
    /** Luôn có số, mặc định `0` (không còn `null` từ 2026-08-11) — xem ghi chú trên. */
    minStock: number
}

export type StockItemSearchReq = SearchReq & {
    /** Chỉ SUPER_ADMIN dùng được; STAFF/ADMIN bị backend ép về chi nhánh mình. */
    branchId?: string
    /** **MÃ SKU** (`SP001-BK-AO-L`) — đã test filter bằng mã chạy đúng. */
    skuId?: string
    /**
     * `true` = chỉ lấy dòng `available <= minStock`. Vì `minStock` mặc định `0` và chưa có API
     * đặt ngưỡng, bộ lọc này hiện tương đương "chỉ lấy hàng đã hết".
     */
    lowStockOnly?: boolean
}

/**
 * `StockAlertResDTO` — `GET /stock-item/alerts`.
 * Backend hiện **chỉ sinh 1 loại** `alertType = "LOW_STOCK"` (xem javadoc `StockAlertResDTO`).
 */
export type StockAlert = Omit<StockItem, 'id'> & {
    alertType: string
}

/** Giá trị `alertType` backend đang trả. Chỉ có duy nhất 1 loại ở giai đoạn này. */
export const ALERT_LOW_STOCK = 'LOW_STOCK'

/* ------------------------------------------------------------------ *
 * Phiếu kho (WarehouseLedger)
 * ------------------------------------------------------------------ */

/** Loại phiếu. `TRANSFER` bắt buộc có `toBranchId` khác chi nhánh nguồn. */
export const EWarehouseLedgerType = {
    IN: 'IN',
    OUT: 'OUT',
    TRANSFER: 'TRANSFER',
} as const
export type EWarehouseLedgerType =
    (typeof EWarehouseLedgerType)[keyof typeof EWarehouseLedgerType]

/**
 * Vòng đời phiếu kho. **Chỉ `ACCEPTED` mới ghi tồn thật** —
 * `DRAFT`/`WAITING_APPROVAL` chưa tác động tới `StockItem`.
 */
export const EWarehouseLedgerStatus = {
    DRAFT: 'DRAFT',
    WAITING_APPROVAL: 'WAITING_APPROVAL',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
} as const
export type EWarehouseLedgerStatus =
    (typeof EWarehouseLedgerStatus)[keyof typeof EWarehouseLedgerStatus]

/** `WarehouseLedgerLineResDTO`. */
export type WarehouseLedgerLine = {
    id: string
    /** **MÃ SKU** — luôn bằng `skuCode` (breaking 2026-08-11). */
    skuId: string
    skuCode: string
    productName: string
    colorName: string
    sizeLabel: string
    quantity: number
    description: string | null
}

/** `WarehouseLedgerResDTO`. */
export type WarehouseLedger = {
    id: string
    /** Backend tự sinh, ví dụ `PN-424187`. */
    code: string
    name: string | null
    type: EWarehouseLedgerType
    status: EWarehouseLedgerStatus
    branchId: string
    branchName: string
    /** Nhãn nguồn/NCC — chỉ dùng cho `IN`. */
    receiveFrom: string | null
    /** Nhãn đích/lý do — chỉ dùng cho `OUT`. */
    sendTo: string | null
    /** Chỉ `TRANSFER`. */
    toBranchId: string | null
    toBranchName: string | null
    description: string | null
    /** **`username`** của người tạo (không phải id) — dùng để chặn tự duyệt phiếu. */
    createdBy: string
    createdDate: string
    /**
     * ⚠️ **`null` ở `POST /warehouse-ledger/search`** — chỉ được populate ở
     * `GET /warehouse-ledger/{id}` (đã kiểm chứng bằng API thật 2026-08-10, giống hệt cách
     * `categories` rỗng ở `product/search`). Mọi chỗ đọc `lines` từ kết quả danh sách **phải**
     * phòng null, đừng gọi thẳng `.reduce()`/`.map()`.
     */
    lines: WarehouseLedgerLine[] | null
}

export type WarehouseLedgerSearchReq = SearchReq & {
    type?: EWarehouseLedgerType
    /**
     * Lọc theo vòng đời phiếu. Tên field là `ledgerStatus` để **không đụng** `status`
     * (0/1) mà `SearchReq` đã dùng cho trạng thái bản ghi.
     */
    ledgerStatus?: EWarehouseLedgerStatus
    branchId?: string
}

/** `WarehouseLedgerLineReqDTO` — `quantity` luôn **dương**, chiều tăng/giảm do `type` quyết định. */
export type WarehouseLedgerLinePayload = {
    skuId: string
    quantity: number
    description?: string
}

/** `CreateWarehouseLedgerReqDTO`. */
export type CreateWarehouseLedgerReq = {
    type: EWarehouseLedgerType
    /** Bỏ trống ⇒ backend tự sinh theo loại + mã phiếu. */
    name?: string
    /** SUPER_ADMIN **bắt buộc** truyền; STAFF/ADMIN bị ép về chi nhánh mình. */
    branchId?: string
    /** Bắt buộc với `TRANSFER`, phải khác `branchId`. */
    toBranchId?: string
    receiveFrom?: string
    sendTo?: string
    description?: string
    lines: WarehouseLedgerLinePayload[]
}

/** `RejectWarehouseLedgerReqDTO` — lý do được backend lưu vào `description` của phiếu. */
export type RejectWarehouseLedgerReq = {
    reason?: string
}

/* ------------------------------------------------------------------ *
 * Kiểm kê & Xuất huỷ (StockOperation)
 * ------------------------------------------------------------------ */

/** `StockCountLineReqDTO` — `countedQuantity` là **số đếm thực tế**, cho phép 0. */
export type StockCountLinePayload = {
    skuId: string
    countedQuantity: number
}

/**
 * `StockCountReqDTO` — backend tự so số đếm với tồn hệ thống rồi sinh **1–2 phiếu điều chỉnh
 * DRAFT** (IN cho phần tăng, OUT cho phần giảm). Không có chênh lệch ⇒ lỗi
 * `error.stock.countNoDiff`.
 */
export type StockCountReq = {
    /** SUPER_ADMIN bắt buộc truyền. */
    branchId?: string
    description?: string
    lines: StockCountLinePayload[]
}

/** `StockDisposalReqDTO` — `[ADMIN]`, tạo phiếu OUT DRAFT rồi đi theo luồng duyệt. */
export type StockDisposalReq = {
    branchId?: string
    /** Bắt buộc — lý do huỷ (hàng lỗi/mất/trưng bày). */
    reason: string
    lines: WarehouseLedgerLinePayload[]
}
