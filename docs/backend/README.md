# Backend — Quy ước chung & chỉ mục domain

> Tri thức backend **đã kiểm chứng bằng API thật**, tách từ CLAUDE.md ngày 2026-09-13.
> Trạng thái: **118 path** trên `/v3/api-docs/api` (khảo sát gần nhất 2026-09-13).
> Muốn khảo sát/đo lại ⇒ skill **update-api-doc** — **chỉ khi user ra lệnh** (CONVENTIONS mục 1).
> Dòng thời gian thay đổi: [docs/history.md](../history.md).

## Chỉ mục domain — làm màn nào đọc file đó

| Domain | File | Màn FE | Tài liệu backend (`35.1.eloria-backend/docs/api/`) |
|---|---|---|---|
| Hệ thống: auth · tài khoản · nhân viên · chi nhánh · nhật ký · địa chỉ | *(file này, mục cuối)* | Đăng nhập · Nhân viên · Chi nhánh · Nhật ký hệ thống | — |
| Sản phẩm · SKU · danh mục · thương hiệu · màu · size · **giá vốn** | [san-pham.md](san-pham.md) | Sản phẩm · Danh mục SP | — |
| Khách hàng (toàn cục — Phase 3b) | [khach-hang.md](khach-hang.md) | Khách hàng | `phase-3b-khach-toan-cuc-review.md` |
| Đơn hàng · thanh toán · giảm giá 2 tầng · luồng POS · hoá đơn · tồn-theo-đơn | [don-hang.md](don-hang.md) | POS · Đơn hàng | `ban-hang-p6.md` |
| Tài khoản ngân hàng & VietQR | [ngan-hang-qr.md](ngan-hang-qr.md) | dialog QR ở POS / chi tiết đơn | `fe-handoff-discount-qr.md` |
| Kho: tồn kho · phiếu · kiểm kê · xuất huỷ | [kho.md](kho.md) | Kho hàng | — |
| Dashboard & Báo cáo · doanh thu sau hoàn | [bao-cao.md](bao-cao.md) | Dashboard | `fe-handoff-phase7.md` · `fe-handoff-phase7-cost.md` |
| Khuyến mại & Coupon | [khuyen-mai.md](khuyen-mai.md) | Khuyến mại · POS | `khuyen-mai-p9.md` |
| Quản lý giá — ❌ **không làm màn** (user chốt 2026-09-08) | [gia.md](gia.md) | — | `quan-ly-gia-p8.md` |
| Ca làm việc & bán quầy | [ca-lam-viec.md](ca-lam-viec.md) | Ca làm việc · POS | `ca-lam-viec-p10.md` |
| Đổi / Trả / Hoàn tiền | [doi-tra.md](doi-tra.md) | Đổi/Trả | `doi-tra-p11.md` |

Cần shape chính xác hơn ⇒ đọc source backend `35.1.eloria-backend/src/main/java/vn/com/eloria/`.
Nguồn sự thật chính thức vẫn là `/v3/api-docs/api` — không hardcode URL này vào code.

---

## Quy ước chung mọi endpoint

- Prefix API: **`/v1.0/api`**. Auth: `bearerAuth` (JWT) áp dụng **global**.
- **Mọi** response bọc `BaseResponse<T>` = `{code, message, data}` — kể cả `/authenticate` và `/refresh`.
  **`code === 1` là thành công**, không phải `0`. Mã khác (`ResponseCode`): `3` đã tồn tại ·
  `4` không tồn tại · `7` dữ liệu không hợp lệ · `15` xác thực thất bại · `24` không đủ quyền.
- Lỗi trả kèm **HTTP status tương ứng** (login sai ⇒ 401), body `ErrorResponse` =
  `{code, message, logInfo, subKey}` (ví dụ thật `subKey: "error.login.fail"`).
  `subKey` dạng `a.b.c` → map i18n, fallback `message` (CONVENTIONS mục 3.2).
- **Ngoại lệ KHÔNG bọc `BaseResponse`** — bắt buộc `apiClient.getBlob()`, dùng `get()` sẽ hỏng vì
  `unwrap` đọc `body.code`: `GET /sku/{id}/barcode` (PNG EAN-13) ·
  `GET /bank-account/order/{orderId}/qr` (PNG VietQR) · `GET /coupon/export` (CSV).

## API danh sách — `POST .../search`

- **`page`/`size`/`sort` bắt buộc ở query param** (đổi 2026-08-09); body **chỉ còn filter**
  (`keyword`, `status`, filter riêng module). **Backend validate chặt field thừa trong body** —
  gửi kèm `page`/`size`/`sortBy`/`sortDir` trong body ⇒ `400 code:7`, áp dụng cho **mọi** endpoint `/search`.
