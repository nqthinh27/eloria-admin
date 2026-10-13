# Domain Nội dung CMS — bài viết · banner (backend Phase 15 + 15.1)

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase15-admin.md` + `docs/decisions/phase-15-content-cms.md`
> (đo 2026-10-13). Phía FE: route `/posts`, `/banners` — **chỉ SUPER_ADMIN**, kể cả đọc (ADMIN/STAFF ⇒ 403).
> Types: `src/types/cms.ts` · service: `src/api/cms.ts`.

## Bài viết — `/post`
> **P15.1 (2026-10-13):** bỏ loại `PAGE` + cơ chế trang bảo vệ; `slug` tuỳ chọn (trống ⇒ tạo: sinh từ tiêu đề · sửa: giữ cũ). Trang tĩnh viết cứng ở storefront.
- `POST /post/search` body `{keyword?, type?, postStatus?}` (keyword lọc title/slug); dòng **không** có `content`.
  Sort 200 ở `title · slug · type · postStatus · publishedAt · createdDate · excerpt` (FE chỉ mở 5 cột đầu có cột).
- `GET /post/{id}` đủ `content` (đã sanitize), `productIds[]`, `createdBy`.
- `POST /post`, `PUT /post/{id}`: `{slug?, title*, excerpt?, content?, type* (NEWS/PRODUCT_STORY/BRAND_STORY/CAMPAIGN), metaTitle?, metaDescription?, productIds?[≤12]}`.
  **Không có** `coverUrl/status/postStatus/ogImage` (gửi ⇒ 400). Luôn tạo **DRAFT**. `productIds` bỏ trống = giữ, `[]` = gỡ hết.
  Slug `^[a-z0-9]+(-[a-z0-9]+)*$` ≤150; title ≤255; excerpt ≤500; metaTitle ≤255; metaDescription ≤500 (FE giới hạn 150/300 theo `SeoFields`).
- `POST /post/update-status` `{id, postStatus, publishedAt?}`; `SCHEDULED` bắt buộc `publishedAt` tương lai. Bài hiện ở web ngay khi tới `publishedAt`; **cron đầu mỗi giờ** mới đổi nhãn SCHEDULED → PUBLISHED (trễ tới 1 giờ). FE coi `SCHEDULED && publishedAt <= now` là "Đã đến giờ — đang xuất bản", không báo lệch.
- `DELETE /post/{id}` xoá hẳn + file.
- Ảnh: `POST|DELETE /post/{id}/cover` (field `cover`), `POST /post/content-image` (field `image`) trả `{url:"/post/<file>"}`; ≤2 MB, jpg/jpeg/png/gif/webp.
- Hiển thị: `coverUrl` tương đối ⇒ `GET /image?imageUrl=` (`resolveImageSrc`).
- Sanitize khi lưu: h2–h4, p, ul/ol/li, a, strong/em, blockquote, img, hr, br; `img src` chỉ `/post/<file>`; `href` chỉ http(s)/mailto/tel//path/#anchor.
- Lỗi: `error.post.{slugExisted,notExisted,scheduleInvalid,productInvalid,statusTransitionInvalid}` · `error.file.typeNotAllowed`.

## Banner — `/banner`
- `POST /banner/search` `{keyword?, status?, position?}` + `activeTotal/inactiveTotal`. Sort 200 ở `title · sortOrder · effectiveFrom · effectiveTo · status · createdDate · position`.
- `POST /banner`, `PUT /banner/{id}`: `{position?, title*, subtitle?, ctaLabel?, ctaUrl?, sortOrder?, effectiveFrom?, effectiveTo?}`.
  ⚠️ **`PUT` thay toàn bộ** — field bỏ trống ⇒ null (`sortOrder` ⇒ 0). ⚠️ `ctaUrl:""` ⇒ **400** (phải bỏ field). `ctaUrl` chỉ `http(s)://…` hoặc `/path`.
  `position` v1 chỉ `HOME_HERO`. `effectiveFrom` phải trước `effectiveTo` (`error.banner.periodInvalid`).
- `POST /banner/update-status` `{id, status 0|1}` · `DELETE /banner/{id}` xoá mềm + file · `POST /banner/{id}/image` (field `image`). **Không có** `DELETE …/image`.
- Banner chưa có ảnh **không hiện** ở storefront dù ACTIVE. **Không có job**: backend chỉ lọc `effectiveFrom/To` lúc đọc, `status=1` vẫn giữ khi hết hạn ⇒ FE tự tính nhãn Chưa hiệu lực / Đang hiệu lực / Hết hạn, không coi `status=1` là đang hiển thị.
