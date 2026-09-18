# CONVENTIONS — Eloria Admin (Frontend)

> Tài liệu quy ước chung cho **mọi agent / mọi phiên làm việc**.
> **Đọc file này TRƯỚC khi viết code.** Nếu một thay đổi mâu thuẫn với tài liệu này,
> phải hỏi lại người dùng thay vì tự quyết định.
>
> Các mục 5.1 · 5.2 · 5.3 · 5.6 và 10 chỉ giữ **lõi luật** ở đây — bản chi tiết + checklist thi công
> đã đóng gói thành skill (xem bảng ở mục 8). **Số mục KHÔNG được xáo trộn** — code đang tham chiếu
> "CONVENTIONS mục x.y" ở ~60 chỗ.

Stack hiện tại: React 19 + TypeScript + Vite + React Router 7 + TailwindCSS 4 + shadcn/ui (Radix).

---

## 1. Nguồn sự thật cho API & DTO

- API doc (OpenAPI/Swagger JSON): **http://localhost:8080/v3/api-docs/api** — khảo sát gần nhất
  **2026-09-13** (118 path). Kết quả đã chắt lọc vào **[docs/backend/](docs/backend/)** (quy ước chung
  + một file mỗi domain) và [PLAN.md](PLAN.md) mục A/B.
- **Mọi DTO, endpoint, tên field, kiểu dữ liệu, enum ở frontend PHẢI khớp 100% với tài liệu này.**
  Không được tự bịa field, tự đổi tên field, tự thêm field "cho tiện".
