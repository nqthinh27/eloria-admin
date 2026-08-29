# Yêu cầu backend — báo cáo: bổ sung `groupBy: YEAR` + 1 bug cần vá

> **Người gửi:** FE (Eloria Admin) · **Ngày:** 2026-08-30
> **Liên quan:** `docs/api/fe-handoff-phase7.md` §B2/B3 · PLAN Phase 12 mục **BE15**, **BE16**
> **Đã đối chiếu source thật** (`ReportServiceImpl`, `ReportRepository`, 2 ReqDTO, `ReportResource`)
> **và đo API thật** trên server local.

Tài liệu gồm **2 việc độc lập**, có thể làm riêng:

| # | Việc | Mức độ | Ưu tiên |
|---|---|---|---|
| **A** | Thêm `groupBy: YEAR` cho `/report/sales` + `/report/profit` | Tính năng mới, additive | Theo nhu cầu |
| **B** | 🐞 **Vá bug**: `/report/profit` nhận `CHANNEL`/`STAFF` rồi **trả sai dữ liệu trong im lặng** | **Bug đang có trên bản chạy** | **Nên vá sớm** |

---

# PHẦN B — 🐞 Bug: `/report/profit` trả sai dữ liệu khi `groupBy = CHANNEL｜STAFF`

*(Đặt trước vì đây là lỗi đang tồn tại, không phải tính năng mới.)*

## B1. Hiện tượng

Javadoc của `ProfitReportReqDTO` ghi rõ:

```java
// @Schema: "Chiều nhóm: DAY/MONTH/BRANCH/PRODUCT. Mặc định DAY. (CHANNEL/STAFF không hỗ trợ ở BC lãi gộp.)"
```

Nhưng **code không chặn** — `EReportGroupBy` là enum dùng chung 6 giá trị, `@Valid` chỉ kiểm tra
tên enum hợp lệ chứ không biết `/report/profit` chỉ nhận 4. Kết quả: gửi `CHANNEL`/`STAFF` vẫn qua.

**Đo thật 2026-08-30** (`superadmin`, kỳ 2026-01-01 → 2027-01-01):

```http
POST /v1.0/api/report/profit   {"groupBy":"CHANNEL", ...}
→ 200  {"code":1, "groupBy":"CHANNEL",
        "rows":[{"key":"2026-08-14",...},{"key":"2026-08-15",...}, ... 7 dòng]}
```

`groupBy` trong response ghi **`CHANNEL`**, nhưng `rows[].key` lại là **ngày** (`2026-08-14`…) —
**giống hệt** kết quả `groupBy: DAY` (đã so sánh: cùng 7 dòng, cùng bộ key). `STAFF` y hệt.

## B2. Nguyên nhân

`ReportServiceImpl#profitReport` (~dòng 252) dùng chuỗi `if/else` chỉ bắt 3 nhánh, **phần còn lại
rơi hết vào `else` = nhóm theo ngày**:

```java
if (groupBy == EReportGroupBy.PRODUCT)      { ... }
else if (groupBy == EReportGroupBy.MONTH)   { sales = salesByMonth(...);  cogs = cogsByMonth(...);  }
else if (branchGroup /* BRANCH */)          { sales = salesByBranch(...); cogs = cogsByBranch(...); }
else                                        { sales = salesByDay(...);    cogs = cogsByDay(...);    }
//                                            ^^^^ CHANNEL và STAFF rơi vào đây
```

## B3. Vì sao đáng vá

Đây là **sai số liệu âm thầm**, tệ hơn báo lỗi: người dùng bấm "lãi gộp theo kênh bán", hệ thống
trả về lãi gộp **theo ngày** mà vẫn dán nhãn `groupBy: "CHANNEL"`. Không có gì để họ nghi ngờ, và
số tiền thì trông vẫn hợp lý. Nếu đem ra quyết định kinh doanh (kênh nào lãi hơn) thì kết luận sai
hoàn toàn.

## B4. Đề xuất — chọn 1 trong 2

**Cách 1 (khuyến nghị): chặn sớm, trả `400` rõ ràng.** Đúng như Javadoc đã cam kết.

```java
// ReportServiceImpl#profitReport, ngay sau khi resolve groupBy
if (groupBy == EReportGroupBy.CHANNEL || groupBy == EReportGroupBy.STAFF) {
    throw new CustomException(ResponseCode.INVALID_INPUT_DATA,
        "Báo cáo lãi gộp chỉ hỗ trợ nhóm theo DAY/MONTH/YEAR/BRANCH/PRODUCT",
        Constants.SUBKEY.INVALID_INPUT);
}
```

**Cách 2: hỗ trợ thật.** Thêm `cogsByChannel`/`cogsByStaff` (copy `cogsByBranch`, đổi `o.branch_id`
thành `o.channel` / `o.staff_id`) rồi nối vào `if/else`. Nhiều việc hơn, chỉ nên làm nếu nghiệp vụ
thực sự cần *"kênh nào lãi hơn"* — mà theo tôi là **có ích**, nên nếu rảnh thì ưu tiên cách này.

