import type { EOrderChannel, EOrderStatus } from '@/types/order'

/**
 * Type domain Dashboard & Báo cáo — đồng bộ nguyên văn từ `/v3/api-docs/api`
 * (khảo sát **2026-08-29**, backend lên 88 path) và **đối chiếu response thật** của backend local.
 *
 * Nguồn tài liệu: `35.1.eloria-backend/docs/api/fe-handoff-phase7.md`.
 *
 * ## Quy tắc số liệu (backend chốt, FE chỉ hiển thị — không tự tính lại)
 *
 * - **Doanh thu chỉ tính đơn `COMPLETED`**, theo **ngày tạo đơn** (`createdDate`).
 *   Đơn PENDING/CANCELLED… không vào tiền, nhưng `statusBreakdown` vẫn đếm để xem pipeline.
 * - `grossSubtotal` = tiền gốc (Σ đơn giá × SL) · `discountTotal` = tổng giảm (dòng + chung)
 *   · **`netRevenue = grossSubtotal − discountTotal`** · **`revenue = totalAmount`** (đã gồm ship).
 * - **Lãi gộp**: `cogs` = giá vốn snapshot lúc bán · `grossProfit = netRevenue − cogs`
 *   · `marginPercent = grossProfit / netRevenue × 100`.
 *
 * ⚠️ **`marginPercent` là `null` khi `netRevenue <= 0`** — đã đo thật (khoảng ngày rỗng trả
 * `totalMarginPercent: null`). Mọi chỗ hiển thị phải phòng `null` và render `—`, đừng
 * `.toFixed()` thẳng.
 *
 * ⚠️ **Báo cáo KHÔNG phân trang** — trả trọn `rows` + các trường `total*`. Không có `page`/`size`,
 * cũng không có `BaseListRes`; đừng cố nhét vào `search()` helper.
 */

/** Phạm vi dữ liệu backend tự quyết theo role — FE **không gửi lên**, chỉ đọc để hiển thị. */
export const EReportScope = {
    /** STAFF gọi `/dashboard/summary` ⇒ chỉ đơn **của chính mình**. */
    STAFF_SELF: 'STAFF_SELF',
    /** STAFF/ADMIN ⇒ chi nhánh mình. */
    BRANCH: 'BRANCH',
    /** SUPER_ADMIN ⇒ toàn chuỗi (hoặc 1 chi nhánh khi truyền `branchId`). */
    CHAIN: 'CHAIN',
} as const
export type EReportScope = (typeof EReportScope)[keyof typeof EReportScope]

/**
 * Chiều gom nhóm của báo cáo — **7 giá trị** (backend thêm `YEAR` ngày 2026-08-30).
 *
 * ⚠️ **`/report/sales` nhận cả 7; `/report/profit` chỉ nhận 5** — `CHANNEL`/`STAFF` bị backend
 * chặn bằng **`400 error.input.invalid`** (*"Báo cáo lãi gộp chỉ hỗ trợ nhóm theo
 * DAY/MONTH/YEAR/BRANCH/PRODUCT"*). Trước 2026-08-30 hai giá trị này **lọt qua và trả sai dữ liệu
 * trong im lặng** (gom theo ngày nhưng vẫn dán nhãn `CHANNEL`) — bug đã được vá, xem
 * `docs/backend-request-year-granularity.md` Phần B.
 */
export const EReportGroupBy = {
    DAY: 'DAY',
    MONTH: 'MONTH',
    /** Thêm 2026-08-30. `key` dạng `yyyy`, cắt theo **giờ VN**. */
    YEAR: 'YEAR',
    BRANCH: 'BRANCH',
    /** ⚠️ `/report/profit` **không nhận** — trả `400`. */
    CHANNEL: 'CHANNEL',
    /** ⚠️ `/report/profit` **không nhận** — trả `400`. */
    STAFF: 'STAFF',
    PRODUCT: 'PRODUCT',
} as const
export type EReportGroupBy = (typeof EReportGroupBy)[keyof typeof EReportGroupBy]

/** Khoảng thời gian bắt buộc của **mọi** endpoint báo cáo — ISO-8601 UTC. */
export type ReportDateRange = {
    /** Bắt buộc. Thiếu ⇒ `400 error.input.invalid`. */
    fromDate: string
    /** Bắt buộc. `fromDate > toDate` ⇒ `400` (`code: 14`, đo thật). */
    toDate: string
}

/* ------------------------------------------------------------------ *
 * B1. Dashboard — `GET /dashboard/summary`
 * ------------------------------------------------------------------ */

/** Một ô của `statusBreakdown` — đếm đơn theo trạng thái (gồm cả đơn không tính tiền). */
export type StatusCount = {
    status: EOrderStatus
    count: number
}

