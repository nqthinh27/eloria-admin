# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này. File này là **bản đồ điều hướng** — nội dung
chi tiết nằm ở các file được trỏ tới, đừng chép ngược vào đây. **Lịch sử không ghi vào file này**
(đã có [docs/history.md](docs/history.md) — skill `handoff` ghi tiếp vào đó).

> ℹ️ Tái cấu trúc 2026-09-14: tri thức backend từng nằm trong file này đã chuyển sang
> [docs/backend/](docs/backend/README.md). Comment cũ trong code còn trỏ *"CLAUDE.md mục Sort phía
> server / Mô hình tồn kho / Phase 3b / cap `size`…"* ⇒ tra các mục đó ở `docs/backend/` (Sort +
> cap `size` ở `README.md` · tồn kho/thanh toán ở `don-hang.md` · Phase 3b ở `khach-hang.md`).

## Đọc gì / gọi skill nào — theo việc sắp làm

| Sắp làm gì | Đọc / gọi |
|---|---|
| **Bất kỳ việc code nào** | [CONVENTIONS.md](CONVENTIONS.md) — luật bắt buộc. Mâu thuẫn với luật ⇒ **hỏi user**, không tự quyết |
| Làm việc theo phase | [PLAN.md](PLAN.md) — user **chỉ định phase**, chỉ làm đúng phase đó, không lấn phase khác. Mục B = việc chờ backend (mã BE#) |
| Đụng một màn hình | Mockup của màn trong [design/](design/) (bảng tra: CONVENTIONS mục 6.1) + file domain trong [docs/backend/](docs/backend/README.md) |
| Gọi bất kỳ API nào | [docs/backend/README.md](docs/backend/README.md) — quy ước response/phân trang/status/sort/RBAC + **tài khoản test** + chỉ mục domain |
| Dựng / sửa bảng danh sách | skill **create-table** |
| Khảo sát api-docs / đo API thật | skill **update-api-doc** — **chỉ khi user ra lệnh** |
| Thiếu API, gặp bug backend | skill **request-backend** |
| Xong task / kết thúc phiên | skill **handoff** |
| Review sau task · rà luật mới toàn repo | skill **review-phase** |

## Lệnh

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc -b && vite build  — dùng lệnh này để type-check
npm run lint     # eslint .
npm run preview  # preview bản build (proxy /v1.0 đã cấu hình sẵn)
```

**Chưa có test runner** (không Vitest/Jest). Cổng kiểm tra = `npm run lint` + `npm run build`.
Muốn thêm test framework phải hỏi user trước (CONVENTIONS mục 8).

## Vị trí trong hệ thống

Web quản trị nội bộ (back-office) cho chuỗi cửa hàng thời trang, cạnh 2 project anh em:

```
d:\Project\35.eloria\
├─ 35.1.eloria-backend\   # Spring Boot — nguồn của DTO/API (docs/api/*.md + source Java)
├─ 35.2.eloria-admin\     # ← repo này
└─ 35.3.eloria-client\    # storefront cho khách
```

Cần biết shape dữ liệu: đọc [docs/backend/](docs/backend/README.md) trước, rồi source backend
(`35.1.eloria-backend/src/main/java/vn/com/eloria/`) khi cần sâu hơn. Nguồn sự thật chính thức là
`/v3/api-docs/api` — **chỉ fetch khi user ra lệnh** (skill `update-api-doc`).

## Trạng thái dự án

- **Trọn 17 phase của PLAN đã hoàn thành** (phase cuối: Phase 13, 2026-09-12). Việc mở duy nhất còn
  lại: Phase 17 (mở rộng Khuyến mại) — để cuối, tuỳ chọn. Màn Quản lý giá **không làm** (user chốt).
- Backend: **118 path** (2026-09-13). Việc chờ backend còn mở: **BE2 · BE3 · BE4 · BE6 · BE7 · BE10 ·
  BE11 · BE12 · BE13 · BE14 · BE18 · BE21 · BE27 · BE30** — chi tiết ở PLAN mục B.
- Dòng thời gian phase & khảo sát backend: [docs/history.md](docs/history.md) ·
  bàn giao từng phiên: [docs/handoff/](docs/handoff/).

## Luật sống còn (tóm tắt — chi tiết ở CONVENTIONS + docs/backend/README.md)

- Prefix `/v1.0/api`; mọi response bọc `BaseResponse`; **`code === 1` mới là thành công**.
- Danh sách = `POST .../search`: `page` (1-based)/`size`/`sort` ở **query param**, body chỉ chứa
  filter — field thừa trong body ⇒ 400. Vượt trần `size` bị **cắt im lặng** ⇒ luôn so `data.length`
  với `total`.
- `status`: bật/tắt 1/0 qua `update-status`; xoá mềm = API `DELETE` riêng; **không bao giờ gửi `-1`**,
  không dựng UI "Đã xoá".
- Sort giải theo field **ENTITY** — field DTO-only ⇒ **HTTP 500**; cột ngoài whitelist
  (docs/backend/README.md mục Sort) phải `enableSorting: false`.
- RBAC thang bậc `SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS`; `[ROLE]` trong summary = role
  tối thiểu; so bậc bằng một hàm dùng chung.
- Auth: token in-memory, refresh cookie HttpOnly, luôn `rememberMe: true`; **cấm** `fetch`/`axios`
  ngoài api-client.
- i18n VI + EN cho mọi chuỗi; chỉ light theme; ngày `dd/MM/yyyy` (`DateInput`), tiền `MoneyInput` + `đ`.

## Cấu trúc mã nguồn

```
src/
├─ api/          # service theo domain (auth, staff, order, return, shift, …) — 1 file ≈ 1 domain backend
├─ components/   #   dùng chung: data-table/, detail-modal, search-select, async-suggest,
│  │             #   date-input, money-input, page-header, pill-tabs, confirm-dialog, can (RBAC), shell/
│  └─ ui/        #   shadcn (đã vá bg-card + SelectContent — xem CONVENTIONS mục 5)
├─ config/       # app.ts (storeConfig từ VITE_STORE_*), menu.ts (menu theo role), roles.ts (rank)
├─ contexts/     # auth, branch, cart
├─ hooks/        # use-auth, use-table-state, use-paged-search, use-sku-options, use-cart, …
├─ i18n/         # locales/{vi,en}/<namespace>.ts + errors.ts (map subKey — thêm key phải đủ CẢ 2 ngôn ngữ)
├─ lib/          # api-client, api-error, format, money-input-format, validation, token-store, …
├─ pages/        # theo route: auth/ pos/ orders/ returns/ shift/ staff/ customer/ product/
│                #   inventory/ promotion/ report/ (mỗi màn: XxxPage.tsx + components/)
└─ types/        # DTO đồng bộ 100% từ api-docs — không bịa field
```

Luồng dữ liệu: `page/feature → src/api/<module>.ts → src/lib/api-client.ts → backend`.
Không component/hook nào gọi `fetch`/`axios` trực tiếp; lỗi chuẩn hoá một chỗ ở api-client.

## Quy ước kỹ thuật riêng của repo

- Alias `@/*` → `src/*` (khai ở cả [vite.config.ts](vite.config.ts) và [tsconfig.app.json](tsconfig.app.json)).
- **Tailwind CSS 4** — cấu hình nằm trong [src/index.css](src/index.css) qua CSS variables,
  **không có `tailwind.config.js`**. Token màu khai ở đây, không hardcode hex trong component.
- shadcn/ui style `new-york`, base `neutral`, icon `lucide` ([components.json](components.json)).
  Thêm component bằng CLI shadcn. ⚠️ Sau `npx shadcn add` phải **áp lại 2 bản vá của repo**:
  `bg-background` → `bg-card` cho component nổi, và `SelectContent` mặc định `position="popper"` —
  chi tiết ở CONVENTIONS mục 5.
- Router chọn `BrowserRouter`/`HashRouter` theo env `VITE_USE_HASH_ROUTE` ([src/App.tsx](src/App.tsx)).
- TS strict + `noUnusedLocals`/`noUnusedParameters` ⇒ biến thừa làm **build fail**, không chỉ warning.
- `.env` bị gitignore; mẫu biến ở `.env.example`.
- `README.md` vẫn là README của template `react-shadcn-starter` — **lỗi thời**, không dùng tham chiếu.

## Sau khi xong việc

Kết thúc task bằng skill **handoff** (cổng lint+build · bàn giao `docs/handoff/` · ghi
`docs/history.md` · cập nhật PLAN). Sẽ có **agent khác review** bằng skill **review-phase**.