- `page` **1-based** (đo thật — dù OpenAPI ghi `minimum: 0`) · `size` mặc định 10 ·
  `sort` là **mảng** query dạng `field,ASC` / `field,DESC` (viết hoa), hỗ trợ nhiều tiêu chí;
  mặc định `createdDate,DESC`. Ví dụ: `POST /staff/search?page=1&size=20&sort=fullName,ASC` body `{"keyword":"an"}`.
- Response: `data.data` là mảng, `data.total` là tổng. `staff` · `branch` · `product` · `brand` ·
  `category` · `sku` có thêm `activeTotal`/`inactiveTotal` (`BaseListResStatus`); module còn lại chỉ `{total, data}`.
- ⚠️ **Vượt trần `size` bị CẮT IM LẶNG** — không lỗi, không cảnh báo, `total` vẫn báo số thật.
  Trần hiện tại: **5000** (`max-page-size`, BE1 — đo thật 2026-08-18 `size=300` trả đủ 300;
  trước 2026-08-18 trần là 200 và từng làm dropdown SKU thiếu 64/264 bản ghi).
  ⇒ Chỗ nào nạp "toàn bộ" danh mục để dựng dropdown **bắt buộc so `data.length` với `total`** và cảnh
  báo khi lệch, hoặc tra phía server (CONVENTIONS mục 5.7).
- **`keyword` khớp gì là tuỳ module — đừng suy diễn chỗ này giống chỗ kia:**
  `sku/search` soi `sku.id` + `ean` + `product.name` + `product.code` *(BE29, mở rộng 2026-09-13,
  đo thật `"linen"` ⇒ 12)* · `product/search` khớp tên nhưng **phân biệt dấu** (BE6) ·
  `stock-item/search` chỉ khớp mã SKU (BE6) · `order/search` khớp mã đơn + tên/SĐT khách ·
  `customer/search` khớp tên + SĐT.

## Đăng nhập & cookie refresh

- `POST /authenticate` body `LoginReqDTO = {username, password, rememberMe}` — field là **`username`**,
  không phải email. **Luôn gửi `rememberMe: true`** (user chốt): backend **chỉ set cookie khi cờ này bật**,
  và FE không hiển thị checkbox "Ghi nhớ đăng nhập".
- Cookie `refresh_token`: `path=/v1.0/api/refresh; HttpOnly; Max-Age=864000` (10 ngày), không `Secure`,
  không `SameSite` ⇒ **bắt buộc same-origin qua Vite dev proxy** (B2 — production phải cùng domain
  hoặc backend bật `SameSite=None; Secure`).
- `SysUserDTO` mang `role` (`CUSTOMER | STAFF | ADMIN | SUPER_ADMIN`), `branchId` (null với SUPER_ADMIN),
  `langKey` — nguồn dựng menu theo role và khoá bộ chọn chi nhánh. *(`coverUrl` đã bị xoá 2026-08-11.)*

## Quy ước dữ liệu

- Ngày giờ **ISO-8601 UTC** (`2026-08-05T16:17:10Z`). Id là **UUID chuỗi** — ⚠️ trừ **`sku.id` = MÃ SKU**
  (xem [san-pham.md](san-pham.md)). Địa chỉ hành chính chỉ **2 cấp**: Tỉnh/Thành → Phường/Xã.
- Validate khớp sang zod: mật khẩu `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,50}$` ·
  SĐT `^0\d{9}$` · username 6–50 ký tự (cho phép cả email lẫn `[_.@A-Za-z0-9-]+`).
- `code` các danh mục bị backend **chuẩn hoá uppercase + bỏ khoảng trắng** (BE8, đo thật `"br 001 "` → `BR001`);
  FE mirror ở `src/lib/validation.ts#normalizeCode` để người dùng thấy đúng thứ sẽ được lưu.
- `AdministrativeAddressResDTO` chỉ có `{id, name}` — không có field `code` riêng.
  `provinceCode`/`wardCode` ở các DTO khác và query `wards?provinceCode=` **chính là `id`** này.
- `UpdateStaffReqDTO` **không có `role`** — đổi role qua `POST /staff/assign-role` (`{id, role}`) riêng.
- `ResetStaffPasswordResDTO` chỉ có `temporaryPassword`, "chỉ hiển thị duy nhất lần này" —
  không có endpoint xem lại, UI tự giữ trong state dialog.
- `UpdateStatusReqDTO = {id, status}` dùng chung mọi module, bị chặn `@Min(0) @Max(1)`.

### `status` 3 giá trị — hai cơ chế TÁCH BIỆT (rule toàn hệ thống, chốt 2026-08-09)

| Giá trị | Ý nghĩa | Ai đặt |
|---|---|---|
| `1` | ACTIVE | `POST /<module>/update-status` |
| `0` | INACTIVE (vẫn tra cứu được) | `POST /<module>/update-status` |
| **`-1`** | **DELETED — xoá mềm, ẩn khỏi MỌI truy vấn** | **`DELETE /<module>/{id}`** — API riêng |

