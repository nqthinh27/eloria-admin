# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Đọc trước khi code

Repo này có 2 tài liệu **bắt buộc đọc**, đừng chép lại nội dung của chúng vào đây:

- **[CONVENTIONS.md](CONVENTIONS.md)** — luật chung (API/DTO, auth, format response, API client, UI/UX,
  bám thiết kế `design/`, cấu trúc code, tài liệu hoá, review). Mâu thuẫn với tài liệu này ⇒ **hỏi user**, không tự quyết.
- **[PLAN.md](PLAN.md)** — kế hoạch chia 17 phase. User sẽ **chỉ định phase**; chỉ làm đúng phase đó,
  không lấn sang phase khác. Mục B của PLAN là các điểm còn chờ user chốt.

`README.md` hiện vẫn là README của template `react-shadcn-starter` — **đã lỗi thời**, không dùng làm nguồn tham chiếu.

## Lệnh

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc -b && vite build  — dùng lệnh này để type-check
npm run lint     # eslint .
npm run preview  # preview bản build
```

**Chưa có test runner nào được cấu hình** (không Vitest/Jest, không thư mục test). Cổng kiểm tra hiện tại
là `npm run lint` + `npm run build`. Nếu cần thêm test framework thì phải hỏi user trước (CONVENTIONS mục 8).

## Trạng thái thực tế của repo

Repo **vẫn là starter `react-shadcn-starter` nguyên bản** — chưa code phase nào của PLAN.
Những gì thấy trong `src/` (Dashboard/Sample/ComingSoon, menu tiếng Anh, `mode-toggle`, footer/github của tác giả
template) là **code demo của template, sẽ bị gỡ ở Phase 0**, không phải code sản phẩm. Đừng bắt chước pattern của chúng.

## Kiến trúc

### Vị trí trong hệ thống

Đây là **web quản trị nội bộ** (back-office) cho chuỗi cửa hàng thời trang, nằm cạnh 2 project anh em:

```
d:\Project\35.eloria\
├─ 35.1.eloria-backend\   # Spring Boot — nguồn của DTO/API
├─ 35.2.eloria-admin\     # ← repo này
└─ 35.3.eloria-client\    # storefront cho khách
```

Khi cần biết shape dữ liệu, ưu tiên **đọc source backend** (`35.1.eloria-backend/src/main/java/vn/com/eloria/`)
thay vì đoán — nhưng **nguồn sự thật chính thức là `/v3/api-docs/api`**, chỉ fetch khi user ra lệnh (CONVENTIONS mục 1).

### Tích hợp backend — khảo sát `/v3/api-docs/api` ngày **2026-08-06**

- Prefix API: **`/v1.0/api`**. Auth: `bearerAuth` (JWT) áp dụng **global** cho mọi endpoint.
- **Response đã được chuẩn hoá hoàn toàn**: *mọi* endpoint bọc `BaseResponse<T>` = `{code, message, data}`,
  kể cả `/authenticate` và `/refresh` (trước đây trả DTO trần — điều này **không còn đúng**).
- **`code === 1` là thành công**, không phải `0`. Xem `ResponseCode` phía backend:
  `1` thành công · `3` đã tồn tại · `4` không tồn tại · `7` dữ liệu không hợp lệ · `15` xác thực thất bại · `24` không đủ quyền.
- Lỗi trả kèm **HTTP status tương ứng** (login sai ⇒ 401) với body
  `ErrorResponse` = `{code, message, logInfo, subKey}`, ví dụ thật: `subKey: "error.login.fail"`.
  `subKey` dạng `a.b.c` → map i18n, fallback `message`.
- **API danh sách là `POST .../search`** với body `{page, size, sortBy, sortDir, keyword, status, ...}`.
  Kết quả lồng 2 tầng: `data.data` mới là mảng, `data.total` là tổng;
  `staff/search` + `branch/search` có thêm `data.activeTotal` / `data.inactiveTotal`.
- Cookie `refresh_token`: `path=/v1.0/api/refresh; HttpOnly; Max-Age=864000`, không `Secure`, không `SameSite`
  ⇒ **bắt buộc same-origin qua Vite dev proxy**. **Chỉ được set khi login gửi `rememberMe: true`.**
- `SysUserDTO` mang `role` (`CUSTOMER | STAFF | ADMIN | SUPER_ADMIN`), `branchId` (null với SUPER_ADMIN),
  `langKey` — nguồn để dựng menu theo role và khoá bộ chọn chi nhánh.
- Quy ước dữ liệu: `status` **`1` = ACTIVE, `0` = INACTIVE**; ngày giờ ISO-8601 UTC (`2026-08-05T16:17:10Z`);
  id là UUID chuỗi. Địa chỉ hành chính chỉ **2 cấp**: Tỉnh/Thành → Phường/Xã (không có Quận/Huyện).
- Validate của backend cần khớp sang zod ở FE: mật khẩu `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,50}$`,
  SĐT `^0\d{9}$`, username 6–50 ký tự.

### Phân quyền — role phân cấp, đọc từ `summary` của api-docs

Backend fix cứng **thang bậc kế thừa**, role bên trái kế thừa **toàn bộ** quyền của role bên phải:

```
SUPER_ADMIN  >  ADMIN  >  STAFF  >  CUSTOMER  >  ANONYMOUS
```

`summary` của mỗi endpoint mang tiền tố **`[ROLE]`** = **role tối thiểu** được gọi endpoint đó,
theo cấu trúc `[ROLE] Tên api` (ví dụ `[ANONYMOUS] Đăng nhập`). Nhờ kế thừa, `[ADMIN]` nghĩa là
**ADMIN và SUPER_ADMIN** gọi được, còn STAFF thì không.

FE **suy quyền từ đúng thang bậc này**, không dùng ma trận quyền rời rạc và **không có API ma trận quyền**.
Cách làm: so sánh bậc của role người dùng với bậc tối thiểu của route/hành động
(`rank(SUPER_ADMIN)=4 … rank(ANONYMOUS)=0`, cho phép khi `rank(user) >= rank(required)`).

### API đã có (đủ để code Phase 7 bằng API thật)

Cột **Role** là role tối thiểu, lấy từ tiền tố `[ROLE]` trong `summary`.

| Nhóm | Role | Endpoint |
|---|---|---|
| Auth | `ANONYMOUS` | `POST /authenticate` · `/refresh` · `/register` · `/activate-account?code=` · `/forgot-password` · `/reset-password` |
| Đăng xuất | `CUSTOMER` | `POST /logout` |
| Tài khoản đang đăng nhập | `CUSTOMER` | `GET /account/me` · `POST /account/change-password` · `POST /sys-user/update-avatar` |
| Ảnh | `ANONYMOUS` | `GET /image?imageUrl=` |
| Địa chỉ hành chính | `STAFF` | `GET /administrative-address/provinces` · `/wards?provinceCode=` |
| Chi nhánh — đọc | `STAFF` | `POST /branch/search` · `GET /branch/{id}` |
| Chi nhánh — sửa | `ADMIN` | `PUT /branch/{id}` |
| Chi nhánh — tạo/xoá/bật-tắt | `SUPER_ADMIN` | `POST /branch` · `/branch/update-status` · `DELETE /branch/{id}` |
| Nhân viên (toàn bộ) | `ADMIN` | `POST /staff` · `/staff/search` · `/staff/assign-role` · `/staff/update-status` · `/staff/{id}/reset-password` · `GET|PUT|DELETE /staff/{id}` |
| Audit log | `ADMIN` | `POST /audit-log/search` · `GET /audit-log/{id}` |

**Chưa có** API: sản phẩm/SKU, giá, kho, POS, đơn hàng, đổi/trả, khuyến mại, khách hàng
⇒ các phase đó vẫn chạy trên **lớp mock sau service layer** (PLAN Phase 6).

Ngoài bậc role, backend còn **tự giới hạn phạm vi dữ liệu** (ghi trong `description` từng endpoint):
ADMIN chỉ thấy/tạo nhân viên chi nhánh mình và chỉ gán được role STAFF; điều chuyển chi nhánh chỉ SUPER_ADMIN.
FE vẫn phải chặn ở UI nhưng **không được coi đó là lớp bảo mật duy nhất**.

### Tài khoản test (môi trường dev local)

Dùng để gọi thử API và kiểm tra RBAC theo từng role. Đăng nhập bằng `POST /v1.0/api/authenticate`
với body `LoginReqDTO` = `{username, password, rememberMe}` — field là **`username`**, không phải email.
**Luôn gửi `rememberMe: true`** (user đã chốt): backend chỉ set cookie `refresh_token` khi cờ này bật,
và FE **không hiển thị checkbox "Ghi nhớ đăng nhập"**.

| Username | Password | Role |
|---|---|---|
| `superadmin` | `Admin@123` | `SUPER_ADMIN` |
| `adminbranch` | `Admin@123` | `ADMIN` |
| `staffone` | `Admin@123` | `STAFF` |

- Chỉ dùng cho backend local (`http://localhost:8080`). **Không** hardcode các tài khoản này vào code,
  không dùng làm giá trị mặc định của form đăng nhập, không đưa lên môi trường ngoài dev.
