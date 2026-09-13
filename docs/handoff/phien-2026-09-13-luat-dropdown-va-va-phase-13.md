# Bàn giao phiên 2026-09-13 — Luật dropdown tìm kiếm + vá tồn tại Phase 13

> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning có sẵn của shadcn) · `npm run build` pass
> **Đã kiểm chứng bằng API thật** trên backend local (tạo/từ chối phiếu, đo quota, đo RBAC 2 tài khoản).

---

## ✅ Hai việc "còn lại" của phiên 2026-09-12 đã tự hết

| Phiên trước ghi | Hôm nay |
|---|---|
| ⚠️ **BẮT BUỘC**: `staffone` bị xoá mềm, phải sửa bằng SQL | **Đã sống lại** — DB đã được reseed, đăng nhập trả token role `STAFF` bình thường |
| 8 phiếu test `FE-TEST` không dọn được | **Đã sạch** — `/return/search` trả `total: 0` lúc bắt đầu phiên |

### Hai điểm role STAFF chưa kiểm được — nay đã xác minh (tầng API)

Phiên này **không có công cụ điều khiển trình duyệt** nên không xem được tận mắt giao diện; thay vào
đó kiểm đúng phần logic mà UI gate dựa vào, bằng tài khoản `staffone` thật:

| Kiểm | Kết quả | Suy ra cho UI |
|---|---|---|
| `POST /return/search` | **200** | STAFF vào được màn, thấy phiếu của chi nhánh mình |
| `POST /return` *(body thiếu `lines` cố ý)* | **400** `lines: must not be empty` — **không phải 403** | STAFF **có quyền tạo** ⇒ nút "Tạo yêu cầu" hiện đúng *(cách thử này không để lại dữ liệu rác)* |
| `POST /return/{id}/approve` | **403** | |
| `POST /return/{id}/refund` | **403** | `hasMenu = canApprove && …` ⇒ **`(...)` rỗng nên tự ẩn**, cột THAO TÁC chỉ còn nút "Chi tiết" |

⚠️ **Vẫn nên xem tận mắt một lần** khi có trình duyệt — đây là kiểm chứng suy luận từ RBAC, không
phải ảnh chụp màn hình.

---

## Phần 1 — Luật mới: CONVENTIONS mục **5.7** (dropdown/combobox có tìm kiếm)

Ba luật, áp cho **mọi ô chọn có tìm kiếm** dù nằm trong trang, modal hay dropdown khác:

1. **Panel kết quả LUÔN nổi** (`Popover`, hoặc `absolute` + `z-50`) — cấm render danh sách thẳng vào
   luồng trang làm trang/dialog dài thêm mỗi lần tìm.
2. **LUÔN giới hạn chiều cao** (`max-h-64`) và cuộn bên trong.
3. **Nạp hết được ⇒ lọc phía FE; không nạp hết được ⇒ tra phía server, 10 mục mỗi lượt + infinite
   scroll.** Ranh giới là **so `data.length` với `total`**, không phải cảm tính.

**Ngoại lệ (user chốt cuối phiên): ô chọn SKU LUÔN tra phía server**, không xét `total`. SKU là danh
mục lớn nhất và tăng nhanh nhất (mỗi SP sinh hàng chục biến thể màu × size) nên chắc chắn vượt trần;
để nó tự đổi chế độ vào một ngày nào đó nghĩa là hành vi ô chọn **đột ngột khác đi** giữa lúc đang dùng.

### Hạ tầng mới (dùng lại, đừng dựng tay)

| File | Vai trò |
|---|---|
| `hooks/use-paged-search.ts` | **Engine**: debounce · abort · phân trang cộng dồn · `hasMore`. Mọi thứ bên dưới chạy trên nó |
| `components/async-suggest.tsx` | **Ô tra cứu gõ tự do** rồi chọn một bản ghi (tra khách POS, tra đơn gốc) |
| `components/search-select.tsx` | Thêm **chế độ server**: truyền `loadPage` ⇒ tự chuyển, không truyền ⇒ giữ nguyên lọc FE như cũ |
| `hooks/use-sku-options.ts` | Nguồn SKU dùng chung: **luôn** tra server + infinite scroll, ép nhãn `mã — tên` + `hint` màu · size, lọc sẵn `ACTIVE` |

