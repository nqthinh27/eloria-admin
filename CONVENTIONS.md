# CONVENTIONS — Eloria Admin (Frontend)

> Tài liệu quy ước chung cho **mọi agent / mọi phiên làm việc**.
> **Đọc file này TRƯỚC khi viết code.** Nếu một thay đổi mâu thuẫn với tài liệu này,
> phải hỏi lại người dùng thay vì tự quyết định.

Stack hiện tại: React 19 + TypeScript + Vite + React Router 7 + TailwindCSS 4 + shadcn/ui (Radix).

---

## 1. Nguồn sự thật cho API & DTO

- API doc (OpenAPI/Swagger JSON): **http://localhost:8080/v3/api-docs/api**
  — khảo sát gần nhất: **2026-08-06**. Kết quả đã chắt lọc vào [CLAUDE.md](CLAUDE.md) (danh sách endpoint,
  quy ước dữ liệu) và [PLAN.md](PLAN.md) mục A/B.
- **Mọi DTO, endpoint, tên field, kiểu dữ liệu, enum ở frontend PHẢI khớp 100% với tài liệu này.**
  Không được tự bịa field, tự đổi tên field, tự thêm field "cho tiện".
- Nếu tài liệu thiếu thứ gì frontend cần → **báo lại người dùng**, không tự chế API giả.
- URL trên **có thể thay đổi**. Khi thay đổi, người dùng sẽ ra lệnh đọc lại.
  Agent **không tự ý fetch lại** trừ khi được yêu cầu, và **không hardcode** URL này vào code
  (chỉ dùng biến môi trường `VITE_API_BASE_URL` cho base URL runtime).
- Khi được yêu cầu đọc lại api-docs: đồng bộ lại type/DTO trong `src/types` (hoặc `src/api/**/types.ts`)
  và cập nhật lại tài liệu ở mục 9 nếu có thay đổi kiến trúc.

---

## 2. Chiến lược xác thực (KHÔNG được tự đổi)

| Thành phần | Nơi lưu | Ai quản lý |
|---|---|---|
| **Access token** | **In-memory** (biến trong module/state, KHÔNG localStorage / sessionStorage) | Frontend |
| **Refresh token** | **HttpOnly Cookie** | **Backend** |

Quy tắc bắt buộc:

- Access token **chỉ nằm trong bộ nhớ**. Reload trang ⇒ mất token ⇒ gọi refresh để lấy lại.
- Refresh token do backend set/xoá qua cookie. Frontend **không đọc, không ghi, không parse** cookie này.
- ⚠️ **Backend chỉ set cookie `refresh_token` khi request login có `rememberMe: true`** (đã kiểm chứng thực tế).
  Với `rememberMe: false` không có cookie ⇒ F5 là mất phiên, không refresh được.
  ⇒ Form đăng nhập **luôn gửi `rememberMe: true`** và **không hiển thị checkbox "Ghi nhớ đăng nhập"**
  (user đã chốt). Không tự đổi thành `false` hay thêm checkbox.
- Cookie thực tế backend trả: `path=/v1.0/api/refresh; HttpOnly; Max-Age=864000` (10 ngày),
  **không có `SameSite`/`Secure`** ⇒ trình duyệt mặc định `Lax`, bắt buộc same-origin.
- Mọi request gọi API phải bật `credentials: 'include'` (fetch) / `withCredentials: true` (axios)
  để cookie refresh được gửi kèm.
- Khi access token hết hạn (401) → gọi endpoint refresh **một lần**, dùng cơ chế
  **single-flight** (nhiều request 401 cùng lúc chỉ sinh **một** lần refresh, các request còn lại xếp hàng chờ),
  sau đó **retry** request gốc. Refresh thất bại → xoá state auth → điều hướng `/login`.
- **Agent KHÔNG được tự đổi chiến lược này** (ví dụ: chuyển token sang localStorage, tự lưu refresh token ở FE,
  đổi sang scheme khác) nếu chưa có yêu cầu rõ ràng từ người dùng.