> **FE đang làm gì:** chỉ bày **4** giá trị `DAY|MONTH|BRANCH|PRODUCT` cho báo cáo lãi gộp, đúng
> theo Javadoc ⇒ **người dùng Eloria Admin không chạm được bug này**. Nhưng API là public với mọi
> client (mobile, tích hợp sau này), nên vẫn nên vá ở backend.

---

# PHẦN A — Bổ sung `groupBy: YEAR`

## A1. Bối cảnh

User yêu cầu Dashboard có bộ chọn **đơn vị thống kê: Ngày | Tháng | Năm** (mặc định Ngày), kèm trần
độ dài kỳ **ngày ≤ 30 · tháng ≤ 24 · năm ≤ 10**.

FE đã xong **Ngày**/**Tháng** (map thẳng `DAY`/`MONTH`). **Năm chưa gọi được:**

```java
public enum EReportGroupBy { DAY, MONTH, BRANCH, CHANNEL, STAFF, PRODUCT }   // không có YEAR
```

```http
POST /v1.0/api/report/sales   {"groupBy":"YEAR", ...}
→ 400  {"code":7, "subKey":"error.input.invalid"}
```

⇒ FE tạm **khoá lựa chọn "Theo năm"** (hiện chữ *"chưa hỗ trợ"*, không cho chọn). Backend xong thì
FE **chỉ cần xoá `'YEAR'` khỏi mảng `UNSUPPORTED_GRANULARITIES`** trong `src/pages/Dashboard.tsx`.

### Vì sao không gộp 12 tháng ở FE cho xong?

Cộng các cột tiền thì đúng, nhưng **`marginPercent` thì không**: nó là `grossProfit / netRevenue`,
lấy trung bình 12 tháng ra số **khác** với tính trên cả năm. Gộp ở FE là bịa ra con số sai.
Thêm nữa, xem 10 năm sẽ phải xin 120 dòng `MONTH` rồi vứt 110 — báo cáo **không phân trang**.

## A2. Thay đổi đề xuất (4 file, ~20 dòng, additive)

### A2.1 `datatype/EReportGroupBy.java`

```java
public enum EReportGroupBy {
    DAY,
    MONTH,
    YEAR,     // ⭐ MỚI
    BRANCH,
    CHANNEL,
    STAFF,
    PRODUCT
}
```

> ✅ **An toàn tuyệt đối về vị trí.** Đã kiểm tra toàn bộ chỗ dùng: enum này **chỉ xuất hiện trong
> 4 DTO** (`SalesReportReqDTO`, `SalesReportResDTO`, `ProfitReportReqDTO`, `ProfitReportResDTO`),
> **không có `@Enumerated`, không entity nào persist nó xuống DB** ⇒ không có rủi ro lệch
> `ordinal()`. Thêm ở giữa hay cuối đều được.

### A2.2 `repository/ReportRepository.java` — thêm 2 query

Copy `salesByMonth`, **chỉ đổi `'%Y-%m'` → `'%Y'`** (nhóm sales dùng hằng số chung `SALES_COLS`/
`SALES_WHERE`):

```java
@Query(value = "SELECT DATE_FORMAT(CONVERT_TZ(o.created_date,'+00:00','+07:00'),'%Y') AS k,"
    + SALES_COLS + SALES_WHERE + " GROUP BY k ORDER BY k", nativeQuery = true)
List<Object[]> salesByYear(@Param("fromDate") Instant fromDate, @Param("toDate") Instant toDate,
                           @Param("branchId") String branchId, @Param("channel") String channel,
                           @Param("staffId") String staffId);
```

Copy `cogsByMonth`, cũng chỉ đổi format. ⚠️ Nhóm COGS **viết SQL thẳng trong `@Query`**, không dùng
hằng số chung — nên phải chép đủ:

```java
@Query(value = "SELECT DATE_FORMAT(CONVERT_TZ(o.created_date,'+00:00','+07:00'),'%Y') AS k,"
    + " COALESCE(SUM(CASE WHEN d.cost_amount IS NOT NULL THEN d.cost_amount*d.quantity ELSE 0 END),0) AS cogs,"
    + " COALESCE(SUM(CASE WHEN d.cost_amount IS NULL THEN d.quantity ELSE 0 END),0) AS missing"
    + " FROM order_detail d JOIN order_sale o ON o.id=d.order_id"
    + " WHERE o.status='COMPLETED' AND o.created_date>=:fromDate AND o.created_date<=:toDate"
    + " AND (:branchId IS NULL OR o.branch_id=:branchId)"
    + " GROUP BY k", nativeQuery = true)
List<Object[]> cogsByYear(@Param("fromDate") Instant fromDate, @Param("toDate") Instant toDate,
                          @Param("branchId") String branchId);
```

> Giữ nguyên `CONVERT_TZ(...,'+07:00')` để năm cắt theo **giờ VN**, nhất quán với DAY/MONTH.
> ⚠️ Lưu ý `cogsBy*` **không có** tham số `channel`/`staffId` (khác `salesBy*`) — chép đúng chữ ký.

### A2.3 `service/impl/ReportServiceImpl.java` — thêm 2 nhánh

**Báo cáo bán hàng** (`salesReport`, ~dòng 184) — thêm `case` cạnh `MONTH` trong `switch`:

```java
case YEAR -> {
    for (Object[] r : reportRepository.salesByYear(from, to, branchId, channel, staffId)) {
        rows.add(orderSalesRow(r, label(r[0])));
    }
}
```

**Báo cáo lãi gộp** (`profitReport`, ~dòng 252) — thêm nhánh vào chuỗi `if/else`:

```java
} else if (groupBy == EReportGroupBy.YEAR) {              // ⭐ MỚI
    sales = reportRepository.salesByYear(from, to, branchId, null, null);
    cogs  = index(reportRepository.cogsByYear(from, to, branchId));
} else if (groupBy == EReportGroupBy.MONTH) {
    ...
```

> ⚠️ **Phải đặt `YEAR` TRƯỚC nhánh `else` cuối**, nếu không nó rơi vào `salesByDay` y hệt bug
> `CHANNEL`/`STAFF` ở Phần B.

### A2.4 Cập nhật tài liệu & Javadoc

- `docs/api/fe-handoff-phase7.md` §B2/§B3: thêm `YEAR`, ghi `key` = `yyyy`.
- `@Schema` của **cả 2 ReqDTO** (đang ghi cứng danh sách groupBy trong mô tả) — sửa cho khớp,
  nếu không api-docs sẽ mô tả sai.

## A3. Hợp đồng API sau khi sửa

**Không breaking.** DTO/response giữ nguyên hình dạng, chỉ thêm một giá trị `groupBy` hợp lệ.

```jsonc
// POST /report/sales  {"fromDate":"2020-01-01T00:00:00Z","toDate":"2026-12-31T23:59:59Z","groupBy":"YEAR"}
{
  "groupBy": "YEAR",
  "rows": [
    { "key": "2025", "label": "2025", "orderCount": 412, "itemsSold": 1830, ... },
    { "key": "2026", "label": "2026", "orderCount": 508, "itemsSold": 2110, ... }
  ]
}
```

- `key` = `label` = **`yyyy`** (4 chữ số), sắp tăng dần — cùng quy ước `DAY` (`yyyy-MM-dd`),
  `MONTH` (`yyyy-MM`).
- Áp dụng cho **`/report/sales`** và **`/report/profit`**.
  `/report/inventory` và `/report/branch-comparison` **không có `groupBy`** ⇒ không đụng.

---

# PHẦN C — Xin xác nhận thêm (không chặn)

**Backend hiện KHÔNG giới hạn độ dài kỳ.** `validateRange()` (dòng 402) chỉ kiểm tra:

```java
if (from == null || to == null || from.isAfter(to)) throw ...   // hết, không kiểm tra độ dài
```

⇒ Gọi thẳng API với `groupBy: DAY` + kỳ 5 năm sẽ trả **~1800 dòng trong một response không phân
trang**. FE đã tự chặn (30/24/10) trước khi gọi, nhưng đó chỉ là hàng rào ở client.

Đề xuất backend chặn cùng ngưỡng, trả `400` với subKey riêng — ví dụ `error.report.rangeTooLong` —
để FE hiện đúng thông báo thay vì lỗi chung. *Không gấp, chỉ là phòng thủ ở tầng dưới.*

---

# Checklist nghiệm thu

**Phần B (bug):**
- [ ] `POST /report/profit` với `groupBy: "CHANNEL"` → `400` (cách 1) **hoặc** trả `rows[].key` là
      `ONLINE|POS|OTHER` (cách 2). **Không được** trả key dạng ngày như hiện tại.
- [ ] `groupBy: "STAFF"` → tương tự.
- [ ] 4 giá trị cũ `DAY|MONTH|BRANCH|PRODUCT` **không đổi hành vi**.

**Phần A (YEAR):**
- [ ] `POST /report/sales` `groupBy: "YEAR"` → `200`, `rows[].key` dạng `yyyy`.
- [ ] `POST /report/profit` `groupBy: "YEAR"` → `200`, `marginPercent` tính trên **cả năm**
      (không phải trung bình 12 tháng), `null` khi `netRevenue <= 0`.
- [ ] Năm cắt theo **giờ VN**: đơn lúc `2025-12-31T23:30+07:00` phải thuộc năm `2025`.
- [ ] `totalNetRevenue`/`totalCogs`/`totalGrossProfit` của `YEAR` **khớp** với tổng của `MONTH`
      cùng kỳ (đối chiếu chéo — nếu lệch là query sai điều kiện `WHERE`).
- [ ] Data-scope không đổi: STAFF/ADMIN vẫn bị ép về chi nhánh mình.
- [ ] STAFF gọi `/report/profit` với `YEAR` → vẫn `403`.
