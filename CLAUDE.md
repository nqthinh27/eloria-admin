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

### Tích hợp backend — các sự thật đã khảo sát

- Prefix API: **`/v1.0/api`** (`Constants.VERSION_PREFIX`).
- Backend hiện **chỉ có `AuthenticateController` + `FileController`**. Chưa có API nghiệp vụ nào
  (sản phẩm, kho, đơn, POS, khuyến mại, chi nhánh, khách hàng). Mọi màn nghiệp vụ phải chạy trên
  **lớp mock sau service layer** (PLAN Phase 6) cho tới khi backend bổ sung.
- **Hai shape response cùng tồn tại** — API client phải xử lý cả hai:
  - `BaseResponse<T>` = `{code, message, data}` (`/register`, `/logout`, `/forgot-password`, `/reset-password`, `/activate-account`)
  - **`/authenticate` và `/refresh` trả `LoginResDTO` trần** (`{accessToken, user}`), KHÔNG bọc `BaseResponse`.
- Lỗi: `ErrorResponse` = `{code, message, logInfo, subKey}`. `subKey` dạng `a.b.c` → map i18n, fallback `message`.
- Cookie `refresh_token`: `httpOnly`, `path=/v1.0/api/refresh`, `secure=false`
  ⇒ **bắt buộc chạy same-origin qua Vite dev proxy**, không gọi thẳng cross-origin.
- `SysUserDTO` mang `role: ERole` (`CUSTOMER | STAFF | ADMIN | SUPER_ADMIN`), `branchId`, `langKey`
  — đây là nguồn để dựng menu theo role và khoá bộ chọn chi nhánh.

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
