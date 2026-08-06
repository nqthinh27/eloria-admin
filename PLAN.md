# PLAN — Eloria Admin (Frontend)

> Kế hoạch triển khai chia theo **phase**. Người dùng sẽ chỉ định **làm phase nào**;
> agent **chỉ thực hiện đúng phase được chỉ định**, không tự làm lấn sang phase khác.
> Đọc [CONVENTIONS.md](CONVENTIONS.md) trước khi bắt đầu bất kỳ phase nào.

Trạng thái: **Phase 0 · 1 · 2 · 3 đã xong** (0–1: 2026-08-06 · 2–3: 2026-08-07). Các phase còn lại chưa bắt đầu.

---

## A. Bối cảnh đã khảo sát

**Frontend hiện có:** React 19 + TS + Vite + React Router 7 + Tailwind 4 + shadcn/ui.
Mới chỉ là starter: [Router.tsx](src/Router.tsx) có 3 route demo, [config/menu.ts](src/config/menu.ts)
là menu mẫu tiếng Anh, `pages/` là Dashboard/Sample/ComingSoon rỗng.

**Backend ([../35.1.eloria-backend](../35.1.eloria-backend)) — cập nhật theo `/v3/api-docs/api` ngày 2026-08-06:**

Đã có: **Auth** · **Tài khoản đang đăng nhập** (`/account/me`, đổi mật khẩu, đổi avatar) ·
**Nhân viên** (CRUD + search + gán role + khoá/mở + reset mật khẩu) · **Chi nhánh** (CRUD + search + bật/tắt) ·
**Audit log** (search + chi tiết before/after) · **Địa chỉ hành chính** (Tỉnh → Phường/Xã) · **File/ảnh**.
Danh sách endpoint đầy đủ ở [CLAUDE.md](CLAUDE.md).

**Chưa có:** sản phẩm/SKU, giá, kho, POS, đơn hàng, đổi/trả, khuyến mại, khách hàng.

**Phân quyền:** thang bậc kế thừa `SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS`;
`summary` mỗi endpoint mang tiền tố `[ROLE]` = role tối thiểu. Bảng tra đầy đủ ở [CLAUDE.md](CLAUDE.md).

**Hệ quả cho kế hoạch:**

- **Phase 2, 3, 4, 7 chạy được trên API thật** (auth, bộ chọn chi nhánh, RBAC, màn Nhân viên & Chi nhánh + audit log).
- **Phase 8→15 vẫn chạy trên lớp mock** đúng shape DTO, đóng gói sau service layer (Phase 6),
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
| **4** | RBAC: menu & route theo role | 2, 3 | mục 6.4 CONVENTIONS |
| **5** | Bộ component & pattern dùng chung | 3 | `04`, `07`, `11` |
| **6** | Lớp mock data & service contract (chỉ cho module **chưa có API**) | 1, 5 | — |
| **7** | Nhân viên & Chi nhánh + Audit log (**API thật**) | 4, 5 | `07`, `08`, `09` |
| **8** | Khách hàng (CRM) | 5, 6 | `10` |
| **9** | Sản phẩm & Danh mục SP | 5, 6 | `11`, `12` |
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

## Phase 4 — RBAC (thang bậc kế thừa)

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

---

## Phase 5 — Bộ component & pattern dùng chung

- `DataTable`: search, filter, sort cột, phân trang, **empty state**, **loading skeleton**, error state,
  scroll ngang trong khung ở màn hẹp, slot action theo hàng.
- Form kit: `react-hook-form` + `zod`, đánh dấu trường bắt buộc, lỗi inline, map lỗi 400/422 từ BE về field.
- `StatusBadge` chuẩn hoá màu: xanh = tốt/hoàn tất, vàng = **chờ duyệt**, đỏ = lỗi/huỷ, xám = ngừng.
- `ConfirmDialog` cho hành động nhạy cảm, kèm dòng ghi chú "sẽ được lưu vào nhật ký (audit log)".
- `KpiCard` (theo hàng thẻ số liệu ở `01-dashboard`), `SectionCard`, `PillTabs` (theo `07/08/09`).
- `ExportButton` (Excel/PDF) — chuẩn hoá vị trí, chưa cần implement backend.
- Helper format: tiền VND, số lượng, ngày giờ tiếng Việt.

**DoD:** có 1 trang demo nội bộ dựng lại `04-don-hang` **chỉ bằng** component dùng chung, khớp mockup.

---

## Phase 6 — Lớp mock data & service contract

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

---

## Phase 7 — Nhân viên & Chi nhánh

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

---

## Phase 8 — Khách hàng (CRM)

**Thiết kế:** `10-khach-hang.png`.

- Danh sách khách (gộp online + tại quầy), tìm theo tên/SĐT, badge phân nhóm VIP / mới / ngủ đông.
- Trang chi tiết: thông tin, lịch sử mua toàn kênh, size hay mua, sản phẩm ưa thích *(chưa có mockup)*.
- Cảnh báo **trùng hồ sơ theo SĐT** + hành động "gộp hồ sơ" (confirm dialog).

---

## Phase 9 — Sản phẩm & Danh mục SP

**Thiết kế:** `11-san-pham.png`, `12-danh-muc-sp.png`.

- CRUD danh mục nền: ngành hàng đa cấp, thương hiệu, chất liệu, nhà cung cấp, bộ sưu tập mùa.
- Cấu hình bảng size theo nhóm hàng.
- Tạo sản phẩm cha → chọn màu × size → **tự sinh ma trận SKU** (mỗi dòng 1 SKU + barcode).
- Quản lý ảnh theo color-way, chọn ảnh đại diện.
- Badge vòng đời SKU: New → Active → Markdown → Ngừng KD.
- Import/Export Excel có **preview lỗi trước khi xác nhận**.

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

---

## E. Quy trình mỗi phase

1. Đọc [CONVENTIONS.md](CONVENTIONS.md) + **mở file mockup** của phase trong [design/](design/).
2. Code đúng phạm vi phase, không lấn phase khác.
3. Chạy `npm run lint` và `npm run build`.
4. Báo cáo cuối phase: file đã đổi · quyết định kỹ thuật · giả định · phần chưa làm.
5. **Agent khác review** theo checklist CONVENTIONS mục 10.
6. Cập nhật cột trạng thái ở mục D và tài liệu nếu có thay đổi kiến trúc.