- Gửi `status: -1` vào `update-status` ⇒ luôn `400 error.input.invalid` (đã test). Muốn xoá ⇒ gọi `DELETE`.
- Bản ghi `-1` bị loại khỏi mọi truy vấn ⇒ FE **không bao giờ nhận được** ⇒ không dựng filter/badge
  "Đã xoá"; type FE khai `EntityStatus` 0/1 là đủ. ⚠️ Xoá mềm **không có đường khôi phục bằng API**
  (sự cố `staffone` 2026-09-12 phải sửa bằng SQL).
- Entity áp dụng xoá mềm (`@Min(-1)`): `SysUser` · `Branch` · `Brand` · `Category` · `Product` · `Sku`.
  Riêng `color`/`size` là **hard delete** thật (chặn khi còn SKU tham chiếu). **Không có** `DELETE /product/{id}`.

## Sort phía server — field nào sort được, field nào gây 500

Mọi `/search` đều là `repository.findAll(Specification, pageable)` rồi mới map DTO ⇒ **`sort` giải theo
tên field của ENTITY**. Sort theo field chỉ có ở DTO ⇒ `PropertyReferenceException` ⇒ **HTTP 500
`ERROR_IN_BACKEND`** (không phải 400) — người dùng chỉ thấy "lỗi hệ thống". Vì vậy CONVENTIONS mục 5.2:
**cột ngoài danh sách dưới đây phải khai `enableSorting: false`.**

- **Luôn sort được** (kế thừa `AbstractAuditingEntityUUID`): `id` · `createdBy` · `createdDate` ·
  `lastModifiedBy` · `lastModifiedDate`. Riêng **`AuditLog` không có `status`** (`sort=status` ⇒ 500).

**Field DTO-only — TUYỆT ĐỐI không sort:**

| Module | Field chỉ có ở DTO (sort ⇒ 500) |
|---|---|
| `stock-item` | `skuCode` · `productName` · `colorName` · `sizeLabel` · `branchName` · **`available`** |
| `sku` | **`skuCode`** (dùng `id` — cùng giá trị) · `productName` · `colorName` · `sizeLabel` · `unitPrice` |
| `warehouse-ledger` | `toBranchId` · `toBranchName` · `lines` |
| `product` | `brandName` · `images` · `categories` |
| `order` | `paidAmount` · `lines` · `payments` |
| `branch` | `provinceName` · `wardName` · `staffCount` |
| `category` | `parentName` |
| `work-shift` | `staffName` *(BE27 — backend đã sửa nhưng CHƯA deploy, đo 2026-09-13 vẫn 500)* |
| `return` | `staffName` · `lines` (BE27) |
| `brand` · `audit-log` | *(không có — DTO trùng entity)* |

**Field sort được hay dùng:** `staff`/`customer`: `username`, `fullName`, `phoneNumber`, `email`,
`status`, `role`, `dob`, `gender`, `membershipPoint`, `branchId` · `branch`: `name`, `code`,
`phoneNumber`, `address`, `status` · `product`: `code`, `name`, `price`, `gender`, `status`, `brandId`,
`material` · `sku`: `id`, `ean`, `status`, `productId`, `colorId`, `sizeId` · `category`: `code`,
`name`, `level`, `sortOrder`, `status`, `parentId` · `order`: `orderCode`, `status`, `type`,
`paymentStatus`, `paymentMethod`, `subtotal`, `totalAmount`, `discountAmount`, `shippingFee`,
`channel`, `customerName`, `customerPhone`, `branchId`, `completedDate` · `stock-item`: **chỉ**
`total`, `minStock`, `skuId`, `branchId` (+ audit) · `warehouse-ledger`: `code`, `name`, `type`,
`status`, `branchId` · `audit-log`: `action`, `entityName`, `entityId`, `username`, `fullName`,
`branchId`, `branchName` · `work-shift`: `code`, `status`, `openingCash`, `closingCash`,
`expectedCash`, `cashDifference`, `openedAt`, `closedAt`, `createdDate` · `return`: `code`, `status`,
`type`, `reason`, `returnedAmount`, `deliveredAmount`, `refundAmount`, `collectAmount`, `refundedAt`,
`approvedAt`, `orderId`, `orderCode`, `customerName`, `branchName`.

- ✅ **Đã kiểm chứng bằng API thật 2026-09-08** (Phase 16 ③): 30 cặp (endpoint, sortField) × 2 chiều =
  **60/60 trả 200**; chiều ngược lại các field DTO-only đúng là trả 500.