- **Tài khoản test dev** cho 3 role (`superadmin` / `adminbranch` / `staffone`) khai báo tại
  [CLAUDE.md](CLAUDE.md#tài-khoản-test-môi-trường-dev-local). Chỉ dùng để gọi thử API local —
  **không hardcode vào code**, không đặt làm giá trị mặc định của form đăng nhập.

---

## 3. Định dạng response của Backend

> Backend **đã chuẩn hoá toàn bộ response** (khảo sát ngày 2026-08-06 trên `/v3/api-docs/api`):
> **mọi** endpoint đều bọc `BaseResponse<T>`, kể cả `/authenticate` và `/refresh`. Không còn ngoại lệ.

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
- Dữ liệu nghiệp vụ **luôn nằm trong `data`**; `data` có thể là object, mảng, chuỗi hoặc `null`.
- API danh sách trả `data` dạng bao ngoài:
  `{ total, data: [...] }` — riêng `staff/search` và `branch/search` có thêm `activeTotal`, `inactiveTotal`.
  Tức là **`data.data`** mới là mảng bản ghi.
- Hàm gọi API dùng chung phải **tự bóc `data`** trả về cho tầng UI; UI không tự đụng vào `code`/`message` khi thành công.
- Khi thao tác thành công (create / update / delete / submit…) → hiển thị **toast thành công**
  với **message mặc định riêng cho từng màn hình** (ví dụ: "Tạo sản phẩm thành công", "Cập nhật danh mục thành công"),
  không dùng một câu chung chung cho tất cả màn.
- Thao tác chỉ đọc (GET để render danh sách/chi tiết) **không** hiện toast.

### 3.2 Thất bại — `ErrorResponse`

```json
{
  "code": 0,
  "message": "string",
  "logInfo": "string",
  "subKey": "string"
}
```

- `subKey` có dạng `a.b.c` — ví dụ: `error.password.incorrect`.
- Frontend **bắt buộc** có một file message chung để map `subKey` → chuỗi i18n đa ngôn ngữ.
  Vị trí quy ước: `src/i18n/messages/<lang>.ts` (hoặc `src/locales/<lang>/errors.ts`) — giữ nguyên
  cấu trúc key phẳng theo đúng `subKey` của backend.
- Quy tắc hiển thị lỗi (theo thứ tự ưu tiên):
  1. Có `subKey` **và** key tồn tại trong tài nguyên i18n của FE ⇒ hiển thị bản dịch theo ngôn ngữ hiện tại.
  2. **Ngược lại** (không có `subKey`, hoặc key không tồn tại) ⇒ hiển thị **`message`** do backend trả về.
  3. Không có cả hai ⇒ hiển thị message lỗi mặc định của hệ thống.
- `logInfo` **chỉ dùng để log/debug**, **tuyệt đối không hiển thị cho người dùng cuối**.
- Khi thêm `subKey` mới, phải bổ sung key vào **tất cả** file ngôn ngữ đang hỗ trợ.

---

## 4. Hàm gọi API dùng chung (bắt buộc)

- **Mọi** lời gọi API phải đi qua **một** lớp client dùng chung (quy ước: `src/lib/api-client.ts` +
  các service theo domain tại `src/api/<domain>.ts`).
- **Cấm** gọi `fetch` / `axios` trực tiếp trong component, page hay hook nghiệp vụ.
- Client dùng chung chịu trách nhiệm:
  - Gắn base URL từ `VITE_API_BASE_URL`, header `Content-Type`, `Accept-Language` (theo i18n hiện tại).
  - Gắn `Authorization: Bearer <access token in memory>`; gửi cookie (`credentials: 'include'`).
  - Bóc tách response thành công (`code === 1` ⇒ trả `data`), chuẩn hoá lỗi về đúng shape `ErrorResponse`.
  - Xử lý mặc định theo HTTP status:
    | Status | Hành vi mặc định |
    |---|---|
    | **401** | Thử refresh (single-flight) → retry; thất bại ⇒ clear auth + redirect `/login` |
    | **403** | Toast "Không có quyền truy cập" + điều hướng trang 403 / giữ nguyên màn tuỳ ngữ cảnh |
    | **404** | Trả lỗi cho caller; màn chi tiết hiển thị trạng thái "Không tìm thấy" |
    | **422 / 400** | Map lỗi validate về từng field của form |
    | **5xx** | Toast lỗi hệ thống chung, log `logInfo` ra console (chỉ ở môi trường dev) |
    | **Network / timeout / abort** | Toast lỗi kết nối; abort do huỷ request thì bỏ qua im lặng |
  - Cho phép caller **opt-out** xử lý mặc định (ví dụ tuỳ chọn `skipErrorToast`) khi màn hình cần tự xử lý lỗi.
- Không lặp lại logic xử lý 401/403/500 ở từng màn hình. Nếu cần hành vi khác ⇒ mở rộng client dùng chung.

---

## 5. UI / UX

- **Tuân theo thiết kế UI/UX đã có sẵn trong folder [design/](design/) — xem chi tiết ở mục 6.**
  Không tự sáng tạo layout, đổi bố cục, đổi màu, đổi icon set hay thay component khi chưa được yêu cầu.
- Dùng component có sẵn trong [src/components/ui/](src/components/ui/) (shadcn/ui). Cần component mới ⇒
  thêm đúng theo chuẩn shadcn, không tự viết component trùng chức năng.
- Style bằng **Tailwind utility classes**; dùng `cn()` trong [src/lib/utils.ts](src/lib/utils.ts) để merge class.
  Không viết CSS rời rạc, không dùng inline style trừ giá trị động.
- **Responsive — thứ tự ưu tiên: desktop → tablet → mobile.**
  Đây là công cụ nội bộ dùng chủ yếu trên PC và tablet tại quầy, nên:
  - **Desktop (≥ `lg`) và tablet (`md`–`lg`) là bắt buộc đúng thiết kế**, phải test kỹ.
    Mốc desktop tham chiếu: laptop 13"–15".
  - **Mobile (< `md`) chỉ cần "không vỡ"**: không tràn ngang toàn trang, không đè chữ, vẫn bấm/đọc được.
    **Không** bắt buộc tối ưu thao tác hay thiết kế lại luồng cho mobile.
  - Bảng dữ liệu: desktop dùng table; màn hình hẹp cho **scroll ngang trong khung bảng** (có chủ đích).
    Chỉ chuyển sang card/list khi có yêu cầu riêng.
  - Sidebar/menu: thu gọn (drawer/sheet) khi hẹp — dùng hook [use-mobile.ts](src/hooks/use-mobile.ts).
- **Chỉ hỗ trợ light theme** (đúng theo mockup trong `design/`). **Không** làm dark theme, không thêm nút
  chuyển theme, cho tới khi có yêu cầu mới. Vẫn **bắt buộc dùng token màu** trong
  [src/index.css](src/index.css) thay vì hardcode hex, để sau này bật dark không phải sửa từng component.
- Trạng thái màn hình phải đầy đủ: **loading (skeleton) / empty / error / success**.
- **Đa ngôn ngữ: VI + EN** ngay từ đầu. Mọi text hiển thị cho người dùng đi qua i18n,
  **không hardcode chuỗi** trong JSX. Mặc định `vi`; thêm key mới phải bổ sung **cả `vi` và `en`**.
  Bộ chuyển ngôn ngữ đặt ở **top bar, bên trái chuông thông báo** — đây là **phần bổ sung ngoài mockup**
  (thiết kế hiện chưa có control này), style bám theo các control còn lại của top bar.
- Accessibility cơ bản: `label` cho input, `aria-*` cho control, điều hướng bằng bàn phím.

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
| `09-phan-quyen.png` | Nhân viên & Chi nhánh — tab Phân quyền (ma trận role × quyền) |
| `10-khach-hang.png` | Khách hàng (CRM) |
| `11-san-pham.png` | Sản phẩm |
| `12-danh-muc-sp.png` | Danh mục SP |
| `13-kho-hang-ton-kho.png` | Kho hàng — Tồn kho |
| `14-kho-hang-phieu-nhap.png` | Kho hàng — Phiếu nhập |
| `15-kho-hang-kiem-ke.png` | Kho hàng — Kiểm kê |
| `16-khuyen-mai.png` | Khuyến mại |

### 6.2 Quy tắc bắt buộc

- Trước khi code **bất kỳ màn hình nào**, agent phải **mở và đọc file thiết kế tương ứng** trong `design/`.
  Không code "theo trí nhớ" hay theo mô tả gián tiếp.
- Bám sát: bố cục, thứ tự khối, nhóm menu, wording tiếng Việt, badge/trạng thái, cột của bảng,
  vị trí nút hành động, tone màu, spacing.
- **Wording lấy nguyên văn từ thiết kế** (ví dụ: "Tồn khả dụng", "Chậm luân chuyển > 60 ngày", "Xuất dữ liệu").
  Khi đưa vào i18n thì key mới, còn chuỗi tiếng Việt phải giữ đúng chữ trong ảnh.
- Thiết kế **không phủ hết** mọi màn hình (ví dụ: quên mật khẩu, chốt ca, quản lý giá, chi tiết khách hàng,
  audit log…). Với màn chưa có thiết kế ⇒ **tái sử dụng pattern của màn cùng loại đã có** trong `design/`
  (list = pattern của `04-don-hang`, form/tab = pattern của `07-nhan-vien`), **không tự sáng tạo layout mới**.
- Lệch so với thiết kế chỉ được phép khi: (a) người dùng yêu cầu, hoặc (b) thiết kế bất khả thi về kỹ thuật —
  trường hợp (b) phải **báo và hỏi trước khi làm**, không tự quyết.
- Khi file trong `design/` được cập nhật, người dùng sẽ ra lệnh đọc lại. Agent **không tự đoán** thiết kế đã đổi.
- Mockup **chỉ có frame desktop và chỉ có light theme** — đúng với quyết định ở mục 5
  (desktop/tablet là chính, mobile chỉ cần không vỡ; không làm dark theme).
  Agent **không tự dựng thêm biến thể mobile hay dark** rồi coi đó là thiết kế.
- Wording trong mockup là tiếng Việt. Bản **EN** không có trong thiết kế ⇒ agent tự dịch sát nghĩa,
  giữ đúng thuật ngữ nghiệp vụ (SKU, POS, size curve…), và ghi key vào cả `vi` lẫn `en`.

### 6.3 Khung layout chung (rút ra từ thiết kế)

- **Sidebar trái tối màu**, có logo ELORIA, nút thu gọn, menu chia theo nhóm có tiêu đề nhóm viết hoa nhỏ:
  `TỔNG QUAN` · `BÁN HÀNG` · `HỆ THỐNG` · `SẢN PHẨM & KHO`. Item đang chọn nền màu nhấn, bo góc.
- **Top bar**: breadcrumb bên trái ("Trang chủ › Tên màn"), bên phải là **bộ chọn chi nhánh**,
  chuông thông báo, avatar + tên/role người dùng.
- **Vùng nội dung**: tiêu đề màn + mô tả phụ 1 dòng, hàng action bên phải (bộ lọc thời gian, nút xuất dữ liệu),
  rồi tới hàng KPI card, sau đó là khối biểu đồ / bảng dữ liệu.
- Màn nhiều phần dùng **tab dạng pill** ngay dưới tiêu đề (xem `07/08/09`), không dùng tab gạch chân.
- Card nền trắng, bo góc vừa, viền mảnh, đổ bóng nhẹ; nền trang xám nhạt.
- Màu nhấn chính là **indigo/violet**; xanh lá = tăng/tốt, đỏ = giảm/lỗi, vàng = cảnh báo/chờ duyệt.
  Toàn bộ màu phải khai báo thành **token theme** trong [src/index.css](src/index.css), **không hardcode hex trong component**.
- Màn **đăng nhập** là layout riêng (2 cột: panel brand tối bên trái + form bên phải), không dùng app layout.

### 6.4 Role & menu — lưu ý quan trọng

> **Cụm tab `STAFF | ADMIN | SA` trên top bar trong thiết kế CHỈ LÀ DEMO** để người xem chuyển
> qua lại giữa các vai trò khi review mockup. **Không implement cụm tab này vào sản phẩm thật.**

Thực tế:

- Role của người dùng được xác định **từ kết quả login / thông tin phiên do backend trả về**.
- **Menu, route và quyền thao tác được sinh theo role sau khi login**, người dùng không tự chuyển role trên UI.
- Phân quyền phải chặn **cả route lẫn UI**: mục không có quyền thì **ẩn khỏi menu** *và* truy cập thẳng URL
  cũng bị chặn (redirect / trang 403). Không chỉ ẩn nút.
- Bộ chọn chi nhánh trên top bar: `SUPER_ADMIN` được chọn "Tất cả chi nhánh"/từng chi nhánh;
  `ADMIN`/`STAFF` bị **cố định** theo chi nhánh được gán (hiển thị dạng read-only).

**Mô hình quyền: thang bậc kế thừa** (backend fix cứng, FE bám theo — **không có ma trận quyền**):

```
SUPER_ADMIN  >  ADMIN  >  STAFF  >  CUSTOMER  >  ANONYMOUS
```

- Role bên trái **kế thừa toàn bộ** quyền của role bên phải.
- Mỗi endpoint trong api-docs mang tiền tố **`[ROLE]`** ở `summary` theo cấu trúc `[ROLE] Tên api`
  (ví dụ `[ANONYMOUS] Đăng nhập`, `[ADMIN] Danh sách nhân viên`) — đó là **role tối thiểu** gọi được.
- FE khai báo **một** hàm so bậc dùng chung, cho phép khi `rank(user) >= rank(required)`.
  Không viết `if (role === 'ADMIN' || role === 'SUPER_ADMIN')` rải rác — sai ngay khi thêm bậc mới.
- Bảng role tối thiểu của từng endpoint đã chắt lọc sẵn ở [CLAUDE.md](CLAUDE.md).
- Màn `09-phan-quyen.png` chỉ là **bảng mô tả tĩnh** để người dùng đọc, **không phải cấu hình**:
  không có API đọc/ghi ma trận quyền, không được dựng UI cho phép sửa.

> ⚠️ `CUSTOMER` là role của khách mua hàng bên storefront, **không được đăng nhập vào web quản trị này**.
> Endpoint gắn `[CUSTOMER]` (ví dụ `/account/me`, `/logout`) chỉ có nghĩa "cần đã đăng nhập" —
> đừng hiểu nhầm thành "web admin có màn cho CUSTOMER".

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

- File component: `kebab-case.tsx` cho `components/`, `PascalCase.tsx` cho `pages/`
  (giữ đúng quy ước đang có trong repo).
- TypeScript **strict**: không `any`, không `@ts-ignore` nếu không có lý do được ghi chú.
- Không để lại `console.log` trong code commit (log lỗi hệ thống chỉ trong dev).
- Chạy `npm run lint` trước khi kết thúc task; build kiểm tra bằng `npm run build`.

---

## 8. Quy tắc chung cho Agent

- Ưu tiên **đọc code hiện có** và tái sử dụng, không tạo pattern mới song song với pattern đã có.
- Chỉ làm đúng phạm vi được yêu cầu; phát hiện vấn đề ngoài phạm vi ⇒ **báo cáo**, không tự sửa lan man.
- Không tự ý thêm dependency mới nếu chưa hỏi.
- Không tự đổi: chiến lược auth (mục 2), format response (mục 3), lớp gọi API dùng chung (mục 4),
  thiết kế UI/UX (mục 5), bản thiết kế trong `design/` (mục 6).

---

## 9. Tài liệu hoá khi thay đổi kiến trúc

Khi có thay đổi **lớn, ảnh hưởng tới kiến trúc**, agent **bắt buộc** cập nhật lại tài liệu ngay trong cùng task:

- Thay đổi được coi là ảnh hưởng kiến trúc: đổi/ thêm cơ chế auth, đổi lớp gọi API, đổi cấu trúc thư mục,
  thêm state management / data-fetching layer, đổi routing, đổi cơ chế i18n, đổi hệ thống theme/design system,
  thêm build/deploy pipeline.
- Phải cập nhật: **file này (CONVENTIONS.md)**, `README.md`, và tài liệu kiến trúc trong `docs/` nếu có.
- Ghi rõ: **cái gì đổi — vì sao đổi — ảnh hưởng tới phần nào — cách migrate**.
- Code và tài liệu phải được cập nhật **trong cùng một commit/PR**.

---

## 10. Review

- **Mỗi lần một agent hoàn thành công việc, sẽ có agent khác review lại code.**
- Agent thực thi phải, ở cuối mỗi task, tóm tắt: các file đã đổi, quyết định kỹ thuật đã đưa ra,
  giả định đang dùng, phần chưa làm — để agent review có đủ ngữ cảnh.
- Agent review kiểm tra tối thiểu:
  1. DTO/endpoint khớp api-docs (mục 1).
  2. Không vi phạm chiến lược auth (mục 2).
  3. Xử lý đúng response thành công / `ErrorResponse` + map `subKey` → i18n, fallback `message` (mục 3).
  4. Gọi API qua client dùng chung, không tự xử lý 401/403/500 rời rạc (mục 4).
  5. Bám thiết kế UI/UX; desktop/tablet đúng thiết kế, mobile không vỡ; chỉ light theme;
     text có cả `vi` + `en`; đủ trạng thái loading/empty/error (mục 5).
  6. **Khớp bản thiết kế trong `design/`**; không implement tab đổi role STAFF/ADMIN/SA;
     menu & route sinh theo role sau login (mục 6).
  7. Không hardcode chuỗi, không `any`, lint/build sạch (mục 7).
  8. Tài liệu đã cập nhật nếu có thay đổi kiến trúc (mục 9).
- Có phát hiện vi phạm ⇒ nêu rõ **file:line**, mức độ nghiêm trọng và cách sửa đề xuất.
