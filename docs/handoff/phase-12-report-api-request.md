# Yêu cầu API báo cáo cho Phase 12 (Dashboard & Báo cáo doanh thu)

> **Ngày:** 2026-08-29 · **Từ:** FE `35.2.eloria-admin` · **Tới:** BE `35.1.eloria-backend`
> **Chặn:** FE Phase 12 · **Tương ứng:** BE `PLAN.md:298` — *Phase 7 — Dashboard & Báo cáo*
> (phase duy nhất của backend chưa ✅)

## 1. Tình trạng

FE đã xong Phase 11 (bán hàng + đơn hàng). Phase kế tiếp theo plan là **Dashboard & Báo cáo doanh
thu** theo mockup `design/01-dashboard-bao-cao.png`, nhưng **backend chưa có endpoint tổng hợp nào**
— đã rà toàn bộ `web/rest/` (21 Resource) và toàn bộ repository (không có `@Query` nào chứa
`SUM`/`GROUP BY`).

**FE không thể tự cộng ở client**, vì 3 lý do đo được từ source:

| Rào cản | Bằng chứng |
|---|---|
| Không có API SUM ⇒ muốn tổng tiền phải tải **hết** đơn của kỳ rồi cộng | không repository nào có `SUM`; `BaseListRes` chỉ có `total` (số dòng) |
| Trần phân trang **5000** ⇒ vượt mốc đó là **sai âm thầm**, không có cách nào biết | `application.yml:129` `max-page-size: 5000` |
| **Không làm được báo cáo theo sản phẩm** | `order/search` gọi `toDto(o, branchNames, false)` (`OrderServiceImpl:136`) ⇒ **`lines` bị lược khỏi kết quả tìm kiếm** |

## 2. Endpoint FE cần (theo đúng thứ mockup vẽ)

Backend đã tự liệt kê ở `PLAN.md:298`; dưới đây là phần FE **thực sự dùng ngay** ở Phase 12,
kèm shape đề xuất.

### 2.1 `GET /dashboard/summary` — hàng 4 KPI card

```
?fromDate=&toDate=&branchId=      (branchId: chỉ SUPER_ADMIN; ADMIN bị ép chi nhánh mình)
```

```jsonc
{
  "revenue":        { "value": 74200000, "previous": 68400000 },  // previous = kỳ liền trước, FE tự tính %
  "orderCount":     { "value": 38, "previous": 36, "online": 22, "pos": 16 },
  "newCustomers":   { "value": 12, "previous": 12 },
  "pendingApproval": { "warehouseLedger": 5 }                     // đổi/trả + chiết khấu: chưa có, để sau
}
```

- **`previous`** để FE hiện "% so hôm qua" mà **không phải gọi API 2 lần**.
- ⚠️ **`revenue` tính theo `completedDate` hay `createdDate`?** Hiện `order/search` lọc theo
  `createdDate` (`OrderServiceImpl:628-658`). Doanh thu nên tính theo **đơn đã hoàn tất**
  — cần backend chốt và ghi rõ vào javadoc.
- **Mục tiêu doanh thu ("Mục tiêu: 80tr")**: backend **chưa có khái niệm target**. Hoặc bổ sung
  cấu hình target theo chi nhánh/tháng, hoặc FE **bỏ dòng này** khỏi mockup — cần chốt.

### 2.2 `POST /report/revenue` — biểu đồ doanh thu 13 ngày

```jsonc
// body: { "fromDate": "...", "toDate": "...", "branchId": null, "groupBy": "DAY" }
{ "data": [ { "date": "2026-08-17", "revenue": 52300000, "orderCount": 31 }, … ] }
```

`groupBy`: `DAY` (biểu đồ 13 ngày) · `MONTH` (biểu đồ so sánh chi nhánh theo tháng).

### 2.3 `GET /report/branch-comparison` — biểu đồ cột nhóm theo tháng

```jsonc
// ?year=2026
{ "months": ["T2","T3",…], "branches": [ { "branchId": "…", "branchName": "…", "revenue": [195000000, …] } ] }
```

### 2.4 Khối "Tình trạng kho"

FE **tự làm được 3/4 dòng** bằng `sku/search` + `stock-item/search` (dùng `total`/`activeTotal`).
**Chỉ thiếu:**

- **"Chậm luân chuyển > 60 ngày"** — không có dữ liệu ngày bán gần nhất theo SKU.
- **"Nhập kho tuần này / Xuất bán tuần này"** (số lượng sản phẩm) — `warehouse-ledger/search` trả
  **`lines: null`**, chỉ `GET /{id}` mới có ⇒ cộng được thì phải N+1 request.

⇒ Xin gộp vào `GET /dashboard/summary` hoặc thêm `POST /report/inventory`.

## 3. Ngoài phạm vi — FE đã tự cắt

- **Giá vốn / lãi gộp**: không có nguồn (`ProductResDTO` không có `costPrice`, kho không lưu giá nhập).
  FE **đã bỏ** khỏi phạm vi Phase 12. Backend có kế hoạch `POST /report/profit` — nếu làm thì phải
  bổ sung cột giá vốn trước.
- **"Hàng chờ duyệt: 3 đổi/trả · 2 chiết khấu"**: **đổi/trả (FE Phase 13)** và **duyệt chiết khấu
  (B8)** đều chưa tồn tại ở backend ⇒ Phase 12 chỉ đếm phiếu kho `WAITING_APPROVAL`.

## 4. Phân quyền

**B9 đã chốt (2026-08-29): Dashboard `minRole = ADMIN`, bỏ nhánh STAFF.**
⇒ Chỉ cần 2 mức phạm vi: **ADMIN** = chi nhánh mình (backend tự ép, như các endpoint khác) ·
**SUPER_ADMIN** = toàn chuỗi + chọn được `branchId`.

## 5. Các phase sau cũng đang chờ backend

| FE Phase | Thiếu gì ở backend |
|---|---|
| **13** Đổi / Trả | `EOrderType.REFUND` là **enum chết** — nơi ghi `type` duy nhất là `OrderServiceImpl:201` set cứng `PURCHASE`. `/cancel` chỉ đảo `paymentStatus`, không phải luồng trả hàng (không có dòng trả, không trả từng phần) |
| **14** Khuyến mại | 3 enum mồ côi (`EPromotionStatus`/`Type`/`Target`) + `OrderDetail.promotionId` luôn `null`; **không có bảng `promotion`** |
| **15** Ca làm việc | `EShiftStatus` không nơi nào dùng; `OrderSale.shiftId` luôn `null`; **không có bảng `work_shift`** (Liquibase chỉ tạo 18 bảng) |

⇒ Thứ tự đề nghị phía backend: **Dashboard/Report trước** (FE đang chờ ngay), rồi 13 → 14 → 15
theo đúng thứ tự FE plan.
