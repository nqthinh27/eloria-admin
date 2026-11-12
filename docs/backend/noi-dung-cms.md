# Domain Nội dung CMS — bài viết · banner · trang "Về chúng tôi" (backend Phase 15 + 15.1 + 15.2)

## Trang "Về chúng tôi" — `/about-page` (P15.2, đo thật 2026-11-12, `superadmin`)

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase15_2.md`. Bảng **1 bản ghi** — không search/tạo/xoá. Route FE `/about-page`.

- `GET /about-page` ⇒ luôn có dữ liệu (backend tự tạo mặc định). `images` **luôn 5 phần tử** theo slot (null = trống) + `lastModifiedDate`.
- `PUT /about-page` `{title*, subtitle?, content?, metaTitle?, metaDescription?}` — `content` không gửi = giữ nguyên; `<`/`>` hoặc field lạ ⇒ 400 `error.input.invalid`.
- `POST /about-page/image/{slot}` (multipart `image`, chỉ ảnh, ≤15MB) · `DELETE /about-page/image/{slot}` · `PUT /about-page/image-order {order:[hoán vị 1..5]}` — đều trả bản ghi mới. Slot ngoài 1..5 ⇒ `error.aboutPage.imageSlotInvalid`; order sai ⇒ `error.aboutPage.imageOrderInvalid` (thiếu phần tử ⇒ `error.input.invalid`).
- Storefront chỉ hiện số ảnh **lẻ** (bỏ ô trống, số chẵn bỏ ảnh cuối) — FE admin cảnh báo + xem trước theo đúng luật này.
- Rich text (cả bài viết): backend nhận thêm bảng (`colspan/rowspan` 1–9) + class cố định `align-*` (p/h2–h4/img) · `img-sm|img-md` · `cms-button` (a) · `cms-table-bordered` (table) · `width/height` trên img; vẫn bỏ `style`/`colgroup`/class lạ.

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase15-admin.md` + `docs/decisions/phase-15-content-cms.md`
> (đo 2026-10-13). Phía FE: route `/posts`, `/banners` — **chỉ SUPER_ADMIN**, kể cả đọc (ADMIN/STAFF ⇒ 403).
> Types: `src/types/cms.ts` · service: `src/api/cms.ts`.

## Bài viết — `/post`
> **P15.1 (2026-10-13):** bỏ loại `PAGE` + cơ chế trang bảo vệ; `slug` tuỳ chọn (trống ⇒ tạo: sinh từ tiêu đề · sửa: giữ cũ). Trang tĩnh viết cứng ở storefront.
- `POST /post/search` body `{keyword?, type?, postStatus?}` (keyword lọc title/slug); dòng **không** có `content`.
  Sort 200 ở `title · slug · type · postStatus · publishedAt · createdDate · excerpt` (FE chỉ mở 5 cột đầu có cột).
- Sort `/post/search` chỉ nhận `title · slug · type · postStatus · publishedAt · createdDate · lastModifiedDate`; giá trị khác **bị bỏ qua** (mặc định `createdDate desc`, không còn 500). Keyword: `%` `_` hiểu theo nghĩa đen.
- `PUT /post/{id}`: thiếu `content` = giữ nguyên; xoá phải gửi `""` (không áp dụng khi PUBLISHED/SCHEDULED). `title/excerpt/metaTitle/metaDescription` không chứa `<` `>` (400) — FE validate trước.
- `GET /post/{id}` đủ `content` (đã sanitize), `productIds[]`, `createdBy`.
- `POST /post`, `PUT /post/{id}`: `{slug?, title*, excerpt?, content?, type* (NEWS/PRODUCT_STORY/BRAND_STORY/CAMPAIGN), metaTitle?, metaDescription?, productIds?[≤12]}`.
  **Không có** `coverUrl/status/postStatus/ogImage` (gửi ⇒ 400). Luôn tạo **DRAFT**. `productIds` bỏ trống = giữ, `[]` = gỡ hết.
  Slug `^[a-z0-9]+(-[a-z0-9]+)*$` ≤150; title ≤255; excerpt ≤500; metaTitle ≤255; metaDescription ≤500 (FE giới hạn 150/300 theo `SeoFields`).
- `POST /post/update-status` `{id, postStatus, publishedAt?}`; `SCHEDULED` bắt buộc `publishedAt` tương lai. Bài hiện ở web ngay khi tới `publishedAt`; **cron đầu mỗi giờ** mới đổi nhãn SCHEDULED → PUBLISHED (trễ tới 1 giờ). FE coi `SCHEDULED && publishedAt <= now` là "Đã đến giờ — đang xuất bản", không báo lệch.
- `DELETE /post/{id}` xoá hẳn + file.
- Ảnh: `POST|DELETE /post/{id}/cover` (field `cover`), `POST /post/content-image` (field `image`) trả `{url:"/post/<file>"}`; ≤2 MB, jpg/jpeg/png/gif/webp. **Cập nhật 2026-10-29:** trần lên **15 MB/ảnh** (cả ảnh bìa, ảnh nội dung và ảnh banner), timeout upload FE 10 phút — xem `san-pham.md` mục dung lượng.
- Hiển thị: `coverUrl` tương đối ⇒ `GET /image?imageUrl=` (`resolveImageSrc`).
- Sanitize khi lưu: h2–h4, p, ul/ol/li, a, strong/em, blockquote, img, hr, br; `img src` chỉ `/post/<file>`; `href` chỉ http(s)/mailto/tel//path/#anchor.
- Lỗi: `error.post.{slugExisted,notExisted,scheduleInvalid,productInvalid,statusTransitionInvalid}` · `error.file.typeNotAllowed`.

## Banner — `/banner`
- Ảnh banner `POST /banner/{id}/image` nhận thêm **video mp4/webm/mov ≤ 15MB** từ 2026-10-31 (xem `san-pham.md` mục Video).
- `POST /banner/search` `{keyword?, status?, position?}` + `activeTotal/inactiveTotal`. Sort chỉ nhận `title · position · sortOrder · status · effectiveFrom · effectiveTo · createdDate · lastModifiedDate` (giá trị khác bị bỏ qua). `title/subtitle/ctaLabel` không chứa `<` `>` (400) — FE validate trước.
- `POST /banner`, `PUT /banner/{id}`: `{position?, title*, subtitle?, ctaLabel?, ctaUrl?, sortOrder?, effectiveFrom?, effectiveTo?}`.
  ⚠️ **`PUT` thay toàn bộ** — field bỏ trống ⇒ null (`sortOrder` ⇒ 0). ⚠️ `ctaUrl:""` ⇒ **400** (phải bỏ field). `ctaUrl` chỉ `http(s)://…` hoặc `/path`.
  `position` v1 chỉ `HOME_HERO`. `effectiveFrom` phải trước `effectiveTo` (`error.banner.periodInvalid`).
- `POST /banner/update-status` `{id, status 0|1}` · `DELETE /banner/{id}` xoá mềm + file · `POST /banner/{id}/image` (field `image`). **Không có** `DELETE …/image`.
- Banner chưa có ảnh **không hiện** ở storefront dù ACTIVE. **Không có job**: backend chỉ lọc `effectiveFrom/To` lúc đọc, `status=1` vẫn giữ khi hết hạn ⇒ FE tự tính nhãn Chưa hiệu lực / Đang hiệu lực / Hết hạn, không coi `status=1` là đang hiển thị.
