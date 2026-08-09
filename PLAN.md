# PLAN — Eloria Admin (Frontend)

> Kế hoạch triển khai chia theo **phase**. Người dùng sẽ chỉ định **làm phase nào**;
> agent **chỉ thực hiện đúng phase được chỉ định**, không tự làm lấn sang phase khác.
> Đọc [CONVENTIONS.md](CONVENTIONS.md) trước khi bắt đầu bất kỳ phase nào.

Trạng thái: **Phase 0 · 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 đã xong** (0–1: 2026-08-06 · 2–3: 2026-08-07 · 4–7: 2026-08-08 · 8–9: 2026-08-09). Các phase còn lại chưa bắt đầu.

---

## A. Bối cảnh đã khảo sát

**Frontend hiện có:** React 19 + TS + Vite + React Router 7 + Tailwind 4 + shadcn/ui.
Mới chỉ là starter: [Router.tsx](src/Router.tsx) có 3 route demo, [config/menu.ts](src/config/menu.ts)
là menu mẫu tiếng Anh, `pages/` là Dashboard/Sample/ComingSoon rỗng.

**Backend ([../35.1.eloria-backend](../35.1.eloria-backend)) — cập nhật theo `/v3/api-docs/api` ngày 2026-08-06, khảo sát lại 2026-08-08:**

Đã có: **Auth** · **Tài khoản đang đăng nhập** (`/account/me`, đổi mật khẩu, đổi avatar) ·
**Nhân viên** (CRUD + search + gán role + khoá/mở + reset mật khẩu) · **Chi nhánh** (CRUD + search + bật/tắt) ·
**Audit log** (search + chi tiết before/after) · **Địa chỉ hành chính** (Tỉnh → Phường/Xã) · **File/ảnh** ·
**Thương hiệu, Danh mục, Màu, Size, Sản phẩm + SKU, Khách hàng** *(mới phát hiện 2026-08-08 — trước đó
chưa có)*. Danh sách endpoint đầy đủ ở [CLAUDE.md](CLAUDE.md).

**Chưa có:** giá theo kênh riêng biệt, kho/tồn kho, POS, đơn hàng, đổi/trả, khuyến mại, ca làm việc.

**Phân quyền:** thang bậc kế thừa `SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS`;
`summary` mỗi endpoint mang tiền tố `[ROLE]` = role tối thiểu. Bảng tra đầy đủ ở [CLAUDE.md](CLAUDE.md).

**Hệ quả cho kế hoạch:**

- **Phase 2, 3, 4, 7 chạy được trên API thật** (auth, bộ chọn chi nhánh, RBAC, màn Nhân viên & Chi nhánh + audit log).
- **Phase 8 (Khách hàng) và Phase 9 (Sản phẩm & Danh mục SP) giờ CŨNG chạy được trên API thật**
  khi tới lượt code — khác với giả định ban đầu ("chạy mock"). Type/mock đã dựng ở Phase 6 vẫn giữ
  nguyên cho tới khi Phase 8/9 thực sự được chỉ định làm; lúc đó đổi implement service theo API thật
  mới phát hiện, đối chiếu lại schema chính xác trong CLAUDE.md trước khi code (không đoán field).
- **Phase 10→14 vẫn chạy trên lớp mock** đúng shape DTO, đóng gói sau service layer (Phase 6),
  để khi backend bổ sung thì **chỉ đổi implement của service**, không đụng màn hình.

---

## B. Trạng thái các điểm chờ chốt

| # | Vấn đề | Trạng thái |
|---|---|---|
| B1 | Response không đồng nhất giữa `/authenticate` và các endpoint khác. | ✅ **Đã xong** — backend đã chuẩn hoá, *mọi* endpoint bọc `BaseResponse`. **Lưu ý: `code === 1` là thành công, không phải `0`** như bản CONVENTIONS đầu tiên; đã sửa lại tài liệu. |
| B2 | Cookie `refresh_token`: `path=/v1.0/api/refresh`, `HttpOnly`, không `Secure`, không `SameSite`. | ⚠️ **Vẫn còn** — bắt buộc same-origin qua **Vite dev proxy** (`/v1.0` → `http://localhost:8080`). Production phải cùng domain hoặc BE bật `SameSite=None; Secure`. |
| B3 | Mô hình phân quyền. | ✅ **Đã chốt** — **bỏ ma trận quyền**. Backend fix cứng thang bậc kế thừa `SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS`; `summary` mỗi endpoint mang tiền tố `[ROLE]` = role tối thiểu. FE so bậc bằng **một** hàm dùng chung. Tab "Phân quyền" của `09-phan-quyen.png` chỉ hiển thị tĩnh, không cho sửa. |
| B4 | Dependency cần duyệt (mục C). | ✅ **Đã duyệt toàn bộ** (2026-08-06). |
| B5 | Bộ chọn chi nhánh trên top bar chưa có API. | ✅ **Đã xong** — dùng `POST /v1.0/api/branch/search` (backend tự giới hạn: STAFF/ADMIN chỉ thấy chi nhánh được gán). |
| B6 | Backend chỉ set cookie `refresh_token` khi login gửi `rememberMe: true`. | ✅ **Đã chốt** — **luôn gửi `rememberMe: true`**, **không** hiển thị checkbox "Ghi nhớ đăng nhập". |

**Không còn điểm chờ chốt.** Có thể chạy Phase 1.

---

## C. Dependency — ✅ đã duyệt toàn bộ (2026-08-06)

| Gói | Dùng cho | Cài ở phase |
|---|---|---|
| `axios` | HTTP client (interceptor cho refresh single-flight) | 1 |
| `i18next` + `react-i18next` | Đa ngôn ngữ VI/EN + map `subKey` | 1 |
| `sonner` | Toast (shadcn chuẩn) | 1 |
| `@tanstack/react-query` | Cache/loading/error state cho data fetching | 5 |
| `react-hook-form` + `zod` | Form + validate + lỗi inline theo field | 5 |
| `@tanstack/react-table` | DataTable (sort/filter/paging) | 5 |
| `date-fns` | Format ngày tiếng Việt | 5 |
| `recharts` | Biểu đồ dashboard | 15 |

Cài **đúng phase cần**, không cài trước hàng loạt.

Các gói shadcn/ui còn thiếu (table, tabs, select, dialog, form, badge, checkbox, textarea,
radio, switch, calendar, pagination, alert, toast…) sẽ được thêm dần qua CLI shadcn ở đúng phase cần.

---

## D. Bảng phase

| Phase | Tên | Phụ thuộc | Thiết kế tham chiếu |
|---|---|---|---|
| **0** | ✅ Dọn starter & nền tảng dự án | — | — |
| **1** | ✅ Lớp lõi: i18n · api-client · error mapping · toast | 0 | — |
| **2** | ✅ Auth: đăng nhập, quên/đặt lại mật khẩu, session | 1 | `00-dang-nhap.png` |
| **3** | ✅ App shell: sidebar · top bar · breadcrumb · 403/404 | 1, 2 | tất cả (khung chung) |
| **4** | ✅ RBAC: menu & route theo role | 2, 3 | mục 6.4 CONVENTIONS |
| **5** | ✅ Bộ component & pattern dùng chung | 3 | `04`, `07`, `11` |
| **6** | ✅ Lớp mock data & service contract (chỉ cho module **chưa có API**) | 1, 5 | — |
| **7** | ✅ Nhân viên & Chi nhánh + Audit log (**API thật**) | 4, 5 | `07`, `08`, `09` |
| **8** | ✅ Khách hàng (CRM) (**API thật**) | 5, 6 | `10` |
| **9** | ✅ Sản phẩm & Danh mục SP (**API thật**) | 5, 6 | `11`, `12` |
| **10** | Kho hàng: tồn kho · phiếu nhập · kiểm kê | 5, 6, 9 | `13`, `14`, `15` |
| **11** | POS: mở ca · bán hàng | 5, 6, 9, 10 | `02`, `03` |
| **12** | Đơn hàng & chi tiết đơn | 5, 6 | `04`, `05` |
| **13** | Đổi / Trả | 5, 6, 12 | `06` |
| **14** | Khuyến mại | 5, 6, 9 | `16` |
| **15** | Dashboard & Báo cáo | 5, 6 | `01` |
| **16** | Hoàn thiện: audit i18n · a11y · responsive · tài liệu | tất cả | — |

Thứ tự đề xuất chạy: **0 → 1 → 2 → 3 → 4 → 5 → 7** (Phase 7 đã có API thật, làm sớm để
kiểm chứng toàn bộ hạ tầng trên dữ liệu thật), rồi **6** khi bắt đầu các màn cần mock,
sau đó 8→15 theo thứ tự bạn ưu tiên, cuối cùng là 16.

---

## Phase 0 — Dọn starter & nền tảng dự án ✅ **ĐÃ XONG (2026-08-06)**

**Mục tiêu:** biến starter thành khung dự án Eloria sạch, đúng CONVENTIONS.

- Đổi branding: `appConfig` → ELORIA, gỡ link github/author của starter khỏi
  [config/app.ts](src/config/app.ts), [app-footer.tsx](src/components/app-footer.tsx),
  [icons/github.tsx](src/components/icons/github.tsx).
- **Gỡ dark theme** theo CONVENTIONS mục 5: xoá [mode-toggle.tsx](src/components/mode-toggle.tsx),
  rút gọn [ThemeContext.tsx](src/contexts/ThemeContext.tsx) (hoặc bỏ hẳn), dọn class `dark:` thừa.
- Xoá page demo: `Sample.tsx`, `ComingSoon.tsx`; giữ `NotMatch.tsx` để làm trang 404.
- `.env.example`: thêm `VITE_API_BASE_URL=/v1.0/api`, `VITE_APP_NAME=Eloria Admin`.
- **Vite dev proxy** `/v1.0` → `http://localhost:8080` trong [vite.config.ts](vite.config.ts) *(giải quyết B2)*.
- Dựng **design token** trong [src/index.css](src/index.css) theo mockup: accent indigo/violet,
  nền trang xám nhạt, card trắng, semantic success/warning/danger, radius, sidebar tối.
- Tạo skeleton thư mục theo CONVENTIONS mục 7: `src/api/`, `src/i18n/`, `src/types/`, `src/features/`.

**DoD:** `npm run lint` + `npm run build` sạch; app chạy, không còn dấu vết starter, không còn nút đổi theme.

**Kết quả:** lint 0 lỗi (2 warning `react-refresh` sẵn có trong `components/ui` của shadcn), build sạch,
dev server chạy, đã test login `staffone` **qua Vite proxy** và nhận được cookie `refresh_token` ⇒ **B2 xác nhận đã giải quyết**.

⚠️ **Bẫy đã xử lý — đừng xoá `@custom-variant dark` trong [src/index.css](src/index.css).**
Tưởng rằng bỏ dòng đó là "gỡ dark theme", nhưng thực tế Tailwind v4 sẽ quay về variant `dark`
mặc định là `@media (prefers-color-scheme: dark)`, khiến các class `dark:` còn sót trong component
shadcn/ui tự bật trên máy có dark mode hệ điều hành. Giữ variant neo vào class `.dark` (class app
không bao giờ gắn) mới thực sự vô hiệu hoá chúng — kể cả class do `npx shadcn add` thêm sau này.

---

## Phase 1 — Lớp lõi ✅ **ĐÃ XONG (2026-08-06)**

**Mục tiêu:** hạ tầng mọi phase sau đều dùng.

- **i18n** (`src/i18n/`): cấu hình `vi` (mặc định) + `en`, tách namespace `common`, `errors`, và
  namespace theo module. File `errors` map **`subKey` dạng `a.b.c`** → chuỗi dịch.
- **`resolveErrorMessage(err)`**: `subKey` có trong tài nguyên ⇒ dịch; không ⇒ dùng `message` của BE;
  không có cả hai ⇒ message mặc định. `logInfo` chỉ log ở dev.
- **`src/lib/api-client.ts`**: base URL từ env, `credentials: 'include'`, header `Accept-Language`,
  gắn `Authorization: Bearer <token in-memory>`, **bóc `BaseResponse` với `code === 1` là thành công**,
  chuẩn hoá lỗi về `ErrorResponse`, xử lý mặc định 401/403/404/400-422/5xx/network,
  cờ opt-out (`skipErrorToast`), hỗ trợ `AbortSignal`.
- **Toast provider** + helper `toastSuccess(msgKey)` / `toastError(err)`.
- `src/types/common.ts`: `BaseResponse<T>`, `ErrorResponse`, `ERole`, `EGender`,
  `BaseListRes<T>` = `{total, data[]}` và `BaseListResStatus<T>` = `{total, data[], activeTotal, inactiveTotal}`,
  `SearchReq` = `{page, size, sortBy, sortDir, keyword, status}` làm base cho mọi request `.../search`.
- Helper `search<T>()` dùng chung cho pattern **`POST .../search`** (không phải GET query string).

**DoD:** gọi thử 1 endpoint bất kỳ thấy đúng luồng thành công/lỗi; đổi ngôn ngữ đổi được message lỗi.

**Kết quả:** lint 0 lỗi, build sạch. Smoke test trên backend thật **12/12 PASS**
(login, `code===1`, `ErrorResponse`+`subKey`, 401, refresh bằng cookie, token mới dùng được,
shape danh sách 2 tầng, STAFF gọi API `[ADMIN]` bị 403). Đối chiếu key lỗi: **35/35 khớp**
giữa `subKey` backend phát ra và file dịch, không thiếu không thừa.

**File chính:** `src/types/common.ts` · `src/lib/api-error.ts` · `src/lib/token-store.ts` ·
`src/lib/api-client.ts` · `src/lib/toast.ts` · `src/i18n/` (vi + en, namespace `common` và `errors`).

⚠️ **`npx shadcn add sonner` sinh ra bản dùng `next-themes`** (package của Next.js) và tự cài nó.
Đã gỡ `next-themes` và ghim `theme="light"` trong [src/components/ui/sonner.tsx](src/components/ui/sonner.tsx).
Chạy lại lệnh add đó sẽ ghi đè và cài lại next-themes ⇒ phải sửa lại file.

---

## Phase 2 — Auth ✅ **ĐÃ XONG (2026-08-07)**

**Thiết kế:** `00-dang-nhap.png` (layout 2 cột: panel brand tối trái + form phải).

- Màn **Đăng nhập**: username + password, "Quên mật khẩu?", lỗi inline + lỗi từ `subKey`.
  Login **luôn gửi `rememberMe: true`** và **không có checkbox "Ghi nhớ đăng nhập"** *(B6 đã chốt)* —
  nếu gửi `false` backend không set cookie refresh.
- Màn **Quên mật khẩu** (`POST /forgot-password`) → **Đặt lại mật khẩu** (`POST /reset-password` với `{token, newPassword}`).
  *Chưa có mockup ⇒ tái sử dụng layout màn đăng nhập, theo CONVENTIONS mục 6.2.*
  Lưu ý `/forgot-password` **luôn trả thành công** dù email có tồn tại hay không (chống dò tài khoản)
  ⇒ copy màn hình phải trung tính.
- **AuthContext**: access token **chỉ in-memory**, `user: SysUserDTO` (`role`, `branchId`, `fullName`, `langKey`).
  `langKey` của user dùng làm ngôn ngữ khởi tạo cho i18n.
- **Refresh single-flight** trong api-client: 401 → `POST /refresh` một lần → retry; fail ⇒ clear + về `/login`.
- **Bootstrap khi load app**: gọi `/refresh` để khôi phục phiên (token không lưu ổ đĩa),
  rồi `GET /account/me` để lấy thông tin user; có màn splash chờ.