- Nếu tài liệu thiếu thứ gì frontend cần → **báo lại người dùng**, không tự chế API giả.
  Cần xin backend ⇒ skill **request-backend** (đo thật lấy bằng chứng + đăng ký BE# ở PLAN mục B).
- URL trên **có thể thay đổi**. Agent **không tự ý fetch lại** trừ khi được yêu cầu, và **không
  hardcode** URL này vào code (base URL runtime chỉ qua biến môi trường `VITE_API_BASE_URL`).
- Khi được yêu cầu đọc lại api-docs ⇒ skill **update-api-doc**: diff path, đo API thật đủ role,
  đồng bộ `src/types`, cập nhật `docs/backend/` + `docs/history.md`.

---

## 2. Chiến lược xác thực (KHÔNG được tự đổi)

| Thành phần | Nơi lưu | Ai quản lý |
|---|---|---|
| **Access token** | **In-memory** (biến trong module/state, KHÔNG localStorage / sessionStorage) | Frontend |
| **Refresh token** | **HttpOnly Cookie** | **Backend** |

Quy tắc bắt buộc:

- Access token **chỉ nằm trong bộ nhớ**. Reload trang ⇒ mất token ⇒ gọi refresh để lấy lại.
- Refresh token do backend set/xoá qua cookie. Frontend **không đọc, không ghi, không parse** cookie này.
- ⚠️ **Backend chỉ set cookie `refresh_token` khi request login có `rememberMe: true`** (đã kiểm chứng).
  ⇒ Form đăng nhập **luôn gửi `rememberMe: true`** và **không hiển thị checkbox "Ghi nhớ đăng nhập"**
  (user đã chốt). Không tự đổi thành `false` hay thêm checkbox.
- Cookie thực tế: `path=/v1.0/api/refresh; HttpOnly; Max-Age=864000` (10 ngày), **không
  `SameSite`/`Secure`** ⇒ trình duyệt mặc định `Lax`, bắt buộc same-origin (Vite dev proxy).
- Mọi request gọi API phải bật `credentials: 'include'` (fetch) / `withCredentials: true` (axios).
- Khi access token hết hạn (401) → gọi refresh **một lần**, cơ chế **single-flight** (nhiều request
  401 cùng lúc chỉ sinh một lần refresh, còn lại xếp hàng), sau đó **retry** request gốc.
  Refresh thất bại → xoá state auth → điều hướng `/login`.
- **Agent KHÔNG được tự đổi chiến lược này** (chuyển token sang localStorage, tự lưu refresh token,
  đổi scheme…) nếu chưa có yêu cầu rõ ràng từ người dùng.
- **Tài khoản test dev** (4 tài khoản, 3 role): [docs/backend/README.md](docs/backend/README.md)
  mục "Tài khoản test" — chỉ dùng gọi thử API local, **không hardcode vào code**, không đặt làm
  giá trị mặc định form đăng nhập.

---

## 3. Định dạng response của Backend

> Backend **đã chuẩn hoá toàn bộ response**: **mọi** endpoint bọc `BaseResponse<T>`, kể cả
> `/authenticate` và `/refresh`. Ngoại lệ duy nhất là vài endpoint trả file (PNG/CSV) —
> danh sách ở [docs/backend/README.md](docs/backend/README.md).

### 3.1 Thành công

```json
{
  "code": 1,
  "message": "Thành công",
  "data": { }
}
```

- **`code === 1` ⇒ thành công** (`ResponseCode.TRANSACTION_SUCCESSFUL`), **không phải `0`**.
  Các mã khác là mã lỗi nghiệp vụ (3 = đã tồn tại, 4 = không tồn tại, 15 = xác thực thất bại, 24 = không đủ quyền…).
- Dữ liệu nghiệp vụ **luôn nằm trong `data`**; có thể là object, mảng, chuỗi hoặc `null`.
- API danh sách trả `data` dạng bao ngoài `{ total, data: [...] }` — tức **`data.data`** mới là mảng
  bản ghi; một số module có thêm `activeTotal`/`inactiveTotal` (danh sách ở docs/backend/README.md).
- Hàm gọi API dùng chung phải **tự bóc `data`**; UI không đụng vào `code`/`message` khi thành công.
- Thao tác ghi thành công → **toast thành công** với **message riêng từng màn** ("Tạo sản phẩm thành
  công"…), không dùng câu chung. Thao tác chỉ đọc **không** toast.

### 3.2 Thất bại — `ErrorResponse`

```json
{
  "code": 0,
  "message": "string",
  "logInfo": "string",
  "subKey": "string"
}
```

- `subKey` dạng `a.b.c` — ví dụ `error.password.incorrect`. FE **bắt buộc** có file message chung map
  `subKey` → chuỗi i18n, key phẳng đúng `subKey` backend.
- Thứ tự hiển thị lỗi: ① `subKey` có trong i18n ⇒ bản dịch → ② ngược lại ⇒ `message` backend →
  ③ không có cả hai ⇒ message mặc định hệ thống.
- `logInfo` **chỉ để log/debug**, tuyệt đối không hiển thị cho người dùng cuối.
- Thêm `subKey` mới ⇒ bổ sung key vào **tất cả** file ngôn ngữ đang hỗ trợ (`vi` + `en`).

### 3.3 Quy ước `status` — 3 giá trị, **hai cơ chế tách biệt**

Rule chung cho **mọi** entity có cột `status` (chốt với user 2026-08-09):

| Giá trị | Ý nghĩa | Đặt qua |
|---|---|---|
| `1` | ACTIVE | `POST /<module>/update-status` |
| `0` | INACTIVE | `POST /<module>/update-status` |
| **`-1`** | **DELETED (xoá mềm)** | **`DELETE /<module>/{id}`** — API riêng |

- **Bật/tắt và xoá là hai đường khác nhau, KHÔNG dùng chung API.** `UpdateStatusReqDTO` bị chặn
  `@Min(0) @Max(1)` ⇒ gửi `status: -1` luôn trả `400`. Muốn xoá **phải** gọi `DELETE`.
- Bản ghi `-1` bị **ẩn khỏi mọi truy vấn** ⇒ FE không bao giờ nhận được ⇒ **không dựng bộ lọc/badge
  "Đã xoá"**; type FE chỉ cần 0/1.
- Chi tiết (entity nào xoá mềm, module nào hard-delete):
  [docs/backend/README.md](docs/backend/README.md) mục "`status` 3 giá trị".

---

## 4. Hàm gọi API dùng chung (bắt buộc)

- **Mọi** lời gọi API đi qua **một** lớp client dùng chung: `src/lib/api-client.ts` +
  service theo domain tại `src/api/<domain>.ts`.
- **Cấm** gọi `fetch` / `axios` trực tiếp trong component, page hay hook nghiệp vụ.
- Client dùng chung chịu trách nhiệm:
  - Base URL từ `VITE_API_BASE_URL`, header `Content-Type`, `Accept-Language` (theo i18n hiện tại).
  - `Authorization: Bearer <token in memory>`; gửi cookie (`credentials: 'include'`).
  - Bóc response thành công (`code === 1` ⇒ trả `data`), chuẩn hoá lỗi về shape `ErrorResponse`.
  - Xử lý mặc định theo HTTP status:
    | Status | Hành vi mặc định |
    |---|---|
    | **401** | Refresh (single-flight) → retry; thất bại ⇒ clear auth + redirect `/login` |
    | **403** | Toast "Không có quyền truy cập" + điều hướng 403 / giữ màn tuỳ ngữ cảnh |
    | **404** | Trả lỗi cho caller; màn chi tiết hiển thị "Không tìm thấy" |
    | **422 / 400** | Map lỗi validate về từng field của form |
    | **5xx** | Toast lỗi hệ thống chung, log `logInfo` ra console (chỉ dev) |
    | **Network / timeout / abort** | Toast lỗi kết nối; abort do huỷ request thì bỏ qua im lặng |
  - Cho caller **opt-out** xử lý mặc định (`skipErrorToast`…) khi màn cần tự xử lý.
- Không lặp lại logic 401/403/500 ở từng màn. Cần hành vi khác ⇒ mở rộng client dùng chung.

---

## 5. UI / UX

- **Tuân theo thiết kế trong [design/](design/) — chi tiết ở mục 6.** Không tự sáng tạo layout,
  đổi bố cục/màu/icon khi chưa được yêu cầu.
- Dùng component sẵn có trong [src/components/ui/](src/components/ui/) (shadcn/ui). Cần component
  mới ⇒ thêm đúng chuẩn shadcn, không viết tay trùng chức năng.
- Style bằng **Tailwind utility classes**; merge class bằng `cn()`. Không CSS rời rạc, không inline
  style trừ giá trị động.
- **Responsive — ưu tiên: desktop → tablet → mobile.** Desktop (≥`lg`) + tablet (`md`–`lg`) bắt buộc
  đúng thiết kế; **mobile (<`md`) chỉ cần "không vỡ"** (không tràn ngang, không đè chữ, vẫn bấm được).
  Bảng cho **scroll ngang trong khung** khi hẹp; sidebar thu gọn dùng [use-mobile.ts](src/hooks/use-mobile.ts).
- **Chỉ light theme** (đúng mockup). Không dark theme, không nút chuyển theme. Vẫn **bắt buộc dùng
  token màu** trong [src/index.css](src/index.css), không hardcode hex.
- Trạng thái màn hình đầy đủ: **loading (skeleton) / empty / error / success**.
- **Không gọi trùng API trong CÙNG một màn — nhưng KHÔNG cache giữa các màn** (chốt 2026-08-09).
  Vào màn nào gọi đủ API màn đó để luôn có dữ liệu mới:
  - **Mỗi endpoint chỉ gọi đúng 1 lần cho một lần vào màn** (đừng vừa `size=10` cho bảng vừa
    `size=200` cho dropdown cùng tài nguyên — nạp một lần rồi lọc/phân trang client khi danh sách nhỏ).
  - `BranchProvider` **cố ý không tự nạp** khi đăng nhập — màn nào cần thì gọi `refresh()` khi vào màn.
  - **Mọi `useEffect` gọi API phải truyền `AbortSignal` + huỷ trong cleanup**; trong `catch`/`finally`
    nhớ `if (signal?.aborted) return`. Các hàm `*Api.search()` nhận `signal` ở tham số thứ 3.
  - Đo bằng tab Network: mở một màn, **không endpoint nào lặp 2 lần** (`GET /account/me` 2 lần lúc mở
    app là bình thường: 401 ⇒ refresh ⇒ retry).
- **`<StrictMode>` BẬT và không tắt khi build** — React tự loại bỏ ở production. Request nhân đôi khi
  dev = **effect chưa idempotent** (thiếu AbortController) ⇒ **sửa effect**, đừng tắt StrictMode.
  Đo số request thật: `npm run build && npx vite preview`.
- ⚠️ **`bg-background` KHÔNG phải màu trắng** — là **xám nền trang** (`#F1F5F9`); trắng là
  **`bg-card`**/`bg-popover`. Bản shadcn gốc dùng `bg-background` cho `DialogContent`/`SheetContent`/
  `Button variant="outline"` ⇒ **đã sửa thành `bg-card`**; `npx shadcn add` component mới phải rà lại.
- ⚠️ **`SelectContent` đã đổi mặc định sang `position="popper"` + `side="bottom"` + `align="start"`**
  (2026-08-30, user chốt: dropdown hiển thị dưới box chính — chế độ `item-aligned` gốc đè lên trigger).
  Sửa **một chỗ** ở `components/ui/select.tsx`; đồng thời bỏ `h-[var(--radix-select-trigger-height)]`
  ở Viewport (class gốc ép panel cao 1 dòng). **Không** thêm `sideOffset`, **không** đặt
  `avoidCollisions={false}`. `npx shadcn add` ghi đè thì áp lại.
- **Bố cục hàng công cụ màn danh sách** (chốt 2026-08-28): nút **tác động dữ liệu** (Thêm · Xuất ·
  Nhập…) ⇒ **`PageHeader`** slot `actions`; nút **điều khiển bảng** (Tải lại · Hiển thị cột) ⇒
  **`DataTableToolbar`** slot `tableControls`, cùng hàng search/filter (trái: search + Select;
  phải: cụm điều khiển). Chi tiết + lý do: skill **create-table**.
- **Droplist danh sách dài dùng [`SearchSelect`](src/components/search-select.tsx)** (tìm kiếm bỏ dấu,
  khớp tên lẫn mã, chọn 1/nhiều). Danh sách ngắn (<8) dùng `Select` thường. Phải phân trang ⇒ search
  phía server (mục 5.7).
- **Đa ngôn ngữ VI + EN từ đầu.** Mọi text qua i18n, **không hardcode chuỗi trong JSX**. Mặc định `vi`;
  key mới bổ sung **cả `vi` và `en`**. Bộ chuyển ngôn ngữ ở top bar, trái chuông thông báo
  (bổ sung ngoài mockup, style bám top bar).
- Accessibility cơ bản: `label` cho input, `aria-*` cho control, điều hướng bàn phím.

### 5.1 Sau khi ghi dữ liệu ⇒ **nạp lại danh sách, GIỮ NGUYÊN ngữ cảnh** (chốt 2026-08-28)

Áp cho **mọi** hành động đổi dữ liệu (create/update/delete/update-status/assign-role/submit/approve/
reject/tạo đơn/thu tiền/kiểm kê…):

- Thành công ⇒ **gọi lại đúng API danh sách của màn** — không để UI hiển thị dữ liệu cũ chờ F5.
- **Giữ nguyên toàn bộ ngữ cảnh bảng**: `page`, `size`, `sort`, filter, `keyword`, tab, **vị trí
  scroll**. **Cấm `setPage(1)` sau khi ghi** (`setPage(1)` chỉ dành cho đổi filter/từ khoá).
- Xoá bản ghi cuối trang cuối ⇒ kẹp `page` về trang cuối còn dữ liệu.
- Màn nhiều danh sách liên quan ⇒ nạp lại **tất cả** danh sách bị ảnh hưởng.
- Ngoại lệ duy nhất: thao tác không đổi thứ đang hiển thị (vd `reset-password`) — ghi chú lý do tại chỗ.

Cách làm chuẩn + chi tiết: skill **create-table**.

### 5.2 Bảng danh sách — năng lực bắt buộc (chốt 2026-08-28)

Mọi bảng dựng bằng [`DataTable`](src/components/data-table/data-table.tsx) dùng chung
(tham chiếu ProTable của Ant Design), đủ 3 năng lực:

1. **Nút Tải lại** — cùng hàng search/filter; giữ nguyên page/size/sort/filter/scroll; phản hồi đủ
   3 lớp (icon xoay · bảng mờ + spinner đè lên **dữ liệu cũ**, không nháy skeleton · toast khi xong,
   qua `tableState.runRefresh`). Reload **sau mutation** không toast.
2. **Bật/tắt cột** — cạnh nút Tải lại; cột khoá cứng (`enableHiding: false`) cho dải ghim + cột thao
   tác; cột ít dùng **ẩn sẵn** qua `useTableState`, không bỏ hẳn.
3. **Sort theo cột** — **chỉ mở cho cột backend thực sự sort được** (whitelist:
   [docs/backend/README.md](docs/backend/README.md) mục Sort — field DTO-only sort là **HTTP 500**),
   và là **sort phía server** (`field,ASC|DESC`). Cấm sort mặc định TanStack chạy tự do. Tên field là
   field DTO backend (`meta.sortField` khi lệch). **Đổi sort ⇒ về trang 1.**

Trạng thái bảng (cột ẩn, sort) là **state của màn**, không lưu localStorage.
Chi tiết + checklist thi công: skill **create-table**.

### 5.3 Cột THAO TÁC — **"Chi tiết" mặc định; `(...)` chỉ khi có hành động** (chốt 2026-09-07, làm rõ 2026-09-12)

- Cột THAO TÁC của mọi `DataTable` chỉ có **đúng 2 thành phần theo thứ tự**: ① nút **"Chi tiết"**
  (icon `Eye`, mở modal xem — **luôn có, không ẩn theo quyền**, không bao giờ nằm trong menu)
  ② menu **`(...)`** gom toàn bộ hành động còn lại — **không còn hành động nào thì KHÔNG vẽ nút**
  (tính theo *cả quyền lẫn trạng thái bản ghi*; không vẽ nút rỗng/disabled).
- **Cấm** nút hành động thứ ba trực tiếp trên cột — kể cả khi chỉ có một hành động.
- Modal chi tiết theo [`DetailModal`](src/components/detail-modal.tsx): xem có 2 nút "Sửa" + "Đóng";
  "Sửa" = **inline edit tại chỗ**; field không sửa được hiện dạng `disabled`, không ẩn. Bản ghi không
  có gì để sửa ⇒ modal chỉ đọc.
- Cột luôn `enableHiding: false` + `enableSorting: false` + `size` cố định + `meta.align: 'center'`;
  **tiêu đề `THAO TÁC` bắt buộc** (mục 5.6 cấm cột không nhãn).
- Màn không phải bảng (card grid) không áp rule này. Bảng không có bản ghi mở được (Tồn kho — không
  có `GET /stock-item/{id}`) ⇒ **bỏ hẳn cột THAO TÁC**.

Chi tiết + pattern `hasMenu`: skill **create-table**.

### 5.4 Định dạng ngày giờ hiển thị — **`dd/MM/yyyy`**, có giờ thì **`HH:mm:ss dd/MM/yyyy`** (chốt 2026-09-07)

Áp cho **mọi** chỗ người dùng nhìn thấy ngày/giờ: ô nhập, bảng, modal, hoá đơn, báo cáo.

| Loại | Định dạng hiển thị | Helper |
|---|---|---|
| Chỉ ngày | `dd/MM/yyyy` | `formatDate()` |
| Ngày + giờ | **`HH:mm:ss dd/MM/yyyy`** (giờ **đứng trước** ngày) | `formatDateTime()` |

- ⚠️ **`<Input type="date">` bị CẤM** ở ô nhập ngày — input date trình duyệt hiển thị theo locale máy,
  không ép được `dd/MM/yyyy`. Dùng [`DateInput`](src/components/date-input.tsx) (ô text + nút lịch);
  giá trị trong form vẫn `yyyy-MM-dd`.
- Giá trị **gửi backend không đổi** (ISO-8601 UTC hoặc `yyyy-MM-dd` tuỳ DTO) — rule chỉ nói phần hiển thị.
- **Không tự viết lại logic format** — luôn gọi helper ở [`src/lib/format.ts`](src/lib/format.ts).

### 5.5 Ô nhập & hiển thị số tiền — **có dấu ngăn cách, gửi backend số thuần** (chốt 2026-09-08)

| Nơi | Định dạng | Cách làm |
|---|---|---|
| **Hiển thị** | `1.500.000đ` | `formatVnd()` |
| **Ô nhập** | `1.500.000` + hậu tố **`đ`** bên phải trong ô | [`MoneyInput`](src/components/money-input.tsx) |
| **Gửi API** | `1500000` — số thuần | `Number(value)` |

- ⚠️ **`<Input type="number">` bị CẤM cho ô tiền** (không chèn được dấu ngăn cách). `MoneyInput` có
  `value`/`onChange` là **chuỗi chữ số thuần**.
- **Mọi ô nhập tiền BẮT BUỘC có hậu tố `đ`** trong ô; ô đổi được đơn vị (`%` ↔ `đ`) thì hậu tố đổi theo.
- ⚠️ Dấu `.` tiếng Việt là **ngăn cách hàng nghìn**, không phải thập phân — `parseMoneyInput` bỏ hẳn
  dấu chấm (`1.500` = một nghìn năm trăm). VNĐ không có phần lẻ.
- **Ô phần trăm không dùng `MoneyInput`** (giữ `<Input inputMode="decimal">` + hậu tố `%`).
  **Ô số lượng** giữ `type="number"`.
- Helper: [`src/lib/money-input-format.ts`](src/lib/money-input-format.ts) + [`src/lib/format.ts`](src/lib/format.ts).

### 5.6 Cấu trúc bảng — **STT · tiêu đề · căn lề · thứ tự & ghim cột · cột ẩn sẵn** (chốt 2026-09-12)

Năm luật cho **mọi `DataTable`** — 3 luật đầu do `DataTable` **ép cứng**, màn hình không đặt khác được:

1. **Cột đầu LUÔN là STT** — `DataTable` tự chèn `__index` (không khai ở màn), đánh số theo vị trí
   hiển thị trong toàn bộ kết quả (`(page−1)×size + vị trí + 1`); không sort, không ẩn được.
2. **Mọi cột bắt buộc có tiêu đề** (cấm `header: ''`), tiêu đề **căn giữa** + **CHỮ HOA** (DataTable
   áp `uppercase`, kể cả nút sort) — không bọc `header` trong div căn lề.
3. **Căn lề nội dung qua `meta.align`** (không bọc div trong `cell`): STT/THAO TÁC/badge ⇒ `center` ·
   tiền/số ⇒ `right` + `tabular-nums` · text ⇒ `left`.
4. **Thứ tự mở đầu: STT → cột mã → cột tên, và ghim trái 3 cột đó** khi cuộn ngang. **Cột ghim BẮT
   BUỘC khai `size`** (vị trí tính bằng tổng size, không đo DOM) + `enableHiding: false`. DTO không có
   `code` ⇒ chọn trường định danh có nghĩa (không UUID) + ghi lý do tại chỗ.
5. **Ẩn sẵn cột ít dùng** qua `useTableState(sorting, {<id>: false})`, mỗi cột ẩn kèm **một câu lý
   do**; bảng mà mọi cột đều quan trọng thì hiện hết.

Bảng căn lề đầy đủ + hiện trạng cột ẩn sẵn từng màn + cạm bẫy thi công: skill **create-table**.

### 5.7 Dropdown / combobox có tìm kiếm — **panel NỔI · giới hạn chiều cao · 10 mục mỗi lượt** (chốt với user 2026-09-13)

Áp cho **mọi ô chọn có tìm kiếm**, dù nằm trong trang, trong modal hay trong một dropdown khác.
Ba luật này do hạ tầng **ép cứng**, màn hình không đặt khác được:

#### ① Kết quả LUÔN **nổi lên trên** nội dung, không chiếm chiều dài trang

Panel kết quả phải là lớp nổi (`Popover`, hoặc `absolute` + `z-50` neo theo ô nhập). **Cấm** render
danh sách kết quả thẳng vào luồng trang: mỗi lần tìm là trang/dialog dài thêm một đoạn, nút bấm bên
dưới bị đẩy đi, người dùng mất chỗ đang nhìn.

#### ② LUÔN giới hạn chiều cao panel và cho **cuộn bên trong**

`max-h-64` + `overflow-y-auto` trên danh sách. Không có trần này thì 200 kết quả kéo dài panel ra
khỏi màn hình, và người dùng phải cuộn cả trang để xem hết một dropdown.

#### ③ Nạp hết được ⇒ **lọc phía FE**; không nạp hết được ⇒ **tra phía server, 10 mục mỗi lượt + infinite scroll**

Ranh giới là **so `data.length` với `total`** của backend, không phải cảm tính:

| Tình huống | Cách làm |
|---|---|
| `total <= size` đã xin (nạp hết được) | Giữ nguyên danh sách ở client, **`SearchSelect` lọc phía FE** — tìm khớp cả nhãn lẫn `hint`, không tốn request nào |
| `total > size` (không nạp hết được) | **Tra phía server**: mỗi lượt **10 phần tử**, cuộn tới đáy mới nạp tiếp |
| **Danh mục SKU** | **LUÔN tra phía server**, không xét `total` — xem ngoại lệ ngay dưới |

⚠️ **Ngoại lệ bắt buộc: ô chọn SKU LUÔN tra phía server** (user chốt 2026-09-13), dù hôm nay catalog
còn nhỏ. Lý do: SKU là danh mục **lớn nhất và tăng nhanh nhất** (mỗi sản phẩm sinh ra hàng chục biến
thể màu × size) nên chắc chắn sẽ vượt trần — để nó tự đổi chế độ vào một ngày nào đó nghĩa là hành vi
ô chọn **đột ngột khác đi** ngay giữa lúc đang dùng. Dùng [`useSkuOptions`](src/hooks/use-sku-options.ts),
đừng tự gọi `skuApi.search` để dựng options.

⚠️ **Tuyệt đối không "xin một trang thật to rồi lọc phía FE"** — backend **cắt IM LẶNG phần vượt trần
`size`** (trần đã nâng 200 → 5000 từ BE1, vẫn cắt im lặng — xem
[docs/backend/README.md](docs/backend/README.md)): không lỗi, không cảnh báo. Danh mục vượt trần sẽ
**thiếu hàng mà gõ tìm cũng không ra**, người dùng tưởng bản ghi đó không tồn tại.

#### Hạ tầng dùng chung — dùng lại, đừng dựng tay

| Thành phần | Dùng khi |
|---|---|
| [`usePagedSearch`](src/hooks/use-paged-search.ts) | Engine: debounce · abort · phân trang cộng dồn · `hasMore`. Mọi thứ bên dưới đều chạy trên nó |
| [`SearchSelect`](src/components/search-select.tsx) | **Combobox** có trạng thái "đang chọn" hiện trên nút. Truyền `loadPage` ⇒ tự chuyển sang chế độ server |
| [`AsyncSuggest`](src/components/async-suggest.tsx) | **Ô tra cứu gõ tự do** rồi chọn một bản ghi (tra khách ở POS, tra đơn gốc khi lập phiếu đổi/trả) |
| [`useSkuOptions`](src/hooks/use-sku-options.ts) | Nguồn SKU dùng chung: **luôn** tra server + infinite scroll, ép nhãn `mã — tên` + `hint` màu · size, lọc sẵn `ACTIVE` |

⚠️ `AsyncSuggest` **cố ý không dùng `Popover`**: Radix kéo focus sang panel, người đang gõ dở bị cướp
con trỏ mỗi lần kết quả về. Bù lại phải tự chặn `mousedown` trên từng mục để `blur` không đóng panel
trước `click`.

⚠️ Ô chọn SKU **bắt buộc hiện mã SKU trong nhãn**, không chỉ tên sản phẩm: một sản phẩm sinh ra hàng
chục SKU **trùng hệt tên** (đo thật 2026-09-13: 67 SKU chỉ có **7** tên khác nhau, riêng *"Áo sơ mi
linen"* có **12** SKU). Chỉ hiện tên là người dùng không thể biết mình chọn màu/size nào.

⚠️ Mọi ô chọn hàng hoá phải lọc **`status: ACTIVE`**. SKU đã ngừng kinh doanh mà vẫn chọn được thì
lỗi chỉ nổ ở bước sau (duyệt phiếu mới trừ tồn) — **người tạo phiếu không phải người lãnh lỗi**.

✅ **Tìm SKU khớp cả mã lẫn tên sản phẩm** — `keyword` của `POST /sku/search` soi `sku.id` · `ean` ·
`product.name` · `product.code` (**BE29**, backend mở rộng 2026-09-13). Nhờ vậy tra phía server
**không còn kém** lọc phía FE, và đó chính là điều kiện để ô chọn SKU luôn chạy server mode.

---

## 6. Thiết kế nguồn — folder `design/`

Folder [design/](design/) chứa **bản thiết kế chốt** của hệ thống (ảnh PNG mockup).
Đây là **nguồn sự thật về giao diện**, tương đương vai trò của api-docs với dữ liệu.

### 6.1 Danh sách màn hình

| File | Màn hình |
|---|---|
| `00-dang-nhap.png` | Đăng nhập |
| `01-dashboard-bao-cao.png` | Dashboard & Báo cáo |
| `02-pos-mo-ca.png` | POS — Mở ca |
| `03-pos-ban-hang.png` | POS — Bán hàng |
| `04-don-hang.png` | Đơn hàng |
| `05-don-hang-chi-tiet.png` | Đơn hàng — Chi tiết |
| `06-doi-tra.png` | Đổi / Trả |
| `07-nhan-vien.png` | Nhân viên & Chi nhánh — tab Nhân viên |
| `08-chi-nhanh.png` | Nhân viên & Chi nhánh — tab Chi nhánh |
| `09-phan-quyen.png` | Nhân viên & Chi nhánh — tab Phân quyền (chỉ mô tả tĩnh — xem 6.4) |
| `10-khach-hang.png` | Khách hàng (CRM) |
| `11-san-pham.png` | Sản phẩm |
| `12-danh-muc-sp.png` | Danh mục SP |
| `13-kho-hang-ton-kho.png` | Kho hàng — Tồn kho |
| `14-kho-hang-phieu-nhap.png` | Kho hàng — Phiếu nhập |
| `15-kho-hang-kiem-ke.png` | Kho hàng — Kiểm kê |
| `16-khuyen-mai.png` | Khuyến mại |

### 6.2 Quy tắc bắt buộc

- Trước khi code **bất kỳ màn nào**, agent phải **mở và đọc file thiết kế tương ứng**. Không code
  "theo trí nhớ" hay mô tả gián tiếp.
- Bám sát: bố cục, thứ tự khối, nhóm menu, wording tiếng Việt, badge/trạng thái, cột bảng, vị trí nút,
  tone màu, spacing. **Wording lấy nguyên văn từ thiết kế** (key i18n mới, chuỗi tiếng Việt giữ đúng chữ trong ảnh).
- Thiết kế **không phủ hết** mọi màn ⇒ màn chưa có thiết kế **tái dùng pattern màn cùng loại**
  (list = `04-don-hang`, form/tab = `07-nhan-vien`), không tự sáng tạo layout mới.
- Lệch thiết kế chỉ khi: (a) người dùng yêu cầu, hoặc (b) bất khả thi kỹ thuật — trường hợp (b)
  **báo và hỏi trước khi làm**.
- File `design/` cập nhật thì người dùng sẽ ra lệnh đọc lại — agent không tự đoán.
- Mockup **chỉ có frame desktop, chỉ light theme** — không tự dựng biến thể mobile/dark rồi coi là thiết kế.
- Bản **EN** không có trong thiết kế ⇒ tự dịch sát nghĩa, giữ thuật ngữ nghiệp vụ (SKU, POS…),
  ghi key vào cả `vi` lẫn `en`.

### 6.3 Khung layout chung (rút ra từ thiết kế)

- **Sidebar trái tối màu**: logo ELORIA, nút thu gọn, menu nhóm có tiêu đề viết hoa nhỏ
  (`TỔNG QUAN` · `BÁN HÀNG` · `HỆ THỐNG` · `SẢN PHẨM & KHO`); item chọn nền màu nhấn, bo góc.
- **Top bar**: breadcrumb trái ("Trang chủ › Tên màn"); phải là bộ chọn chi nhánh, chuông, avatar + tên/role.
- **Vùng nội dung**: tiêu đề màn + mô tả phụ 1 dòng, hàng action bên phải, hàng KPI card, rồi khối
  biểu đồ / bảng.
- Màn nhiều phần dùng **tab dạng pill** dưới tiêu đề (xem `07/08/09`), không tab gạch chân.
- Card nền trắng, bo góc vừa, viền mảnh, bóng nhẹ; nền trang xám nhạt. Màu nhấn **indigo/violet**;
  xanh lá = tăng/tốt, đỏ = giảm/lỗi, vàng = cảnh báo/chờ duyệt — tất cả là **token theme** trong
  [src/index.css](src/index.css).
- Màn **đăng nhập** layout riêng (2 cột: panel brand tối + form), không dùng app layout.

### 6.4 Role & menu — lưu ý quan trọng

> **Cụm tab `STAFF | ADMIN | SA` trên top bar trong thiết kế CHỈ LÀ DEMO** để người xem mockup chuyển
> vai. **Không implement vào sản phẩm.**

- Role đến **từ kết quả login** — menu, route và quyền thao tác **sinh theo role**, người dùng không
  tự chuyển role trên UI.
- Chặn **cả route lẫn UI**: mục không có quyền thì ẩn khỏi menu *và* vào thẳng URL cũng bị chặn
  (redirect / 403). Không chỉ ẩn nút.
- Bộ chọn chi nhánh top bar: `SUPER_ADMIN` chọn được; `ADMIN`/`STAFF` **cố định** theo chi nhánh (read-only).
- ⚠️ **Data-scope chi nhánh KHÔNG áp dụng cho khách hàng** (Phase 3b): khách là bản ghi **toàn cục**
  — chi tiết ở [docs/backend/khach-hang.md](docs/backend/khach-hang.md).

**Mô hình quyền: thang bậc kế thừa** (backend fix cứng — **không có ma trận quyền**):

```
SUPER_ADMIN  >  ADMIN  >  STAFF  >  CUSTOMER  >  ANONYMOUS
```

- Role bên trái kế thừa **toàn bộ** quyền role bên phải. Mỗi endpoint mang tiền tố **`[ROLE]`** trong
  `summary` = role tối thiểu.
- FE khai **một** hàm so bậc dùng chung (`rank(user) >= rank(required)`) — không viết
  `if (role === 'ADMIN' || ...)` rải rác.
- Bảng role tối thiểu từng endpoint: [docs/backend/](docs/backend/) theo domain.
- Màn `09-phan-quyen.png` chỉ là **bảng mô tả tĩnh** — không có API ma trận quyền, không dựng UI sửa.

> ⚠️ `CUSTOMER` là role khách storefront, **không đăng nhập web admin**. Endpoint `[CUSTOMER]`
> (`/account/me`, `/logout`) chỉ có nghĩa "cần đã đăng nhập".

---

## 7. Cấu trúc mã nguồn & quy ước code

```
src/
├─ api/          # service theo domain, gọi qua api-client
├─ components/   # component tái sử dụng (ui/ = shadcn)
├─ config/       # cấu hình app, menu
├─ contexts/     # React context (theme, auth, ...)
├─ hooks/        # custom hooks
├─ i18n/         # tài nguyên đa ngôn ngữ + map subKey
├─ lib/          # api-client, utils
├─ pages/        # màn hình theo route
└─ types/        # DTO đồng bộ từ api-docs
```

- File component: `kebab-case.tsx` cho `components/`, `PascalCase.tsx` cho `pages/`.
- TypeScript **strict**: không `any`, không `@ts-ignore` nếu không có lý do ghi chú.
- Không để lại `console.log` trong code commit (log lỗi hệ thống chỉ trong dev).
- Chạy `npm run lint` trước khi kết thúc task; build kiểm tra bằng `npm run build`.

---

## 8. Quy tắc chung cho Agent

- Ưu tiên **đọc code hiện có** và tái sử dụng, không tạo pattern mới song song pattern đã có.
- Chỉ làm đúng phạm vi được yêu cầu; vấn đề ngoài phạm vi ⇒ **báo cáo**, không tự sửa lan man.
- Không tự thêm dependency mới nếu chưa hỏi.
- Không tự đổi: chiến lược auth (mục 2), format response (mục 3), lớp gọi API (mục 4),
  thiết kế UI/UX (mục 5), bản thiết kế `design/` (mục 6).
- **Quy trình lặp lại đã đóng gói thành skill** — dùng skill, đừng làm chay theo trí nhớ:

| Skill | Dùng khi |
|---|---|
| `create-table` | Dựng/sửa màn danh sách (bản chi tiết của 5.1 · 5.2 · 5.3 · 5.6) |
| `review-phase` | Review sau task/phase · rà soát khi user chốt luật mới |
| `update-api-doc` | User ra lệnh khảo sát api-docs / đo API thật |
| `request-backend` | Soạn yêu cầu gửi backend + đăng ký BE# ở PLAN mục B |
| `handoff` | Kết thúc task/phiên: cổng lint+build, bàn giao, ghi history, cập nhật PLAN |
| `srs` | Viết/cập nhật SRS `docs/srs/srs-<slug>.md` từ nguồn sự thật FE + traceability matrix; luồng phức tạp gọi `sequence-diagram` |
| `sequence-diagram` | Vẽ sequence diagram Mermaid bằng trace code thật FE (Page → api → api-client → backend), mỗi bước map `file:dòng` |

---

## 9. Tài liệu hoá khi thay đổi kiến trúc

Khi có thay đổi **lớn, ảnh hưởng kiến trúc**, agent **bắt buộc** cập nhật tài liệu ngay trong cùng task:

- Được coi là ảnh hưởng kiến trúc: đổi/thêm cơ chế auth, đổi lớp gọi API, đổi cấu trúc thư mục,
  thêm state management/data-fetching layer, đổi routing, đổi cơ chế i18n, đổi theme/design system,
  thêm build/deploy pipeline.
- Phải cập nhật: **file này (CONVENTIONS.md)**, [CLAUDE.md](CLAUDE.md), và tài liệu trong `docs/`
  (`docs/backend/` nếu hành vi API đổi, `docs/history.md` một dòng sự kiện).
- Ghi rõ: **cái gì đổi — vì sao — ảnh hưởng phần nào — cách migrate**.
- Code và tài liệu cập nhật **trong cùng một commit/PR**.

---

## 10. Review

- **Mỗi lần một agent hoàn thành công việc, có agent khác review lại** — checklist đầy đủ + format
  báo cáo (file:line · mức độ · cách sửa) trong skill **review-phase**.
- Agent thực thi kết thúc task bằng skill **handoff**: tóm tắt file đã đổi · quyết định kỹ thuật ·
  giả định · phần chưa làm — để agent review có đủ ngữ cảnh.
- Phát hiện vi phạm ⇒ nêu rõ **file:line**, mức độ nghiêm trọng và cách sửa đề xuất.