### Kết quả rà soát 5 ô tìm kiếm trong repo

| Nơi | Trước | Sau |
|---|---|---|
| `SearchSelect` (lọc FE) | ✅ đã đúng | giữ nguyên + thêm chế độ server |
| POS tra khách | `size: 8` **một lần**, khách thứ 9 không chạm tới được | `AsyncSuggest`, 10/lượt + infinite scroll |
| Return · tra đơn gốc | ❌ list **inline đẩy dài dialog**, không giới hạn cao, phải bấm nút mới tìm | `AsyncSuggest` nổi, gõ tới đâu tìm tới đó |
| Return · chọn SKU | nạp phẳng 200, **cắt im lặng** | `useSkuOptions` — **luôn** server, 10/lượt + infinite scroll |
| Phiếu kho · chọn SKU | nạp 200 + câu cảnh báo | `useSkuOptions` — **gỡ được cả trần lẫn cảnh báo** |

> 💡 `ledger-form-dialog.tsx` từng ghi *"cách sửa triệt để là tìm kiếm phía server; cần `SearchSelect`
> hỗ trợ async — **ngoài phạm vi bản vá này**"*. Luật 5.7 chính là thứ mở khoá việc đó; TODO đã đóng.

### 3 chi tiết dễ làm sai nếu sửa lại sau này

1. **`AsyncSuggest` cố ý KHÔNG dùng `Popover`** — Radix kéo focus sang panel, người đang gõ dở bị
   cướp con trỏ mỗi lần kết quả về. Bù lại **phải chặn `mousedown`** trên từng mục để `blur` không
   đóng panel trước `click`.
2. **Panel phải gắn với `focused`** — với `minChars = 0`, thiếu điều kiện này thì ô vừa hiện ra đã
   tự bung panel đè lên form.
3. **`SearchSelect` chế độ server phải nhớ nhãn mục đang chọn** (`labelCacheRef`): đổi từ khoá xong,
   mục đang chọn thường không còn trong trang kết quả ⇒ không nhớ thì nút hiển thị trống.

---

## Phần 2 — 5 tồn tại của Phase 13

| # | Vấn đề | Cách sửa |
|---|---|---|
| 1 | 🔴 Dropdown chọn hàng chỉ hiện `productName` ⇒ **67 SKU chỉ có 7 nhãn**, "Áo sơ mi linen" xuất hiện **12 lần giống hệt nhau** | `useSkuOptions` ép nhãn `mã — tên` + `hint` màu · size (giống Phiếu kho) |
| 2 | 🟠 Nút thêm **dòng hàng trả** mang nhãn **"Thêm hàng giao mới"** | Khoá i18n riêng `addReturnLine` (vi + en) |
| 3 | 🟠 Dropdown SKU **không lọc `status`** ⇒ chọn được SKU ngừng KD, lỗi nổ lúc ADMIN duyệt | `useSkuOptions` luôn lọc `ACTIVE` |
| 4 | 🟡 Nạp 200 SKU, **cắt im lặng** khi catalog vượt | Chuyển sang chế độ server + infinite scroll |
| 5 | 🟡 Băng "chờ duyệt" hiện với cả STAFF, dù nội dung là *"Cần ADMIN phê duyệt"* | `loadPending` gate sau `canApprove` |

**Nhân tiện vá thêm:** `ProductListPage` nạp 4 danh mục nền (`category`/`brand`/`color`/`size`) với
`size: 200` mà **không so `data.length` với `total`** — vi phạm luật có sẵn trong CLAUDE.md. Nay có
cảnh báo `refsTruncated`. *(Hiện chưa bao giờ bật: 9/3/5/7 mục.)*

---

## Việc thuộc phạm vi BACKEND

