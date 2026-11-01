# Bàn giao phiên 2026-10-31 — Video cho sản phẩm/banner/danh mục + đồng bộ image-spec 2:3 (IMG-4)

> **Nhánh:** `develop` · **0 commit** (chưa commit — theo yêu cầu phiên điều phối)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` ✓ (warning CSS `:has(:is())` có sẵn từ trước)
> **Đã kiểm chứng bằng gì:** 2026-10-31 chỉ logic client (không BE). **2026-11-01: UI thật + BE local thật**
> (`localhost:8080`, `superadmin` SUPER_ADMIN, OTP Zalo do PO cấp) — upload video thật qua UI 3 màn, xem chi tiết ở
> "Kiểm chứng UI thật 2026-11-01".

## ⚠️ ĐỌC TRƯỚC — dữ liệu test cần dọn sau (giữ lại để phiên CLIENT kiểm storefront)
| Loại | Bản ghi | Đã làm | Dọn thế nào |
|---|---|---|---|
| Banner HOME_HERO | id `23776577-8845-4d94-a3fe-380fd8dafa31`, tiêu đề "TEST video hero 2026-11-01", active, sortOrder 0 | **tạo mới**, `imageUrl` = `/banner/b4415dc2-cc40-4163-a424-a03c5ec70cfc.mp4` (2560×1440 H.264) | xoá banner |
| Sản phẩm | `P7COST01` · id `ef6d5564-f001-4e8f-be26-f6e4e0b6ab20` · slug `test-gia-von-p7` (sản phẩm test có sẵn, trước đó **không có ảnh**, không gán danh mục) | slot 1 = `/product/79ec8290-….mp4` (720×1280), slot 2 = `/product/1980f3e5-….jpg`, slot 3 = `/product/0473fc16-….mp4` | xoá slot 3→2→1 |
| Danh mục gốc | **Váy đầm** · id `ec390bf2-f8e3-48b5-99a4-68420644dcee` · slug `vay-dam` (level 0) | `imageLink1` **thay** ảnh demo cũ `/category/a832c892-9741-47ee-8075-8e81baa6d2d4.jpeg` (file cũ đã bị BE xoá) bằng `/category/d442bf6c-2055-42ff-bb0f-6a399d3bb4ed.mp4`; `coverLink1` (trước trống) = `/category/8256e2ff-637e-4c53-a7a4-f6022732472d.mp4` | upload lại ảnh tile từ `Anh-SP-demo/`, gỡ cover 1 |

### Dữ liệu mock "Sản phẩm liên quan" (2026-11-01, PO duyệt)
15 sản phẩm **ACTIVE** để storefront có khối liên quan (BE `/related` = cùng danh mục lá gán trực tiếp). Tạo qua đúng
API admin mà UI dùng (`POST /product` → `POST /product/{id}/generate-sku` → `POST /product/{id}/images`, SUPER_ADMIN),
không đụng DB. Đánh dấu để dọn: **mã `MK01`–`MK15`**, `metadata = "MOCK-RELATED-2026-11-01"`,
`shortDescription` kết thúc "— hàng mock liên quan (dọn sau)". Mỗi SP: 2 màu × 3 size = 6 SKU, 2 ảnh từ `Anh-SP-demo/sp`
(ảnh vuông/ngang, lệch chuẩn 2:3), giới tính nữ, giá vốn = 45 % giá.

| Danh mục lá | Mã · slug |
|---|---|
| Áo len (`AO-LE`) | MK01 `ao-len-det-kim-hoa-tiet-hinh-hoc` · MK02 `ao-len-cardigan-vien-soc` · MK03 `ao-len-co-tim-mong` |
| Áo sơ mi (`AO-SM`) | MK04 `ao-so-mi-trang-co-tau` · MK05 `ao-so-mi-denim-tay-dai` · MK06 `ao-kieu-ke-soc-tay-bong` |
| Quần âu (`QU-AU`) | MK07 `quan-au-ong-suong-cap-cao` · MK08 `quan-au-ong-con-cong-so` · MK09 `quan-au-ong-rong-xep-ly` |
| Quần jeans (`QU-JE`) | MK10 `quan-jeans-skinny-cap-cao` · MK11 `quan-jeans-baggy-wash-nhat` · MK12 `quan-jeans-ong-loe` |
| Đầm công sở (`VAY-CS`) | MK13 `dam-cham-bi-co-so-mi` · MK14 `dam-ren-trang-tay-loe` · MK15 `dam-suong-cong-so-co-tron` |

- Kiểm: `/related` của cả 5 SP seed (`ao-so-mi-linen-trang-basic`, `ao-len-co-lo-det-kim`, `quan-au-ong-dung`,
  `quan-jeans-ong-suong`, `dam-cong-so-tay-lo`) đều trả **3 SP** đúng danh mục.
- ⚠️ **Chưa có tồn kho** ⇒ mọi SKU `inStock: false` (PDP có bộ chọn size nhưng hết hàng). Muốn mua thử phải nhập kho.
- Dọn: `DELETE /product/{id}` (xoá mềm, SKU theo) cho MK01–MK15 — lọc `keyword: "MK"` ở màn Sản phẩm.

## Phần 1 — Video (handoff BE `35.1.eloria-backend/docs/api/fe-handoff-media-video.md`)

### File mới / đổi
| File | Đổi gì |
|---|---|
| `src/lib/image-spec.ts` | `BACKEND_VIDEO_MIME`, `IMAGE_ACCEPT`, `MEDIA_ACCEPT`, `isVideoUrl`, `isVideoFile`, `inspectMediaFile(file, spec, {allowVideo})`, `measureVideoUrl`, `measureMediaUrl`; issue mới `formatMedia` (chặn) · `videoUnplayable` (cảnh báo) |
| `src/components/image/media-view.tsx` (mới) | `<video muted loop playsInline autoPlay preload="metadata">` khi là video, còn lại `<img>` |
| `clickable-image.tsx` · `image-lightbox.tsx` · `image-frame-preview.tsx` · `hover-swap-preview.tsx` · `cover-slides-preview.tsx` | thay `<img>` bằng `MediaView`; prop `video`/`isVideo` cho blob URL; lightbox video có `controls` |
| `image-upload-field.tsx` | prop `allowVideo` (mặc định `false`) ⇒ `accept`, kiểm tra, xem trước, đo kích thước video đã lưu |
| `image-spec-hint.tsx` | prop `allowVideo` ⇒ thêm dòng gợi ý MP4 H.264 |
| `banner-form-dialog.tsx` · `category-form-dialog.tsx` | bật `allowVideo` |
| `product-detail-modal.tsx` | `MEDIA_ACCEPT` + `inspectMediaFile(…, {allowVideo: true})`, hint video, lưới ảnh 2:3 |
| `ProductListPage.tsx` | thẻ sản phẩm dùng `MediaView` |
| `i18n/locales/{vi,en}/image.ts` · `errors.ts` | chuỗi mới; `error.file.typeNotAllowed`/`tooLarge` nhắc video |
| `docs/backend/san-pham.md` · `noi-dung-cms.md` | ghi hợp đồng video |

### Quyết định kỹ thuật
1. **Nhận biết video theo đuôi** (`/\.(mp4|webm|mov)$/i`) như BE chốt; chạy được cả trên URL đã qua `resolveImageSrc`
   (`…?imageUrl=%2Fproduct%2Fx.mp4` vẫn kết thúc bằng đuôi). Blob URL của file chờ gửi không có đuôi ⇒ truyền cờ
   `video` từ `isVideoFile(file)`.
2. **Kích thước video: đọc `videoWidth/videoHeight`** (chỉ tải metadata, timeout 10 s) rồi chấm min + tỉ lệ như ảnh
   (đều chỉ cảnh báo). Lý do: gần như không tốn code hơn bỏ qua, mà người nhập vẫn thấy video lệch tỉ lệ bị cắt.
3. **Trình duyệt không đọc được video** (thường MOV HEVC trên Chrome) ⇒ **cảnh báo mềm**, vẫn cho lưu (BE không kiểm
   codec; Safari vẫn phát được). Quá 15MB chặn **trước** khi giải mã.
4. Ô avatar/thương hiệu/bài viết không đổi (`allowVideo` mặc định `false`); chọn video ở đó ⇒ chặn với thông báo cũ.

### Giả định tôi tự quyết
- Nhãn nút vẫn "Tải ảnh lên"/"Đổi ảnh"; khả năng nhận video báo qua dòng gợi ý dưới ô — đổi nhãn nếu PO muốn.
- Video ở bảng/thẻ/xem trước tự phát không tiếng (giống storefront); lightbox thêm thanh điều khiển.
- Thẻ trong `ProductListPage` giữ khung vuông (bố cục admin, không phải khung storefront).

## Phần 2 — Đồng bộ image-spec IMG-4 (`35.3.eloria-client/docs/image-spec.md`)
- `PRODUCT` 2:3 · 1600×2400 · min 1000×1500; `CATEGORY_TILE` 2:3 · 800×1200 · min 480×720.
- `HOME_HERO`: `safeZone` 560×1200, `mobile` = 9:19,5 (hero mobile cao 100svh) ⇒ khung xem trước mobile cao, "còn ~22 %";
  câu "Vì sao?" của hero sửa theo (VI + EN).
- Lưới ảnh chi tiết sản phẩm `aspect-[2/3]`; chú thích `types/product.ts`.
- Repo **không có test runner** (CLAUDE.md) ⇒ không có test snapshot để sửa; số liệu đã kiểm bằng chạy module trong trình duyệt.

### Kiểm chứng
- `inspectMediaFile`: webm 400×600 ⇒ `warn belowMin`; 16MB `.mp4` ⇒ chặn `tooLarge`; `.avi` ⇒ chặn `formatMedia`;
  video vào `LOGO_SQUARE` ⇒ chặn `format`; MOV hỏng ⇒ `warn videoUnplayable`. `isVideoUrl` đúng với `.MP4`, URL `/image?…mov`.
- Render: ô sản phẩm `accept` có video, thumbnail video 2:3 tự phát; ô logo `accept` chỉ ảnh; khung hero hiện vùng an toàn
  + khung mobile cao.
- **Chưa:** Safari/iOS.

### Kiểm chứng UI thật 2026-11-01 (BE local, SUPER_ADMIN)
Video lấy từ `Anh-SP-demo/video` (H.264, 3,7MB 720×1280 và 6,6MB 2560×1440) + 1 file 17MB; nạp vào input file qua
DataTransfer (trình duyệt nội bộ không có hộp chọn file).
1. Banner: file 17MB ⇒ toast "File nặng 16,5 MB, vượt mức tối đa 15 MB", không request. Tạo banner mới + video ⇒
   `POST /banner` 200 + `POST /banner/{id}/image` 200; bảng hiện `<video>` phát (readyState 4, 2560×1440).
2. Sản phẩm: 17MB bị chặn; lượt [mp4, jpg, mp4] ⇒ `POST /product/{id}/images` 200, 3 slot lưu đúng thứ tự, video phát
   ở lưới + ô hover-swap (khung 2:3).
3. Danh mục: tile 1 + ảnh bìa 1 ở hộp sửa ⇒ upload ngay, video phát ở form, bảng, chi tiết.
4. Thương hiệu (Thêm) + Avatar (Tài khoản của tôi): `accept` chỉ ảnh; nạp mp4 ⇒ chặn phía client ("Định dạng không
   được hỗ trợ…" / "Chỉ chấp nhận ảnh jpg, png hoặc webp."), không request.
- Không thử 400/413 phía server qua UI (client chặn trước) — BE đã đo ở handoff của BE.
- Sửa thêm: chuỗi gợi ý tab Ảnh sản phẩm (`product.images.hint` VI/EN) nhắc cả video.

## Phần 3 — Sửa theo review (2026-11-01, PO duyệt finding #1 #2 #3 #4 #5 #7; bỏ #6 #8 #9)
| # | Sửa | File |
|---|---|---|
| 1·2·4 | **Sửa gốc**: file chờ gửi dùng `mediaPreviewSrc(blobUrl, file)` = blob + `#.mp4`/`#.webm`/`#.mov` khi là video ⇒ `isVideoUrl` nhận đúng ở **mọi** khung (ô upload, hover-swap, slideshow ảnh bìa, lightbox). Bỏ hẳn cờ truyền tay: prop `video` của `MediaView`/`ClickableImage`/`ImageFramePreview`, `isVideo` của `ImageLightbox`, tham số thứ 3 của `measureMediaUrl`. Revoke vẫn bằng blob URL gốc | `image-spec.ts` · `image-upload-field.tsx` · `category-form-dialog.tsx` (stagedUrls) · các component ảnh |
| 3 | `MediaView` có `autoPlay` (mặc định **tắt**): không tự phát thì `preload="metadata"` (khung đầu), rê chuột phát / rời chuột dừng; đổi `autoPlay` sau khi tải ⇒ `play()`/`pause()` qua effect. Tự phát chỉ ở: lightbox, khung "Xem đúng khung", ảnh 1 của hover-swap, **slide đang tới lượt** của slideshow (slide ẩn dừng) | `media-view.tsx` · `image-lightbox.tsx` · `image-frame-preview.tsx` · `hover-swap-preview.tsx` · `cover-slides-preview.tsx` |
| 5 | `measureVideoUrl`: signal đã huỷ ⇒ trả `null` ngay, không tải metadata | `image-spec.ts` |
| 7 | `isVideoUrl` tìm đuôi theo thứ tự: fragment đúng dạng `#.mp4` (dấu của `mediaPreviewSrc`) → đường dẫn đã bỏ `?query`/`#fragment` → tham số `imageUrl` của `/image?imageUrl=` (URL `resolveImageSrc`) | `image-spec.ts` |

