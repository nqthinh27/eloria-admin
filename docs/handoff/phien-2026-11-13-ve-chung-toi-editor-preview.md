# Bàn giao phiên 2026-11-13 — Nội dung / Về chúng tôi · editor mở rộng · Xem trước

> **Nhánh:** `develop` · 1 commit (cùng đợt với backend P15.2 và storefront)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` ✅
> **Đã kiểm chứng bằng gì:** API thật dev (`superadmin`, OTP Zalo) — 16/16 ca admin `/about-page` PASS, bảng đo ở
> `35.3.eloria-client/docs/backend/noi-dung.md`. ⚠️ **Màn admin CHƯA mở trên trình duyệt** (đăng nhập cần OTP mỗi lần) —
> UI mới chỉ qua build + lint; user đã tự dùng màn này (đã upload 5 ảnh thật và thấy khung Xem trước điện thoại).

## Phần 1 — Màn Nội dung / Về chúng tôi (`/about-page`, SUPER_ADMIN)

### File mới / đổi
| File | Đổi gì |
|---|---|
| `src/pages/content/AboutUsPage.tsx` (mới) | Form sửa trực tiếp: 5 ô ảnh `ABOUT_STRIP` (chọn là lưu ngay, mũi tên đổi chỗ), cảnh báo số ảnh chẵn, xem trước dải ảnh; tiêu đề · dòng giới thiệu · nội dung (editor) · SEO; thanh Lưu ghim đáy; nút Xem trước + Xem trên web |
| `src/api/cms.ts`, `src/types/cms.ts` | `aboutPageApi` (get/update/uploadImage/deleteImage/updateImageOrder) + type `AboutPage`, `AboutPagePayload` |
| `src/Router.tsx`, `src/config/menu.ts` | route `about-page` (RoleRoute SUPER_ADMIN), menu Nội dung / Về chúng tôi (icon Info) |
| `src/lib/image-spec.ts` | spec `ABOUT_STRIP` 3:4 (1200×1600, min 750×1000, 15MB); `resolveImageSrc` nhận thư mục `/about/` |
| `src/i18n/locales/{vi,en}/aboutPage.ts` (mới), `menu.ts`, `errors.ts`, `image.ts`, `i18n/index.ts` | chuỗi màn mới, subKey `error.aboutPage.imageSlotInvalid/imageOrderInvalid`, giải thích khung ảnh |

## Phần 2 — Editor CMS mở rộng (dùng chung bài viết)

| File | Đổi gì |
|---|---|
| `src/pages/content/components/cms-extensions.ts` (mới) | Extension tự viết (không thêm gói): global attribute ghi **class** `align-*` (p/heading/image), `img-sm/md`, `cms-button` (link), `cms-table-bordered` (table) + lệnh `setTextAlign/setImageSize/setLinkButton/setTableBordered` |
| `rich-text-editor.tsx` | Nút căn trái/giữa/phải/đều · kiểu nút cho liên kết · menu cỡ ảnh · menu bảng (chèn 1×2…3×3, thêm/xoá hàng cột, gộp/tách ô, bật/tắt viền, xoá bảng) |
| `package.json` | **+ `@tiptap/extension-table@^3.32.0`** (cùng bản core) |
| `src/index.css` | CSS `.cms-prose` cho class mới; bảng không viền vẫn kẻ đứt nét mờ khi soạn |

## Phần 3 — Xem trước (Về chúng tôi + bài viết)

| File | Đổi gì |
|---|---|
| `components/store-preview.tsx` (mới) | `StorePreviewDialog` (nút Máy tính/Điện thoại) · `AboutPreview` (dải ảnh rơi + hover; khung điện thoại "xòe lá bài" kéo/chấm để đổi) · `PostPreview` |
| `src/lib/cms-html.ts` | `toPreviewHtml`: bỏ `style`/`colgroup` như backend sẽ bỏ khi lưu |
| `post-form-dialog.tsx` | Nút Xem trước nội dung **đang soạn** (kể cả ảnh bìa chưa tải lên) |
| `post-preview-dialog.tsx` | Xem trước từ danh sách bài đổi sang cùng khung mô phỏng |
| `src/index.css` | Token `--store-*` + khối `.store-preview` (bản sao `.prose-content`/`.about-strip` của storefront, container query) |
| `i18n/{vi,en}/common.ts` | `storePreview.*` |

### Quyết định kỹ thuật đáng nhớ
1. **Căn lề/cỡ ảnh/nút ghi bằng `class`, không `style`** — backend sanitizer chỉ nhận class giá trị cố định; dùng TextAlign chính
   hãng sẽ ghi `style` và bị xoá khi lưu ⇒ tự viết extension nhỏ thay vì thêm gói.
2. **Bảng tắt kéo đổi độ rộng cột** (`resizable: false`) — độ rộng ghi bằng `style` mà backend xoá ⇒ web luôn chia đều cột.
3. **Xem trước là mô phỏng**, không gọi storefront: storefront chỉ render dữ liệu đã lưu, còn render HTML chưa sanitize từ admin
   sang web sẽ mở lỗ XSS. Cái giá: phải giữ `.store-preview` khớp tay với CSS storefront (đã ghi chú ở cả 2 nơi).
4. **Container query** cho khung xem trước để chế độ Điện thoại dựng đúng bố cục <640px trong cửa sổ admin rộng.
5. Ảnh đầu trang upload/xoá/đổi chỗ **lưu ngay** (giống ảnh sản phẩm khi sửa), tách khỏi nút Lưu nội dung chữ.

### Giả định tôi tự quyết
- Tối đa 5 ô ảnh; web hiện 1/3/5 (1 ảnh vẫn hiện, không bắt buộc ≥3).
- Khung ảnh 3:4 cho mọi ảnh đầu trang.
- Menu bảng chèn nhanh 5 cỡ (1×2, 1×3, 1×4, 2×2, 3×3), không có hộp nhập số hàng/cột.
- Không có ô alt riêng cho ảnh đầu trang (storefront sinh alt từ tiêu đề trang).

### Kiểm chứng
- API thật: 16/16 ca admin (GET/PUT/sanitizer/upload/xoá/đổi chỗ/slot sai/file giả/xoá file trên đĩa) — dữ liệu test đã dọn.
- UI: chưa tự mở trên trình duyệt (OTP); khung Xem trước chưa tự kiểm — chỉ build/lint.

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | Mở màn `/about-page` + 2 nút Xem trước trên trình duyệt thật, kiểm editor bảng/căn lề/nút | Nên làm |
| 2 | Chưa đo ADMIN/STAFF gọi `/about-page` ⇒ 403 | Thấp |
