# Bàn giao phiên 2026-10-11 — Phase 22/23: nối backend P13.2/P13.3 (chỉ upload ảnh) + review UI

> **Nhánh:** `develop` · **0 commit mới** (toàn bộ còn ở working tree, trên commit `8962b8a feat: P22 23 - uncheck`)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` pass (cảnh báo CSS `Unexpected ")"` có sẵn từ trước)
> **Đã kiểm chứng bằng gì:** API thật (`superadmin`, `localhost:8080`, script Python) + UI thật qua Claude in Chrome
> (`superadmin`, dev `localhost:5173`, file ảnh tạo bằng canvas rồi gán vào `input[type=file]`). Chưa đăng nhập ADMIN/STAFF.

## Phần 1 — Nối backend (BE31 · BE32 · BE33 · BE34)

Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase13_2-admin.md`, `fe-handoff-phase13_3-admin.md`,
`docs/decisions/phase-13_2-…`, `phase-13_3-image-flows.md`. **P13.3 BREAKING:** body create/update có field ảnh ⇒ 400 `error.input.invalid`.

### File mới / đổi / xoá

| File | Đổi gì |
|---|---|
| `src/components/image/image-upload-field.tsx` | **Mới** — ô ảnh chỉ upload: kiểm `inspectImageFile` → báo cha; xem trước blob/ảnh đã lưu; nút đổi/gỡ/xem khung |
| `src/components/image/image-link-field.tsx` | **Xoá** (backend không còn nhận link) |
| `src/api/product.ts` | `categoryApi.uploadImages/deleteImage`, `brandApi.uploadLogo/deleteLogo` (cả 4 trả DTO) |
| `src/types/product.ts` | `Category` bỏ `imageUrl`; `CategoryPayload` bỏ `imageLink*`/`coverLink*`; `BrandPayload` bỏ `logoUrl`; thêm `CategoryImageSlot` |
| `src/types/staff.ts` | `UpdateStaffReq` bỏ `imageUrl` (không màn nào gửi) |
| `src/pages/product/components/category-form-dialog.tsx` | 7 ô `ImageUploadField`; thêm mới = giữ file chờ, tạo xong upload tuần tự từng slot; sửa = upload/`DELETE` ngay; nạp lại 1 lần khi đóng |
| `src/pages/product/components/brand-form-dialog.tsx` | Ô logo upload, cùng mô hình trên |
| `src/pages/product/CategoryListPage.tsx` | 409 bắt theo `error.category.defaultConflict` (BE33); `saveCategory` trả `Category` vừa tạo; thumbnail chỉ `imageLink1` |
| `src/pages/product/BrandListPage.tsx` | `handleCreate` trả `Brand`; `onMediaChanged` |
| `src/pages/product/components/brand-logo.tsx`, `brand-detail-modal.tsx` | Logo qua `resolveImageSrc` (trước đó `src` thô ⇒ 404); reset trạng thái lỗi khi `logoUrl` đổi |
| `src/pages/product/components/category-detail-modal.tsx` | Bỏ fallback `imageUrl` |
| `src/lib/image-spec.ts` | `resolveImageSrc`: `/category/…` `/brand/…` đi qua `/image`, `blob:` dùng nguyên văn; **mọi spec `maxBytes` = 2 MB**; `belowMin` **không chặn** |
| `src/i18n/locales/{vi,en}/{image,product,brand,errors}.ts` | Key mới: `field.upload/replace/uploading/pending/uploaded/removed/appliesNow`, `category.toast.imagesPartial`, `brand.toast.logoFailed`, `error.category.defaultConflict`; câu `error.image.notAvailable` đổi cho đúng ngữ cảnh gỡ slot; xoá key link/`blockedNotice` |
| `docs/backend/san-pham.md` | Mục P13.2/P13.3 đã đo |
| `docs/backend-request-category-brand-media.md` | Đóng BE31–BE34 |
| `PLAN.md` | Mục B đóng BE31–34; bảng D + tiêu đề Phase 22/23 cập nhật |
| `CLAUDE.md` | Dòng trạng thái Phase 22/23 + danh sách BE mở |

### Luật chốt với user 2026-10-11
1. Ảnh chỉ upload, không dán link (theo backend P13.3).
2. Trần dung lượng mọi loại ảnh = **2 MB** như backend (bỏ ngân sách 500 KB/300 KB/1 MB… của `image-spec.md` client).
3. Không đúng khuyến nghị (kích thước tối thiểu, tỉ lệ, định dạng khuyến nghị) ⇒ **chỉ cảnh báo**. Vẫn chặn: sai định dạng backend không nhận, > 2 MB (backend cũng từ chối).

