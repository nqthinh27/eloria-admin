# Bàn giao phiên 2026-09-20 — Phase 19: Quản lý Thương hiệu (SUPER_ADMIN)

> **Nhánh:** `develop` · **1 commit** (sau commit Phase 18 `75b26c7`)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` xanh
> **Đã kiểm chứng bằng gì:** **API thật** (`localhost:8080`, `superadmin`) cho hành vi backend.
> **CHƯA mở UI trên trình duyệt**, chưa thử role ADMIN/STAFF (guard 403 mới chỉ suy từ `RoleRoute`).

## Phần 1 — Màn `/brands`

### File mới / đổi

| File | Đổi gì |
|---|---|
| `src/pages/product/BrandListPage.tsx` | **Mới.** Bảng + toolbar (tìm keyword, lọc trạng thái) + 2 `ConfirmDialog` (bật/tắt, xoá) |
| `src/pages/product/components/brand-columns.tsx` | **Mới.** Cột + THAO TÁC (Chi tiết + menu `(...)`: Sửa · Bật/Ngừng · Xoá) |
| `src/pages/product/components/brand-form-dialog.tsx` | **Mới.** Form Thêm/Sửa (zod theo `CreateBrandReqDTO`; chuẩn hoá `code` lúc gõ) |
| `src/pages/product/components/brand-detail-modal.tsx` | **Mới.** Chi tiết chỉ đọc (`canEdit={false}`) |
| `src/pages/product/components/brand-logo.tsx` | **Mới.** Logo + fallback chữ cái đầu khi URL rỗng/lỗi |
| `src/api/product.ts` | `brandApi` thêm `create`/`update`/`updateStatus`/`remove` |
| `src/types/product.ts` | Thêm `BrandPayload` |
| `src/i18n/locales/{vi,en}/brand.ts` | **Mới.** Namespace `brand`; đăng ký `src/i18n/index.ts` |
| `src/i18n/locales/{vi,en}/menu.ts` · `src/config/menu.ts` · `src/Router.tsx` | Mục menu (nhóm SẢN PHẨM & KHO, icon `Tags`) + route bọc `RoleRoute SUPER_ADMIN` |
| `PLAN.md` · `docs/backend/san-pham.md` · `docs/history.md` · `CLAUDE.md` · `.claude/skills/create-table/SKILL.md` | Ghi sổ Phase 19; thêm dòng "cột ẩn sẵn" của Thương hiệu |

### Quyết định kỹ thuật đáng nhớ
1. **Chỉ SUPER_ADMIN có màn** — áp lại phân quyền Phase 18 dù bạn không nhắc (xem giả định 1).
2. **Chi tiết chỉ đọc, sửa qua form** (giống Danh mục SP, khác Tài khoản ngân hàng): `code` cần chuẩn hoá
   ngay lúc gõ và cần validate độ dài mà `DetailModal` dùng chung không có.
3. **Không dùng `setFormErrorFromApi`** — `errors.ts` đã có sẵn `error.brand.codeExisted` nên toast của
   api-client đã đủ rõ; form giữ mở để sửa lại.
4. **`logoUrl` là ô nhập URL**, không upload — backend chỉ nhận chuỗi ≤256 ký tự, không có endpoint upload
   cho thương hiệu. Cái giá: không kiểm tra URL có ảnh thật hay không (logo lỗi ⇒ hiện chữ cái đầu).
5. **Sort mở 5 cột**, khoá `description` (đoạn văn dài) dù backend sort được (đo 200).

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
1. **Chỉ SUPER_ADMIN thấy menu/route** như Phase 18. Nếu muốn ADMIN/STAFF xem (chỉ đọc) thì mở `minRole`
   ở `config/menu.ts` + `Router.tsx` và ẩn nút ghi bằng `hasRole`.
2. Menu nằm nhóm **SẢN PHẨM & KHO**, sau "Danh mục SP".
3. Cột MÔ TẢ ẩn sẵn; `PAGE_SIZE = 10`.
4. Nhãn trạng thái "Ngừng hoạt động" (đồng bộ Danh mục SP), không dùng "Đã tắt" như Tài khoản ngân hàng.

### Kiểm chứng
**Đã đo API thật (superadmin), dữ liệu đã dọn:**
- Sort 6 field × 2 chiều ⇒ 12/12 HTTP 200.
- Tạo `"zz test 1"` ⇒ lưu `ZZTEST1`; tạo trùng `ZZTEST1` ⇒ `error.brand.codeExisted`.
- `PUT` đổi `code` sang `zztest2` ⇒ `ZZTEST2` (đổi được).
- `update-status`, `DELETE` ⇒ `data: null`; xoá lần 2 ⇒ `error.brand.notExisted`.
- Xoá thương hiệu `ELB` (đang có sản phẩm) ⇒ **bị chặn** `error.brand.hasProducts` (dữ liệu không đổi).

**Chưa kiểm chứng:** UI trình duyệt (bố cục, logo, dialog, nút Tải lại, kẹp trang khi xoá dòng cuối, 4 trạng thái),
guard 403 với ADMIN/STAFF, bật/ngừng hoạt động qua UI, và hành vi form Sản phẩm với thương hiệu ngừng hoạt động (xem việc #2).

## Việc còn lại / cần bạn chốt

| # | Việc | Mức độ |
|---|---|---|
| 1 | Mở `/brands` bằng `superadmin` và `admin`/`staff` xem tận mắt | **Nên làm trước khi review** |
| 2 | **Đã đọc code:** `ProductListPage.tsx:148` gọi `brandApi.search({})` (mọi trạng thái) ⇒ dropdown ở form Sản phẩm **vẫn hiện thương hiệu đã ngừng hoạt động**, chọn được cho sản phẩm mới. Chưa sửa (ngoài phạm vi). Muốn chặn: lọc `status: ACTIVE` cho form thêm, giữ lại thương hiệu hiện tại của sản phẩm khi sửa | Trung bình |
| 3 | Màn Màu / Size cùng kiểu (chỉ có `search`) — chưa làm, chờ bạn yêu cầu | Tuỳ chọn |

## Dữ liệu test còn sót
Thương hiệu test `ZZTEST2` (id `3aa93455-ec57-412f-82b1-665e28bb9883`) đã **xoá mềm** (`status=-1`) — vẫn nằm
trong DB nhưng không hiện ở API; 3 thương hiệu gốc (`URB`, `ELB`, `ELR`) không đổi.