- Đổi mật khẩu (`POST /account/change-password`) + đổi avatar (`POST /sys-user/update-avatar`)
  trong menu tài khoản — *chưa có mockup, dùng dialog theo pattern chung*.
- **Logout**: gọi `POST /logout`, clear state, về `/login`.
- `ProtectedRoute` / `PublicOnlyRoute`.

**Tài khoản test (dev local):** `superadmin` / `adminbranch` / `staffone`, mật khẩu đều là `Admin@123`
— tương ứng role `SUPER_ADMIN` / `ADMIN` / `STAFF`. Chi tiết ở [CLAUDE.md](CLAUDE.md).

**DoD:** login → vào app → F5 vẫn giữ phiên → token hết hạn tự refresh → logout sạch cookie.
Không có bất kỳ chỗ nào ghi token vào `localStorage`/`sessionStorage`.
Test đủ **cả 3 tài khoản** trên.

**Kết quả:** lint 0 lỗi, build sạch, **e2e Playwright trên trình duyệt thật 18/18 PASS**
(redirect guard, lỗi inline, dịch `subKey`, F5 giữ phiên, token không rò ra storage,
logout, reset-password thiếu/có token, forgot-password trung tính, đăng nhập bằng `staffone`).

**File chính:** `src/api/auth.ts` · `src/types/auth.ts` · `src/config/roles.ts` ·
`src/contexts/auth-context.ts` + `AuthProvider.tsx` · `src/hooks/use-auth.ts` ·
`src/components/auth-layout.tsx` + `route-guards.tsx` · `src/pages/auth/{Login,ForgotPassword,ResetPassword}.tsx` ·
`src/lib/validation.ts` · `src/i18n/locales/{vi,en}/auth.ts`.

**Ba lỗi thật đã phát hiện khi chạy trình duyệt (build sạch không lộ ra):**

1. ⚠️ **App treo vĩnh viễn sau F5.** Chặn StrictMode chạy effect 2 lần bằng cờ
   `if (done) return` khiến lần chạy thứ hai thoát sớm và **không ai set `status`**,
   app kẹt ở màn "Đang tải phiên làm việc…" dù network hoàn toàn đúng.
   Đã đổi sang **nhớ chính promise** trong `useRef` — lần 2 dùng lại kết quả lần 1,
   `/refresh` vẫn chỉ gọi một lần mà state luôn được cập nhật. **Đừng quay lại cách dùng cờ.**
2. **App mở ra tiếng Anh.** `i18next-browser-languagedetector` dò `navigator.language`.
   Đã bỏ `navigator` khỏi `detection.order`, chỉ đọc lựa chọn đã lưu, mặc định `vi`.
3. **Toast "Phiên đăng nhập không hợp lệ" hiện ngay lần đầu mở app.** Bootstrap gọi
   `/account/me` khi chưa từng đăng nhập ⇒ 401 ⇒ toast. Đã thêm `authApi.meSilent()`
   (`skipErrorToast`) riêng cho bootstrap — 401 lúc này là đường đi bình thường.

**Quyết định kỹ thuật:**

- Schema zod **nhận `t`** để message đã dịch sẵn — `FormMessage` của shadcn render thẳng chuỗi,
  không tự dịch khoá i18n được. Tránh phải vá file trong `components/ui/`.
- `authApi.logout()` **nuốt lỗi**: endpoint cần `Authorization` mà lúc đăng xuất token
  thường đã hết hạn ⇒ dễ 401. State phía client luôn bị dọn trong `finally`.
- `src/config/roles.ts` làm sớm ở phase này (thay vì Phase 4) vì cần `canAccessAdminApp()`
  để chặn `CUSTOMER` ngay sau login.
- Regex mật khẩu/SĐT trong `src/lib/validation.ts` **sao chép nguyên văn** constraint backend.

**Chờ backend (đã thống nhất với user):** sửa template email trỏ về
`clientBaseUrl + "/reset-password?token=" + resetToken`; chặn `CUSTOMER` ở `/authenticate`.
FE đã sẵn sàng cho cả hai.

---

## Phase 3 — App shell ✅ **ĐÃ XONG (2026-08-07)**

**Thiết kế:** khung chung trong mọi mockup.

- **Sidebar tối**: logo ELORIA, nút thu gọn, 4 nhóm — `TỔNG QUAN` / `BÁN HÀNG` / `HỆ THỐNG` / `SẢN PHẨM & KHO`,
  item active nền accent bo góc. Thay hoàn toàn [config/menu.ts](src/config/menu.ts).
- **Top bar**: breadcrumb ("Trang chủ › …"), **bộ chọn chi nhánh** (`POST /branch/search` — B5),
  **bộ chuyển ngôn ngữ VI/EN**
  (bổ sung ngoài mockup, đặt bên trái chuông), chuông thông báo, avatar + tên + role.
- `PageHeader` chuẩn: tiêu đề + mô tả phụ + slot action bên phải.
- Trang **403** và **404** theo style hệ thống.
- Responsive: desktop/tablet đúng thiết kế, `< md` sidebar thành sheet, không tràn ngang.
- Route rỗng cho từng module (placeholder) để điều hướng chạy được.

**DoD:** đi hết mọi mục menu không lỗi; thu gọn sidebar OK; đổi VI/EN đổi được toàn bộ chữ trong shell.

**Kết quả:** lint 0 lỗi, build sạch, **e2e Playwright 24/24 PASS** với **cả 3 role**:
4 nhóm menu + 10 mục đúng mockup · breadcrumb đổi theo màn · bộ chọn chi nhánh nạp từ
`POST /branch/search` thật · thu gọn sidebar · đổi VI/EN và lưu vào localStorage ·
mobile mở sheet + **không tràn ngang** (`scrollWidth == clientWidth == 390`) · không lỗi console.

**File chính:** `src/components/shell/` (`app-sidebar` · `app-topbar` · `app-breadcrumb` ·
`branch-selector` · `language-switcher` · `account-menu`) · `src/components/app-layout.tsx` ·
`src/config/menu.ts` · `src/api/branch.ts` + `src/types/branch.ts` ·
`src/contexts/branch-context.ts` + `BranchProvider.tsx` · `src/hooks/use-branch.ts` ·
`src/pages/{Forbidden,Placeholder}.tsx` · `src/i18n/locales/{vi,en}/menu.ts`.

**Đã xoá** (bị shell mới thay thế hoàn toàn): `app-header.tsx` · `app-sidebar.tsx` ·
`app-footer.tsx` · `app-logo.tsx` ở `src/components/`.

**Quyết định kỹ thuật:**

- **`minRole` khai ngay trong `config/menu.ts`** thay vì để tới Phase 4. Sidebar lọc mục theo
  `hasRole()` nên **menu theo role đã chạy đúng từ Phase 3** — kiểm chứng: STAFF không thấy
  "Nhân viên & CN" (`[ADMIN]`), ADMIN không thấy Sản phẩm/Danh mục/Khuyến mại (`[SUPER_ADMIN]`).
  Phase 4 chỉ còn phải bọc **router guard** (chặn gõ thẳng URL) và component `<Can>`.
- Nhóm menu rỗng **không render tiêu đề** — tránh nhóm trơ tiêu đề khi role thấp.
- Breadcrumb tra tên màn từ `allMenuItems`, khớp URL **dài nhất** để route con (`/staff/123`)
  vẫn ra đúng tên màn cha; không phải khai báo lại ở từng trang.
- `BranchProvider` đặt **trong `AppLayout`** (không phải bọc toàn app) để chỉ nạp chi nhánh
  sau khi đã đăng nhập, tránh gọi API ở nhóm màn auth.

⚠️ **Bẫy đã sửa — sidebar thu gọn xong không mở lại được** (user báo sau khi Phase 3 "xong").
Nút thu gọn ban đầu nằm trong nhánh `{!isCollapsed && …}` nên vừa thu gọn là nút biến mất,
người dùng kẹt cho tới khi tải lại trang. Nút toggle phải nằm **ngoài** nhánh điều kiện đó
và đổi icon `ChevronLeft ⇄ ChevronRight` theo trạng thái. Đã thêm test vòng lặp
thu gọn/mở rộng 3 lần để không tái diễn (6/6 PASS).
Bài học: **bộ e2e chỉ kiểm tra chiều đi mà quên chiều về** — thu gọn có test, mở lại thì không.

⚠️ **Bẫy a11y đã sửa:** nút đổi ngôn ngữ ban đầu dùng `title` + `<span class="sr-only">{current}</span>`,
khiến accessible name thành `"vi"` thay vì "Tiếng Việt" — trình đọc màn hình đọc ra mã ngôn ngữ.
Đã đổi sang `aria-label`. Khi thêm nút chỉ có icon, dùng `aria-label`, đừng nhét mã kỹ thuật vào `sr-only`.

---

## Phase 4 — RBAC (thang bậc kế thừa) ✅ **ĐÃ XONG (2026-08-08)**

Mô hình đã chốt ở **B3**: `SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS`, role bên trái
kế thừa toàn bộ quyền role bên phải. **Không có ma trận quyền, không có API quyền.**

- `src/config/roles.ts`: bảng bậc (`SUPER_ADMIN: 4 … ANONYMOUS: 0`) + **một** hàm dùng chung
  `hasRole(userRole, minRole)` = `rank(userRole) >= rank(minRole)`.
  **Cấm** viết `role === 'ADMIN' || role === 'SUPER_ADMIN'` rải rác trong màn hình.
- Mỗi route khai báo **`minRole`** đúng bằng tiền tố `[ROLE]` của API mà màn đó gọi
  (bảng tra ở [CLAUDE.md](CLAUDE.md)). Menu **sinh theo role**; route chặn ở cả
  **router guard** (vào thẳng URL ⇒ 403) lẫn ẩn khỏi menu.
- Component `<Can minRole="ADMIN">` để ẩn/khoá nút — dùng lại đúng hàm `hasRole` trên.
- Bộ chọn chi nhánh: `SUPER_ADMIN` chọn được "Tất cả chi nhánh"/từng chi nhánh;
  `ADMIN`/`STAFF` hiển thị **read-only** theo `branchId`.
- **Không** implement cụm tab `STAFF | ADMIN | SA` của mockup (chỉ là demo — CONVENTIONS mục 6.4).
- `CUSTOMER` không được vào web quản trị: login trả về role `CUSTOMER` ⇒ báo lỗi không đủ quyền, không cho vào app.

**DoD:** đăng nhập lần lượt bằng `superadmin` / `adminbranch` / `staffone` thấy 3 bộ menu khác nhau;
gõ thẳng URL không có quyền ⇒ 403; thêm một bậc role mới chỉ phải sửa `src/config/roles.ts`.

**Kết quả:** lint 0 lỗi, build sạch. `hasRole()`/`ROLE_RANK` đã có sẵn từ Phase 2, sidebar đã lọc theo
`minRole` từ Phase 3 — Phase 4 bổ sung phần còn thiếu: **router guard** chặn gõ thẳng URL
(`RoleRoute` trong [route-guards.tsx](src/components/route-guards.tsx)) và component **`<Can>`**
([can.tsx](src/components/can.tsx)) cho lần dùng đầu ở Phase 7 trở đi.

**Menu theo role — chốt lại với user** (khác với suy đoán ban đầu từ tiền tố API, vì nhiều màn
chưa có API thật nên minRole trước đó chỉ là tạm):

| Mục menu | minRole trước | minRole sau (Phase 4) |
|---|---|---|
| Dashboard & Báo cáo | STAFF | **ADMIN** |
| Khuyến mại | SUPER_ADMIN | **ADMIN** |
| Sản phẩm, Danh mục SP | SUPER_ADMIN | **STAFF** (xem — CRUD giới hạn theo role sẽ chặn ở Phase 9 bằng `<Can>`) |

Kết quả theo role đúng yêu cầu: **STAFF** = Bán hàng, Đơn hàng, Đổi/Trả, Khách hàng, Kho hàng
(+ Sản phẩm, Danh mục SP ở chế độ xem) · **ADMIN** = tất cả trên + Dashboard, Nhân viên & CN,
Khuyến mại · **SUPER_ADMIN** = toàn bộ.

**File chính:** `src/config/menu.ts` (đổi `minRole`) · `src/components/route-guards.tsx`
(thêm `RoleRoute`) · `src/components/can.tsx` (mới) · `src/Router.tsx` (bọc `RoleRoute` theo nhóm
`minRole`) · `PLAN.md`.

**Quyết định kỹ thuật:**

- Route `/` (Dashboard) đổi `minRole` lên `ADMIN` nhưng vẫn là route gốc sau login ⇒ STAFF vào `/`
  sẽ không thấy 403 mà **redirect sang `/pos`** (`RoleRoute` nhận thêm prop `redirectTo`, chỉ dùng
  ở route này). Các route khác không đủ quyền vẫn về `/403` như thiết kế.
- `<Can>` tạo sẵn ở Phase 4 theo yêu cầu PLAN nhưng **chưa có chỗ dùng thật** (chưa có nút hành động
  nào cần ẩn/khoá theo role) — sẽ dùng lần đầu ở Phase 7 (nút CRUD Nhân viên/Chi nhánh) và Phase 9
  (khoá nút sửa/xoá Sản phẩm với STAFF/ADMIN xem-only).
- Không kiểm chứng bằng trình duyệt thật (Playwright chưa cài trong repo — CLAUDE.md xác nhận chưa
  có test runner nào; không tự ý cài thêm dependency). Đã trace logic thủ công qua `ROLE_RANK` +
  từng route/guard cho cả 3 role, khớp lint + build sạch. **Khuyến nghị user tự click-test 3 tài
  khoản** trước khi coi Phase 4 là chốt hoàn toàn, đúng tinh thần DoD.

**Phần chưa làm:** không có — đúng phạm vi Phase 4 (chỉ menu & route theo role, không đụng CRUD/UI
nghiệp vụ của từng module).

---

## Phase 5 — Bộ component & pattern dùng chung ✅ **ĐÃ XONG (2026-08-08)**

- `DataTable`: search, filter, sort cột, phân trang, **empty state**, **loading skeleton**, error state,
  scroll ngang trong khung ở màn hẹp, slot action theo hàng.
- Form kit: `react-hook-form` + `zod`, đánh dấu trường bắt buộc, lỗi inline, map lỗi 400/422 từ BE về field.
- `StatusBadge` chuẩn hoá màu: xanh = tốt/hoàn tất, vàng = **chờ duyệt**, đỏ = lỗi/huỷ, xám = ngừng.
- `ConfirmDialog` cho hành động nhạy cảm, kèm dòng ghi chú "sẽ được lưu vào nhật ký (audit log)".
- `KpiCard` (theo hàng thẻ số liệu ở `01-dashboard`), `SectionCard`, `PillTabs` (theo `07/08/09`).
- `ExportButton` (Excel/PDF) — chuẩn hoá vị trí, chưa cần implement backend.
- Helper format: tiền VND, số lượng, ngày giờ tiếng Việt.

**DoD:** có 1 trang demo nội bộ dựng lại `04-don-hang` **chỉ bằng** component dùng chung, khớp mockup.

**Kết quả:** lint 0 lỗi, build sạch. Đã dựng đủ bộ component theo yêu cầu. **User chủ động bỏ qua
phần DoD "trang demo nội bộ"** (không cần thiết vì Phase 6/12 — mock layer và màn Đơn hàng thật —
chưa tới) ⇒ các component **chưa có màn hình thật nào gọi tới**, sẽ được dùng lần đầu ở Phase 7.

