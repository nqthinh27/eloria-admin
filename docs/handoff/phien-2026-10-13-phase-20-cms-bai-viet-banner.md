# Bàn giao phiên 2026-10-13 — Phase 20 (R2): màn Bài viết + Banner

> ℹ️ **Cập nhật sau backend P15.1 (2026-10-13):** loại `PAGE` + cơ chế *trang bảo vệ* đã bị backend bỏ (trang tĩnh viết cứng ở storefront), `slug` thành tuỳ chọn (tạo: backend sinh từ tiêu đề · sửa: để trống = giữ). Các chỗ dưới đây đã sửa theo; form không còn ô slug khi tạo mới.

> **Nhánh:** `develop` · **chưa commit** (user chưa yêu cầu)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` sạch (cảnh báo CSS `:has(:is())` có sẵn từ trước).
> **Đã kiểm chứng bằng gì:** API thật `localhost:8080` bằng `superadmin` (curl: sort, tạo/sửa/xoá banner, đọc/xoá bài) + UI thật trên Vite dev (danh sách, form sửa, tạo bài nháp, gợi ý sản phẩm, hẹn giờ).
> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase15-admin.md` + `docs/decisions/phase-15-content-cms.md`.

## Phần 1 — Màn CMS

### File mới / đổi
| File | Đổi gì |
|---|---|
| `src/types/cms.ts` · `src/api/cms.ts` | DTO + `postApi`/`bannerApi` (đồng bộ từ source Java, không bịa field) |
| `src/pages/content/PostListPage.tsx` + `components/post-*.tsx` | bảng, form, dialog đổi trạng thái, xem trước |
| `src/pages/content/BannerListPage.tsx` + `components/banner-*.tsx` | bảng, form, cảnh báo "không còn banner hiển thị" |
| `components/rich-text-editor.tsx` | TipTap, đúng bộ thẻ whitelist backend, chèn ảnh qua upload |
| `src/lib/cms-html.ts` | đổi `src` ảnh `/post/x` ⇄ `/image?imageUrl=` (lưu ⇄ hiển thị), `slugify`, `isAllowedHref` |
| `src/lib/image-spec.ts` | `resolveImageSrc` nhận thêm `/post/` · `/banner/` |
| `Router.tsx` · `config/menu.ts` · i18n `post`/`banner` (vi+en) · `errors.ts` | route `/posts` `/banners` (SUPER_ADMIN), menu, subKey `error.post.*`/`error.banner.*` |
| `index.css` | `.cms-prose` (bộ thẻ whitelist) |
| `package.json` | + `@tiptap/react` `pm` `starter-kit` `extension-image` `extensions` (user đã duyệt 2026-10-13) |

### Quyết định kỹ thuật
1. **Xem trước trong admin** (D5), không mở storefront: storefront chỉ trả PUBLISHED. Render HTML đã sanitize bằng `.cms-prose`.
2. **Trạng thái không nằm trong form soạn**: bài mới luôn DRAFT; đổi trạng thái ở `PostStatusDialog` (nạp chi tiết để biết đã có nội dung chưa — chặn Đăng/Hẹn giờ khi chưa có). Cái giá: một lần gọi `GET /post/{id}` khi mở dialog.
3. **Banner `PUT` là thay toàn bộ** (đo thật): bỏ trống ⇒ null, `ctaUrl:""` ⇒ **400** ⇒ form bỏ field thay vì gửi `""`. Không có `DELETE /banner/{id}/image` ⇒ ô ảnh chỉ thay, không gỡ.
4. **Sort mở** ở mọi field đã đo 200: post `title · type · postStatus · publishedAt · createdDate`, banner `title · sortOrder · effectiveFrom · status`. Banner mặc định sort `sortOrder ASC` (đúng thứ tự hero).
5. **Editor chặn dán/kéo-thả file + bỏ `<img>` trong HTML dán**; ảnh chỉ qua nút "Chèn ảnh" (upload `content-image`, `alt` bắt buộc, ghi width/height — backend có thể bỏ width/height khi sanitize, chưa kiểm).

### Giả định tôi tự quyết
- Giờ hẹn nhập theo **giờ máy** (`<input type="time">` 24h) rồi đổi ISO UTC.
- Hiệu lực banner: "từ" = 00:00:00, "đến hết ngày" = 23:59:59 giờ máy.
- Cảnh báo "không còn banner hiển thị" chỉ hiện khi không lọc; >1 trang thì dựa `activeTotal` (không biết ảnh/hiệu lực).
- Menu đặt chung nhóm "SẢN PHẨM & KHO".

### Kiểm chứng
- ✅ API thật: sort 14 field → 200; tạo/sửa/xoá banner; bài tạo → DRAFT, `productIds` lưu đúng, SCHEDULED nhận `publishedAt` UTC; slug tự sinh khớp.
- ✅ UI thật: danh sách (ảnh bìa tải qua `/image`), form sửa, tạo nháp, gợi ý sản phẩm, hẹn giờ + validation giờ trống.
- ✅ **Review 2026-10-13 (browser, superadmin/adminbranch)**: tạo bài + upload ảnh bìa, ảnh thân bài hiện qua `/image` và lưu lại giữ `/post/…`, publish/unpublish khớp storefront, nhãn hẹn giờ "Đã lên lịch" → "Đã đến giờ — đang xuất bản", banner upload + nhãn Chưa hiệu lực/Hết hạn, ADMIN → 403 menu + URL; staffone 403 ở API.
- ❌ **Chưa nhìn tận mắt**: nút "Chèn ảnh" qua hộp thoại, chèn link, slug trùng báo tại ô, STAFF trên UI, viewport 390/768, ảnh banner đúng khung ở web, DoD "nhập nội dung thật + biên bản" (R2 gate #4).

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | Kiểm tay nút "Chèn ảnh" + chèn link + slug trùng + STAFF trên UI | trung bình |
| 2 | "Xem trên web" cho bài: client **chưa có** route bài viết (`/tin-tuc/[slug]`) ⇒ chưa làm nút | trung bình — làm khi client có route |
| 3 | Biên bản nhập nội dung thật (R2 gate #4) | theo PLAN |
| 4 | Phase 20 mục 4 `customerNote` (R3, chờ BE P14) | chưa làm |

## Dữ liệu test còn sót
Không — bài `bai-thu-cms-dep` và banner "Banner thu CMS" đã xoá. Dữ liệu seed của backend (5 bài, 3 banner) giữ nguyên.