### Backend xử lý xong **cả 3** ngay trong ngày

Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-be26-be28-be29.md`. FE đã **đo thật từng cái** trước
khi sửa.

| Mã | Backend làm gì | FE đã làm |
|---|---|---|
| **BE26** | `GET /order/{id}` trả kèm `lines[].returnedQuantity` | **Gỡ hẳn `loadReturnable()`** — chọn đơn từ `1 + N` request còn **đúng 1**. Đo 3 ca: `PENDING` ⇒ 1 · từ chối ⇒ 0 · đơn chỉ có phiếu `REJECTED` ⇒ 0 |
| **BE29** | `keyword` của `/sku/search` khớp thêm `product.name` + `product.code` | Đổi lại placeholder + câu báo rỗng của ô chọn SKU. Đo: `"linen"` ⇒ 12 · `"Áo sơ mi"` (có dấu) ⇒ 12 · EAN ⇒ 1 |
| **BE28** | Thêm field doanh thu **sau hoàn**, giữ nguyên nghĩa GỘP của `revenue` | Hiện ở **Dashboard**; types cập nhật cho cả `report/sales` + `branch-comparison` |

#### BE28 — chi tiết

Net hoàn = `Σ(refundAmount − collectAmount)` phiếu **đã quyết toán**, quy kỳ theo `refundedAt`.
Đo thật: hoàn 500.000 ⇒ `revenue` giữ **6.900.000**, `revenueAfterReturns` = **6.400.000**.

FE hiển thị ở Dashboard: thẻ **Doanh thu** giữ số **gộp** làm số chính (khớp các kỳ đã xem trước
đây), tiền hoàn xuống dòng mô tả và **chỉ hiện khi thực sự có hoàn**. Thẻ **Lãi gộp** thêm nhãn
*"Chưa trừ hàng trả"* trong kỳ có hoàn.

⚠️ **Lãi gộp vẫn CHƯA trừ hoàn** (giá vốn hàng trả chưa snapshot) ⇒ **đừng** lấy
`revenueAfterReturns − cogs` suy ra lãi.

⚠️ `returnRefund` / `revenueAfterReturns` **là `null`** ở nhóm `CHANNEL`/`STAFF` và ở scope
`STAFF_SELF` ⇒ fallback về doanh thu gộp, **không** gắn nhãn "sau hoàn".

⚠️ **Phần lớn field mới của BE28 chưa có chỗ hiển thị**: FE **chưa từng dựng màn Báo cáo** — chỉ có
Dashboard, và nó chỉ dùng `dashboard/summary` + `report/sales` (cho biểu đồ, vẽ theo `netRevenue` nên
BE28 không đụng tới). `report/profit`, `report/inventory`, `branch-comparison` có sẵn hàm trong
`api/report.ts` nhưng **không màn nào gọi**. Types đã cập nhật sẵn cho khi dựng màn.

### 🆕 BE30 — 🐞 `groupBy=DAY` làm mất tiền hoàn (FE phát hiện khi kiểm thử BE28)

Dòng `DAY` chỉ được sinh cho ngày **có đơn**. Phiếu hoàn rơi vào ngày không bán được gì thì **biến
mất khỏi cả `rows` lẫn `totalReturnRefund`**.

Đo thật — hoàn 500.000 ngày 2026-09-13 (ngày đó không có đơn nào), cùng một khoảng ngày:

| Nguồn | `totalReturnRefund` |
|---|---|
| `dashboard/summary` | **500.000** ✓ |
| `report/sales` MONTH · BRANCH · PRODUCT · YEAR | **500.000** ✓ |
| `report/sales` **DAY** | **0** ❌ |

**Backend đã code bản sửa** (dòng riêng cho mọi key chỉ-có-hoàn: `revenue = 0`,
`returnRefund = net`, **`revenueAfterReturns` ÂM**) — nhưng xem cảnh báo triển khai ngay dưới.

**FE không phải sửa gì** cho BE30: `formatVnd` dùng `Intl.NumberFormat` nên số âm hiện đúng
(`-500.000đ`), và biểu đồ Dashboard vẽ theo `netRevenue` nên dòng chỉ-hoàn chỉ thêm một điểm `0` —
không vỡ, cũng không sai.

---

## ⛔ CẢNH BÁO TRIỂN KHAI — bản vá BE30 + BE27 **chưa lên server đang chạy**

Backend báo *"mvn test BUILD SUCCESS, 22/22 pass"*, nhưng **server đang chạy vẫn là bản cũ**. Đo
thật 2026-09-13 sau khi nhận bàn giao:

| Kiểm | Kỳ vọng (bản mới) | Đo thật trên server |
|---|---|---|
| `report/sales` `DAY` → `totalReturnRefund` | 500.000 | **0** ❌ |
| `report/sales` `DAY` → có dòng `2026-09-13` | có | **không** ❌ |
| `/work-shift/search` `sort=staffName` | 200 | **500** ❌ |
| `/return/search` `sort=staffName` | *(không thuộc bản vá)* | 500 |

*(Đối chứng: `MONTH`/`BRANCH`/`PRODUCT`/`YEAR` vẫn trả đúng 500.000 ⇒ không phải lỗi cách gọi, mà
là **code mới chưa được nạp**.)*

⇒ **Backend cần build/chạy lại.** Tình huống này đã gặp trước đây với `DELETE /sku/{id}`
(source có, server chưa có). Chạy lại xong thì FE **mở sort 2 cột** ở màn Ca làm việc — hiện vẫn
khoá vì gọi thật còn 500.

⚠️ **Trùng mã "BE27" giữa hai bên**: BE27 **trong tài liệu backend** = sort `staffName`/`branchName`
của **`/work-shift/search`**. BE27 **trong PLAN này** = sort `staffName`/`lines` của
**`/return/search`** — **hai việc khác nhau**, và cái sau **backend chưa đụng tới**.

⚠️ Ghi chép cũ trong CLAUDE.md *"`/work-shift/search` sort `staffName`/`branchName` đều 500"*
**sai một nửa**: đo lại thấy **`branchName` trả 200 và sắp đúng** (ASC/DESC đảo ngược nhau) — đã sửa
lại tài liệu.

### Còn lại

| Mã | Trạng thái |
|---|---|
| **BE27** (PLAN) | ⏳ Vẫn còn — sort `staffName`/`lines` trên `/return/search` ⇒ **500** (đo lại 2026-09-13); 2 cột giữ `enableSorting: false` |
| **BE30** | ⚠️ Backend đã code, **chưa deploy** — xem cảnh báo triển khai ở trên |
| Sort ca làm việc | ⚠️ Backend đã code, **chưa deploy** — mở sort 2 cột sau khi server chạy bản mới |

**Còn tồn phía backend, cần PO quyết (có schema change):** lãi gộp *return-aware* · quy chiếu tiền
hoàn theo `CHANNEL`/`STAFF` (nay vẫn `null`).

---

## Dữ liệu test còn lại trong DB

5 phiếu `TH-CNTT-20260913-001…005`:

- **`-001` → `-004`: `REJECTED`** ⇒ không phát sinh tiền, không đụng tồn kho.
- **`-005`: `COMPLETED`, đã hoàn 500.000** — **cố ý giữ lại**, đây là phiếu dùng để chứng minh BE28
  thật sự đổi số (`revenueAfterReturns` = `revenue − 500.000`). Nhận hàng ở tình trạng **`DEFECTIVE`**
  nên **tồn kho không bị cộng thêm** — kiểm chứng: `SP001-BK-AO-L` = 82, `SP002-BK-AO-M` = 90, y như
  trước khi bắt đầu phiên.

⚠️ Vì `-005` đã quyết toán, **Dashboard kỳ chứa ngày 2026-09-13 sẽ hiện "Sau hoàn" thấp hơn doanh
thu 500.000** — đúng chứ không phải lỗi. Muốn số sạch thì xoá bản ghi thẳng ở DB (phiếu đổi/trả là
bản ghi lịch sử, backend cố ý không có `DELETE`).

## Phần chưa làm

- **Xem tận mắt trên trình duyệt**: cả luật 5.7 lẫn 2 điểm role STAFF mới chỉ kiểm ở tầng API và
  type-check. Cần một lượt bấm thật: cuộn tới đáy dropdown để thấy nạp thêm, và đăng nhập `staffone`
  vào `/returns`.
- **4 danh mục nền ở `ProductListPage`** (danh mục / thương hiệu / màu / size) vẫn nạp phẳng 200 —
  **đúng luật 5.7** vì tổng < 200 nên "trả về hết ⇒ lọc phía FE", và nay đã có cảnh báo nếu vượt.
  Khác SKU ở chỗ đây là master data tăng chậm, không có lý do ép sang server ngay. Hạ tầng đã sẵn.