/** Một dòng của `topProducts` — tối đa 5 SKU bán chạy nhất. */
export type TopProductRow = {
    /** ⚠️ Là **mã SKU** (`SP001-BK-AO-L`), không phải UUID — xem `types/product.ts`. */
    skuId: string
    /** Bằng đúng `skuId` (backend vẫn trả cả hai). */
    skuCode: string
    productName: string | null
    itemsSold: number
    netRevenue: number
}

/**
 * `DashboardSummaryResDTO` — `GET /dashboard/summary?fromDate&toDate[&branchId]`.
 *
 * ⚠️ `fromDate`/`toDate` **có trong response** (api-docs + JSON thật) dù ví dụ trong tài liệu
 * handoff không vẽ ra — dùng để đối chiếu kỳ đang xem.
 */
export type DashboardSummary = ReportDateRange & {
    scope: EReportScope
    /** `null` khi xem toàn chuỗi (SUPER_ADMIN không lọc chi nhánh). */
    branchId: string | null
    completedOrderCount: number
    /** `= totalAmount`, **đã gồm phí ship**. */
    revenue: number
    /** `= grossSubtotal − discountTotal`, **chưa gồm** phí ship. */
    netRevenue: number
    discountTotal: number
    shippingTotal: number
    itemsSold: number
    avgOrderValue: number
    cogs: number
    grossProfit: number
    /** ⚠️ `null` khi `netRevenue <= 0` ⇒ hiển thị `—`. */
    marginPercent: number | null
    /**
     * Số lượng hàng đã bán thuộc SKU **chưa nhập giá vốn**.
     * ⚠️ `> 0` ⇒ COGS thiếu ⇒ **lãi gộp bị thổi phồng** ⇒ FE **phải cảnh báo**.
     */
    missingCostQty: number
    statusBreakdown: StatusCount[]
    /** Tối đa 5 dòng, backend đã sắp sẵn. */
    topProducts: TopProductRow[]
}

/* ------------------------------------------------------------------ *
 * B2. Báo cáo bán hàng — `POST /report/sales`
 * ------------------------------------------------------------------ */

/** `SalesReportReqDTO`. */
export type SalesReportReq = ReportDateRange & {
    /** Chỉ SUPER_ADMIN dùng được; role thấp hơn backend **bỏ qua trong im lặng** (đo thật). */
    branchId?: string
    channel?: EOrderChannel
    staffId?: string
    /** Bỏ trống ⇒ backend mặc định `DAY` (đo thật). */
    groupBy?: EReportGroupBy
}

/**
 * Một dòng của báo cáo bán hàng.
 *
 * `key`/`label` đổi nghĩa theo `groupBy`: **DAY** `key = yyyy-MM-dd` · **MONTH** `key = yyyy-MM`
 * · **BRANCH/STAFF** `key = id`, `label` = tên (nhân viên đã xoá ⇒ `label` rơi về id)
 * · **CHANNEL** `key = label = ONLINE|POS|OTHER` · **PRODUCT** `key = skuId`, `label` = tên SP.
 *
 * ⚠️ **`shippingTotal` là `null` khi `groupBy = PRODUCT`** (phí ship thuộc về đơn, không chia
 * được về từng SKU) — đã đo thật.
 *
 * ⚠️ Tài liệu handoff ghi `orderCount = null` khi `groupBy = PRODUCT`, nhưng **API thật vẫn trả
 * số** (đo 2026-08-29: `orderCount: 1`, `11`). Kiểu vẫn khai nullable để phòng backend sửa lại
 * cho khớp tài liệu; chỗ hiển thị đã phòng `null`.
 */
export type SalesReportRow = {
    key: string
    label: string | null
    orderCount: number | null
    itemsSold: number
    grossSubtotal: number
    discountTotal: number
    netRevenue: number
    shippingTotal: number | null
    revenue: number
}

/** `SalesReportResDTO`. */
export type SalesReport = ReportDateRange & {
    groupBy: EReportGroupBy
    scope: EReportScope
    branchId: string | null
    totalOrderCount: number
    totalItemsSold: number
    totalGrossSubtotal: number
    totalDiscount: number
    totalNetRevenue: number
    totalShipping: number
    totalRevenue: number
    rows: SalesReportRow[]
}

/* ------------------------------------------------------------------ *
 * B3. Báo cáo lãi gộp — `POST /report/profit` (ADMIN+)
 * ------------------------------------------------------------------ */

/** `ProfitReportReqDTO`. */
export type ProfitReportReq = ReportDateRange & {
    branchId?: string
    groupBy?: EReportGroupBy
}

