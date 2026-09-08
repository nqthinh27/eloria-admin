# Eloria Admin

Web quản trị nội bộ (back-office) cho chuỗi cửa hàng thời trang Eloria: bán hàng tại quầy (POS),
đơn hàng, kho, sản phẩm, khách hàng, khuyến mại, nhân viên và báo cáo doanh thu.

> **Tài liệu bắt buộc đọc trước khi code:**
> - **[CONVENTIONS.md](CONVENTIONS.md)** — luật chung (API/DTO, auth, format response, API client,
>   UI/UX, bám thiết kế `design/`, cấu trúc code, tài liệu hoá, review).
> - **[PLAN.md](PLAN.md)** — kế hoạch 17 phase, trạng thái từng phase và các điểm còn chờ chốt.
> - **[CLAUDE.md](CLAUDE.md)** — khảo sát backend chi tiết (shape DTO, phân quyền, các bẫy đã đo thật).

## Vị trí trong hệ thống

```
d:\Project\35.eloria\
├─ 35.1.eloria-backend\   # Spring Boot — nguồn của DTO/API
├─ 35.2.eloria-admin\     # ← repo này (back-office)
└─ 35.3.eloria-client\    # storefront cho khách
```

## Yêu cầu

- **Node.js 22+** (đang dùng v22.22)
- Backend Spring Boot chạy ở `http://localhost:8080` (xem repo `35.1.eloria-backend`)

## Chạy dự án

```bash
npm install
cp .env.example .env     # chỉnh nếu backend không ở localhost:8080
npm run dev              # dev server (Vite)
```

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server (Vite), có proxy sang backend |
| `npm run build` | `tsc -b && vite build` — **dùng lệnh này để type-check** |
| `npm run lint` | ESLint |
| `npm run preview` | Xem thử bản build |

> **Chưa cấu hình test runner** (không Vitest/Jest). Cổng kiểm tra hiện tại là
> `npm run lint` + `npm run build`. Thêm test framework phải hỏi user trước (CONVENTIONS mục 8).

## Cấu hình

Biến môi trường khai ở `.env` (mẫu đầy đủ kèm giải thích ở [`.env.example`](.env.example)).
Hai điểm dễ sai:

- **`VITE_API_BASE_URL` phải là đường dẫn tương đối** (`/v1.0/api`). Cookie `refresh_token` của
  backend là `HttpOnly`, không `Secure`, không `SameSite` ⇒ **bắt buộc same-origin**, dev đi qua
  `server.proxy` của Vite.
- **`VITE_STORE_*`** là phần letterhead của hoá đơn in — backend không trả các thông tin cấp hệ
  thống này (xem `storeConfig` ở [src/config/app.ts](src/config/app.ts)).

## Kiến trúc

### Luồng dữ liệu

```
page/feature  →  src/api/<module>.ts  →  src/lib/api-client.ts  →  backend
                 (service theo module)     (auth header, refresh single-flight,
                                            bóc response, xử lý 401/403/5xx, toast lỗi)
```

**Không component/hook nào được gọi `fetch`/`axios` trực tiếp.** Lỗi được chuẩn hoá một chỗ ở
api-client; màn hình chỉ nhận `data` hoặc `ErrorResponse` đã chuẩn hoá.

### Thư mục

| Đường dẫn | Nội dung |
|---|---|
| [src/api/](src/api/) | Service theo module — chỗ duy nhất gọi API |
| [src/lib/](src/lib/) | api-client, format, validation, toast, token store |
| [src/components/](src/components/) | Component dùng chung (DataTable, DetailModal, MoneyInput, DateInput…) |
| [src/components/ui/](src/components/ui/) | Primitive của shadcn/ui — thêm bằng CLI, đừng viết tay |
| [src/pages/](src/pages/) | Màn hình theo domain |
| [src/types/](src/types/) | Type/enum khớp DTO backend |
| [src/i18n/locales/](src/i18n/locales/) | Chuỗi VI/EN — `vi` và `en` phải **luôn cùng bộ key** |
| [design/](design/) | 17 file PNG mockup — **nguồn sự thật về giao diện** |

### RBAC

Role đến **từ kết quả login**, không phải từ UI. Backend dùng thang bậc kế thừa
`SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS`; FE so bậc của user với bậc tối thiểu của
route/hành động, chặn ở **cả** router guard lẫn hiển thị.

## Quy ước kỹ thuật

- Alias `@/*` → `src/*` (khai ở cả [vite.config.ts](vite.config.ts) và [tsconfig.app.json](tsconfig.app.json)).
- **Tailwind CSS 4** — cấu hình bằng CSS variables trong [src/index.css](src/index.css),
  **không có `tailwind.config.js`**. Không hardcode hex trong component.
- shadcn/ui style `new-york`, base color `neutral`, icon `lucide`.
- ⚠️ `bg-background` là **màu xám nền trang**, không phải trắng — trắng là `bg-card`/`bg-popover`.
- TS strict + `noUnusedLocals`/`noUnusedParameters` ⇒ **biến thừa làm build fail**, không chỉ cảnh báo.
- Chỉ **light theme**, mockup chỉ có frame desktop; mobile chỉ cần "không vỡ".

## Tài khoản test (chỉ môi trường dev local)

| Username | Role |
|---|---|
| `superadmin` | `SUPER_ADMIN` |
| `adminbranch` | `ADMIN` — Chi nhánh Trung tâm |
| `staffone` | `STAFF` — Chi nhánh Trung tâm |
| `hkadmin` | `ADMIN` — HN - Hoàn Kiếm |

Mật khẩu xem [CLAUDE.md](CLAUDE.md). **Không** hardcode vào code, không dùng làm giá trị mặc định
của form đăng nhập, không đưa lên môi trường ngoài dev.
