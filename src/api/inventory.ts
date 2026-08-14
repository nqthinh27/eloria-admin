import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    CreateWarehouseLedgerReq,
    RejectWarehouseLedgerReq,
    StockAlert,
    StockCountReq,
    StockDisposalReq,
    StockItem,
    StockItemSearchReq,
    WarehouseLedger,
    WarehouseLedgerSearchReq,
} from '@/types/inventory'

/**
 * Service domain Kho & Tồn kho — **API thật** (backend bổ sung, khảo sát api-docs 2026-08-10).
 * Không còn nhánh mock: `src/mocks/inventory.ts` chỉ phục vụ Phase 6 và đã hết vai trò.
 *
 * Phân quyền: **đọc `[STAFF]`**, **duyệt/từ chối + xuất huỷ `[ADMIN]`**.
 * Backend còn tự giới hạn phạm vi: STAFF/ADMIN chỉ thao tác được với phiếu của chi nhánh mình,
 * chỉ SUPER_ADMIN lọc được theo `branchId`.
 */
export const stockItemApi = {
    /**
     * `[STAFF] POST /stock-item/search`.
     * ⚠️ Từ 2026-08-14 backend **bỏ cơ chế giữ chỗ** ⇒ không còn `reserved`, `available === total`.
     */
    search(body: StockItemSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<StockItem>>('/stock-item/search', body, pagination, { signal })
    },

    /**
     * `[STAFF] GET /stock-item/alerts` — các dòng `available <= minStock`.
     * **Không phân trang**, trả thẳng mảng.
     */
    alerts(branchId?: string, signal?: AbortSignal) {
        return apiClient.get<StockAlert[]>('/stock-item/alerts', {
            params: branchId ? { branchId } : undefined,
            signal,
        })
    },
}

export const warehouseLedgerApi = {
    /** `[STAFF] POST /warehouse-ledger/search`. */
    search(body: WarehouseLedgerSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<WarehouseLedger>>('/warehouse-ledger/search', body, pagination, {
            signal,
        })
    },

    /** `[STAFF] GET /warehouse-ledger/{id}` — bản duy nhất cần gọi để lấy `lines` đầy đủ. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<WarehouseLedger>(`/warehouse-ledger/${id}`, { signal })
    },

    /** `[STAFF] POST /warehouse-ledger` — phiếu tạo ra ở `DRAFT`, **chưa** tác động tồn. */
    create(payload: CreateWarehouseLedgerReq) {
        return apiClient.post<WarehouseLedger>('/warehouse-ledger', payload)
    },

    /** `[STAFF] POST /warehouse-ledger/{id}/submit` — `DRAFT → WAITING_APPROVAL`. */
    submit(id: string) {
        return apiClient.post<WarehouseLedger>(`/warehouse-ledger/${id}/submit`)
    },

    /**
     * `[ADMIN] POST /warehouse-ledger/{id}/approve` — `WAITING_APPROVAL → ACCEPTED`, **ghi tồn thật**.
     *
     * ⚠️ Backend chặn **tự duyệt phiếu do chính mình tạo** (`error.warehouseLedger.cannotApproveOwn`,
     * HTTP 403) — FE phải ẩn nút trước, đừng để người dùng bấm rồi mới nhận lỗi.
     */
    approve(id: string) {
        return apiClient.post<WarehouseLedger>(`/warehouse-ledger/${id}/approve`)
    },

    /** `[ADMIN] POST /warehouse-ledger/{id}/reject` — lý do được lưu vào `description`. */
    reject(id: string, payload: RejectWarehouseLedgerReq) {
        return apiClient.post<WarehouseLedger>(`/warehouse-ledger/${id}/reject`, payload)
    },
}

export const stockOperationApi = {
    /**
     * `[STAFF] POST /stock-count` — kiểm kê.
     * Backend so số đếm với tồn hệ thống và trả về **1–2 phiếu điều chỉnh DRAFT**
     * (IN cho phần tăng, OUT cho phần giảm). Không chênh lệch ⇒ `error.stock.countNoDiff`.
     */
    stockCount(payload: StockCountReq) {
        return apiClient.post<WarehouseLedger[]>('/stock-count', payload)
    },

    /** `[ADMIN] POST /stock-disposal` — xuất huỷ, tạo phiếu OUT DRAFT rồi đi theo luồng duyệt. */
    stockDisposal(payload: StockDisposalReq) {
        return apiClient.post<WarehouseLedger>('/stock-disposal', payload)
    },
}