/** Một dòng báo cáo lãi gộp. */
export type ProfitReportRow = {
    key: string
    label: string | null
    netRevenue: number
    cogs: number
    grossProfit: number
    /** ⚠️ `null` khi `netRevenue <= 0` ⇒ hiển thị `—`. */
    marginPercent: number | null
    missingCostQty: number
}

/**
 * `ProfitReportResDTO`.
 *
 * ⚠️ **Nhóm `PRODUCT` không so sánh tuyệt đối được với DAY/MONTH/BRANCH**: `netRevenue` cấp SKU
 * = Σ `line_total` (đã trừ giảm-**dòng**, *không* trừ giảm-**chung** cả đơn) ⇒ tổng theo PRODUCT
 * có thể **cao hơn** các nhóm khác. Chỉ dùng để xếp hạng tương đối giữa các SKU — FE có ghi chú
 * tại chỗ ở bảng.
 */
export type ProfitReport = ReportDateRange & {
    groupBy: EReportGroupBy
    scope: EReportScope
    branchId: string | null
    totalNetRevenue: number
    totalCogs: number
    totalGrossProfit: number
    /** ⚠️ `null` khi `totalNetRevenue <= 0` — đã đo thật với khoảng ngày rỗng. */
    totalMarginPercent: number | null
    totalMissingCostQty: number
    rows: ProfitReportRow[]
}

/* ------------------------------------------------------------------ *
 * B4. Báo cáo xuất-nhập-tồn — `POST /report/inventory` (ADMIN+)
 * ------------------------------------------------------------------ */

/** `InventoryReportReqDTO`. */
export type InventoryReportReq = ReportDateRange & {
    branchId?: string
}

/**
 * Một dòng xuất-nhập-tồn, gom theo **(SKU × chi nhánh)**.
 *
 * ⚠️ Ba mốc thời gian **khác nhau** trong cùng một dòng, đừng cộng trừ lẫn nhau để "kiểm tra":
 * - `inQty`/`outQty`/`transferOutQty` — chỉ phiếu **ĐÃ DUYỆT**, theo **ngày phiếu**.
 * - `soldQty` — đơn `COMPLETED`, theo **ngày đơn**.
 * - `currentTotal` — tồn **tại thời điểm gọi API**, không theo khoảng lọc.
 *
 * ⚠️ Phiếu `TRANSFER` **chỉ ghi chiều XUẤT ở chi nhánh nguồn** (`transferOutQty`); chi nhánh đích
 * không có cột "chuyển đến" ⇒ không dựng được cột đó.
 */
export type InventoryReportRow = {
    branchId: string
    branchName: string | null
    /** ⚠️ Là **mã SKU**, không phải UUID. */
    skuId: string
    skuCode: string
    productName: string | null
    /** Nhập kho — phiếu `IN` đã duyệt. */
    inQty: number
    /** Xuất kho — phiếu `OUT` (xuất/điều chỉnh/huỷ) đã duyệt. */
    outQty: number
    /** Chuyển đi — phiếu `TRANSFER`, tính ở chi nhánh **nguồn**. */
    transferOutQty: number
    /** Bán ra — đơn `COMPLETED`. */
    soldQty: number
    /** Tồn hiện tại (thời điểm gọi API). */
    currentTotal: number
}

/** `InventoryReportResDTO` — `rows` đã được backend sắp giảm dần theo `soldQty`. */
export type InventoryReport = ReportDateRange & {
    scope: EReportScope
    branchId: string | null
    totalInQty: number
    totalOutQty: number
    totalTransferOutQty: number
    totalSoldQty: number
    rows: InventoryReportRow[]
}

/* ------------------------------------------------------------------ *
 * B5. So sánh chi nhánh — `GET /report/branch-comparison` (SUPER_ADMIN)
 * ------------------------------------------------------------------ */

/** Một dòng so sánh chi nhánh. */
export type BranchComparisonRow = {
    branchId: string
    branchName: string | null
    orderCount: number
    itemsSold: number
    revenue: number
    netRevenue: number
    cogs: number
    grossProfit: number
    /** ⚠️ `null` khi `netRevenue <= 0` ⇒ hiển thị `—`. */
    marginPercent: number | null
}

/**
 * `BranchComparisonResDTO` — `rows` đã sắp giảm dần theo `revenue`.
 *
 * ⚠️ **Không có `scope`/`branchId`** như 4 DTO kia (endpoint này vốn chỉ SUPER_ADMIN, luôn
 * toàn chuỗi) — đã xác nhận trên api-docs và JSON thật.
 */
export type BranchComparison = ReportDateRange & {
    rows: BranchComparisonRow[]
}