### Quyết định kỹ thuật đáng nhớ
1. **Sửa ⇒ upload/gỡ ngay, không đợi nút Lưu** — backend tách endpoint theo slot; staging ở chế độ sửa phải tự diff 7 slot + xử lý lỗi từng phần khi Lưu. Cái giá: Huỷ không hoàn tác ảnh ⇒ hiện dòng `image:field.appliesNow` + toast "Đã lưu ảnh / Đã gỡ ảnh".
2. **Thêm mới ⇒ giữ file chờ, tạo xong mới upload từng slot một request** — lỗi slot nào báo slot đó (`imagesPartial`), không rollback bản ghi (backend handoff khuyến nghị).
3. **Nạp lại danh sách một lần khi đóng dialog** (`mediaDirtyRef`) thay vì sau mỗi slot — đo trước sửa: mỗi slot kéo một `category/search?size=200`.
4. **Object URL tạo + thu hồi trong cùng effect** — bản `useMemo` + cleanup bị StrictMode (đang bật) thu hồi mất URL.
5. **File bị chặn không ghi đè khung kiểm tra** — trước sửa, khung hiện kích thước/lỗi của file bị từ chối cạnh thumbnail ảnh cũ.
6. Dialog giữ bản `saved` cập nhật theo DTO trả về — prop `category`/`brand` chỉ là ảnh chụp lúc mở.

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
- Xung đột 409 khi **tạo** danh mục bật mặc định ⇒ dialog **giữ mở** (để không mất file đã chọn); trước đây đóng.
- Câu `error.image.notAvailable`: "Ảnh không tồn tại hoặc đã được gỡ trước đó." (dùng chung cho ảnh sản phẩm).
- Modal chi tiết thương hiệu vẫn in đường dẫn logo dạng chữ cạnh ảnh.

### Kiểm chứng
- 🔌 **API thật:** body có `imageLink1`/`logoUrl` ⇒ 400; upload/gỡ slot + logo trả DTO đầy đủ; gỡ slot trống ⇒ 400 `error.image.notAvailable`; slot `cover9` ⇒ 400 `error.input.invalid`; **ảnh 100×100 backend vẫn nhận** (backend không kiểm kích thước).
- ✅ **UI thật (`superadmin`):** dialog thêm danh mục không còn ô link; chọn 3 file ⇒ xem trước blob (hover-swap, slideshow); ảnh 100×100 chỉ cảnh báo; Lưu ⇒ `POST /category` + 3 × `POST …/images` ⇒ thumbnail hiện qua `/image`; sửa ⇒ gỡ slot (`DELETE`) + upload lại đều 200; file 3,3 MB ⇒ toast chặn, 0 request; thêm thương hiệu kèm logo ⇒ `POST /brand` + `POST …/logo`, logo hiện ở bảng (sau fix); sửa thương hiệu upload logo ⇒ toast + dòng "áp dụng ngay", 0 lần nạp lại trong lúc mở, 1 lần `brand/search` khi đóng; xoá bản ghi không gọi xoá ảnh; Console 0 lỗi.
- ⚠️ **Chưa kiểm:** RBAC ADMIN/STAFF; race 409 `defaultConflict` (cần 2 phiên); popup về 0 mặc định + đường INACTIVE/XOÁ; ảnh seed `/media/cat/...` + gỡ slot seed; mobile; so khung với storefront thật; file sai định dạng (đã bắn vào ô nhưng không chụp kết quả riêng).
- Toast đọng lại lâu khi test: Sonner tạm dừng đếm giờ khi tab không focus — do môi trường automation, không phải bug.

## Việc còn lại / cần bạn chốt

| # | Việc | Mức độ |
|---|---|---|
| 1 | **Repo client** `35.3.eloria-client/docs/image-spec.md`: cột "Dung lượng" còn 500 KB/300 KB/1 MB… và "dưới tối thiểu ⇒ chặn" — lệch luật 2 MB + chỉ cảnh báo vừa chốt. Cần user cập nhật (ngoài repo này) | 🟡 |
| 2 | Kiểm UI các mục ⚠️ ở trên (RBAC, race, INACTIVE/XOÁ, seed, mobile) | 🟡 |
| 3 | Unit test `IMAGE_SPEC`/`evaluateImage` — repo chưa có test runner (CONVENTIONS mục 8 phải hỏi user) | 🟢 |
| 4 | Commit toàn bộ working tree (gồm commit "uncheck" trước đó đã được review) | — |

## Dữ liệu test còn sót
Không. Danh mục `ZZREVIEW1`, `ZZRV…` và thương hiệu `ZZRVB1`, `ZZRVB2`, `ZZB…` đã xoá mềm (backend tự dọn file ảnh); đã kiểm không còn mã `ZZ*`.
