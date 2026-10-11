# Bàn giao phiên 2026-10-11 — Phase 24 (CMS catalog sẵn sàng R1) + đóng nợ Phase 22/23

> **Nhánh:** `develop` · **0 commit** (toàn bộ ở working tree, trên `2fe2e6b`)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` pass
> **Đã kiểm bằng gì:** API thật (`superadmin`/`adminbranch`, `localhost:8080`, script Python) + UI thật qua Claude in Chrome
> (dev `localhost:5199`): trang `/store-settings` đổi chi nhánh + dialog xác nhận + toast, ADMIN gõ URL ⇒ 403 + không thấy menu,
> detail modal SP hiện slug/SEO/"Xem trên web", form SP hiện khối SEO. **Docker:** build 2 image liên tiếp với `PREV_IMAGE` ⇒ image B giữ `index-*.js` của A + file mới, `assets-manifest` chỉ liệt kê file của chính B, `version.json` khác nhau. **Chưa kiểm:** popup + `vite:preloadError`
> trên môi trường deploy thật (xem "Việc còn lại"), STAFF (tài khoản `staffone` đang bị vô hiệu hoá trên dev).

## Việc làm

| # | Mục PLAN | Kết quả | File chính |
|---|---|---|---|
| 1 | Chi nhánh bán online | Màn `/store-settings` (**chỉ SUPER_ADMIN**, menu + route): SearchSelect chi nhánh, dialog xác nhận khi **đổi** (lần đầu đặt thì lưu thẳng), cảnh báo đỏ khi rỗng / id không khớp chi nhánh nào / chi nhánh INACTIVE | `src/pages/system/StoreSettingsPage.tsx` · `src/api/system-config.ts` · `src/types/system-config.ts` · `src/i18n/locales/*/storeSettings.ts` |
| 2 | SEO SP + danh mục | Khối **SEO (tuỳ chọn)** dùng chung: slug chỉ đọc, `metaTitle` ≤150, `metaDescription` ≤300, đếm ký tự + gợi ý ≤60/≤160, ghi chú "để trống ⇒ web tự sinh". Detail modal hiện slug + SEO | `src/components/seo-fields.tsx` · `product-form-dialog` · `category-form-dialog` · 2 detail modal |
| 3 | "Xem trên web" | `<ViewOnWeb>` ở detail modal SP + danh mục: `{STORE_URL}/san-pham/{slug}` · `/danh-muc/{slug}`, tab mới, chú thích 5–10 phút, cảnh báo khi INACTIVE. `STORE_URL` = key runtime mới `VITE_STORE_URL` | `src/components/view-on-web.tsx` · `src/lib/storefront-url.ts` · `src/config/app.ts` (`storefrontUrl`) · `docker/30-eloria-runtime-config.sh` · `docker-compose.yml` · `.env.example` |
| 4 | Biên bản "admin nhập → web hiện" | Bên dưới (đo bằng API, không có ảnh chụp cạnh nhau) | — |
| 5 | Chống bản cũ | `vite:preloadError` ⇒ reload 1 lần (cờ `sessionStorage`); build sinh `version.json` + `__APP_VERSION__`; popup `<dialog>` không modal (focus lại tab + mỗi 10 phút), **không tự reload**; `nginx.conf` `no-store` cho `/version.json`; `Dockerfile` chép asset bản trước (`--build-arg PREV_IMAGE=`), giữ đúng **một** thế hệ qua manifest | `src/lib/stale-bundle.ts` · `src/lib/app-version.ts` · `src/components/new-version-popup.tsx` · `vite.config.ts` · `nginx.conf` · `Dockerfile` |

## Đo API thật (2026-10-11) — `docs/backend/README.md` đã ghi

- `GET/PUT /system-config`: **chỉ SUPER_ADMIN** (ADMIN 403 `error.token.forbidden`, không token 401). Khoá lạ ⇒ 400 `error.systemConfig.notExisted`.
- ⚠️ **Không validate giá trị**: `store.branch_id` nhận `"abc"` và UUID không tồn tại (200). ⚠️ **`value` rỗng/null ⇒ 400 không subKey** (`@NotBlank`) ⇒ đã đặt rồi **không thể xoá về "chưa đặt"**.
- Product `metaTitle`/`metaDescription`: bỏ field ⇒ giữ nguyên; `""` ⇒ **lưu nguyên `""`/`"  "`** (không trim, không `null` như danh mục); >150/300 ⇒ 400 `error.input.invalid`; `ogImage` ⇒ 400.
- Category: `""`/khoảng trắng ⇒ `null`; bỏ field ⇒ giữ nguyên (BE32).
- Product **không có** `update-status`/`DELETE` (405) ⇒ không thể ẩn/xoá sản phẩm khỏi web qua API.

## Biên bản mục 4 — catalog admin ↔ storefront (API công khai `/store/public/catalog/**`)

| Ca | Kết quả đo | Đạt? |
|---|---|---|
| Đổi `store.branch_id` ⇒ `inStock` đổi | Cầu Giấy **0/7** còn hàng · Hoàn Kiếm **2/7** · Trung tâm **2/7**; đổi là thấy ngay (không có độ trễ cache phía backend) | ✅ |
| Danh mục: admin ↔ cây storefront | 9 admin ACTIVE = 9 node store; không lệch hai chiều | ✅ |
| Danh mục INACTIVE | Biến khỏi cây; `GET /categories/{slug}` ⇒ 400 | ✅ |
| Danh mục xoá | Biến khỏi cây; detail 400 | ✅ |
| Danh mục mặc định 0/1 | 1 ⇒ `home.defaultCategory` đúng; INACTIVE ⇒ `null`; bật B tự gỡ A (cả A lẫn B vừa test đã khôi phục `AO-LE` = default) | ✅ |
| `metaTitle`/`metaDescription` SP → PDP | PDP trả đúng giá trị đã nhập | ✅ |
| `metaTitle` danh mục → detail store | Đúng | ✅ |
| SP không danh mục (SP002, P7COST01/02…) | Có trong admin; SP002 vẫn lên list store. P7COST01/02 **không có trong list store** (chưa có SKU/chưa listable) nhưng `GET /products/{slug}` vẫn **200** | ⚠️ ghi nhận → BE37 |
| SP ACTIVE / INACTIVE / xoá | **Không đo được**: không có API ẩn/xoá SP | ⚠️ BE37 |
| SP không ảnh / 1 ảnh / ≥2 ảnh (hover) | Dữ liệu dev **toàn bộ 9 SP không có ảnh** ⇒ chỉ đo được ca "0 ảnh" (`image: null`) | ⏳ cần ảnh thật trước release |
| Giá kênh ONLINE (P8) khác niêm yết | Dev không có bảng giá ONLINE khác giá niêm yết | ⏳ |
| Chụp admin ↔ web cạnh nhau | Chưa làm (storefront chưa dựng/chạy ở phiên này) | ⏳ |

## Phase 23 — các mục còn "đóng nợ"

- **So với storefront:** bảng trên (cây danh mục, default, INACTIVE, XOÁ).
- **Race 409:** backend đã đo (`error.category.defaultConflict`, BE33), FE bắt đúng subKey — không tái hiện lại.
- **Đường INACTIVE/XOÁ:** đo ở bảng trên.
- **RBAC:** ADMIN ⇒ **403** trên mọi API ghi của category/product/brand + `system-config`; đọc (`category/search`) 200. FE `CategoryListPage` gate `canWrite = SUPER_ADMIN`. STAFF không đo được (tài khoản dev bị vô hiệu hoá) — suy từ thang bậc.
- Phase 22: **ghi nợ unit test `IMAGE_SPEC`** (không thêm Vitest — theo đề xuất PLAN; CONVENTIONS mục 8 cần user duyệt dependency).

## ⚠️ Dữ liệu dev bị đụng trong lúc đo (để người dọn biết)

- `store.branch_id` dev: trước phiên là `""`; hiện = **HN - Cầu Giấy** (`71f48fb5…`). Không đặt lại về rỗng được (backend chặn).
- Sản phẩm test **`ZZR1TMP`** (`zz-r1-temp`) do tôi tạo để đo — **không xoá được qua API** (không có `DELETE /product`). Ops dọn cùng đợt fixture `test-*`.
- `P7COST02`: `metaTitle`/`metaDescription` hiện là `""` (trước là `null`).
- Danh mục `ZZR1CAT` đã tạo rồi xoá; `AO-LE` đã được bật lại default.

## Việc còn lại / cần user

1. **Deploy 2 lần để kiểm popup + reload** (DoD mục 5) — cần môi trường có nginx; dev server không có `version.json`. Build lệnh: `docker build --build-arg PREV_IMAGE=<registry>/eloria-admin:<tag-trước> …`.
2. **Khai `VITE_STORE_URL`** ở compose production (đang đặt `https://eloria.com.vn`; không khai ⇒ lùi về `https://<VITE_STORE_WEBSITE>`).
3. Ảnh thật cho SP/danh mục + chụp admin ↔ web cạnh nhau trước ngày release.
4. Chốt hướng xử lý BE35–BE37 (PLAN mục B) với backend.
5. Router hiện **không code-split** (không `lazy`) nên `vite:preloadError` hầu như không bắn — vẫn giữ như PLAN; cơ chế popup mới là lớp chính.