**File chính:**
- `src/components/data-table/data-table.tsx` — bọc `@tanstack/react-table` (client-side sort qua
  `getSortedRowModel`, hoặc `manualSorting` khi màn tự quản lý sort phía server), loading = hàng
  skeleton theo đúng số cột, error = icon + nút thử lại, empty = text tuỳ biến được, phân trang tự
  viết (không dùng `ui/pagination.tsx` vì đó là bản `<a>` cho URL-based routing, không hợp para
  trạng thái client).
- `src/components/data-table/data-table-toolbar.tsx` — hàng search + filter + tổng số bản ghi phía
  trên bảng (theo `04`, `07`).
- `src/components/status-badge.tsx` — 5 tông màu (`success/warning/danger/muted/info`) map thẳng vào
  token `--success/--warning/--destructive` đã có sẵn từ Phase 0, không hardcode hex.
- `src/components/confirm-dialog.tsx` — bọc `ui/dialog.tsx`, có `auditLogged` để hiện dòng ghi chú
  audit log theo CONVENTIONS, tự quản `loading` khi `onConfirm` là async.
- `src/components/kpi-card.tsx`, `section-card.tsx`, `pill-tabs.tsx` — theo đúng bố cục
  `01-dashboard-bao-cao` và `07/08/09-…` (tab pill, không gạch chân — CONVENTIONS mục 6.3).
- `src/components/export-button.tsx` — 1 định dạng ⇒ nút đơn, 2 định dạng (Excel/PDF) ⇒ dropdown.
- `src/lib/format.ts` — `formatVnd`, `formatNumber`, `formatDate`, `formatDateTime`,
  `formatRelativeTime` (dùng `date-fns` + locale `vi`).
- `src/lib/form-error.ts` — `setFormErrorFromApi()` gắn lỗi 400/422 vào field form.
- `src/i18n/locales/{vi,en}/common.ts` — thêm namespace `dataTable`, `confirmDialog`, mở rộng `action`.
- Thêm shadcn: `table`, `tabs`, `dialog`, `checkbox`, `pagination` (component `pagination.tsx` được
  tạo theo chuẩn CLI nhưng **không dùng** — xem quyết định kỹ thuật).
- Cài `@tanstack/react-table`, `date-fns` (đã duyệt sẵn ở PLAN mục C).

**Quyết định kỹ thuật:**

- **`@tanstack/react-table` ghim ở `^8.21.3`, không dùng bản mới nhất.** `npm install` không ghi rõ
  version sẽ kéo về **v9** (đã ra bản chính thức, không còn là beta) — v9 đổi toàn bộ API
  (`useReactTable`/`getCoreRowModel` bị thay bằng `createCoreRowModel`…), một breaking rewrite chưa
  phổ biến trong tài liệu/cộng đồng. Build thử với v9 lỗi ngay (`getCoreRowModel` không tồn tại).
  Ghim v8 — bản ổn định, được dùng rộng rãi — để `DataTable` không phải học lại API mới giữa chừng.
  Nếu sau này muốn nâng lên v9, phải là quyết định rõ ràng của user, không phải tác dụng phụ của
  `npm install` không ghim version.
- **Không dùng `ui/pagination.tsx` (thêm qua CLI) cho `DataTable`.** Component đó dựng cho điều hướng
  qua URL (`PaginationLink` render `<a href>`), trong khi phân trang bảng dữ liệu ở đây là state phía
  client (`page`/`onPageChange`) khớp đúng tham số `SearchReq.page` của backend — dùng `<a>` sai
  semantic (không phải link điều hướng) và phải tự chặn `preventDefault`. Tự viết pager bằng
  `<Button>` trong `data-table.tsx`, file `ui/pagination.tsx` vẫn giữ lại (không xoá component shadcn
  chuẩn) phòng khi có màn cần điều hướng qua URL thật.
- **`DataTable` hỗ trợ cả sort phía client lẫn phía server** (`onSortingChange` truyền vào ⇒
  `manualSorting: true`, bảng không tự sort mà để màn gọi lại API): các API `.../search` thật đều
  nhận `sortBy`/`sortDir` ở backend (CLAUDE.md), nên phần lớn màn ở Phase 7 trở đi sẽ dùng chế độ
  server-sort; chế độ client-sort giữ lại cho bảng tĩnh nhỏ (ví dụ audit log detail, bảng tra cứu).
- **`setFormErrorFromApi()` cần caller khai báo map `subKey → field` thủ công**, không tự động suy ra
  field. Lý do: `ErrorResponse` của backend chỉ có **một** `subKey` chuỗi phẳng
  (`error.username.duplicated`), không phải mảng lỗi theo field như một số backend khác — không có
  cách suy field tên từ subKey một cách tổng quát, nên chuẩn hoá thành helper nhận map tường minh
  thay vì cố "đoán" field.
- **`RequiredMark`/đánh dấu trường bắt buộc không tách file riêng.** `FormLabel` của shadcn nhận
  `children` tự do, nên đánh dấu `*` bắt buộc chỉ cần `<FormLabel>Tên <span className="text-destructive">*</span></FormLabel>`
  ngay tại form — không đủ phức tạp để cần một component riêng, sẽ xem lại nếu Phase 7 lặp lại nhiều lần.
- **`ExportButton` chưa nối `onExportExcel`/`onExportPdf` thật** — theo đúng phạm vi PLAN ("chưa cần
  implement backend"), hai callback là bắt buộc truyền vào nhưng màn gọi tự quyết định làm gì (show
  toast "sắp ra mắt", gọi API thật khi có, …).

**Giả định:** Theo yêu cầu của user, **bỏ qua phần DoD "trang demo nội bộ dựng lại `04-don-hang`"** —
không có màn hình nào thực sự import các component này ở Phase 5. Rủi ro: một số lỗi tích hợp (ví dụ
prop không khớp khi dùng thật, style lệch mockup khi ráp nhiều component lại) chỉ lộ ra khi Phase 7
bắt đầu dùng `DataTable`/`ConfirmDialog` cho màn Nhân viên & Chi nhánh — nên coi bộ component này là
**chưa được kiểm chứng bằng màn hình thật**, cần rà kỹ ở lần dùng đầu tiên.

**Phần chưa làm:** trang demo nội bộ (bỏ theo yêu cầu user, xem trên).

---

## Phase 6 — Lớp mock data & service contract ✅ **ĐÃ XONG (2026-08-08)**

- Định nghĩa **type nghiệp vụ** trong `src/types/`. Các type **đã có API thật** (staff, branch,
  audit-log, administrative-address, account) phải **copy đúng từ api-docs**, không tự đặt tên field.
  Các type **chưa có API** (customer, product, sku, inventory, order, return, promotion, shift)
  đặt tên bám theo quy ước BE đang dùng (`*ResDTO` / `Create*ReqDTO` / `*SearchReqDTO`,
  `status` 1/0, id UUID chuỗi, ngày ISO-8601 UTC).
- Mỗi module 1 service `src/api/<module>.ts` với **chữ ký cố định**. Module chưa có API thì implement
  đọc từ `src/mocks/<module>.ts` (có độ trễ giả lập, có case lỗi để test error state),
  nhưng vẫn **giả lập đúng shape `BaseResponse` + `{total, data[]}`** để sau đổi không lệch.
- Cờ `VITE_USE_MOCK=true|false` — chỉ tác động tới module chưa có API thật.

**DoD:** đổi cờ về `false` là code màn hình không phải sửa gì, chỉ service đổi implement.

> ⚠️ Khi backend bổ sung API thật, phải **đọc lại `/v3/api-docs/api` theo lệnh của bạn**
> rồi đồng bộ lại type — không tự đoán.

**Kết quả:** lint 0 lỗi, build sạch (`tsc -b` type-check toàn bộ file mới vì `tsconfig.app.json`
include cả thư mục `src`, không chỉ theo import graph). Đã dựng đủ 8 module theo đúng danh sách
"chưa có API" trong PLAN mục A: customer, product (+ category, SKU), inventory (+ phiếu nhập, kiểm
kê), order, return, promotion, shift.

**File chính:**
- `src/types/{customer,product,inventory,order,return,promotion,shift}.ts` — mỗi file 1+ enum trạng
  thái (`E*`) và type `*ResDTO`-style, theo đúng field/wording đọc từ mockup tương ứng
  (`10`, `11`, `12`, `13`, `04+05`, `06`, `16`; riêng phiếu nhập/kiểm kê ở `14`/`15` chỉ có empty
  state trong mockup nên dựng theo mô tả nghiệp vụ ở PLAN Phase 10).
- `src/mocks/mock-utils.ts` — helper dùng chung: `mockDelay()` (400ms), `mockError()`, `paginateMock()`
  (lọc keyword + phân trang client, trả đúng shape `{total, data[]}`).
- `src/mocks/<module>.ts` — dữ liệu mẫu **copy nguyên văn con số/tên** từ mockup (ví dụ đơn hàng
  `DH-2407-0891`, khách hàng `KH001 Nguyễn Thị Lan`…) để dễ đối chiếu khi Phase 8+ dựng màn thật.
- `src/api/<module>.ts` — mỗi hàm rẽ nhánh `if (useMock) {...mock...} else {...apiClient thật...}`,
  cùng chữ ký `Promise<T>` ở cả hai nhánh nên tầng UI gọi giống hệt nhau dù đang mock hay thật.

**Quyết định kỹ thuật:**

- **Quy ước test error state:** gõ đúng chuỗi `MOCK_ERROR_KEYWORD` (`__mock_error__`, export từ
  `mock-utils.ts`) vào ô tìm kiếm của bất kỳ màn nào đang dùng mock sẽ khiến `.search()` ném lỗi thay
  vì trả rỗng — dùng chung 1 quy ước cho toàn bộ 8 module thay vì mỗi module tự bịa cách trigger lỗi
  riêng, để QA nhớ được và dùng nhất quán.