**Quyết định:** chọn gắn fragment thay vì cặp `{url, isVideo}` vì mọi chỗ đang truyền `string[]` (gallery lightbox,
`coverLinks`) — fragment đi theo chuỗi, không phải đổi kiểu ở từng tầng; `<video>` bỏ qua fragment lạ (`#t=` mới là media fragment).

**Kiểm chứng (2026-11-01, dev server + BE 8080, `superadmin`, phiên còn hạn — không cần OTP):**
- `isVideoUrl` 14 ca (blob `#.mp4`/`#.MOV`, blob trơn, `#t=1`, `/product/a.mp4`, `?v=2`, `#t=3`, `x.jpg?f=a.mp4`,
  `/image?imageUrl=…mp4|jpeg|mov&w=1`, `x.mp4.jpg`, rỗng) đều đúng; `mediaPreviewSrc` ra `#.mov`/`#.webm`/không đổi với ảnh;
  `measureVideoUrl` với signal đã huỷ ⇒ `null` trong 0 ms. Chạy module trong trình duyệt (repo không có test runner).
- **Thêm danh mục mới**, chưa lưu: tile 1 = mp4, tile 2 = jpg, bìa 1 = mp4, bìa 2 = jpg ⇒ 4 `<video>` src `blob:…#.mp4` đều giải
  mã được (720/2560 px), không còn `<img>` vỡ. Ô upload: dừng, rê chuột phát, rời chuột dừng. Hover-swap ảnh 1: tự phát.
  Slideshow: slide video phát khi tới lượt, dừng khi chuyển sang jpg. Lightbox từ hover-swap và từ slideshow: `<video controls>`
  đang phát, `→` sang jpg hiện `<img>` đúng. **Không bấm Lưu** (không tạo dữ liệu).
- Bảng danh mục: thumbnail video Váy đầm `paused`, `preload=metadata`.
- Chưa kiểm: thẻ video ở màn Sản phẩm (P7COST01 không nằm trang 1) — cùng `MediaView` mặc định; Safari/iOS.
- Cổng: lint 0 lỗi (5 warning shadcn) · build ✓.

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | Dọn dữ liệu test (bảng đầu file) sau khi phiên CLIENT kiểm xong | Cao |
| 4 | Thông báo vấn đề kích thước/tỉ lệ vẫn bắt đầu bằng "Ảnh …" kể cả với video — chấp nhận được, đổi nếu PO muốn | Thấp |
| 2 | PLAN.md mục Phase 22 (dòng 3091+, 3223, 3318…) còn ghi 4:5 / hero mobile 4:5 — mô tả lịch sử phase đã đóng, chưa sửa | Thấp |
| 3 | Rate limit `/image` 120/phút/IP dùng chung cho video (Range) — trang danh sách nhiều video có thể chạm trần | Theo dõi |
