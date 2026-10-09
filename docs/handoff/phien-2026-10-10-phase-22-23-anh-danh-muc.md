# Bàn giao phiên 2026-10-10 — Phase 22 (chuẩn ảnh) + Phase 23 (ảnh danh mục · danh mục mặc định)

> **Nhánh:** `develop` · **chưa commit** (user chưa yêu cầu)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` sạch (cảnh báo CSS `grid-cols-[1fr_auto]:has(:is())` là của `card.tsx`, có từ trước).
> **Đã kiểm chứng bằng gì:** **UI thật** (Chrome, `superadmin` trên dev local, backend `localhost:8080` đã có P13.1) + **API thật** (curl/fetch cùng tài khoản). **Chưa** kiểm bằng ảnh chụp đặt cạnh storefront (xem "Chưa nhìn tận mắt").
> **Nguồn:** [`35.1.eloria-backend/docs/api/fe-handoff-phase13_1-admin.md`](../../../35.1.eloria-backend/docs/api/fe-handoff-phase13_1-admin.md) · `35.3.eloria-client/docs/image-spec.md`.

## ⚠️ ĐỌC TRƯỚC

1. **Backend KHÔNG có endpoint upload ảnh cho danh mục/thương hiệu** (chỉ `POST /product/{id}/images` + avatar nhân viên; `FileService` chỉ có `uploadAvatar`/`uploadProductImage`). PLAN Phase 22 mục 5 viết "dùng endpoint upload đã có cho `brand.logoUrl`, `category.imageUrl`" — **sai**. Hai trường này chỉ nhận **chuỗi link**. ⇒ Ô ảnh danh mục/thương hiệu là **ô nhập link**, không phải ô upload file. Đã đăng ký **BE31** và soạn [yêu cầu gửi backend](../backend-request-category-brand-media.md) (BE31–BE34).
2. **Phase 22 chưa đóng hoàn toàn** — xem bảng "Việc còn lại".

## Phần 1 — Phase 22: chuẩn ảnh CMS (làm trước theo thứ tự PLAN, user chọn)

### File mới
| File | Vai trò |
|---|---|
| `src/lib/image-spec.ts` | `IMAGE_SPEC` (7 mã, chép từ `image-spec.md` §2–§3), `evaluateImage` (hàm thuần, chấm theo §5), `inspectImageFile` (`createImageBitmap`), `measureImageUrl`, `resolveImageSrc`, `issueKey`, `COVER_ROTATE_MS` |
| `src/components/image/image-spec-hint.tsx` | Dòng "Tỉ lệ · khuyến nghị · tối thiểu · định dạng ≤ dung lượng" + popover "Vì sao?" |
| `src/components/image/image-frame-preview.tsx` | Xem trước đúng khung (desktop + mobile cho spec full-bleed), overlay vùng an toàn |
| `src/components/image/image-link-field.tsx` | Ô nhập **link** + đo kích thước/tỉ lệ + thumbnail + popover xem khung (thay vai `ImageUploadField` trong PLAN — xem quyết định 1) |
| `src/components/image/image-issue-list.tsx` | Hiển thị vấn đề ảnh (đỏ = chặn, vàng = cảnh báo) |
| `src/components/image/hover-swap-preview.tsx` · `cover-slides-preview.tsx` | Xem trước hover (CSS) · slideshow 4 giây (`setInterval`, tạm dừng, `prefers-reduced-motion`) |
| `src/i18n/locales/{vi,en}/image.ts` + đăng ký ở `src/i18n/index.ts` | Namespace `image`; **không nhúng số vào chuỗi dịch** |

### Gắn vào màn đã có
| Màn | Đổi gì |
|---|---|
| Sản phẩm — tab Ảnh (`product-detail-modal.tsx`) | Kiểm file **trước khi gửi** theo `PRODUCT` (sai định dạng / >2 MB / dưới 1000×1250 ⇒ chặn cả lượt, không request nào bay đi; lệch tỉ lệ ⇒ toast cảnh báo, vẫn lưu). Hint dưới nút upload; chú thích từng slot (1 = mặc định · 2 = rê chuột · 3–10 = chỉ trang chi tiết); `HoverSwapPreview` cặp 1–2; ô ảnh đổi `aspect-square` → 4:5 |
| Thương hiệu (`brand-form-dialog.tsx`) | `logoUrl` dùng `ImageLinkField` spec `LOGO_SQUARE`; logo dưới 256×256 ⇒ chặn lưu |
| Nhân viên | **Không làm**: form nhân viên không có ô ảnh nào (grep `type="file"` chỉ ra Sản phẩm) |

## Phần 2 — Phase 23: ảnh danh mục + danh mục mặc định

### File đổi
| File | Đổi gì |
|---|---|
| `src/types/product.ts` | `Category` + 9 field (`description`, `imageLink1/2`, `coverLink1..5`, `isDefault`); `imageUrl` đánh dấu deprecated; `CategorySearchReq.isDefault`; `CategoryPayload` mở rộng kèm ghi chú ngữ nghĩa |
| `src/api/product.ts` | `categoryApi.create/update` nhận `ApiRequestOptions` (để màn tự xử lý 409) |
| `category-form-dialog.tsx` | Khối "Hiển thị trên web bán hàng": mô tả, 2 ô tile + `HoverSwapPreview`, 5 ô cover + `CoverSlidesPreview` (vẽ tên + mô tả đè nửa trái), công tắc mặc định (báo trước "đang là mặc định: X"); chặn lưu khi ô ảnh `blocked`; popup xác nhận khi tắt mặc định của chính danh mục đang giữ cờ |
| `CategoryListPage.tsx` | Cột + badge "Mặc định", bộ lọc "Chỉ danh mục mặc định" (lọc client vì bảng đã nạp trọn cây), thumbnail `imageLink1 ?? imageUrl`, banner cảnh báo khi không có mặc định **đang hoạt động**, mục menu "Đặt làm mặc định", popup cảnh báo cho đường INACTIVE + XOÁ, toast "chuyển từ A sang B", xử lý 409 |
| `set-default-category-dialog.tsx` (mới) | Chọn nhanh danh mục làm mặc định từ banner |
| `category-detail-modal.tsx` | Thêm mặc định · mô tả · 2 tile · dải cover (chỉ đọc) |
| `src/i18n/locales/{vi,en}/product.ts` | Chuỗi mới cho danh mục + slot ảnh sản phẩm |

### Quyết định kỹ thuật đáng nhớ
1. **`ImageLinkField` thay `ImageUploadField`** — vì backend không có upload cho danh mục/thương hiệu (⚠️ trên). Cái giá: chỉ kiểm được **kích thước + tỉ lệ**, không biết dung lượng/định dạng (hiện ghi chú). Khi BE31 xong chỉ thay phần nhập bằng nút chọn file + `inspectImageFile`; hint/preview/issue giữ nguyên.
2. **Định dạng: chặn = ngoài allowlist backend (jpg/png/gif/webp); cột "định dạng" của spec chỉ cảnh báo mềm.** `image-spec.md` ghi sản phẩm "JPG · WebP", nhưng chặn PNG sẽ làm hỏng luồng upload hiện có mà không ai yêu cầu.
3. **Chỉ gửi `""` cho ô VỪA BỊ XOÁ**, ô vốn trống thì bỏ field. Đo thật: gửi `""` thì `description`/`coverLink*` lưu **`""`** (không về `null` như handoff nói; riêng `imageLink1` thì về `null`). Gửi `""` bừa sẽ biến mọi cột null thành chuỗi rỗng, storefront kiểm `null` có thể coi là "có ảnh".
4. **`parentId` luôn gửi cha hiện tại** (form nạp từ `category.parentId`); "Đặt làm mặc định" nhanh cũng gửi lại `code·name·parentId·sortOrder`, bỏ hẳn field nội dung ⇒ giữ nguyên. Đã đo: PUT 'đặt mặc định' không làm mất ảnh seed của "Áo".
5. **409 `error.dataIntegrity.violation` tự xử lý chỉ khi đang bật mặc định**: tắt toast mặc định (câu chung "đang được sử dụng ở nơi khác" sai ngữ cảnh) → toast `category.toast.defaultRace` + nạp lại. Lỗi khác vẫn `toastError` + ném lại.
6. **Banner "chưa có mặc định" tính theo mặc định ĐANG HOẠT ĐỘNG**: backend vẫn giữ cờ ở danh mục INACTIVE (chiếm chỗ unique) nhưng web chỉ dùng danh mục active ⇒ về mặt thực tế là 0 mặc định. Popup cũng hiện khi chuyển mặc định sang INACTIVE (PLAN yêu cầu).
7. **`resolveImageSrc`**: link tuyệt đối và đường dẫn gốc (`/media/...`, như dữ liệu seed) dùng nguyên văn; tên file tương đối đi qua `GET /image?imageUrl=` (giống ảnh sản phẩm).
8. `setDefaultRef` (ref cập nhật trong effect) cho menu dòng, vì `columns` memo theo `[t, canWrite]` sẽ giữ `currentDefault` cũ ⇒ toast nêu sai tên A.

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
- Phase 22 còn 2 câu chưa chốt với user → dùng **mặc định PLAN đề xuất**: ① lệch tỉ lệ **chỉ cảnh báo**, chỉ chặn sai định dạng/quá nặng/dưới min; ② **không** có nút "tự cắt về đúng tỉ lệ".
- Màn Nhân viên bỏ khỏi Phase 22 (không có ô ảnh).
- Lọc "mặc định" ở client thay vì gửi `isDefault` lên `search` (bảng đã nạp 200 dòng một lần; tiết kiệm request). API có hỗ trợ — chuyển sang server khi danh mục vượt trần.
- Desktop frame ghi nhãn "từ 768 px", mobile "390 px" (tài liệu §3 chỉ xác định 2 khung).
- Vùng an toàn vẽ theo % của ảnh ở kích thước khuyến nghị — chính xác khi ảnh đúng tỉ lệ, xấp xỉ khi lệch.

### Kiểm chứng
**Đã chạy thật (UI + API, `superadmin`):**
- Sửa "Áo sơ mi" (cấp 1): nhập link ảnh thật → đo đúng `800×1000` / `2520×560`; ảnh `300×375` → **chặn** (đỏ) + nút Lưu mờ + thông báo; ảnh `1600×1000` cho cover → **chặn dưới min** + **cảnh báo cắt ~64 % chiều cao**; xem trước hover và slideshow chạy; cover thủng lỗ (1·3·4) → preview "Ảnh 1/3", lưu rồi đọc lại đúng, **`parentId`/level giữ nguyên**.
- ① Đặt A→B: **1 request PUT** + 1 search, **không popup**, toast `Đã chuyển danh mục mặc định từ "Áo" sang "Áo sơ mi"`, bảng đúng **1** badge (đối chiếu `search {isDefault:true}` = `['AO-SM']`).
- ② Tắt mặc định qua form: popup hiện; **Huỷ** ⇒ DB vẫn `['AO-SM']`; **Vẫn tiếp tục** ⇒ 0 badge + banner cảnh báo; banner → dialog chọn "Áo" → khôi phục `['AO']`, ảnh seed của Áo còn nguyên (`YYY-Y`).
- Detail modal Áo hiển thị mặc định · mô tả · tile · cover.

**CHƯA nhìn tận mắt / chưa đo:**
- Popup cho đường **chuyển INACTIVE** và **XOÁ** danh mục mặc định: cùng pattern, đã build/lint nhưng chưa bấm thật (tránh phá dữ liệu seed).
- **409 race 2 tab**: không dựng được 2 phiên đồng thời; logic chỉ review mã.
- Upload file sản phẩm (chặn <1000×1250 / >2 MB / sai định dạng, và "không request nào bay đi"): tool trình duyệt không chọn file; chỉ kiểm bằng `evaluateImage` thuần + build.
- Ảnh seed `/media/cat/*.webp` **404 trên admin** (file thuộc storefront) ⇒ detail modal hiện icon ảnh vỡ; không phải lỗi mã.
- **Chưa** so ảnh chụp admin ↔ storefront cùng thời điểm đổi ảnh (DoD Phase 23); **chưa** kiểm "khối ngang Trang chủ biến mất thật" bên client.
- **Chưa có unit test `IMAGE_SPEC`** (DoD Phase 22): repo không có test runner, thêm phải hỏi user (CONVENTIONS mục 8).

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | **BE31** — xin backend endpoint upload ảnh cho danh mục (`image1/2`, `cover1..5`) và thương hiệu (logo); khi có thì đổi `ImageLinkField` sang chế độ upload | 🟠 Chặn nửa sau Phase 22/23 |
| 2 | Thêm test runner (Vitest) để khoá `IMAGE_SPEC` theo snapshot `image-spec.md`? | 🟡 Cần user duyệt dependency |
| 3 | Chốt 2 điều Phase 22 (chặn/cảnh báo lệch tỉ lệ · nút tự cắt) — đang dùng đề xuất | 🟡 |
| 4 | Chốt **định dạng giá trị** lưu ở `imageLink*` (URL tuyệt đối / `/media/...` của storefront / tên file qua `/image`) — ảnh hưởng xem trước | 🟡 Hỏi backend/PO |
| 5 | Chụp so sánh admin ↔ storefront + kiểm cặp INACTIVE/XOÁ/race khi có môi trường | 🟡 |
| 6 | Backend không nhất quán: `""` → `null` ở `imageLink1` nhưng giữ `""` ở `coverLink*`/`description` (handoff nói cột về null) | 🟢 Báo backend nếu storefront coi `""` ≠ `null` |

## Dữ liệu test còn sót
- Danh mục **AO-SM**: `coverLink1..5` và `description` đang là **`""`** thay vì `null` như ban đầu (không đưa về `null` được qua API). `imageLink1/2`, `isDefault` đã về như cũ. Danh mục mặc định về lại **AO**.
- Ảnh test tạm `public/__test/` và dev server đã dọn/tắt.
