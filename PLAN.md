# PLAN — Eloria Admin (Frontend)

> Kế hoạch triển khai chia theo **phase**. Người dùng sẽ chỉ định **làm phase nào**;
> agent **chỉ thực hiện đúng phase được chỉ định**, không tự làm lấn sang phase khác.
> Đọc [CONVENTIONS.md](CONVENTIONS.md) trước khi bắt đầu bất kỳ phase nào.

Trạng thái: **chưa code phase nào** (repo vẫn là `react-shadcn-starter` nguyên bản).

---

## A. Bối cảnh đã khảo sát

**Frontend hiện có:** React 19 + TS + Vite + React Router 7 + Tailwind 4 + shadcn/ui.
Mới chỉ là starter: [Router.tsx](src/Router.tsx) có 3 route demo, [config/menu.ts](src/config/menu.ts)
là menu mẫu tiếng Anh, `pages/` là Dashboard/Sample/ComingSoon rỗng.

**Backend ([../35.1.eloria-backend](../35.1.eloria-backend)) hiện có:**

- Prefix: `/v1.0/api`
- `AuthenticateController`: `POST /authenticate`, `/refresh`, `/register`, `/activate-account`,
  `/forgot-password`, `/reset-password`, `/logout`
- `FileController`
- **Chưa có** controller nghiệp vụ nào (sản phẩm, kho, đơn hàng, POS, khuyến mại, chi nhánh, khách hàng…)

**Hệ quả cho kế hoạch:** chỉ **Phase 2 (Auth)** gọi được API thật. Toàn bộ màn nghiệp vụ
(Phase 7→15) phải chạy trên **lớp mock** đúng shape DTO, đóng gói sau service layer,
để khi backend có API thì **chỉ đổi implement của service**, không đụng vào màn hình.

---

## B. Điểm cần bạn chốt trước khi bắt đầu Phase 1

| # | Vấn đề | Ghi chú |
|---|---|---|
| B1 | **`/authenticate` và `/refresh` trả `LoginResDTO` trần**, KHÔNG bọc `{code, message, data}` — trong khi `/register`, `/logout`, `/forgot-password`… trả `BaseResponse`. Mâu thuẫn với CONVENTIONS mục 3. | Hướng xử lý đề xuất: api-client tự nhận diện 2 shape (có `code` ⇒ bóc `data`; không có ⇒ trả nguyên body). Hoặc bạn yêu cầu BE bọc lại cho đồng nhất. |
| B2 | Cookie `refresh_token` có `path=/v1.0/api/refresh`, `httpOnly`, **`secure=false`** ⇒ cookie chỉ gửi tới đúng endpoint refresh và **không hoạt động cross-site**. | Bắt buộc chạy **same-origin qua Vite dev proxy** (`/v1.0` → `http://localhost:8080`). Production phải cùng domain hoặc BE bật `SameSite=None; Secure`. |
| B3 | **Chưa có API ma trận phân quyền**. `SysUserDTO` chỉ có `role` (`CUSTOMER`/`STAFF`/`ADMIN`/`SUPER_ADMIN`) và `branchId`. | Phase 4 tạm dựng quyền **suy ra từ `role`**, khai báo tập trung 1 file để sau thay bằng API. Ma trận trong `09-phan-quyen.png` chỉ là màn hiển thị. |
| B4 | **Dependency cần duyệt** (CONVENTIONS cấm tự thêm): xem mục C. | Chốt danh sách này trước khi bắt đầu Phase 1. |
| B5 | Chưa có API chi nhánh ⇒ **bộ chọn chi nhánh** trên top bar (Phase 3) tạm dùng mock. | |

---

## C. Dependency đề xuất (cần bạn duyệt — B4)

| Gói | Dùng cho | Phase | Bắt buộc? |
|---|---|---|---|
| `axios` | HTTP client (interceptor cho refresh single-flight) | 1 | Có thể thay bằng `fetch` thuần nếu bạn muốn zero-dep |
| `i18next` + `react-i18next` | Đa ngôn ngữ VI/EN + map `subKey` | 1 | Cần |
| `sonner` | Toast (shadcn chuẩn) | 1 | Cần |
| `@tanstack/react-query` | Cache/loading/error state cho data fetching | 5 | Rất nên — nếu không, phải tự viết hook `useApi` |
| `react-hook-form` + `zod` | Form + validate + lỗi inline theo field | 5 | Cần |
| `@tanstack/react-table` | DataTable (sort/filter/paging) | 5 | Nên |
| `recharts` | Biểu đồ dashboard | 15 | Cần cho Phase 15 |
| `date-fns` | Format ngày tiếng Việt | 5 | Nên |