- **Nhánh "thật" của mỗi hàm API gọi endpoint đoán tên** (`/customer/search`, `/product/search`,
  `/order/search`…) vì backend **chưa có tài liệu api-docs cho các module này** — đây là điểm phải
  đối chiếu lại khi Phase 8+ có API thật, đúng cảnh báo trong PLAN ("đọc lại api-docs theo lệnh của
  bạn, không tự đoán"). Nhánh mock hiện tại là nhánh **duy nhất thực sự chạy được**.
- **Phiếu nhập kho / kiểm kê (`GoodsReceipt`, `StockCount`)**: mockup `14`/`15` chỉ có empty state
  (chưa nhập dữ liệu mẫu), nên 2 type này dựng theo đúng mô tả nghiệp vụ ở PLAN Phase 10 ("PO → nhập
  theo ma trận size × màu", "kiểm kê toàn phần/từng phần, tự sinh phiếu điều chỉnh chênh lệch") thay
  vì soi mockup — rủi ro lệch field nếu Phase 10 phát hiện cách trình bày khác khi có mockup chi tiết
  hơn (hiện chưa có).
- **`Order.items`/`OrderItem` phần lớn để mảng rỗng `[]`** ở các dòng mock ngoài đơn `DH-2407-0891`
  (đơn duy nhất có chi tiết trong mockup `05-don-hang-chi-tiet`) — các đơn còn lại chỉ cần đúng cột
  bảng danh sách (`04-don-hang`), chưa cần chi tiết sản phẩm.
- **Không tạo `.env`** dù `.env.example` đã có sẵn `VITE_USE_MOCK=true`. `.env` bị gitignore và là
  cấu hình máy cục bộ của từng người — repo hiện **không có file `.env`**, nghĩa là
  `import.meta.env.VITE_USE_MOCK` sẽ là `undefined` (⇒ `useMock = false`) cho tới khi người dùng tự
  tạo `.env` từ `.env.example`. Đây không phải lỗi của Phase 6, chỉ là bước setup máy cục bộ — **cần
  bạn tự copy `.env.example` → `.env` để chạy dev với mock**, không có bước này thì `useMock` luôn
  `false` và các service gọi vào endpoint đoán tên (chưa tồn tại) sẽ lỗi.

**Giả định:** Chưa có màn hình nào gọi tới các service này (đúng phạm vi Phase 6 — Phase 8 trở đi mới
dựng UI dùng chúng), nên **chưa kiểm chứng bằng cách chạy thật** ngoài `tsc` type-check. Tên trường
trong các type "chưa có API" là suy đoán hợp lý theo quy ước đặt tên backend đang dùng (PLAN mục A),
không phải xác nhận từ api-docs — sẽ phải đối chiếu lại khi backend bổ sung endpoint tương ứng.

**Phần chưa làm:** không có — đúng phạm vi Phase 6 (chỉ type + mock + service, không đụng UI).

---

## Phase 7 — Nhân viên & Chi nhánh ✅ **ĐÃ XONG (2026-08-08)**

**Thiết kế:** `07-nhan-vien.png`, `08-chi-nhanh.png`, `09-phan-quyen.png` — 3 tab pill dưới tiêu đề.

> **Phase duy nhất trong nhóm màn nghiệp vụ chạy được trên API thật ngay** — không dùng mock.

- Tab **Nhân viên** (`/staff/*`): danh sách qua `POST /staff/search` (filter `keyword`/`status`/`role`/`branchId`),
  thêm (`POST /staff`), sửa (`PUT /staff/{id}`), gán role (`POST /staff/assign-role`),
  khoá/mở (`POST /staff/update-status`), reset mật khẩu (`POST /staff/{id}/reset-password`),
  xoá mềm (`DELETE /staff/{id}`). Hành động nhạy cảm có confirm dialog.
  **Reset mật khẩu trả `temporaryPassword` chỉ hiển thị đúng một lần** ⇒ dialog riêng có nút copy, cảnh báo rõ.
- Tab **Chi nhánh** (`/branch/*`): search + CRUD + bật/tắt. Form gồm tên, SĐT, địa chỉ,
  **Tỉnh/Thành → Phường/Xã** (2 cấp, load từ `/administrative-address/provinces` và `/wards?provinceCode=`),
  giờ mở/đóng cửa dạng `HH:mm`.
  Lưu ý ràng buộc BE: không xoá/tắt được chi nhánh còn nhân viên.
- Tab **Phân quyền**: **bảng tĩnh chỉ để đọc** theo `09-phan-quyen.png` *(B3)*. Quyền do backend fix cứng
  theo thang bậc kế thừa ⇒ **không có API đọc/ghi**, **không dựng checkbox cho sửa**.
  Nội dung bảng lấy từ hằng số trong `src/config/roles.ts`, không gọi API.
- **Audit log** (`POST /audit-log/search`, `GET /audit-log/{id}`): bảng nhật ký + dialog xem before/after
  (`oldValue`/`newValue`), lọc theo `userId`/`entityName`/`action`/khoảng ngày. *Chưa có mockup ⇒ pattern bảng chuẩn.*

**Lưu ý phạm vi theo role (BE tự enforce, FE phải khớp):** ADMIN chỉ thấy/tạo nhân viên chi nhánh mình
và chỉ gán được role STAFF; điều chuyển chi nhánh và CRUD chi nhánh chỉ SUPER_ADMIN.
Test bằng cả `superadmin` lẫn `adminbranch`.

**Kết quả:** lint 0 lỗi, build sạch. **Trước khi code, đã đọc lại `/v3/api-docs/api`** theo yêu cầu
user (khảo sát 2026-08-06 → 2026-08-08) — phần staff/branch/audit-log/administrative-address khớp
100% với CLAUDE.md cũ, nhưng phát hiện backend đã có thêm API cho brand/category/color/size/product/sku/
customer (ngoài phạm vi Phase 7) → đã cập nhật CLAUDE.md + PLAN mục A ghi nhận, không code thêm.

Đã **test toàn bộ bằng cả 2 lớp**: (1) `curl` trực tiếp vào backend thật với cả 3 tài khoản — xác nhận
đúng request/response shape, đúng RBAC scoping (ADMIN chỉ thấy nhân viên chi nhánh mình, STAFF nhận
403 ở `/staff/search`), đúng ràng buộc nghiệp vụ (không tắt được chi nhánh còn nhân viên); (2) UI thật
qua Chrome headless (`puppeteer-core`, xem quyết định kỹ thuật) — chụp ảnh từng tab, mở từng dialog,
xác nhận khớp mockup và không có lỗi console ngoài 401 bootstrap bình thường (Phase 2).

**Dữ liệu mẫu đã tạo trên backend dev local** (qua API thật, không phải mock): 5 chi nhánh khớp đúng
tên/địa chỉ trong mockup (HN-Hoàn Kiếm, HCM-Q1, HCM-Q3, Đà Nẵng, Hải Phòng, đủ `provinceCode`/`wardCode`
thật), 8 nhân viên (3 tài khoản test có sẵn + 5 tạo mới, đủ vai trò STAFF/ADMIN, một tài khoản khoá để
test trạng thái "Đã khoá"). Toàn bộ thao tác tạo/sửa/khoá đã tự động sinh **26 bản ghi audit log thật**
— đủ dữ liệu để tab Nhật ký hệ thống không rơi vào empty state khi review.

**File chính:**
- `src/types/{staff,audit-log,administrative-address}.ts` — copy đúng field từ api-docs (không suy đoán).
- `src/api/{staff,audit-log,administrative-address}.ts` — service API thật, không qua mock.
- `src/i18n/locales/{vi,en}/staff.ts` — namespace mới, đăng ký trong `src/i18n/index.ts`.
- `src/pages/staff/StaffPage.tsx` — khung 4 tab pill (Nhân viên/Chi nhánh/Phân quyền/Nhật ký hệ thống).
- `src/pages/staff/{StaffTab,BranchTab,PermissionsTab,AuditLogTab}.tsx` + `src/pages/staff/components/*`
  (`staff-form-dialog`, `assign-role-dialog`, `reset-password-dialog`, `staff-columns`, `branch-form-dialog`,
  `audit-log-detail-dialog`).
- `src/Router.tsx` — route `/staff` trỏ `StaffPage` thay `Placeholder`.
- `CLAUDE.md`, `PLAN.md` — cập nhật khảo sát api-docs 2026-08-08.

**Quyết định kỹ thuật:**

- **Audit log là tab thứ 4 trong cùng `StaffPage`, không phải mục menu riêng.** Mockup chỉ có 3 tab
  pill (`07/08/09`), nhưng PLAN Phase 7 gộp audit log vào cùng phase và chưa có mockup riêng ⇒ thêm
  tab "Nhật ký hệ thống" cạnh 3 tab có sẵn thay vì thêm route/menu item mới ngoài kế hoạch.
- **`oldValue`/`newValue` của audit log là chuỗi JSON bọc trong MỘT MẢNG** (`"[{...}]"`), không phải
  object trần như suy đoán ban đầu từ api-docs (chỉ khai `type: string`) — phát hiện bằng dữ liệu thật,
  đã sửa `tryParseJson()` bóc phần tử đầu mảng trước khi hiển thị field-by-field.
- **Phát hiện bảo mật cần báo user:** log `CREATE_STAFF` chứa **mật khẩu dạng plaintext** trong
  `newValue` (ví dụ `"password":"Admin@123"`) — xác nhận qua ảnh chụp UI thật. Đây là dữ liệu do
  **backend** ghi vào audit log, FE hiển thị đúng những gì backend trả về (đúng tinh thần "audit log
  là bản ghi trung thực"). Không tự ý lọc field ở FE vì sẽ che mất thông tin audit hợp lệ cho các
  entity khác — nhưng **cần báo cho đội backend** để cân nhắc loại `password` ra khỏi payload trước
  khi ghi log, hoặc mã hoá/ẩn field nhạy cảm ở tầng ghi log.
- **`ResetStaffPasswordResDTO`/`AssignRoleReqDTO` là API riêng biệt với sửa hồ sơ** — xác nhận
  `UpdateStaffReqDTO` không có `username`/`password`/`role` (khớp suy đoán ban đầu), nên dialog sửa
  hồ sơ ẩn hẳn 3 field này; đổi role và reset mật khẩu là 2 dialog riêng, mỗi dialog gọi đúng 1 API.
- **`staffApi.assignRole()` sửa lại kiểu trả về từ `Promise<Staff>` thành `Promise<null>`** sau khi
  test thật — endpoint trả `data: null`, không trả lại `Staff` đã cập nhật như suy đoán lúc viết type
  (màn hình vẫn đúng vì tự gọi lại `load()` sau khi gán role, không dùng giá trị trả về).
- **Chi nhánh dùng card grid, không dùng `DataTable`** — đúng mockup `08-chi-nhanh.png` (không phải
  bảng như `04`/`07`). Nút bật/tắt trạng thái đặt trong menu kebab cạnh nút "Sửa" (mockup không vẽ
  nút này rõ, chỉ có "Sửa" + icon mắt) — suy ra cần có vì PLAN Phase 7 yêu cầu "bật/tắt" tường minh.
- **Form thêm/sửa chi nhánh không có trong mockup** (`08` chỉ có card grid tĩnh) ⇒ dựng theo pattern
  form chuẩn (CONVENTIONS mục 6.2), field đúng `CreateBranchReqDTO`/`UpdateBranchReqDTO` (chỉ `name`
  bắt buộc, còn lại optional kể cả địa chỉ).
- **Cài `puppeteer-core` làm devDependency để tự kiểm tra UI qua Chrome headless** (theo yêu cầu user
  giữa phase) — dùng Chrome hệ thống có sẵn qua `executablePath`, không tự tải Chromium riêng. **User
  đã đồng ý giữ lại** cho các phase sau; đã thêm mục rà soát/gỡ nếu không còn cần vào Phase 16.
- **Test qua `curl` từng gặp lỗi encoding UTF-8 giả** (tiếng Việt có dấu trong body `-d` bị Git Bash
  làm hỏng byte) — không phải lỗi backend hay frontend, chỉ là hạn chế của cách gọi curl trên
  Windows/MSYS. Khắc phục bằng cách ghi body ra file qua Node (`fs.writeFileSync` đảm bảo UTF-8 đúng)
  rồi `curl --data-binary @file`. Ghi lại để lần sau không mất thời gian chẩn đoán lại.

**Giả định:** Nhánh "API thật" của các service **staff/branch/audit-log/administrative-address** đã
được xác nhận đúng 100% qua test thật (không còn là giả định). Wording tab "Nhật ký hệ thống" và toàn
bộ text audit log detail là tự đặt (không có mockup), có thể cần chỉnh lại nếu sau này có bản thiết kế
chính thức cho màn này.

**Phần chưa làm:** không có — đúng phạm vi Phase 7 ban đầu (Nhân viên, Chi nhánh, Phân quyền, Audit
log, tất cả trên API thật). Domain sản phẩm/khách hàng mới phát hiện có API **không** được code ở đây,
để dành đúng lúc Phase 8/9 theo chỉ định của user.

### Cập nhật sau review của user (2026-08-08, cùng ngày)

User rà soát UI thật và yêu cầu 2 thay đổi, cả hai đã làm xong:

1. **Nền trắng cho Input/Select/Textarea/DataTable.** Nguyên nhân: shadcn mặc định dùng
   `bg-transparent` (dự phòng cho dark mode qua `dark:bg-input/30`), nhưng app **không có dark mode**
   (CONVENTIONS mục 5) nên class dark: không bao giờ kích hoạt ⇒ 3 component luôn trong suốt, để lộ
   nền xám của trang phía sau thay vì nền trắng như mockup. Sửa `bg-transparent` → `bg-card` (token
   trắng thuần) trong `src/components/ui/{input,select,textarea}.tsx`, xoá luôn các class `dark:*`
   không dùng được. `DataTable` bọc thêm `bg-card` cho khung bảng. Ảnh hưởng **toàn app** (mọi form
   dùng 3 component này), không riêng màn Nhân viên/Chi nhánh — đây là sửa lỗi thị giác nền tảng từ
   Phase 5, tình cờ được phát hiện khi review Phase 7.
2. **Tách 3 mục Nhân viên/Chi nhánh/Nhật ký hệ thống thành mục menu riêng, bỏ hẳn Phân quyền.**
   Trước đó gộp cả 4 vào 1 route `/staff` với pill tabs theo mockup `07/08/09`. User muốn 3 mục là
   3 điểm vào menu riêng biệt (không qua tab), và bỏ hẳn nội dung Phân quyền — **khác với mô tả gốc
   của Phase 7 trong PLAN** (mockup `09-phan-quyen.png` không còn được implement). Đã xoá
   `PermissionsTab.tsx` và toàn bộ key i18n `staff.permission.*`, `staff.tab.*`.

**File đổi thêm:**
- `src/components/ui/{input,select,textarea}.tsx` — nền `bg-card`.
- `src/components/data-table/data-table.tsx` — khung bảng thêm `bg-card`.
- `src/pages/staff/{StaffListPage,BranchListPage,AuditLogPage}.tsx` (mới, thay `StaffPage.tsx` +
  `StaffTab.tsx` + `BranchTab.tsx` + `AuditLogTab.tsx` đã xoá) — mỗi trang có `PageHeader` riêng.
- `src/pages/staff/PermissionsTab.tsx` — **đã xoá**.
- `src/config/menu.ts` — nhóm HỆ THỐNG giờ có 4 mục (Nhân viên, Chi nhánh, Nhật ký hệ thống, Khách
  hàng) thay vì 2 (Nhân viên & CN, Khách hàng); icon `UserRound` (Nhân viên), `Building2` (Chi nhánh,
  đổi từ Nhân viên cũ), `ClipboardList` (Nhật ký hệ thống, mới).
- `src/Router.tsx` — 3 route `/staff`, `/branch`, `/audit-log` (đều `minRole=ADMIN`) thay 1 route.
- `src/i18n/locales/{vi,en}/menu.ts` — thêm key `menu.branch`, `menu.auditLog`; `menu.staff` đổi
  nghĩa từ "Nhân viên & CN" thành "Nhân viên".
- `src/i18n/locales/{vi,en}/staff.ts` — mỗi nhóm (`staff`, `branch`, `auditLog`) có `pageTitle`/
  `pageDescription` riêng thay vì 1 cặp dùng chung + `tab.*`; xoá toàn bộ `permission.*`.

**Quyết định kỹ thuật:**

- **`PillTabs` component (Phase 5) không xoá** dù không còn nơi dùng — đây là component dùng chung
  theo PLAN Phase 5, có thể cần lại ở màn khác có tab thật (ví dụ Đơn hàng `04` có tab Tất cả/Online/
  Tại quầy). Giữ lại, không phải dead code cần dọn.
- **URL đổi từ `/staff` (chứa cả 3 nội dung) thành `/staff` + `/branch` + `/audit-log` riêng** — không
  giữ redirect từ URL cũ vì trước đó chưa từng công bố/dùng thật (mới xong trong cùng phiên làm việc).
- **Route `/branch` không trùng với khái niệm chi nhánh dùng trong bộ chọn chi nhánh trên top bar**
  (route đó là API `branchApi`, không phải URL) — không có xung đột namespace.

**Kết quả kiểm tra lại:** build + lint sạch (0 lỗi), test bằng Chrome headless thật — chụp ảnh cả 3
trang mới (`/staff`, `/branch`, `/audit-log`) xác nhận: sidebar hiện đúng 3 mục riêng không còn Phân
quyền, breadcrumb đổi đúng theo từng trang, input/select có nền trắng rõ ràng khớp mockup, bảng có
khung nền trắng bao quanh.

### Cập nhật lần 2 sau review của user (2026-08-08, cùng ngày) — pattern "Chi tiết" + cột thao tác cố định

User rà soát tiếp bảng Nhân viên và yêu cầu 2 thay đổi, chốt thành **pattern dùng chung cho toàn hệ
thống**, không riêng Phase 7:

1. **Cột THAO TÁC mặc định chỉ có nút "Chi tiết"** (mở modal xem hồ sơ), các hành động khác (Sửa đầy
   đủ, Gán vai trò, Reset mật khẩu, Khoá/Mở, Xoá) dồn vào menu `(...)`. Trong modal "Chi tiết", nút
   "Sửa" chuyển toàn bộ field từ text sang input/dropdown **ngay tại chỗ** (inline edit, không mở form
   riêng) — field không sửa được qua API (`username`, `role` của nhân viên) vẫn hiện input/select
   nhưng bị khoá (`disabled`), không ẩn khỏi modal.
2. **Cột THAO TÁC cố định chiều rộng 120px**, không bị `flex` kéo giãn dù nội dung ngắn nhất bảng —
   áp dụng `ColumnDef.size` của `@tanstack/react-table` (trước đó `DataTable` chưa hỗ trợ khai `size`
   cho cột, mọi cột đều co giãn theo nội dung dài nhất kiểu bảng HTML mặc định).

**Quyết định thiết kế do user chốt trực tiếp** (không tự suy đoán):
- Modal (không phải Drawer trượt cạnh) cho toàn hệ thống.
- Sửa = inline edit ngay trong modal chi tiết (không mở dialog form thứ hai), áp dụng **cho mọi modal
  chi tiết sau này**, không riêng Nhân viên.
- Modal chi tiết ở chế độ xem chỉ có 2 nút "Sửa" + "Đóng" — các hành động khác (gán role, khoá/mở…)
  vẫn ở `(...)` ngoài bảng, không nhét hết vào modal.
- Field không sửa được qua API vẫn hiện input/dropdown dạng khoá (disabled), không ẩn khỏi modal.
- Màn Chi nhánh (card grid, không phải bảng) **giữ nguyên như cũ**, không đồng bộ sang pattern mới —
  phạm vi lần này chỉ áp dụng cho bảng Nhân viên và Nhật ký hệ thống.

**File mới:**
- `src/components/detail-modal.tsx` — component **`DetailModal`** dùng chung cho toàn hệ thống: nhận
  danh sách `DetailField` (field descriptor: `name`, `label`, `editable`, `type`, `options`,
  `formatValue`, `readOnly`), tự render chế độ xem (text/badge tuỳ `formatValue`) hoặc chế độ sửa
  (input/select đúng `type`, khoá nếu `editable: false`). Field `readOnly: true` (ví dụ trạng thái
  hoạt động/khoá) không thuộc form, luôn hiển thị y hệt cả hai chế độ.
- `src/pages/staff/components/staff-detail-modal.tsx` — áp dụng `DetailModal` cho Nhân viên: field
  sửa được (`fullName`, `email`, `phoneNumber`, `branchId` — chỉ SUPER_ADMIN, `dob`, `gender`,
  `description`) đúng theo `UpdateStaffReqDTO`; field khoá (`username`, `role`) và field chỉ đọc
  (`status`) hiện đúng theo mô tả trên.

**File đổi:**
- `src/components/data-table/data-table.tsx` — đọc `ColumnDef.size` (nếu có khai) để gán `width`/
  `minWidth` cố định cho `TableHead`/`TableCell` tương ứng; cột không khai `size` vẫn co giãn tự do
  như cũ (`table-layout` giữ `auto`, không đổi sang `fixed` — tránh ép toàn bộ cột theo cùng logic,
  làm hỏng cột NHÂN VIÊN cần linh hoạt cho avatar + tên + email).
- `src/pages/staff/components/staff-columns.tsx` — cột THAO TÁC còn 2 nút: "Chi tiết" (icon mắt +
  chữ, gọi `onViewDetail`) và `(...)` (gộp `onEditFull`, `onAssignRole`, `onResetPassword`,
  `onToggleStatus`, `onDelete`); các cột CHI NHÁNH/VAI TRÒ/TRẠNG THÁI/NGÀY VÀO đều thêm `size` theo
  đúng độ dài nội dung thật, cột NHÂN VIÊN không khai `size` (linh hoạt).
- `src/pages/staff/StaffListPage.tsx` — thêm state `detailStaff`, nối `StaffDetailModal`; `handleUpdate`
  giờ cập nhật `detailStaff` bằng response mới sau khi lưu để modal không hiển thị dữ liệu cũ nếu mở
  lại ngay.
- `src/pages/staff/AuditLogPage.tsx` — cột THAO TÁC đổi nút icon-only thành "Chi tiết" (icon + chữ),
  toàn bộ cột thêm `size` cố định.
- `src/components/ui/{input,select,textarea}.tsx` — **KHÔNG đổi thêm** ở lần cập nhật này (đã sửa nền
  trắng ở lần cập nhật trước) — `DetailModal` tái dùng nguyên `Input`/`Select` đã sửa, tự động đúng
  nền mà không cần đụng thêm.
- `src/i18n/locales/{vi,en}/common.ts` — thêm `action.edit`, `action.save`, `action.detail`
  (namespace `common` phẳng, không lồng theo tên file — xem quy ước đã ghi ở Phase 7 gốc).

**Quyết định kỹ thuật đáng chú ý:**
- **`DetailField<TValues>` không dùng discriminated union theo `name` optional** dù thiết kế đầu tiên
  định làm vậy (field readonly ⇒ bỏ `name`) — TypeScript không narrow tốt union có generic parameter
  lồng qua callback `.map()`/`render` của `react-hook-form`, gây hàng loạt lỗi "Property does not
  exist" dù logic đúng. Đổi sang **cờ tường minh `readOnly?: boolean`** + validate bằng `throw` ở
  runtime (dev-time safety net: thiếu `formatValue` khi `readOnly: true`, hoặc thiếu `name` khi không
  phải `readOnly`) — đơn giản hơn, TypeScript suy luận đúng ngay, không cần ép kiểu thủ công.
- **`StaffFormDialog` (Phase 7 gốc) KHÔNG bị xoá** — user chốt giữ song song 2 đường: `DetailModal`
  cho sửa nhanh tại chỗ, `StaffFormDialog` (mở qua `(...)` → "Sửa hồ sơ") cho sửa đầy đủ có validate
  zod chặt hơn (regex SĐT, email format…). `DetailModal` hiện **không validate** ngoài required cứng
  của `<input>` HTML — nếu sau này cần validate chặt trong `DetailModal`, phải bàn thêm với user vì
  đây là quyết định UX (đánh đổi giữa sửa nhanh và sửa có kiểm tra kỹ).
- **`table-layout` giữ `auto`, không đổi `fixed`.** `fixed` sẽ buộc mọi cột dùng chung 1 thuật toán
  chia đều theo `<colgroup>`/cột đầu tiên, phá vỡ cột NHÂN VIÊN (cần rộng linh hoạt cho tên+email dài
  ngắn khác nhau). Với `auto`, cột có `width` cố định vẫn giữ đúng kích thước tối thiểu, cột không
  khai `size` co giãn theo nội dung — đúng hành vi mong muốn mà không cần đổi toàn bộ chiến lược layout.

**Kết quả kiểm tra lại:** build + lint sạch (0 lỗi). Test bằng Chrome headless thật: chụp ảnh xác nhận
cột THAO TÁC gọn cố định (không còn 4 nút icon rời rạc như trước), modal "Chi tiết" hiển thị đúng toàn
bộ hồ sơ, bấm "Sửa" chuyển đúng field sang input/dropdown (kể cả 2 field bị khoá `username`/`role` —
input/dropdown hiện nhưng nền xám, không click được), lưu thành công có toast + đóng chế độ sửa. Menu
`(...)` không tự động xác nhận được qua ảnh chụp (giới hạn kịch bản test tự động với Radix dropdown
portal, không phải lỗi thật — cùng pattern `DropdownMenu` đã test thành công ở màn Chi nhánh).

### Cập nhật lần 3 sau review của user (2026-08-09) — paging query param, bỏ dropdown chi nhánh top bar

User yêu cầu 3 thay đổi, đều đã làm xong:

1. **`page`/`size`/`sort` chuyển từ body sang query param** cho mọi endpoint `POST .../search`.
2. **Nút "Chi tiết" chỉ còn icon**, bỏ chữ (đã áp dụng ở lần cập nhật 2, giờ đúng nghĩa "chỉ icon").
3. **Bỏ dropdown chọn chi nhánh trên top bar** — màn nào cần filter theo chi nhánh tự implement sau.
   Kèm yêu cầu điều tra vì sao `StaffListPage` gọi 2 lần `staff/search` và 2 lần `branch/search`.

**Trước khi sửa (1), đã đọc lại `/v3/api-docs/api` theo lệnh user** (backend đã restart) — xác nhận
đây là thay đổi thật của backend, không phải suy đoán:
- `page`/`size`/`sort` giờ khai ở `parameters` (query) của **cả 10 endpoint `/search`** hiện có
  (staff, branch, audit-log, brand, category, color, size, product, sku, customer), không còn trong
  `requestBody` — `*SearchReqDTO` chỉ còn filter field.
- Test thật bằng `curl` xác nhận: `page` 1-based (không phải 0-based dù OpenAPI ghi
  `minimum: 0` — có thể backend tự clamp); `size` mặc định 10; `sort` phải là **query array lặp lại
  key** (`sort=a&sort=b`), **không phải** `sort[]=a&sort[]=b` (mặc định của axios) — format `[]` bị
  Spring **âm thầm bỏ qua** (không lỗi nhưng không sắp xếp, dễ debug nhầm là "sort không hoạt động").
- Backend giờ **validate chặt field thừa trong body** — gửi kèm `page`/`size`/`sortBy`/`sortDir` cũ
  trong body (thói quen trước đây) bị từ chối thẳng `code: 7`. Không thể "gửi cả 2 nơi cho an toàn".

**Điều tra (3) — nguyên nhân gọi API trùng, đã xác định rõ ràng bằng test thật:**
- **React StrictMode** (bật sẵn trong `src/main.tsx` từ đầu dự án) cố ý chạy `useEffect` 2 lần ở dev
  mode để phát hiện side-effect thiếu cleanup — **không phải bug**, không xảy ra ở production build.
  User đã xác nhận **giữ nguyên StrictMode**.
- `branch/search` gọi thêm vì `BranchProvider` bọc toàn bộ `AppLayout` để nạp danh sách cho dropdown
  top bar — mục (2) loại bỏ UI này nhưng **không loại bỏ hẳn `BranchProvider`** vì `staff-form-dialog`
  và `staff-detail-modal` vẫn cần `useBranch()` lấy **danh sách chi nhánh** cho dropdown khi tạo/sửa
  nhân viên (khác mục đích với dropdown lọc toàn app đã bỏ).

**File chính:**
- `src/types/common.ts` — `SearchReq` bỏ `page/size/sortBy/sortDir`, chỉ còn `keyword`/`status`; thêm
  type mới `SearchPagination = {page?, size?, sort?: string[]}`.
- `src/lib/api-client.ts` — thêm `paramsSerializer` tuỳ chỉnh (dùng `URLSearchParams`, tự lặp key cho
  mảng thay vì hậu tố `[]` mặc định của axios); `search()` nhận thêm tham số `pagination` riêng, tự
  gắn vào `config.params` thay vì `body`.
- `src/api/{staff,branch,audit-log,customer,product,inventory,order,return,promotion,shift}.ts` — mọi
  hàm `.search(body)` đổi chữ ký thành `.search(body, pagination?)`; `branch.ts` đồng thời đổi từ gọi
  `apiClient.post` trực tiếp sang dùng helper `search()` dùng chung (trước đó không nhất quán).
- `src/mocks/mock-utils.ts` — `paginateMock()` nhận `pagination` tham số thứ 4 riêng thay vì đọc
  `req.page`/`req.size` từ body (áp dụng nhất quán cho cả module mock, dù backend mock không có ràng
  buộc thật — tránh 2 kiểu gọi khác nhau giữa module thật và module mock).
- `src/pages/staff/{StaffListPage,BranchListPage,AuditLogPage}.tsx` — cập nhật lời gọi `.search()`
  theo chữ ký mới.
- `src/pages/staff/components/staff-columns.tsx`, `src/pages/staff/AuditLogPage.tsx` — nút "Chi tiết"
  bỏ hẳn chữ, chỉ còn icon (`size="icon"` thay vì `size="sm"` có text), thêm `title`/`aria-label` để
  giữ accessibility; điều chỉnh lại `size` cột THAO TÁC cho khớp nội dung mới (88px — 2 icon; 72px —
  1 icon ở Nhật ký hệ thống).
- `src/contexts/branch-context.ts`, `src/contexts/BranchProvider.tsx` — đơn giản hoá: bỏ hẳn khái
  niệm "chi nhánh đang chọn toàn app" (`selectedBranchId`, `ALL_BRANCHES`, `canSwitchBranch`,
  `setSelectedBranchId`), context giờ chỉ còn `{branches, loading}` — thuần tuý danh sách để form dùng
  làm dropdown, không phải bộ lọc.
- `src/components/shell/app-topbar.tsx` — bỏ `<BranchSelector />`.
- `src/components/shell/branch-selector.tsx` — **đã xoá** (không còn nơi dùng).
- `CLAUDE.md` — thêm mục khảo sát api-docs 2026-08-09, ghi rõ format `sort` và cảnh báo validate
  chặt field thừa trong body.

**Quyết định kỹ thuật đáng chú ý:**
- **Không dùng thư viện `qs` để serialize query param** — chỉ cần `URLSearchParams` built-in của
  trình duyệt là đủ cho nhu cầu lặp key đơn giản, tránh thêm dependency không cần thiết (CONVENTIONS
  mục 8 — không tự ý thêm dependency nếu chưa hỏi).
- **`BranchProvider` KHÔNG bị xoá hẳn dù dropdown top bar đã bỏ** — quyết định user chốt trực tiếp:
  giữ lại ở dạng đơn giản hoá vì 2 form (thêm/sửa nhân viên, chi tiết nhân viên) vẫn cần danh sách chi
  nhánh cho dropdown. Đây không phải "khôi phục lại điều vừa bỏ" mà là tách bạch 2 khái niệm khác
  nhau: "chi nhánh đang chọn để lọc toàn app" (đã bỏ) và "danh sách chi nhánh để chọn trong form" (vẫn
  giữ, dùng đúng mục đích gốc).
- **Vẫn còn 2 lần gọi `staff/search`/`branch/search` trong dev mode sau khi sửa — đây là kỳ vọng
  đúng, không phải lỗi còn sót.** User đã xác nhận hiểu rõ nguyên nhân (StrictMode) và chủ động chọn
  giữ nguyên, không tắt. Ở production build, mỗi API chỉ gọi đúng 1 lần.
- **`sort` mặc định để `undefined`** ở hầu hết lời gọi (không tự áp `createdDate,DESC` phía FE) — để
  backend tự dùng giá trị mặc định đã khai trong api-docs, tránh trùng lặp logic mặc định giữa FE/BE.
  Riêng `BranchProvider`/`BranchListPage` (load toàn bộ chi nhánh cho dropdown) chủ động truyền
  `sort: ['name,ASC']` vì thứ tự bảng chữ cái hợp lý hơn cho dropdown chọn, so với mặc định theo ngày
  tạo của backend.

**Kết quả kiểm tra lại:** build + lint sạch (0 lỗi). Test bằng `curl` xác nhận: `sort=fullName,ASC`
sắp xếp đúng, `sort[]=` bị bỏ qua âm thầm (đã tránh dùng), gửi field paging cũ trong body bị từ chối
`code: 7` (xác nhận không thể "gửi cả 2 nơi"), filter `keyword` trong body vẫn hoạt động song song
với query param. Test bằng Chrome headless thật xác nhận: URL request đúng dạng
`?page=1&size=10&sort=name%2CASC`, body rỗng `{}` khi không có filter; top bar không còn dropdown chi
nhánh (chỉ còn đổi ngôn ngữ + chuông + avatar); nút "Chi tiết" chỉ còn icon mắt; modal chi tiết + sửa
inline vẫn hoạt động đúng sau khi đơn giản hoá `BranchProvider`.

**Giả định:** Các module mock (customer/product/inventory/order/return/promotion/shift) đã đổi chữ ký
`.search()` theo chuẩn mới nhưng **chưa có màn hình nào gọi tới** (đúng phạm vi — các phase đó chưa
tới lượt code) nên chưa kiểm chứng bằng cách chạy thật, chỉ xác nhận qua `tsc` type-check.

### Cập nhật lần 4 sau review của user (2026-08-09) — rule toolbar bảng: bỏ đếm số lượng, gộp nút hành động

User yêu cầu (áp dụng như **rule chung cho mọi bảng**, không riêng 1 màn): không hiển thị dòng
"x + tên item" (ví dụ "7 nhân viên", "33 nhật ký") ở góc trên bên phải mỗi bảng; đưa các nút hành
động (ví dụ "Thêm nhân viên") lên **cùng hàng ngang** phía trên bảng thay vì tách riêng bên dưới.

**File chính:**
- `src/components/data-table/data-table-toolbar.tsx` — bỏ hẳn prop `resultCount`/`resultLabel` (và
  đoạn `<p>` hiển thị chúng); thêm prop `actions?: ReactNode` render trong `<div className="flex
  shrink-0 items-center gap-2">` cùng hàng với search/filter, đẩy sang bên phải nhờ
  `justify-between` của container ngoài.
- `src/pages/staff/StaffListPage.tsx` — nút "Thêm nhân viên" chuyển từ `<div className="flex
  justify-end">` tách riêng dưới `DataTableToolbar` vào prop `actions` của chính `DataTableToolbar`;
  bỏ `resultCount`/`resultLabel` khỏi lời gọi.
- `src/pages/staff/AuditLogPage.tsx` — bỏ `resultCount`/`resultLabel` khỏi lời gọi `DataTableToolbar`
  (trang này không có nút hành động nào để thêm — nhật ký hệ thống không tạo thủ công).
- `src/pages/staff/BranchListPage.tsx` — **không cần sửa**: đây là card grid tự viết layout riêng
  (không dùng `DataTableToolbar`), nút "Thêm chi nhánh" đã sẵn cùng hàng với ô tìm kiếm từ Phase 7 gốc,
  và trang này chưa từng hiển thị số lượng chi nhánh ở đâu.

**Quyết định kỹ thuật:**
- Số lượng bản ghi **không bị xoá khỏi UI hoàn toàn** — vẫn hiển thị đúng vị trí hợp lý hơn: dòng
  phân trang dưới bảng (`unitLabel` trong `DataTable`, ví dụ "Hiển thị 1–7 trong tổng số 7 nhân
  viên"). Rule mới chỉ bỏ chỗ hiển thị **trùng lặp** ở toolbar phía trên.
- Sửa tại component dùng chung `DataTableToolbar` để rule áp dụng nhất quán tự động cho mọi màn dùng
  nó hiện tại và sau này, đúng tinh thần "cập nhật lại rule" của user — không phải patch riêng lẻ
  từng trang.

**Kết quả kiểm tra lại:** build + lint sạch (0 lỗi, chỉ còn 5 warning cũ không liên quan). Test bằng
Chrome headless thật: chụp ảnh xác nhận cả 3 màn Nhân viên/Chi nhánh/Nhật ký hệ thống đều không còn
dòng đếm số lượng ở góc phải toolbar, nút "Thêm nhân viên"/"Thêm chi nhánh" nằm đúng cùng hàng ngang
với ô tìm kiếm, số lượng vẫn hiển thị đúng ở dòng phân trang dưới bảng.

### Cập nhật lần 5 sau review của user (2026-08-09) — dropdown filter chi nhánh ở màn Nhân viên

User yêu cầu thêm dropdown filter theo chi nhánh cho màn Nhân viên (`StaffSearchReqDTO.branchId` đã
có sẵn từ api-docs nhưng chưa được FE dùng tới).

**File chính:**
- `src/pages/staff/StaffListPage.tsx` — thêm state `branchFilter` (mặc định `ALL_BRANCHES`), lấy danh
  sách chi nhánh qua `useBranch()` (context có sẵn, dùng chung với dropdown chọn chi nhánh trong form
  thêm/sửa nhân viên), truyền `branchId` vào `staffApi.search()` khi khác `ALL_BRANCHES`. Dropdown đặt
  cạnh dropdown filter vai trò trong `filters` của `DataTableToolbar` (không đổi cấu trúc component
  dùng chung — chỉ dùng lại prop `filters` sẵn có).
- `src/i18n/locales/{vi,en}/staff.ts` — thêm key `staff.list.allBranches`.

**Quyết định kỹ thuật:**
- **Tái dùng `BranchContext`/`useBranch()` thay vì tự gọi `branchApi.search()` riêng** — context này đã
  nạp sẵn danh sách chi nhánh cho form thêm/sửa nhân viên (Phase 7 gốc), tránh gọi API trùng lặp.
- **Không giới hạn hiển thị dropdown theo role** — dù CLAUDE.md ghi rõ `branchId` chỉ có tác dụng lọc
  thật với SUPER_ADMIN (ADMIN/STAFF bị backend tự giới hạn phạm vi sẵn, `useBranch()` với các role này
  chỉ trả về đúng 1 chi nhánh của họ), dropdown vẫn hiển thị nhất quán cho mọi role — chọn chi nhánh
  duy nhất của mình không gây lỗi, chỉ vô nghĩa về mặt lọc (không cần ẩn có điều kiện, giữ đơn giản).

**Kết quả kiểm tra lại:** build + lint sạch (0 lỗi, 5 warning cũ không liên quan). Test bằng Chrome
headless thật (tài khoản `superadmin`): chọn "Đà Nẵng" trong dropdown gửi đúng request
`POST /staff/search?page=1&size=10` với body `{"branchId":"<uuid>"}`, bảng lọc đúng còn 1 kết quả
đúng chi nhánh Đà Nẵng.

### Fix bug sau review của user (2026-08-09) — bấm "Sửa" trong modal chi tiết tự động gửi PUT

User báo: mở modal "Chi tiết nhân viên" (chế độ xem), bấm "Sửa" → modal chuyển đúng sang giao diện
có input/dropdown, nhưng **ngay sau đó tự động gửi `PUT /staff/{id}`** mà không cần bấm "Lưu" —
không sửa được vì bị lưu ngay với dữ liệu chưa đổi.

**Nguyên nhân (xác định qua phân tích code, không tái hiện được bằng Puppeteer do giới hạn mô phỏng
chuột thật trong môi trường headless — click lập trình `.click()` không tái hiện bug, chỉ chuột thật
của user mới gặp):** trong `DetailModal` ([detail-modal.tsx](src/components/detail-modal.tsx)),
`DialogFooter` render 2 nhánh JSX khác hẳn nhau tuỳ `isEditing` — chế độ xem có nút "Sửa"
(`type="button"`) ở vị trí cuối cùng bên phải; chế độ sửa có nút "Lưu" (`type="submit"`) ở **đúng
cùng vị trí đó** (cả 2 đều là phần tử cuối trong `flex justify-end`). Khi bấm "Sửa", `onClick` gọi
`setIsEditing(true)` **đồng bộ** ngay trong pha xử lý sự kiện chuột — React unmount nút "Sửa" và
mount nút "Lưu" tại đúng toạ độ đó **trước khi trình duyệt xử lý xong `mouseup`** của cú click thật
(khác hành vi so với click giả lập bằng JS, vốn phát sinh sự kiện `click` tổng hợp tức thời chỉ
trên 1 phần tử, không tách `mousedown`/`mouseup` theo thời gian thực). Trình duyệt tính `click`
theo phần tử tại toạ độ con trỏ lúc `mouseup` — lúc đó đã là nút "Lưu" — nên phát sinh submit "ma".

**File sửa:** `src/components/detail-modal.tsx` — bọc `setIsEditing(true)` trong `setTimeout(..., 0)`
ở nút "Sửa", đẩy việc chuyển chế độ (và unmount/mount nút) sang macrotask kế tiếp, sau khi trình
duyệt đã xử lý xong trọn vẹn chuỗi `mousedown`/`mouseup`/`click` gốc trên nút "Sửa" — loại bỏ khả
năng `mouseup` rơi trúng nút "Lưu" vừa xuất hiện tại cùng vị trí.

**Kết quả kiểm tra lại:** build + lint sạch (0 lỗi). Test bằng Chrome headless thật: bấm "Sửa" bằng
`.click()` lập trình xong đợi 10ms — xác nhận **chưa** submit (`PUT requests: []`); đợi đủ để
`setTimeout` chạy — chế độ sửa hiển thị đúng (input/dropdown xuất hiện), vẫn không có PUT nào được
gửi cho tới khi bấm "Lưu" thật; bấm "Lưu" thật sau khi sửa gửi đúng 1 `PUT /staff/{id}` với payload
đúng. Do giới hạn không tái hiện được bug gốc bằng automation (chỉ tái hiện được bằng chuột thật),
**khuyến nghị user xác nhận lại bằng thao tác tay thật** trên trình duyệt sau khi áp dụng bản vá này.

---

## Phase 8 — Khách hàng (CRM) ✅ **ĐÃ XONG (2026-08-09)**

**Thiết kế:** `10-khach-hang.png`.

- Danh sách khách (gộp online + tại quầy), tìm theo tên/SĐT, badge phân nhóm VIP / mới / ngủ đông.
- Trang chi tiết: thông tin, lịch sử mua toàn kênh, size hay mua, sản phẩm ưa thích *(chưa có mockup)*.
- Cảnh báo **trùng hồ sơ theo SĐT** + hành động "gộp hồ sơ" (confirm dialog).

**Chạy trên API thật** (không mock) — đã đọc lại `/v3/api-docs/api` trước khi code theo CONVENTIONS mục 1.

### ⚠️ Lệch so với mockup — 4 cột không có nguồn dữ liệu (đã chốt với user)

Mockup `10-khach-hang.png` có 6 cột: KHÁCH HÀNG · LIÊN HỆ · **PHÂN HẠNG** · **SỐ ĐƠN** ·
**TỔNG CHI TIÊU** · **LẦN CUỐI MUA**. Kiểm chứng **3 lớp** (api-docs · source
`CustomerResDTO.java` + `CustomerMapper.java` · gọi API thật) đều xác nhận backend **không có**
4 field in đậm: hồ sơ khách map từ `SysUser`, và thư mục `domain/` của backend **chưa có entity
đơn hàng/hoá đơn nào** (chỉ `SysUser`, `Branch`, `Brand`, `Category`, `Color`, `Product`,
`RelProductCategory`, `SizeOption`) ⇒ không có nguồn để tính. `grep` toàn backend cho
`tier|totalSpent|orderCount|lastPurchase` chỉ ra 1 kết quả không liên quan trong
`SecurityConfiguration.java`.

**User đã chốt: bám DTO thật, thay tập cột** (giữ nguyên bố cục/style/wording tiêu đề mockup):
KHÁCH HÀNG (tên + SĐT) · LIÊN HỆ (email) · CHI NHÁNH · ĐIỂM TÍCH LUỸ (`membershipPoint`) ·
TRẠNG THÁI · NGÀY TẠO · THAO TÁC. **Khi Phase 12 có API đơn hàng thì bổ sung lại 4 cột kia**
cho khớp mockup.

**Chưa làm (do backend chưa có API, không phải bỏ sót):**
- "Gộp hồ sơ" trùng SĐT — có API **tra trùng** (`GET /customer/duplicates`) nên đã làm phần
  *cảnh báo*, nhưng **không có endpoint merge** ⇒ chưa dựng confirm dialog gộp.
- Trang chi tiết với lịch sử mua toàn kênh / size hay mua / sản phẩm ưa thích — phụ thuộc API
  đơn hàng (Phase 12). Hiện chỉ có modal chi tiết hồ sơ.
- Không có API xoá / đổi trạng thái khách hàng ⇒ không dựng nút tương ứng.

**Ghi chú dữ liệu:** `CustomerResDTO` phía Java có field `activated` nhưng **không xuất hiện
trong JSON thật** ⇒ không khai trong type FE. `customer/search` trả `BaseListRes` (chỉ
`total` + `data[]`), **không** có `activeTotal`/`inactiveTotal` như `staff`/`branch`.

**Kết quả:** lint 0 lỗi (5 warning `react-refresh` cũ trong `components/ui`), build sạch.
Đã tạo **8 khách hàng mẫu qua API thật** (7 tên/SĐT/email lấy nguyên văn từ mockup + 1 sinh ra
lúc test luồng thêm mới), rải trên các chi nhánh có sẵn để test được RBAC scoping.

Test bằng Chrome headless thật (`puppeteer-core`) với **cả 3 tài khoản**:
`superadmin` thấy 7–8 khách + bộ lọc chi nhánh · `adminbranch`/`staffone` chỉ thấy **1** khách
đúng chi nhánh mình, **không** có bộ lọc chi nhánh · modal chi tiết mở đúng dữ liệu ·
`STAFF` **không** thấy nút "Sửa" trong modal · SUPER_ADMIN sửa được: đúng **1** `PUT /customer/{id}`
khi bấm "Lưu", có toast, danh sách tự nạp lại · thêm mới gửi payload sạch
(`{fullName, phoneNumber, branchId}`) · cảnh báo trùng SĐT hiện đúng 2 biến thể · không lỗi console.

**File chính:**
- `src/types/customer.ts` — **viết lại** theo DTO thật (bỏ `code`/`tier`/`orderCount`/`totalSpent`/
  `lastPurchaseDate` tự đặt ở Phase 6; thêm `membershipPoint`/`branchId`/`branchName`),
  tách `CreateCustomerReq`/`UpdateCustomerReq`/`CustomerDuplicate`.
- `src/api/customer.ts` — **bỏ hẳn nhánh mock**, gọi API thật; `checkDuplicate()` bật
  `skipErrorToast` (STAFF gọi sẽ 403 — đường đi bình thường, không phải lỗi cần toast).
- `src/pages/customer/CustomerListPage.tsx` + `components/{customer-columns,customer-form-dialog,customer-detail-modal}.tsx`.
- `src/i18n/locales/{vi,en}/customer.ts` — namespace mới, đăng ký trong `src/i18n/index.ts`.
- `src/Router.tsx` — `/customers` trỏ `CustomerListPage` thay `Placeholder`.
- **Đã xoá `src/mocks/customer.ts`** — lớp mock Phase 6 hết vai trò khi module có API thật; để lại
  sẽ fail build vì import type `ECustomerTier`/`CustomerPayload` đã bị gỡ (`tsconfig.app.json`
  type-check toàn bộ `src/`, không theo import graph).

**Quyết định kỹ thuật:**

- **`DetailModal` nhận thêm prop `canEdit` (mặc định `true`).** `PUT /customer/{id}` là `[ADMIN]`
  nên STAFF không sửa được, nhưng modal chung luôn render nút "Sửa" ⇒ STAFF bấm vào sẽ rơi vào
  chế độ sửa với **toàn bộ field khoá** và nút "Lưu" chắc chắn 403. Thêm cờ để ẩn hẳn nút "Sửa";
  mặc định `true` nên màn Nhân viên (Phase 7) giữ nguyên hành vi. *(Phát hiện khi test bằng
  trình duyệt thật, build sạch không lộ ra.)*
- **Bộ lọc chi nhánh chỉ hiện với SUPER_ADMIN.** `CustomerSearchReqDTO.branchId` được api-docs ghi
  rõ "chỉ có tác dụng với SUPER_ADMIN"; STAFF/ADMIN bị backend ép về chi nhánh mình nên hiện bộ lọc
  cho họ chỉ gây hiểu nhầm là lọc được. Khác màn Nhân viên (ở đó ADMIN vẫn thấy bộ lọc).
- **`branchId` trong form dùng `z.string({ error })` chứ không chỉ `.min(1)`.** Chưa chọn gì thì giá
  trị là `undefined` ⇒ zod v4 bắn lỗi **kiểu** mặc định bằng tiếng Anh
  ("Invalid input: expected string, received undefined") lọt thẳng ra UI, vi phạm quy tắc "không
  hardcode chuỗi/đủ i18n". Phải đặt `error` cho chính schema mới dịch được. *(Cũng phát hiện bằng
  test trình duyệt.)*
- **Tra trùng SĐT debounce 400ms + `AbortController`** — gọi khi SĐT khớp `^0\d{9}$`, chỉ ở chế độ
  thêm mới và chỉ với ADMIN+. Xử lý đủ **2 biến thể** backend trả: cùng chi nhánh
  (`viewable: true` → hiện tên + chi nhánh khách đã có) và khác chi nhánh
  (`exists: true, viewable: false, customer: null` → chỉ báo "đã được sử dụng", không lộ hồ sơ).
- **Form sửa khoá `phoneNumber` + `branchId`**: `UpdateCustomerReqDTO` không có 2 field này
  (mapper backend `@Mapping(ignore)`), hiển thị nhưng disabled thay vì ẩn — đúng pattern
  `username`/`role` của màn Nhân viên.
- **Nút "Xuất dữ liệu" chỉ hiện toast "sắp có"** — chưa có API export phía backend (đúng phạm vi
  PLAN Phase 5).

**Giả định:** dữ liệu mẫu tạo trên backend dev local; `membershipPoint` của mọi khách đang là `0`
(backend mặc định, chưa có nghiệp vụ cộng điểm) nên cột ĐIỂM TÍCH LUỸ hiện toàn `0` — đúng dữ liệu
thật, không phải lỗi hiển thị. Backend **không có endpoint xoá khách hàng** nên bản ghi tạo lúc
test không xoá được, đã đổi tên thành khách mẫu hợp lệ (`Lê Thanh Hà`).

---

## Phase 9 — Sản phẩm & Danh mục SP ✅ **ĐÃ XONG (2026-08-09)**

**Thiết kế:** `11-san-pham.png`, `12-danh-muc-sp.png`.

- CRUD danh mục nền: ngành hàng đa cấp, thương hiệu, chất liệu, nhà cung cấp, bộ sưu tập mùa.
- Cấu hình bảng size theo nhóm hàng.
- Tạo sản phẩm cha → chọn màu × size → **tự sinh ma trận SKU** (mỗi dòng 1 SKU + barcode).
- Quản lý ảnh theo color-way, chọn ảnh đại diện.
- Badge vòng đời SKU: New → Active → Markdown → Ngừng KD.
- Import/Export Excel có **preview lỗi trước khi xác nhận**.

**Chạy trên API thật** — đã đọc lại `/v3/api-docs/api` + source backend trước khi code (CONVENTIONS mục 1).

### Phân quyền khác các phase trước

Toàn bộ nhóm sản phẩm: **đọc `[STAFF]`, ghi `[SUPER_ADMIN]`**. Khác staff/customer (`[ADMIN]`) —
**ADMIN gọi API ghi cũng nhận 403**, đã kiểm chứng bằng tài khoản thật. UI vì thế chỉ hiện nút
thêm/sửa/xoá với SUPER_ADMIN (`hasRole(user, SUPER_ADMIN)`), đúng quyết định Phase 4
(STAFF/ADMIN thấy 2 màn này ở **chế độ xem**).

### ⚠️ Lệch so với mockup — thiếu nguồn dữ liệu (đã chốt với user)

| Mockup | Thực tế backend | Xử lý |
|---|---|---|
| Card "**Tồn: 143**" | Chưa có API kho (Phase 10) | Bỏ dòng tồn khỏi card |
| Badge **New / Markdown / Ngừng KD** | `Sku.status` chỉ 0/1; ghi chú trong `Sku.java`: vòng đời "chưa có enum riêng, để dành cho sau" | Chỉ hiện Active / Ngừng kinh doanh |
| Card có tag danh mục ("Áo sơ mi +1") | `POST /product/search` trả `categories` **luôn rỗng** (chỉ `GET /product/{id}` populate) | Tag danh mục chỉ hiện trong modal chi tiết |
| Cột **SỐ SẢN PHẨM · THƯƠNG HIỆU · BỘ SƯU TẬP** ở màn Danh mục | `CategoryResDTO` không có số đếm nào; không có API bộ sưu tập | Thay bằng THỨ TỰ · TRẠNG THÁI |
| Nút **Import Excel / Export** | Không có API | **User đã chốt: dời sang các phase cuối** |
| CRUD chất liệu / nhà cung cấp / bộ sưu tập mùa | `material` là **enum fix cứng** `COTTON\|LINEN\|SILK\|WOOL`; không có API 3 nhóm này | **User đã chốt: FE fix cứng enum giống BE**, không dựng CRUD |

**Về `status` của SKU — user chốt lại 2026-08-09:** `-1` là **trạng thái xoá mềm, rule chung toàn
hệ thống**, và **không dùng chung API/phương thức với `status` 0/1**. Đã kiểm chứng trên source và
ghi thành mục riêng ở [CONVENTIONS.md](CONVENTIONS.md) mục 3.3 + [CLAUDE.md](CLAUDE.md):

- Bật/tắt ⇒ `POST /<module>/update-status` (chặn `@Min(0) @Max(1)`, gửi `-1` trả `400`).
- Xoá mềm ⇒ `DELETE /<module>/{id}` riêng; 5 service (`staff`/`branch`/`brand`/`category`/`sku`)
  đều chỉ set `EStatus.DELETED` **bên trong `delete(id)`**, không service nào set qua `updateStatus()`.
- Bản ghi `-1` bị ẩn khỏi mọi truy vấn ⇒ FE không nhận được, **không dựng bộ lọc/badge "Đã xoá"**.

⚠️ **Đính chính báo cáo trước đó:** tôi từng kết luận "không có endpoint xoá SKU" — **sai**.
`DELETE /sku/{id}` **đã có trong source** (`SkuResource.java`, `[SUPER_ADMIN] Xóa mềm SKU`), nhưng
gọi thật vẫn trả **405** và không xuất hiện trong api-docs, vì `SkuResource.java`/`SkuServiceImpl.java`
đang **modified chưa commit** (sửa 17:23 ngày 2026-08-09, sau khi server đang chạy khởi động).
⇒ **Backend cần build/chạy lại**; sau đó FE có thể bổ sung nút xoá SKU trong modal chi tiết
(hiện chỉ có bật/tắt). `DELETE /product/{id}` thì **thật sự không tồn tại** ở cả source lẫn api-docs.

**Chưa làm (ngoài phạm vi / thiếu API):** 3 màn CRUD Thương hiệu · Màu · Size (có API đủ nhưng
**mockup không vẽ và menu không có mục** — cần user chốt trước khi thêm route mới); "chọn ảnh đại
diện" riêng (API chỉ nhận cả gallery theo thứ tự, ảnh đầu mặc định là đại diện); quản lý ảnh
**theo color-way** (ảnh gắn ở cấp sản phẩm, không gắn theo màu); **không có API xoá sản phẩm**
(`DELETE /product/{id}` trả 405).

**Kết quả:** lint 0 lỗi (5 warning `react-refresh` cũ), build sạch. Đã tạo **dữ liệu mẫu đầy đủ
qua API thật**: 4 thương hiệu · 6 màu · 8 size (2 nhóm Áo/Quần) · 13 danh mục (cây 2 cấp) ·
9 sản phẩm (8 tên/mã/giá **lấy nguyên văn từ mockup** + 1 sinh lúc test) · **100 SKU**.

Test bằng Chrome headless thật (`puppeteer-core`):
`superadmin` thấy đủ nút thêm/sửa/xoá · `staffone` **không** thấy nút nào (chỉ xem) ·
modal chi tiết 3 tab chạy đúng (Thông tin hiện `categories` thật, Bảng SKU nạp 12 SKU qua
`/sku/search`, tab Ảnh có empty state) · bật/tắt trạng thái SKU gửi đúng `POST /sku/update-status`
kèm toast · **tạo sản phẩm mới → sinh ma trận 2×2 → 4 SKU xuất hiện** đúng luồng ·
tạo danh mục con gửi đúng `parentId`/`sortOrder` · bộ lọc cấp (gốc/con) lọc đúng ·
xoá danh mục còn con bị chặn và **hiện đúng câu tiếng Việt** `error.category.hasChildren` ·
không lỗi console.

**File chính:**
- `src/types/product.ts` — **viết lại** theo DTO thật (bỏ `ESkuLifecycle`/`totalStock`/`basePrice`/
  `productCount`… tự đặt ở Phase 6), thêm `EMaterial`, `CategoryRef`, tách `Create*`/`Update*`.
- `src/api/product.ts` — **bỏ hẳn nhánh mock**; 6 service: `productApi` · `skuApi` · `categoryApi` ·
  `brandApi` · `colorApi` · `sizeApi`.
- `src/pages/product/ProductListPage.tsx` (card grid) + `CategoryListPage.tsx` (bảng) +
  `components/{product-form-dialog,product-detail-modal,generate-sku-dialog,category-form-dialog}.tsx`.
- `src/i18n/locales/{vi,en}/product.ts` (namespace mới) + **bổ sung 14 key lỗi** domain sản phẩm
  vào `errors.ts` cả 2 ngôn ngữ (trích từ source backend, không tự bịa).
- `src/lib/api-client.ts` — xử lý `FormData` (xem quyết định kỹ thuật).
- `src/Router.tsx` — `/products`, `/categories` trỏ màn thật; **đã xoá `src/mocks/product.ts`**.

**Quyết định kỹ thuật:**

- **`api-client` phải xoá header `Content-Type` khi body là `FormData`.** Instance axios khai cứng
  `application/json`, upload ảnh (`POST /product/{id}/images`, multipart) sẽ không có `boundary`
  ⇒ backend không parse được. Đã thêm nhánh `config.data instanceof FormData ⇒ headers.delete`.
  Đây là **lần đầu repo có upload multipart**, các phase sau dùng lại được.
- **`GET /product/{id}` KHÔNG trả kèm SKU** dù `summary` api-docs ghi "+ bảng SKU" (kiểm chứng bằng
  dữ liệu thật) ⇒ modal chi tiết gọi riêng `POST /sku/search?productId=`.
- **Modal chi tiết sản phẩm không dùng `DetailModal` chung** (khác Nhân viên/Khách hàng): màn này
  cần 3 tab với bảng SKU và lưới ảnh, không phải form field phẳng — sửa sản phẩm đi qua
  `ProductFormDialog` riêng.
- **Lọc theo cấp (gốc/con) ở màn Danh mục làm phía client.** `CategorySearchReqDTO` chỉ có
  `parentId` (lọc theo **một** cha cụ thể), không có tham số "chỉ lấy gốc"/"chỉ lấy con".
- **Dialog sinh SKU không tự loại cặp đã tồn tại** — API idempotent ("ô đã có SKU thì bỏ qua"),
  bấm lại cùng lựa chọn không tạo trùng, nên để backend quyết định thay vì tự tính ở FE.
- **Size trong dialog sinh SKU lọc theo `sizeGroup` của sản phẩm**; sản phẩm chưa chọn nhóm size
  thì hiện cảnh báo và khoá nút, thay vì đưa ra toàn bộ size của mọi nhóm.

### Bổ sung sau review của user (2026-08-09) — droplist danh mục có ô tìm kiếm

User góp ý: danh mục sẽ nhiều dần, cần **search ngay trong droplist** (lọc ở tầng FE).
Đã dựng component dùng chung **`src/components/search-select.tsx`** và áp cho **cả 3 chỗ**:
bộ lọc "Tất cả danh mục" (màn Sản phẩm) · picker chọn danh mục trong form sản phẩm ·
dropdown "Danh mục cha" (form danh mục).

**Quyết định kỹ thuật:**

- **Không thêm dependency mới.** Dựng bằng `Popover` + `Input` đã có sẵn, thay vì cài `cmdk`
  để dùng shadcn `Command`/Combobox (CONVENTIONS mục 8 — hỏi trước khi thêm dep; user đã chọn
  phương án không thêm dep).
- **Tìm kiếm bỏ dấu tiếng Việt**: chuẩn hoá `NFD` + strip `[̀-ͯ]` + `đ→d`, nên gõ
  `ao so mi` ra "Áo sơ mi", gõ `dam` ra "Váy đầm"/"Đầm công sở". Khớp cả **tên lẫn mã** danh mục.
- **Ô search chỉ hiện khi > 8 lựa chọn** (`searchThreshold`) — danh sách ngắn (thương hiệu, giới
  tính, chất liệu) giữ nguyên `Select` thường, thêm ô search chỉ gây vướng.
- **Chọn nhiều thay danh sách checkbox cuộn dọc** ở form sản phẩm: nút hiện "Đã chọn N", bên dưới
  là **chip có nút ✕** để bỏ nhanh mà không cần mở lại dropdown. Form gọn hơn hẳn.
- Component **generic, dùng lại được** cho brand/color/size ở các phase sau; danh sách lớn tới mức
  phải phân trang thì cần search phía server, **không** dùng component này.

**Kiểm chứng:** đã thêm 10 danh mục (tổng **23**, vượt ngưỡng hiện search) và test Chrome headless:
gõ `dam` (không dấu) ở bộ lọc ra đúng 3 danh mục có dấu → chọn xong lọc còn 1 sản phẩm ·
gõ `ao` ở form ra 8 kết quả, chọn 2 → nút hiện "Đã chọn 2" + 2 chip · gõ `quan` ở dropdown danh mục
cha ra đủ 8 danh mục quần · tạo sản phẩm mới gửi đúng `categoryIds` 2 phần tử và modal chi tiết
hiển thị đúng 2 danh mục đã lưu · không lỗi console. Lint 0 lỗi, build sạch.

**File thêm/đổi:** `src/components/search-select.tsx` (mới) · `ProductListPage.tsx` ·
`product-form-dialog.tsx` · `category-form-dialog.tsx` · `src/i18n/locales/{vi,en}/common.ts`
(namespace `searchSelect`).

### Fix bug sau review của user (2026-08-09) — dropdown trong suốt + vị trí nút hành động

**1. Overlay/nút trong suốt, nhìn xuyên thấy nội dung phía sau.**

Nguyên nhân thật (đơn giản hơn nhiều so với chẩn đoán ban đầu của tôi): **token `--background` của
repo là màu XÁM nền trang** (`#F1F5F9`), còn trắng là `--card`/`--popover`. Bản shadcn gốc dùng
`bg-background` cho `DialogContent`, `SheetContent` và `Button variant="outline"` ⇒ các thành phần
này mang **đúng màu nền phía sau**, nên tuy vẫn "đục" về mặt kỹ thuật nhưng mắt nhìn thành **trong
suốt / chìm hẳn vào nền**.

Ảnh hưởng: modal (mọi form thêm/sửa), sheet (sidebar mobile), và **mọi nút outline** — nút
"Xuất dữ liệu", nút phân trang "Trang trước/sau", nút "Sửa" trên card chi nhánh, trigger của
`SearchSelect`.

**Cách sửa:** đổi `bg-background` → `bg-card` ở đúng **3 chỗ**: `dialog.tsx`, `sheet.tsx`,
`button.tsx` (variant `outline`). Sửa ở `button.tsx` là sửa một lần cho toàn bộ nút outline, không
phải vá từng màn.

⚠️ **Ghi nhận sai lầm để không lặp lại:** ban đầu tôi kết luận nhầm là do
`tailwindcss-animate@1.0.7` (plugin Tailwind v3) chạy trên Tailwind v4 làm `--tw-enter-opacity`
kẹt ở `0`. Biến đó **thật sự** bằng 0, nhưng **không phải nguyên nhân** — đã kiểm chứng bằng cách
gỡ hẳn bản vá đó, lỗi vẫn y nguyên; và tắt toàn bộ `animation` cũng không hết. Bản vá CSS 29 dòng
`!important` khi đó **đã được gỡ sạch**, `index.css` trở về nguyên trạng.

**Bài học về cách nghiệm thu:** tôi đã báo "đã fix" 2 lần dựa trên **computed style**
(`opacity: 1`, `backgroundColor: oklch(1 0 0)`) — các giá trị này luôn "đúng" nên che mất lỗi thật.
Chỉ khi **đọc màu pixel** của ảnh chụp mới thấy sự thật. Với lỗi hiển thị, **phải nghiệm thu bằng
pixel**, không tin computed style.

**2. Nút hành động (Thêm · Xuất · Nhập…) chuyển xuống cùng hàng với bộ lọc.**

Trước đó nút nằm ở `PageHeader` (hàng tiêu đề). Theo yêu cầu user, chuyển sang slot `actions` của
`DataTableToolbar` — ô tìm kiếm + filter bên trái, cụm nút bên phải **cùng một hàng ngang**;
`PageHeader` chỉ còn tiêu đề + mô tả. Áp cho màn **Sản phẩm**, **Danh mục SP**, và **Khách hàng**
(nút "Xuất dữ liệu"). Màn Nhân viên vốn đã đúng pattern này từ Phase 7.
**Đã ghi thành rule ở [CONVENTIONS.md](CONVENTIONS.md) mục 5** để mọi màn danh sách sau này theo đúng.

**Kiểm chứng (bằng pixel, không phải computed style):** dải ngang giữa dialog chỉ còn **một màu
`(255,255,255)`** — không còn chữ của bảng phía sau lọt qua; trigger `SearchSelect` `(255,255,255)`
trùng khớp `SelectTrigger` bên cạnh và khác rõ nền trang `(241,245,249)`; quét lại 5 màn không còn
nút nào mang màu nền trang. Nút "Thêm sản phẩm" cùng toạ độ `y` với ô tìm kiếm (`y=168`).
Lint 0 lỗi, build sạch, 6 màn regression không vỡ.

### Tối ưu số lượng API sau review của user (2026-08-09)

User phát hiện màn Danh mục gọi **2 API cho cùng một bảng** (`size=10` cho bảng + `size=200` cho
dropdown "danh mục cha"). Rà lại toàn app: **`/products` 15 request**, `/categories` 9, `/branch` 7
mỗi lần mở màn.

**Yêu cầu đã được user làm rõ:** chỉ cần **không duplicate trong CÙNG một màn**, *không* phải hạn
chế gọi lại API giữa các màn. Lý do user đưa ra (và đúng): **không thể biết lúc nào admin khác
thêm chi nhánh/danh mục** — cache giữa các màn sẽ hiển thị dữ liệu cũ. ⇒ **Hạn chế dùng cache.**

| # | Nguyên nhân | Cách sửa |
|---|---|---|
| 1 | `CategoryListPage` gọi 2 API cho cùng bảng dữ liệu | Nạp **1 lần** toàn cây rồi lọc + phân trang phía client |
| 2 | `BranchListPage` tự gọi `branch/search` trong khi `BranchProvider` cũng nạp | `BranchProvider` **không tự nạp** nữa; màn nào cần thì gọi `refresh()` khi vào màn |
| 3 | Effect nạp dữ liệu không huỷ request khi unmount ⇒ StrictMode làm nhân đôi request khi dev | Thêm `AbortController` cho **mọi** effect gọi API |

**Kết quả — mỗi endpoint đúng 1 lần/màn:**
`/products` **15 → 8** · `/categories` **9 → 4** · `/branch` **7 → 4** · `/staff`, `/customers` **7 → 5**.
Không còn endpoint nghiệp vụ nào lặp lại. (`GET /account/me` 2 lần là **đúng thiết kế**: lần đầu
401 ⇒ api-client tự `/refresh` rồi retry — single-flight của Phase 2.)

⚠️ **Đã thử và GỠ BỎ hướng cache** (`src/api/catalog-cache.ts`): ban đầu tôi thêm cache in-memory
TTL 5 phút cho danh mục nền, giảm được request khi qua lại giữa các màn — nhưng **sai yêu cầu** và
tạo rủi ro dữ liệu cũ. Đã xoá hẳn file này; vào màn là nạp lại.

**Bug dữ liệu cũ đã tái hiện được và sửa xong:** `BranchProvider` trước đây nạp một lần lúc đăng
nhập rồi giữ mãi. Test thật: tạo chi nhánh mới qua API (mô phỏng admin khác) → quay lại màn Chi
nhánh vẫn hiển thị **6** thay vì 7. Sau khi sửa: hiển thị đúng **7**.

**Lợi ích phụ:** bộ lọc cấp (gốc/con) ở màn Danh mục trước đây chỉ lọc trong **10 dòng của trang
hiện tại** nên tổng số sai; giờ lọc trên toàn cây — chọn "Danh mục gốc" ra đúng **3/3**.
Tìm kiếm cũng không còn gọi API mỗi lần gõ.

**Quyết định kỹ thuật:**

- **`BranchProvider` cố ý không tự nạp khi đăng nhập.** Nếu vừa để provider tự nạp vừa cho màn gọi
  `refresh()` thì `branch/search` bị gọi **2 lần** — đúng thứ cần tránh. Provider chỉ giữ state +
  hàm nạp; màn nào cần thì gọi. `loading` mặc định `false` vì không có gì tự tải.
- **`<StrictMode>` GIỮ BẬT** (user chốt sau khi cân nhắc). Từng tắt tạm để soi tab Network, nhưng
  đo lại thì thấy: **không cần tắt khi build production** — React tự loại bỏ toàn bộ hành vi
  StrictMode ở bản production. Kiểm chứng bằng số liệu: mở `/products` trên `vite preview` (bản
  build) và `vite dev` đều **8 request như nhau**.
  Quan trọng hơn: việc dev nhân đôi request **là triệu chứng của effect chưa idempotent**, không
  phải lỗi của StrictMode. Sau khi thêm `AbortController` cho mọi effect gọi API thì **dev cũng
  hết nhân đôi** — dev khớp production. Đúng tinh thần: sửa effect, đừng tắt StrictMode để giấu
  triệu chứng.
- **Thêm `AbortSignal` cho toàn bộ `*Api.search()`** (tham số thứ 3) và `AbortController` trong mọi
  `useEffect` gọi API (5 màn danh sách + `BranchProvider`). Ngoài việc hết nhân đôi, còn tránh
  set state trên component đã unmount và bỏ được response cũ ghi đè kết quả mới khi đổi filter nhanh.
- **`vite.config.ts` bổ sung `preview.proxy`**: trước đó chỉ khai proxy cho `server` (dev) nên
  `npx vite preview` không gọi được API (mọi request 404) — không kiểm chứng được bản production
  trước khi deploy. Giờ `npm run build && npx vite preview` chạy được với backend thật.
- Rule đã ghi vào [CONVENTIONS.md](CONVENTIONS.md) mục 5: *không duplicate trong 1 màn, không cache
  giữa các màn*.

### Bổ sung theo yêu cầu user (2026-08-10) — bảng SKU

**1. Bảng SKU chuyển sang infinite scroll.** Trước đây tải một lần `size=200`; giờ tải
`SKU_PAGE_SIZE = 20`/lần, cuộn tới cuối khung bảng thì nối thêm trang sau (`IntersectionObserver`).
Header hiện `đã tải/tổng` (vd `20/24 SKU`), cuối bảng có "Đang tải thêm…" / "Đã tải hết SKU".

**2. Thêm nút xem mã vạch** mỗi dòng SKU → dialog hiện ảnh **EAN-13** (`GET /sku/{id}/barcode`,
trả PNG thuần), kèm mã EAN dạng chữ và nút **In tem**.

**3. Nút bật/tắt trạng thái đổi từ icon nguồn sang `Switch`** (thêm `npx shadcn add switch`).

**Quyết định kỹ thuật:**

- **`apiClient.getBlob()` mới** trong api-client: `GET /sku/{id}/barcode` trả **PNG thuần, không bọc
  `BaseResponse`** nên `apiClient.get()` không dùng được (`unwrap` đọc `body.code` sẽ fail).
  `getBlob` vẫn đi qua cùng instance axios ⇒ giữ `Authorization`, refresh single-flight, chuẩn hoá
  lỗi. Khi lỗi, backend trả JSON nhưng `responseType: 'blob'` gói thành Blob ⇒ đã đọc ngược Blob
  về JSON để không mất `subKey`/`message`.
- **Object URL của ảnh barcode phải `URL.revokeObjectURL`** trong cleanup — mở/đóng dialog nhiều lần
  không revoke sẽ rò bộ nhớ.
- **Bật/tắt SKU cập nhật tại chỗ, KHÔNG `loadSkus()`**: nạp lại sẽ reset bảng về trang 1 và mất hết
  các trang đã cuộn. `togglingSkuId` khoá switch trong lúc chờ để không bấm liên tiếp.
- **`switch.tsx` của shadcn dùng `bg-background` cho núm** ⇒ đã đổi `bg-card`, cùng lý do đã ghi ở
  CONVENTIONS mục 5 (`--background` là màu xám nền trang, núm sẽ chìm vào rãnh).

⚠️ **Hai cái bẫy của infinite scroll đã mất thời gian mới ra — ghi lại để không lặp:**

1. **Phần tử mốc (sentinel) cao `0px` thì `IntersectionObserver` KHÔNG BAO GIỜ báo giao nhau.**
   Phải cho nó chiều cao thật (`h-px`).
2. **Dùng `useRef` + `useEffect` để gắn observer là hỏng**: sentinel chỉ render trong nhánh
   `skus.length > 0`, nên lúc effect chạy lần đầu `ref.current` vẫn `null` ⇒ observer không bao giờ
   được gắn, bảng đứng im ở trang 1. Phải dùng **callback ref** — React gọi đúng lúc node vào/ra DOM.
   Kèm theo: callback của observer giữ closure cũ nên mọi giá trị nó cần đọc (`hasMore`, các cờ
   loading, hàm `loadMore`) phải để trong một ref được cập nhật mỗi lần render.

**Kiểm chứng (Chrome headless, SP001 có 24 SKU):** mở tab hiện `20/24 SKU` + 1 request `page=1`;
cuộn tới đáy → tự gọi `page=2` → **24 dòng**, cuộn tiếp **không** gọi thừa; bật/tắt switch đổi đúng
trạng thái, có toast, bảng **giữ nguyên 24 dòng**; dialog barcode hiện ảnh thật (`naturalWidth 351`)
+ EAN `2019711618853`; không lỗi console. Đã sinh thêm SKU cho toàn bộ sản phẩm (mỗi SP 24 SKU,
tổng **264**) để có dữ liệu test nhiều trang.

**Giả định:** dữ liệu mẫu nằm trên backend dev local. Backend **không có API xoá sản phẩm** nên
bản ghi tạo lúc test không xoá được — đã đổi thành sản phẩm mẫu hợp lệ (`SP009 — Áo len cổ lọ dệt kim`).
Ảnh sản phẩm hiện **chưa có cái nào** (chưa upload thật, chỉ kiểm tra empty state + nút bấm), nên
luồng upload multipart mới chỉ được kiểm chứng ở mức code/không lỗi console — **nên upload thử 1 ảnh
tay** để chốt hoàn toàn.

---

## Phase 10 — Kho hàng

**Thiết kế:** `13-kho-hang-ton-kho.png`, `14-kho-hang-phieu-nhap.png`, `15-kho-hang-kiem-ke.png`.

- Bảng tồn: tồn thực, **tồn khả dụng (= tồn thực − đang giữ)**, cảnh báo tồn tối thiểu,
  thiếu size chủ đạo, chậm luân chuyển.
- Phiếu nhập: PO → nhập kho, **nhập theo ma trận size × màu** (component lưới dùng lại ở kiểm kê).
- Kiểm kê: toàn phần/từng phần, nhập số đếm, tự sinh phiếu điều chỉnh chênh lệch.
- Xuất huỷ theo lý do *(chưa có mockup)*.

---

## Phase 11 — POS

**Thiết kế:** `02-pos-mo-ca.png`, `03-pos-ban-hang.png`.

- Mở ca (nhập tiền đầu ca) / chốt ca (kiểm quỹ, chênh lệch, bàn giao) *(màn chốt ca chưa có mockup)*.
- Bán hàng: quét barcode/tìm nhanh, giỏ hàng phải, chọn size-màu, gán khách.
- Khuyến mãi tự động + chiết khấu tay có **hiển thị ngưỡng của STAFF**; vượt ngưỡng ⇒ badge vàng
  **"Chờ ADMIN duyệt"** + popup nhập mã duyệt.
- Thanh toán **hỗn hợp** nhiều hình thức, hiển thị số còn lại.
- Preview hoá đơn trước khi in.

> Đây là phase nặng nhất, nhiều state cục bộ — nên tách store riêng cho giỏ hàng/ca làm việc.

---

## Phase 12 — Đơn hàng & chi tiết

**Thiết kế:** `04-don-hang.png`, `05-don-hang-chi-tiet.png`.

- Danh sách đơn online: filter trạng thái, tìm kiếm, xác nhận/huỷ, ghi chú nội bộ, tách/gộp đơn.
- Chi tiết đơn theo mockup.
- Màn đóng gói: in phiếu xuất kho, đánh dấu bàn giao vận chuyển *(chưa có mockup)*.
- Danh sách đơn tại quầy: tra theo ca/nhân viên, in lại hoá đơn.

---

## Phase 13 — Đổi / Trả

**Thiết kế:** `06-doi-tra.png`.

- Tạo yêu cầu trả: có hoá đơn (quét/nhập mã) hoặc không (tìm theo khách).
- Đổi cùng giá (size/màu) và **đổi khác giá** (tự tính thu thêm / trả lại).
- Hoàn tiền: tiền mặt / chuyển khoản / store credit.
- Chọn kho nhận hàng trả (bán lại / hàng lỗi).
- Trạng thái "STAFF tạo — chờ ADMIN duyệt" rõ ràng.

---

## Phase 14 — Khuyến mại

**Thiết kế:** `16-khuyen-mai.png`.

- Danh sách chương trình + filter trạng thái (đang chạy / sắp chạy / đã kết thúc).
- Form tạo KM: giảm %, giảm tiền, đồng giá, mua X tặng Y, combo, flash sale + điều kiện áp dụng.
- Quản lý mã giảm giá: sinh hàng loạt, giới hạn lượt, hạn dùng, export danh sách.
- Quy tắc **chồng khuyến mại**: thứ tự ưu tiên, cho/không cộng dồn, mức giảm tối đa.

---

## Phase 15 — Dashboard & Báo cáo

**Thiết kế:** `01-dashboard-bao-cao.png`.

- Hàng 4 KPI card (doanh thu / đơn hàng / khách mới / hàng chờ duyệt) kèm % so hôm qua.
- Biểu đồ doanh thu 13 ngày, khối "Tình trạng kho", biểu đồ **so sánh chi nhánh theo tháng**.
- Bộ lọc thời gian + nút "Xuất dữ liệu".
- **Dashboard đổi theo role**: STAFF = số liệu ca mình · ADMIN = chi nhánh · SUPER_ADMIN = toàn chuỗi + so sánh.
- Các khối báo cáo bán hàng / kho / doanh thu–giá vốn–lãi gộp, mỗi bảng có Export.

---

## Phase 16 — Hoàn thiện

- Rà **toàn bộ chuỗi** đã vào i18n, `vi` và `en` không thiếu key.
- Rà responsive: desktop/tablet đúng thiết kế, `< md` không vỡ / không tràn ngang.
- Rà a11y: label, `aria-*`, tab order, focus ring.
- Rà mọi màn đủ **loading / empty / error / success**; toast thành công có message riêng từng màn.
- Xoá `console.log`, gỡ mock thừa; `npm run lint` + `npm run build` sạch.
- Cập nhật `README.md` + [CONVENTIONS.md](CONVENTIONS.md) nếu kiến trúc đã đổi (CONVENTIONS mục 9).
- **Rà soát devDependency dùng để test thủ công qua các phase** (ví dụ `puppeteer-core` — cài từ
  Phase 7 để agent tự chạy UI thật qua trình duyệt headless, dùng Chrome hệ thống có sẵn nên không
  tự tải Chromium) — gỡ nếu không còn dùng, giữ lại nếu vẫn cần cho việc phát triển tiếp.

---

## E. Quy trình mỗi phase

1. Đọc [CONVENTIONS.md](CONVENTIONS.md) + **mở file mockup** của phase trong [design/](design/).
2. Code đúng phạm vi phase, không lấn phase khác.
3. Chạy `npm run lint` và `npm run build`.
4. Báo cáo cuối phase: file đã đổi · quyết định kỹ thuật · giả định · phần chưa làm.
5. **Agent khác review** theo checklist CONVENTIONS mục 10.
6. Cập nhật cột trạng thái ở mục D và tài liệu nếu có thay đổi kiến trúc.
