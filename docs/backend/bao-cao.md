# Backend — Dashboard & Báo cáo · Doanh thu sau hoàn

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase7.md`. Kiểm chứng bằng API thật 2026-08-29/30
> (5 endpoint × 3 role + case biên), cập nhật 2026-09-13 (doanh thu sau hoàn — BE28).
> Màn FE: **chỉ Dashboard** (gọi `dashboard/summary` + `report/sales`); `report/profit` ·
> `report/inventory` · `report/branch-comparison` **đã có hàm ở `src/api/report.ts` nhưng chưa màn nào
> gọi** — types đầy đủ, dựng màn là dùng ngay. Code FE: `src/hooks/use-report-*.ts`, `src/lib/report-range.ts`.

| Nhóm | Role tối thiểu | Endpoint |
|---|---|---|
| Dashboard | `STAFF` | `GET /dashboard/summary?fromDate&toDate[&branchId]` |
| BC bán hàng | `STAFF` | `POST /report/sales` |
| BC lãi gộp | `ADMIN` | `POST /report/profit` |
| BC xuất-nhập-tồn | `ADMIN` | `POST /report/inventory` |
| So sánh chi nhánh | `SUPER_ADMIN` | `GET /report/branch-comparison?fromDate&toDate` |

*(Dashboard menu vẫn `minRole = ADMIN` — B9 chốt 2026-08-29: bỏ nhánh STAFF.)*

## Quy tắc số liệu (backend chốt — FE chỉ hiển thị, KHÔNG tự tính lại)

- **Doanh thu chỉ tính đơn `COMPLETED`**, theo **ngày tạo đơn**. PENDING/CANCELLED không vào tiền
  nhưng `statusBreakdown` vẫn đếm.
- `grossSubtotal` = tiền gốc · `discountTotal` = tổng giảm · **`netRevenue = grossSubtotal − discountTotal`**
  · **`revenue = totalAmount`** (đã gồm ship) · `cogs` = giá vốn snapshot lúc bán ·
  `grossProfit = netRevenue − cogs` · `marginPercent = grossProfit / netRevenue × 100`.
- **Không phân trang**: trả trọn `rows` + `total*`; không lồng `data.data` ⇒ **không dùng helper
  `search()`**, không gắn sort `DataTable`.
- ⚠️ `marginPercent` là **`null` khi `netRevenue <= 0`** ⇒ render `—`, đừng `.toFixed()` thẳng.
- ⚠️ **`missingCostQty > 0` ⇒ COGS thiếu ⇒ lãi gộp bị THỔI PHỒNG** — FE cảnh báo ở Dashboard. Dữ liệu
  thật đang `140/143` (hầu hết SKU chưa nhập giá vốn) nên cảnh báo luôn hiện — đúng, không phải bug.

## Tham số & múi giờ

- **`fromDate`/`toDate` BẮT BUỘC ở cả 5 endpoint.** Thiếu ⇒ `400 code:7`; `fromDate > toDate` ⇒ `400`
  **`code:14`** với message không khớp lỗi thật — FE chặn sẵn khoảng sai trước khi gọi.
- ⚠️ **Backend gom nhóm + đếm ô theo GIỜ VN (UTC+7) nhưng nhận tham số UTC** (BE12). FE quy đổi ở
  `lib/report-range.ts` (`toIsoUtc(endOfDay(...))` sinh `T16:59:59Z`). **Test bằng curl phải gửi
  `T16:59:59Z`**, gõ tay `T23:59:59Z` sẽ lệch sang ngày sau giờ VN ⇒ thừa 1 ô ⇒ bị chặn oan. Máy lệch
  múi giờ sẽ sai biên ngày — đã biết, **không tự bù ở FE**.
- **`groupBy`**: `/report/sales` nhận **7** giá trị `DAY|MONTH|YEAR|BRANCH|CHANNEL|STAFF|PRODUCT`;
  `/report/profit` chỉ **5** (không `CHANNEL|STAFF` — gửi vào ⇒ 400; bug trả-sai-im-lặng đã vá 2026-08-30).
- **Trần độ dài kỳ** `error.report.rangeTooLong` (400, code 7): DAY ≤ **31** ô · MONTH ≤ **24** ·
  YEAR ≤ **10**; nhóm phi thời gian không giới hạn. **FE chặn DAY ở 30 — cố ý** (user chốt "không quá
  30 ngày"; backend nới 1 ô là hàng rào phòng thủ).
- **`groupBy` chỉ 1 chiều** (BE14) — "doanh thu theo tháng × chi nhánh" của mockup `01` phải gọi
  1 request/chi nhánh rồi ghép ở FE (`branch-month-chart.tsx`); chỉ SUPER_ADMIN làm được và chỉ an
  toàn khi ít chi nhánh.

## Data-scope (đo thật 3 tài khoản)

- `scope` trả về: `STAFF_SELF | BRANCH | CHAIN`. **`branchId` chỉ SUPER_ADMIN dùng được** —
  STAFF/ADMIN gửi lên **bị bỏ qua im lặng** ⇒ chỉ bày bộ lọc chi nhánh cho SUPER_ADMIN.
- `GET /report/branch-comparison` không nhận `branchId`, DTO không có `scope` — luôn toàn chuỗi.

## Ý nghĩa `key`/`label` theo `groupBy` (BC bán hàng)

`DAY` → `yyyy-MM-dd` · `MONTH` → `yyyy-MM` · `YEAR` → `yyyy` (cắt giờ VN) · `BRANCH`/`STAFF` → `key` =
id, `label` = tên (NV đã xoá ⇒ label rơi về id) · `CHANNEL` → `ONLINE|POS|OTHER` · `PRODUCT` → `key` =
mã SKU, `label` = tên SP.

- ⚠️ `shippingTotal` là `null` khi `groupBy = PRODUCT` (ship thuộc đơn, không chia được về SKU).
- ⚠️ Nhóm `PRODUCT` của BC lãi gộp **không so tuyệt đối được** với nhóm khác: `netRevenue` cấp SKU chỉ
  trừ giảm-**dòng**, không trừ giảm-**chung** ⇒ tổng theo PRODUCT có thể cao hơn. Chỉ dùng xếp hạng tương đối.
- ⚠️ BC xuất-nhập-tồn **trộn 3 mốc thời gian một dòng** — đừng cộng trừ để "kiểm tra":
  `inQty`/`outQty`/`transferOutQty` theo ngày phiếu (chỉ phiếu đã duyệt) · `soldQty` theo ngày đơn ·
  `currentTotal` là tồn **tại thời điểm gọi**. `TRANSFER` chỉ ghi chiều xuất ở chi nhánh nguồn.
- ❗ Lệch tài liệu (BE11): handoff ghi "nhóm PRODUCT ⇒ `orderCount = null`" nhưng API thật **vẫn trả
  số**; chỉ `shippingTotal` null thật. FE khai nullable, phòng cả hai nhánh.
- ⚠️ Báo cáo **không trả danh sách đơn** — khối "Đơn hàng gần đây" mockup `01` lấy từ `POST /order/search`.
- ⚠️ `TopProductRow` = `{skuId, skuCode, productName, itemsSold, netRevenue}` — không danh mục, không
  ảnh (tra thêm `product/search` cũng vô ích vì `categories` luôn rỗng ở list) ⇒ cột "Danh mục" hiện `—`.

## Doanh thu sau hoàn — BE28 (2026-09-13, đo thật)

Backend **giữ nguyên nghĩa GỘP** của `revenue`/`totalRevenue` và **thêm field mới**:

| Endpoint | Field mới |
|---|---|
| `GET /dashboard/summary` | `returnRefundTotal` · `revenueAfterReturns` |
| `POST /report/sales` | row: `returnRefund` · `revenueAfterReturns`; tổng: `totalReturnRefund` · `totalRevenueAfterReturns` |
| `GET /report/branch-comparison` | row: `returnRefund` · `revenueAfterReturns` |

- **Net hoàn** = `Σ(refundAmount − collectAmount)` của phiếu **đã quyết toán** (`refundedAt != null`;
  `REJECTED` không tính), **quy kỳ theo `refundedAt`**. `revenueAfterReturns = revenue − returnRefund`.
  Đo thật: hoàn 500.000 ⇒ `revenue` giữ 6.900.000, `revenueAfterReturns` = 6.400.000.
- ⚠️ **`null` ở nhóm `CHANNEL`/`STAFF`** (và khi lọc `channel`/`staffId`) — không quy chiếu được tiền
  hoàn theo kênh/NV. Gặp `null` ⇒ hiển thị doanh thu gộp, **không** gắn nhãn "sau hoàn".
- ⚠️ Scope `STAFF_SELF` luôn trả `returnRefundTotal = 0` (đo với `staffone`).
- ⚠️ **LÃI GỘP VẪN CHƯA TRỪ HOÀN** — `grossProfit` và toàn bộ `/report/profit` tính trên doanh thu gộp.
  **Tuyệt đối không** lấy `revenueAfterReturns − cogs` suy lãi; chỗ hiện lãi gộp ghi rõ **"trước hoàn"**.
- ⚠️ 🐞 **BE30**: `groupBy = DAY` **làm mất tiền hoàn khi ngày đó không có đơn** (dòng DAY chỉ sinh cho
  ngày có đơn) — `MONTH`/`BRANCH`/`PRODUCT`/`YEAR` + `dashboard/summary` đều đúng. Backend đã code bản
  sửa (dòng riêng cho key chỉ-có-hoàn, `revenueAfterReturns` **có thể ÂM**) nhưng **chưa deploy** —
  đo 2026-09-13 vẫn lỗi. Dựng màn Báo cáo bán hàng thì phải chờ bản này lên server.

## Chưa có (backend ghi "đợt sau")

Export Excel/PDF (`POST /report/{type}/export` — BE13, FE chưa dựng nút "Xuất dữ liệu" của mockup `01`
vì sẽ là nút chết) · giá vốn FIFO/bình quân (hiện `product.cost_price` phẳng) · báo cáo size-curve /
hàng chậm luân chuyển.