Các gói shadcn/ui còn thiếu (table, tabs, select, dialog, form, badge, checkbox, textarea,
radio, switch, calendar, pagination, alert, toast…) sẽ được thêm dần qua CLI shadcn ở đúng phase cần.

---

## D. Bảng phase

| Phase | Tên | Phụ thuộc | Thiết kế tham chiếu |
|---|---|---|---|
| **0** | Dọn starter & nền tảng dự án | — | — |
| **1** | Lớp lõi: i18n · api-client · error mapping · toast | 0 | — |
| **2** | Auth: đăng nhập, quên/đặt lại mật khẩu, session | 1 | `00-dang-nhap.png` |
| **3** | App shell: sidebar · top bar · breadcrumb · 403/404 | 1, 2 | tất cả (khung chung) |
| **4** | RBAC: menu & route theo role | 2, 3 | mục 6.4 CONVENTIONS |
| **5** | Bộ component & pattern dùng chung | 3 | `04`, `07`, `11` |
| **6** | Lớp mock data & service contract | 1, 5 | — |
| **7** | Nhân viên & Chi nhánh (3 tab) | 4, 5, 6 | `07`, `08`, `09` |
| **8** | Khách hàng (CRM) | 5, 6 | `10` |
| **9** | Sản phẩm & Danh mục SP | 5, 6 | `11`, `12` |
| **10** | Kho hàng: tồn kho · phiếu nhập · kiểm kê | 5, 6, 9 | `13`, `14`, `15` |
| **11** | POS: mở ca · bán hàng | 5, 6, 9, 10 | `02`, `03` |
| **12** | Đơn hàng & chi tiết đơn | 5, 6 | `04`, `05` |
| **13** | Đổi / Trả | 5, 6, 12 | `06` |
| **14** | Khuyến mại | 5, 6, 9 | `16` |
| **15** | Dashboard & Báo cáo | 5, 6 | `01` |
| **16** | Hoàn thiện: audit i18n · a11y · responsive · tài liệu | tất cả | — |

Thứ tự đề xuất chạy: **0 → 1 → 2 → 3 → 4 → 5 → 6**, sau đó các phase màn hình (7→15)
có thể làm **song song / theo thứ tự bạn ưu tiên**, cuối cùng là 16.

---

## Phase 0 — Dọn starter & nền tảng dự án

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

---

## Phase 1 — Lớp lõi

**Mục tiêu:** hạ tầng mọi phase sau đều dùng.

- **i18n** (`src/i18n/`): cấu hình `vi` (mặc định) + `en`, tách namespace `common`, `errors`, và
  namespace theo module. File `errors` map **`subKey` dạng `a.b.c`** → chuỗi dịch.
- **`resolveErrorMessage(err)`**: `subKey` có trong tài nguyên ⇒ dịch; không ⇒ dùng `message` của BE;
  không có cả hai ⇒ message mặc định. `logInfo` chỉ log ở dev.
- **`src/lib/api-client.ts`**: base URL từ env, `credentials: 'include'`, header `Accept-Language`,
  gắn `Authorization` từ access token in-memory, **xử lý cả 2 shape response** *(B1)*,
  chuẩn hoá lỗi về `ErrorResponse`, xử lý mặc định 401/403/404/400-422/5xx/network,
  cờ opt-out (`skipErrorToast`), hỗ trợ `AbortSignal`.
- **Toast provider** + helper `toastSuccess(msgKey)` / `toastError(err)`.
- `src/types/common.ts`: `BaseResponse<T>`, `ErrorResponse`, `ERole`, kiểu phân trang.

**DoD:** gọi thử 1 endpoint bất kỳ thấy đúng luồng thành công/lỗi; đổi ngôn ngữ đổi được message lỗi.

---

## Phase 2 — Auth

**Thiết kế:** `00-dang-nhap.png` (layout 2 cột: panel brand tối trái + form phải).

- Màn **Đăng nhập**: username + password, "Quên mật khẩu?", lỗi inline + lỗi từ `subKey`.
- Màn **Quên mật khẩu** → **Đặt lại mật khẩu** (token từ email). *Chưa có mockup ⇒ tái sử dụng
  layout màn đăng nhập, theo CONVENTIONS mục 6.2.*