- ✅ **`branchName` SORT ĐƯỢC** (tài liệu cũ ghi sai) — đo thật trả 200 + sắp đúng ở `staff` ·
  `customer` · `order` · `warehouse-ledger` (2026-09-08) và `work-shift` (2026-09-13): Hibernate tự
  join sang `branch`. FE hiện vẫn khoá các cột này ⇒ an toàn, chỉ bảo thủ hơn mức cần — mở được khi muốn.
- Sort đường dẫn lồng (`branch.name`) lý thuyết chạy nhưng **chưa nơi nào dùng, chưa test** — đừng tự ý.

## RBAC — thang bậc kế thừa (không có ma trận quyền)

```
SUPER_ADMIN  >  ADMIN  >  STAFF  >  CUSTOMER  >  ANONYMOUS
```

- `summary` mỗi endpoint mang tiền tố **`[ROLE]`** = **role tối thiểu**; role bên trái kế thừa toàn bộ
  quyền role bên phải. FE so bậc bằng **một** hàm dùng chung (`rank(user) >= rank(required)`).
- Ngoài bậc role, backend còn **tự giới hạn phạm vi dữ liệu** (ghi trong `description` từng endpoint):
  ADMIN chỉ thấy/tạo nhân viên chi nhánh mình, chỉ gán được role STAFF; điều chuyển chi nhánh chỉ
  SUPER_ADMIN. FE chặn ở UI nhưng **không coi đó là lớp bảo mật duy nhất**.
- ⚠️ `CUSTOMER` là role khách storefront, **không đăng nhập web admin** — endpoint `[CUSTOMER]`
  (`/account/me`, `/logout`) chỉ có nghĩa "cần đã đăng nhập".

## Domain hệ thống — auth · tài khoản · nhân viên · chi nhánh · nhật ký

| Nhóm | Role | Endpoint |
|---|---|---|
| Auth | `ANONYMOUS` | `POST /authenticate` · `/refresh` · `/register` · `/activate-account?code=` · `/forgot-password` · `/reset-password` |
| Đăng xuất | `CUSTOMER` | `POST /logout` |
| Tài khoản đang đăng nhập | `CUSTOMER` | `GET /account/me` · `POST /account/change-password` · `POST /sys-user/update-avatar` |
| Ảnh | `ANONYMOUS` | `GET /image?imageUrl=` |
| Địa chỉ hành chính | `STAFF` | `GET /administrative-address/provinces` · `/wards?provinceCode=` |
| Chi nhánh — đọc | `STAFF` | `POST /branch/search` · `GET /branch/{id}` |
| Chi nhánh — sửa | `ADMIN` | `PUT /branch/{id}` |
| Chi nhánh — tạo/xoá/bật-tắt | `SUPER_ADMIN` | `POST /branch` · `/branch/update-status` · `DELETE /branch/{id}` |
| Nhân viên (toàn bộ) | `ADMIN` | `POST /staff` · `/staff/search` · `/staff/assign-role` · `/staff/update-status` · `/staff/{id}/reset-password` · `GET\|PUT\|DELETE /staff/{id}` |
| Audit log | `ADMIN` | `POST /audit-log/search` · `GET /audit-log/{id}` |

- `BranchResDTO.code` — mã CN (vd `HK`), nhận ở `POST/PUT /branch`; dùng làm **prefix mã đơn/mã ca**
  (`HK-20260811-...`). Không có `code` ⇒ backend fallback **viết tắt tên** (`Chi nhánh Trung tâm` → `CNTT-…`).
- `BranchResDTO.staffCount` — số nhân viên chi nhánh, dùng cho màn Chi nhánh thay vì tự đếm.
- **Xoá nhân viên bị chặn** khi còn đơn chưa đóng (`error.staff.referenced`) hoặc còn phiếu đổi/trả mở
  (`error.staff.hasOpenReturns`).

## Tài khoản test (chỉ dev local `http://localhost:8080`)

| Username | Password | Role |
|---|---|---|
| `superadmin` | `Admin@123` | `SUPER_ADMIN` |
| `adminbranch` | `Admin@123` | `ADMIN` — *Chi nhánh Trung tâm* |
| `staffone` | `Admin@123` | `STAFF` — *Chi nhánh Trung tâm* |
| `hkadmin` | `Admin@123` | `ADMIN` — *HN - Hoàn Kiếm* |

- **Không hardcode** vào code, không làm giá trị mặc định form đăng nhập, không đưa ra ngoài dev.
- Test duyệt phiếu kho cần **2 ADMIN khác chi nhánh** (backend chặn tự duyệt + ADMIN chỉ thấy phiếu
  chi nhánh mình). Thay đổi menu/route theo role phải test đủ **cả 3 role**.
- ⚠️ DB dev có thể bị **xoá & seed lại** (đã xảy ra 2026-08-11) ⇒ **không hardcode/cache id** trong
  code hay test; luôn lấy từ API.
