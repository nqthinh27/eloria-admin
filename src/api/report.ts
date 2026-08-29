import { apiClient } from '@/lib/api-client'
import type {
    BranchComparison,
    DashboardSummary,
    InventoryReport,
    InventoryReportReq,
    ProfitReport,
    ProfitReportReq,
    SalesReport,
    SalesReportReq,
} from '@/types/report'

/**
 * Service Dashboard & Báo cáo — **API thật** (backend bổ sung 2026-08-29, api-docs lên 88 path).
 * Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase7.md`.
 *
 * ## Khác biệt so với các service khác trong repo
 *
 * - **Không dùng helper `search()`**: đây không phải pattern `POST .../search` phân trang.
 *   Báo cáo **trả trọn `rows`**, không có `page`/`size`/`sort`, không lồng `data.data`.
 * - **`fromDate`/`toDate` bắt buộc** ở mọi endpoint. Thiếu ⇒ `400 error.input.invalid`;
 *   `fromDate > toDate` ⇒ `400` (`code: 14`) — đã đo thật.
 * - **Data-scope do backend quyết**, FE không tự lọc: `branchId` chỉ có tác dụng với
 *   SUPER_ADMIN; STAFF/ADMIN gửi lên cũng **bị bỏ qua trong im lặng** (đo thật: ADMIN ép
 *   `branchId` chi nhánh khác vẫn nhận đúng chi nhánh mình). ⇒ FE **chỉ bày bộ lọc chi nhánh
 *   cho SUPER_ADMIN**, bày cho role thấp hơn là đánh lừa người dùng.
 *
 * ## Phân quyền (đã kiểm chứng bằng 3 tài khoản thật 2026-08-29)
 *
 * | Endpoint | Role tối thiểu | Đo thật |
 * |---|---|---|
 * | `GET /dashboard/summary` | `STAFF` | STAFF ⇒ `scope: STAFF_SELF` (đơn của mình) |
 * | `POST /report/sales` | `STAFF` | STAFF ⇒ `scope: BRANCH` |
 * | `POST /report/profit` | `ADMIN` | STAFF ⇒ **403** |
 * | `POST /report/inventory` | `ADMIN` | STAFF ⇒ **403** |
 * | `GET /report/branch-comparison` | `SUPER_ADMIN` | STAFF/ADMIN ⇒ **403** |
 */
export const reportApi = {
    /**
     * `[STAFF] GET /dashboard/summary` — thẻ số liệu + pipeline trạng thái + top 5 SKU.
     *
     * ⚠️ FE **chỉ gọi từ màn Dashboard (ADMIN+)** theo PLAN B9 — nhánh `scope: STAFF_SELF`
     * backend có hỗ trợ nhưng FE cố ý không dùng (STAFF điều hướng thẳng sang `/pos`).
     */
    dashboardSummary(
        params: { fromDate: string; toDate: string; branchId?: string },
        signal?: AbortSignal,
    ) {
        return apiClient.get<DashboardSummary>('/dashboard/summary', {
            params,
            signal,
        })
    },

    /** `[STAFF] POST /report/sales` — gom nhóm theo `groupBy` (bỏ trống ⇒ backend mặc định `DAY`). */
    sales(body: SalesReportReq, signal?: AbortSignal) {
        return apiClient.post<SalesReport>('/report/sales', body, { signal })
    },

    /** `[ADMIN] POST /report/profit` — lãi gộp dựa trên giá vốn snapshot lúc bán. */
    profit(body: ProfitReportReq, signal?: AbortSignal) {
        return apiClient.post<ProfitReport>('/report/profit', body, { signal })
    },

    /** `[ADMIN] POST /report/inventory` — xuất-nhập-tồn theo (SKU × chi nhánh). */
    inventory(body: InventoryReportReq, signal?: AbortSignal) {
        return apiClient.post<InventoryReport>('/report/inventory', body, {
            signal,
        })
    },

    /** `[SUPER_ADMIN] GET /report/branch-comparison` — luôn toàn chuỗi, không nhận `branchId`. */
    branchComparison(params: { fromDate: string; toDate: string }, signal?: AbortSignal) {
        return apiClient.get<BranchComparison>('/report/branch-comparison', {
            params,
            signal,
        })
    },
}