- **AuthContext**: access token **chỉ in-memory**, `user: SysUserDTO` (`role`, `branchId`, `fullName`, `langKey`).
- **Refresh single-flight** trong api-client: 401 → `POST /refresh` một lần → retry; fail ⇒ clear + về `/login`.
- **Bootstrap khi load app**: gọi `/refresh` để khôi phục phiên (vì token không lưu ổ đĩa); có màn splash chờ.
- **Logout**: gọi `POST /logout`, clear state, về `/login`.
- `ProtectedRoute` / `PublicOnlyRoute`.

**DoD:** login → vào app → F5 vẫn giữ phiên → token hết hạn tự refresh → logout sạch cookie.
Không có bất kỳ chỗ nào ghi token vào `localStorage`/`sessionStorage`.

---

## Phase 3 — App shell

**Thiết kế:** khung chung trong mọi mockup.

- **Sidebar tối**: logo ELORIA, nút thu gọn, 4 nhóm — `TỔNG QUAN` / `BÁN HÀNG` / `HỆ THỐNG` / `SẢN PHẨM & KHO`,
  item active nền accent bo góc. Thay hoàn toàn [config/menu.ts](src/config/menu.ts).
- **Top bar**: breadcrumb ("Trang chủ › …"), **bộ chọn chi nhánh** (mock — B5), **bộ chuyển ngôn ngữ VI/EN**
  (bổ sung ngoài mockup, đặt bên trái chuông), chuông thông báo, avatar + tên + role.
- `PageHeader` chuẩn: tiêu đề + mô tả phụ + slot action bên phải.
- Trang **403** và **404** theo style hệ thống.
- Responsive: desktop/tablet đúng thiết kế, `< md` sidebar thành sheet, không tràn ngang.
- Route rỗng cho từng module (placeholder) để điều hướng chạy được.

**DoD:** đi hết mọi mục menu không lỗi; thu gọn sidebar OK; đổi VI/EN đổi được toàn bộ chữ trong shell.

---

## Phase 4 — RBAC

- File khai báo quyền tập trung `src/config/permissions.ts`: map `ERole` → danh sách quyền → menu + route *(B3)*.
- Menu **sinh theo role**; route bị chặn ở cả **router guard** (vào thẳng URL ⇒ 403) lẫn ẩn khỏi menu.
- Component `<Can permission="...">` để ẩn/khoá nút.
- Bộ chọn chi nhánh: `SUPER_ADMIN` chọn được "Tất cả chi nhánh"/từng chi nhánh;
  `ADMIN`/`STAFF` hiển thị **read-only** theo `branchId`.
- **Không** implement cụm tab `STAFF | ADMIN | SA` của mockup (chỉ là demo — CONVENTIONS mục 6.4).

**DoD:** đăng nhập bằng 3 role thấy 3 bộ menu khác nhau; gõ thẳng URL không có quyền ⇒ 403.

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

- Định nghĩa **type nghiệp vụ** trong `src/types/` (branch, staff, customer, product, sku, inventory,
  order, return, promotion, shift…) — đặt tên field theo quy ước BE đang dùng.
- Mỗi module 1 service `src/api/<module>.ts` với **chữ ký cố định**; implement hiện tại đọc từ
  `src/mocks/<module>.ts` (có độ trễ giả lập, có case lỗi để test error state).
- Cờ `VITE_USE_MOCK=true|false` để chuyển giữa mock và API thật.

**DoD:** đổi cờ về `false` là code màn hình không phải sửa gì, chỉ service đổi implement.

> ⚠️ Khi backend bổ sung API thật, phải **đọc lại `/v3/api-docs/api` theo lệnh của bạn**
> rồi đồng bộ lại type — không tự đoán.

---

## Phase 7 — Nhân viên & Chi nhánh

**Thiết kế:** `07-nhan-vien.png`, `08-chi-nhanh.png`, `09-phan-quyen.png` — 3 tab pill dưới tiêu đề.

- Tab **Nhân viên**: danh sách (tên, chi nhánh, role, trạng thái), thêm/sửa, gán role, gán chi nhánh,
  khoá/mở khoá, reset mật khẩu — hành động nhạy cảm có confirm dialog.
- Tab **Chi nhánh**: danh sách + form thêm/sửa (tên, địa chỉ, giờ mở cửa, kho gắn kèm, phương thức thanh toán).
- Tab **Phân quyền**: bảng ma trận role × quyền, check/uncheck.
- Khu vực **audit log** theo nhân viên (chưa có mockup ⇒ dùng pattern bảng chuẩn).

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