- Mọi thay đổi liên quan menu/route theo role (PLAN Phase 4) phải test đủ **cả 3 tài khoản**.

### Luồng dữ liệu dự kiến

```
page/feature  →  src/api/<module>.ts  →  src/lib/api-client.ts  →  backend
                 (service, đổi được          (auth header, refresh single-flight,
                  giữa mock ↔ API thật)       bóc response, xử lý 401/403/5xx, toast lỗi)
```

Không có component/hook nào được gọi `fetch`/`axios` trực tiếp. Lỗi được chuẩn hoá **một chỗ** ở api-client,
màn hình chỉ nhận `data` hoặc `ErrorResponse` đã chuẩn hoá.

### RBAC

Role đến **từ kết quả login**, không phải từ UI. Menu và route **sinh theo role**, chặn ở cả router guard
lẫn hiển thị. Cụm tab `STAFF | ADMIN | SA` trên top bar trong mockup **chỉ là demo của bản thiết kế —
không được implement** (CONVENTIONS mục 6.4).

### Thiết kế

[design/](design/) chứa 17 file PNG mockup — **nguồn sự thật về giao diện**. Trước khi code một màn,
phải mở đúng file mockup của màn đó. Mockup chỉ có **frame desktop, chỉ light theme**;
mobile chỉ cần "không vỡ", và **không làm dark theme** (CONVENTIONS mục 5 + 6).

## Quy ước kỹ thuật riêng của repo

- Alias `@/*` → `src/*` (khai báo ở cả [vite.config.ts](vite.config.ts) và [tsconfig.app.json](tsconfig.app.json)).
- **Tailwind CSS 4** — cấu hình nằm trong [src/index.css](src/index.css) qua CSS variables,
  **không có `tailwind.config.js`**. Design token màu khai báo tại đây, không hardcode hex trong component.
- shadcn/ui style `new-york`, base color `neutral`, icon `lucide` (xem [components.json](components.json)).
  Thêm component mới bằng CLI shadcn, đừng viết tay component trùng chức năng.
- Router chọn `BrowserRouter`/`HashRouter` theo env `VITE_USE_HASH_ROUTE` (xem [src/App.tsx](src/App.tsx)).
- TS strict + `noUnusedLocals`/`noUnusedParameters` đang bật ⇒ biến thừa làm **build fail**, không chỉ cảnh báo lint.
- `.env` bị gitignore; mẫu biến ở `.env.example`.

## Sau khi xong việc

Cuối mỗi task, tóm tắt: file đã đổi · quyết định kỹ thuật · giả định · phần chưa làm —
sẽ có **agent khác review** theo checklist ở CONVENTIONS mục 10.
