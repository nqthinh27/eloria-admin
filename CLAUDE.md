# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Đọc trước khi code

Repo này có 2 tài liệu **bắt buộc đọc**, đừng chép lại nội dung của chúng vào đây:

- **[CONVENTIONS.md](CONVENTIONS.md)** — luật chung (API/DTO, auth, format response, API client, UI/UX,
  bám thiết kế `design/`, cấu trúc code, tài liệu hoá, review). Mâu thuẫn với tài liệu này ⇒ **hỏi user**, không tự quyết.
- **[PLAN.md](PLAN.md)** — kế hoạch chia 17 phase. User sẽ **chỉ định phase**; chỉ làm đúng phase đó,
  không lấn sang phase khác. Mục B của PLAN là các điểm còn chờ user chốt.

`README.md` hiện vẫn là README của template `react-shadcn-starter` — **đã lỗi thời**, không dùng làm nguồn tham chiếu.

## Lệnh

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc -b && vite build  — dùng lệnh này để type-check
npm run lint     # eslint .
npm run preview  # preview bản build
```

**Chưa có test runner nào được cấu hình** (không Vitest/Jest, không thư mục test). Cổng kiểm tra hiện tại
là `npm run lint` + `npm run build`. Nếu cần thêm test framework thì phải hỏi user trước (CONVENTIONS mục 8).

## Trạng thái thực tế của repo

Repo **vẫn là starter `react-shadcn-starter` nguyên bản** — chưa code phase nào của PLAN.
Những gì thấy trong `src/` (Dashboard/Sample/ComingSoon, menu tiếng Anh, `mode-toggle`, footer/github của tác giả
template) là **code demo của template, sẽ bị gỡ ở Phase 0**, không phải code sản phẩm. Đừng bắt chước pattern của chúng.

## Kiến trúc

### Vị trí trong hệ thống

Đây là **web quản trị nội bộ** (back-office) cho chuỗi cửa hàng thời trang, nằm cạnh 2 project anh em:

```
d:\Project\35.eloria\
├─ 35.1.eloria-backend\   # Spring Boot — nguồn của DTO/API
├─ 35.2.eloria-admin\     # ← repo này
└─ 35.3.eloria-client\    # storefront cho khách
```

Khi cần biết shape dữ liệu, ưu tiên **đọc source backend** (`35.1.eloria-backend/src/main/java/vn/com/eloria/`)
thay vì đoán — nhưng **nguồn sự thật chính thức là `/v3/api-docs/api`**, chỉ fetch khi user ra lệnh (CONVENTIONS mục 1).

### Tích hợp backend — khảo sát `/v3/api-docs/api` ngày **2026-08-06**, cập nhật **2026-08-08**, **2026-08-09**, **2026-08-10**, **2026-08-11**, **2026-08-21**, **2026-08-29**, **2026-09-07**

> **Khảo sát lại 2026-09-07:** backend lên **100 path** (+12). Hai domain mới:
> **Khuyến mại** (`/promotion/**` 5 + `/coupon/**` 2) và **Quản lý giá** (`/price/**` 3 +
> `/price-change-log/search`). Entity mới: `Promotion`, `PromotionLog`, `SkuPrice`, `PriceChangeLog`.
> Nguồn: `docs/api/khuyen-mai-p9.md` · `docs/api/quan-ly-gia-p8.md`. Xem mục
> "Domain Khuyến mại & Coupon" ở cuối phần này.
>
> ⚠️ **Vẫn KHÔNG có** API đổi/trả (`refund|return|exchange`: 0 path) và ca làm việc
> (`shift`: 0 path) ⇒ **Phase 13 và 15 vẫn bị chặn**.

> **Khảo sát lại 2026-08-29 (lần 2 — backend đã làm xong Phase 7):** backend lên **88 path**
> (+5). ⚠️ **Ghi chép buổi sáng cùng ngày ("vẫn 83 path, Phase 12 bị chặn") KHÔNG CÒN ĐÚNG** —
> backend đã bổ sung **đủ 5 endpoint báo cáo/dashboard** ngay trong ngày:
> `GET /dashboard/summary` · `POST /report/sales` · `POST /report/profit` ·
> `POST /report/inventory` · `GET /report/branch-comparison`.
> Nguồn: `docs/api/fe-handoff-phase7.md`. Xem mục "Domain Dashboard & Báo cáo" bên dưới.
> ⇒ **Phase 12 đã hết bị chặn và đã code xong.**


> **Khảo sát lại 2026-08-21:** backend hiện có **83 path** (+7 so với 2026-08-11). Mới: domain
> **tài khoản ngân hàng & VietQR** (8 endpoint `/bank-account/*`) và **giảm giá 2 tầng**
> (`lines[].discountAmount`). Xem hai mục riêng ở cuối phần này.

> **Khảo sát lại 2026-08-11 (lần 1):** backend hiện có **76 path**. **Domain đơn hàng đã xuất hiện
> đầy đủ** (13 endpoint `/order/*` + `POST /websocket`) — xem mục "Domain Đơn hàng" bên dưới;
> `SkuResDTO` có thêm `unitPrice`.

> ### ⚠️ **BREAKING — backend update 2026-08-11 (lần 2), DB đã xoá & tạo lại**
>
> Đã fetch lại api-docs + **kiểm thử API thật 21/21 PASS**. Ba thay đổi phá vỡ:
>
> 1. **`sku.id` giờ là MÃ SKU, không phải UUID** — ví dụ thật: **`SP001-BK-AO-L`**
>    (`{productCode}-{colorCode}-{sizeCode}`). ⚠️ Lưu ý phần cuối là **`sizeOption.code`**
>    (`AO-L`), *không phải* `label` (`L`) ⇒ mã có dạng `SP001-BK-AO-L` chứ không phải `SP001-BK-L`.
>    **`sku.id === sku.skuCode`** ⇒ FE có thể hiển thị thẳng `id` cho người dùng, không cần cột
>    `skuCode` riêng. Mã dùng được làm **path param** (`GET /sku/SP001-BK-AO-L`) và mọi
>    `skuId` trong body/response (order lines, stock-item, warehouse-ledger lines, stock-count,
>    stock-disposal) đều là **chuỗi mã này**.
> 2. **3 field đã bị xoá khỏi response**: `SkuResDTO.weightGram` · `SysUserDTO.coverUrl`
>    (`/account/me`) · `StaffResDTO.employeeId`. Đã xác nhận biến mất khỏi cả api-docs lẫn JSON thật.
> 3. **`stock_item.minStock` luôn có số (mặc định `0`)**, không còn `null` — kiểm chứng: 20/20 dòng
>    tồn đều có `minStock: 0`. ⇒ Bỏ mọi nhánh xử lý `minStock === null` ở FE.
>
> **Thay đổi khác (không phá vỡ):**
> - **`BranchResDTO.code`** — field mới (mã CN, vd `HK`), nhận ở `POST/PUT /branch`.
>   Dùng làm **prefix mã đơn**: `HK-20260811-233611-0001`. Chi nhánh **không có `code`** thì
>   backend fallback về **viết tắt tên** (`Chi nhánh Trung tâm` → `CNTT-2026...`) — đã đo thật cả 2 case.
> - **`BranchResDTO.staffCount`** — field mới *(không có trong mô tả của user, phát hiện khi diff)*,
>   trả số nhân viên của chi nhánh; dùng được cho màn Chi nhánh thay vì tự đếm.
> - **`CustomerResDTO.activated`** giờ **CÓ trong JSON** (tài liệu cũ ghi "không xuất hiện" —
>   **không còn đúng**). Khách tạo tại quầy có `activated: false` (chưa đăng nhập storefront được).
>   ⚠️ **`activated` khác `status`**: `status` là khoá/mở bản ghi, `activated` là đã kích hoạt
>   tài khoản hay chưa — màn Khách hàng phải phân biệt, đừng gộp.
>
> ⚠️ **DB đã bị xoá và tạo lại** ⇒ **mọi id cũ (product/brand/color/size/branch/customer…) đã đổi
> hết**. Không hardcode/cache id trong code hay test; luôn lấy từ API.
>
> Các cảnh báo đã ghi trước đó **vẫn đúng** sau khi kiểm chứng lại: `categories` rỗng ở
> `product/search` · `lines` null ở `warehouse-ledger/search` · `stock-item/alerts` rỗng
> (nay vì `minStock` mặc định 0 nên chỉ cảnh báo khi `available <= 0`) · chặn tự duyệt phiếu ·
> cap `size` 200.

- Prefix API: **`/v1.0/api`**. Auth: `bearerAuth` (JWT) áp dụng **global** cho mọi endpoint.
- **Response đã được chuẩn hoá hoàn toàn**: *mọi* endpoint bọc `BaseResponse<T>` = `{code, message, data}`,
  kể cả `/authenticate` và `/refresh` (trước đây trả DTO trần — điều này **không còn đúng**).
- **`code === 1` là thành công**, không phải `0`. Xem `ResponseCode` phía backend:
  `1` thành công · `3` đã tồn tại · `4` không tồn tại · `7` dữ liệu không hợp lệ · `15` xác thực thất bại · `24` không đủ quyền.
- Lỗi trả kèm **HTTP status tương ứng** (login sai ⇒ 401) với body
  `ErrorResponse` = `{code, message, logInfo, subKey}`, ví dụ thật: `subKey: "error.login.fail"`.
  `subKey` dạng `a.b.c` → map i18n, fallback `message`.
- **API danh sách là `POST .../search`.** ⚠️ **Đổi ngày 2026-08-09** (trước đó `page`/`size`/`sortBy`/
  `sortDir` nằm trong body — **không còn đúng**): giờ **`page`/`size`/`sort` bắt buộc ở query param**,
  body chỉ còn filter (`keyword`, `status`, và filter riêng từng module như `role`, `branchId`…).
  - `page`: 1-based (`page=1` là trang đầu — đã xác nhận qua test thật, không phải 0-based dù mô tả
    OpenAPI ghi `minimum: 0`).
  - `size`: mặc định 10.
  - `sort`: **mảng** query string dạng `field,ASC` / `field,DESC` (viết hoa), hỗ trợ nhiều tiêu chí
    (`?sort=fullName,ASC&sort=createdDate,DESC`); mặc định `createdDate,DESC`.
  - Ví dụ: `POST /staff/search?page=1&size=20&sort=fullName,ASC` với body `{"keyword":"an"}`.
  - ⚠️ **`size` bị cap cứng ở 200 và IM LẶNG** *(đo thật 2026-08-11)*: gửi `size=201/300/500/1000`
    đều trả **đúng 200 dòng**, **không lỗi, không cảnh báo, `total` vẫn báo số thật**. ⇒ Xin
    `size` lớn hơn 200 là **vô nghĩa** và tạo ảo giác đã nạp đủ. Chỗ nào nạp "toàn bộ" danh mục nền
    để dựng dropdown **bắt buộc phải so `data.length` với `total`** và cảnh báo khi lệch, hoặc
    chuyển sang tìm kiếm phía server. Đã có case thật: `/sku/search` có **264** SKU nên dropdown
    chọn SKU chỉ thấy 200.
  - **Backend validate chặt field thừa trong body** — gửi kèm `page`/`size`/`sortBy`/`sortDir` trong
    body (thói quen cũ) sẽ bị từ chối `code:7 "Dữ liệu truyền vào không hợp lệ"` vì các field đó
    không còn khai trong `*SearchReqDTO`. Áp dụng nhất quán cho **cả 10 endpoint `/search`** hiện có
    (staff, branch, audit-log, brand, category, color, size, product, sku, customer).
  Kết quả response body **không đổi**: `data.data` là mảng, `data.total` là tổng;
  `staff/search` + `branch/search` + `product/search` + `brand/search` + `category/search` +
  `sku/search` có thêm `data.activeTotal` / `data.inactiveTotal`.
- Cookie `refresh_token`: `path=/v1.0/api/refresh; HttpOnly; Max-Age=864000`, không `Secure`, không `SameSite`
  ⇒ **bắt buộc same-origin qua Vite dev proxy**. **Chỉ được set khi login gửi `rememberMe: true`.**
- `SysUserDTO` mang `role` (`CUSTOMER | STAFF | ADMIN | SUPER_ADMIN`), `branchId` (null với SUPER_ADMIN),
  `langKey` — nguồn để dựng menu theo role và khoá bộ chọn chi nhánh.
- Quy ước dữ liệu: `status` **`1` = ACTIVE, `0` = INACTIVE, `-1` = DELETED (xoá mềm)** — xem mục
  "Quy ước `status` 3 giá trị" bên dưới; ngày giờ ISO-8601 UTC (`2026-08-05T16:17:10Z`);
  id là UUID chuỗi. Địa chỉ hành chính chỉ **2 cấp**: Tỉnh/Thành → Phường/Xã (không có Quận/Huyện).
- Validate của backend cần khớp sang zod ở FE: mật khẩu `^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,50}$`,
  SĐT `^0\d{9}$`, username 6–50 ký tự (pattern username thật cho phép **cả email lẫn chuỗi
  `[_.@A-Za-z0-9-]+`**, 6–50 ký tự).
- **`AdministrativeAddressResDTO` chỉ có `{id, name}`** — không có field `code` riêng. `provinceCode`/
  `wardCode` dùng trong `Branch`/`CreateBranchReqDTO`/`BranchSearchReqDTO` và tham số query
  `wards?provinceCode=` **chính là `id`** lấy từ response `/administrative-address/provinces`
  (tên field phía các DTO khác gọi là `provinceCode`/`wardCode` nhưng giá trị truyền vào là `id`,
  không suy ra được `code` nào khác).
- **`UpdateStaffReqDTO` không có `role`** — đổi role phải qua `POST /staff/assign-role` riêng
  (`AssignRoleReqDTO = {id, role}`), không gộp vào form sửa hồ sơ.
- **`ResetStaffPasswordResDTO` chỉ có 1 field `temporaryPassword`**, mô tả trong api-docs ghi rõ
  "chỉ hiển thị duy nhất lần này" — không có endpoint xem lại, UI phải tự lưu tạm trong state dialog.
- **`UpdateStatusReqDTO` dùng chung cho staff và branch** = `{id, status}`, `status` giới hạn
  `minimum: 0, maximum: 1`.

### ⚠️ Sort phía server — field nào sort được, field nào **gây 500** (khảo sát source backend 2026-08-28)

Mọi endpoint `/search` đều là `repository.findAll(Specification<Entity>, pageable)` rồi mới map sang
DTO ⇒ **`sort` giải theo tên field của ENTITY**, không phải field của DTO. Không service nào dùng
`@Query`/native/projection cho search, nên quy tắc này đúng cho **cả 11 module**.

⚠️ **Sort theo field chỉ có ở DTO ⇒ `PropertyReferenceException` ⇒ rơi vào handler `Exception`
chung ⇒ HTTP 500 `ERROR_IN_BACKEND`** — **không phải 400**. Người dùng chỉ thấy "lỗi hệ thống",
không có cách nào đoán ra là do bấm sort. Vì vậy CONVENTIONS mục 5.2 bắt buộc:
**cột không nằm trong danh sách dưới đây phải khai `enableSorting: false`.**

Field **luôn sort được** (10/11 entity kế thừa `AbstractAuditingEntityUUID`):
`id` · `createdBy` · `createdDate` · `lastModifiedBy` · `lastModifiedDate`.
Riêng **`AuditLog` không kế thừa** — nó có `createdDate`/`createdBy`/`lastModifiedDate`/
`lastModifiedBy` riêng nhưng **không có `status`** (`sort=status` trên audit-log ⇒ 500).

**Field DTO-only — TUYỆT ĐỐI không sort:**

| Module | Field chỉ có ở DTO (sort ⇒ 500) |
|---|---|
| `stock-item` | `skuCode` · `productName` · `colorName` · `sizeLabel` · `branchName` · **`available`** (alias tính từ `total`) |
| `sku` | **`skuCode`** (dùng `id` — hai field cùng giá trị, chỉ `id` là cột thật) · `productName` · `colorName` · `sizeLabel` · `unitPrice` |
| `warehouse-ledger` | `branchName` · `toBranchId` · `toBranchName` (suy từ `sendTo`) · `lines` |
| `product` | `brandName` · `images` · `categories` |
| `order` | `branchName` · `paidAmount` (tính từ `payments`) · `lines` · `payments` |
| `branch` | `provinceName` · `wardName` · `staffCount` (tính) |
| `staff` · `customer` | `branchName` |
| `category` | `parentName` |
| `brand` · `audit-log` | *(không có — DTO trùng entity, sort field nào cũng được)* |

Field **sort được** hay dùng, theo module: `staff`/`customer` (`SysUser`): `username`, `fullName`,
`phoneNumber`, `email`, `status`, `role`, `dob`, `gender`, `membershipPoint`, `branchId` ·
`branch`: `name`, `code`, `phoneNumber`, `address`, `status` · `product`: `code`, `name`, `price`,
`gender`, `status`, `brandId`, `material` · `sku`: `id`, `ean`, `status`, `productId`, `colorId`,
`sizeId` · `category`: `code`, `name`, `level`, `sortOrder`, `status`, `parentId` ·
`order`: `orderCode`, `status`, `type`, `paymentStatus`, `paymentMethod`, `subtotal`,
`totalAmount`, `discountAmount`, `shippingFee`, `channel`, `customerName`, `customerPhone`,
`branchId`, `completedDate` · `stock-item`: **chỉ** `total`, `minStock`, `skuId`, `branchId`
(+ audit) · `warehouse-ledger`: `code`, `name`, `type`, `status`, `branchId` ·
`audit-log`: `action`, `entityName`, `entityId`, `username`, `fullName`, `branchId`, `branchName`.

*(Sort theo đường dẫn lồng như `branch.name` về lý thuyết chạy được — Hibernate tự tạo left join —
nhưng **chưa nơi nào dùng và chưa test**, đừng tự ý dùng.)*

### Quy ước `status` 3 giá trị — **rule chung toàn hệ thống** (chốt với user 2026-08-09)

`EStatus` phía backend có **3** giá trị, áp dụng cho *mọi* entity có cột `status`:

| Giá trị | Ý nghĩa | Ai đặt |
|---|---|---|
| `1` | ACTIVE — đang hoạt động | API `update-status` |
| `0` | INACTIVE — ngừng hoạt động (vẫn tra cứu được) | API `update-status` |
| **`-1`** | **DELETED — xoá mềm**, bản ghi bị **ẩn khỏi mọi truy vấn nghiệp vụ** | **API `DELETE` riêng** |

**Hai cơ chế TÁCH BIỆT, không dùng chung API/phương thức** (đã kiểm chứng trên source: 5 service
`BranchServiceImpl` · `BrandServiceImpl` · `CategoryServiceImpl` · `SkuServiceImpl` ·
`StaffServiceImpl` đều chỉ set `EStatus.DELETED` **bên trong `delete(id)`**, không service nào set
qua `updateStatus()`):

- **Bật/tắt** ⇒ `POST /<module>/update-status` với `UpdateStatusReqDTO = {id, status}`.
  DTO này bị chặn **`@Min(0) @Max(1)`** ⇒ **gửi `-1` luôn trả `400 error.input.invalid`**, đã test thật.
- **Xoá mềm** ⇒ `DELETE /<module>/{id}` (không có body). Backend tự set `-1` và tự chặn ràng buộc
  (còn con / còn tham chiếu). Có ở: `staff`, `branch`, `brand`, `category`, `sku`.
  Riêng `color`/`size` là **hard delete** thật (`@Min(-1)` không khai ở 2 entity này).

**Hệ quả bắt buộc cho FE:**

1. **Không bao giờ gửi `status: -1`** lên bất kỳ endpoint `update-status` nào. Muốn xoá ⇒ gọi `DELETE`.
2. **Không dựng UI cho trạng thái "Đã xoá"** trong bộ lọc/badge: bản ghi `-1` bị backend loại khỏi
   mọi truy vấn (`search` thêm điều kiện `status != -1`, `getExisting()` cũng lọc) ⇒ FE **không bao
   giờ nhận được** bản ghi `-1`. Type FE khai `EntityStatus` 0/1 là đủ cho dữ liệu nhận về.
3. Entity có `@Min(-1)` (tức áp dụng xoá mềm): `SysUser`, `Branch`, `Brand`, `Category`,
   `Product`, `Sku`.

⚠️ **`DELETE /sku/{id}` (`[SUPER_ADMIN] Xóa mềm SKU`) đã có trong source nhưng CHƯA có trên server
đang chạy** — gọi thật trả **405**, và endpoint này **không xuất hiện trong `/v3/api-docs/api`**.
Nguyên nhân: `SkuResource.java`/`SkuServiceImpl.java` đang ở trạng thái **modified chưa commit**
(sửa lúc 17:23 ngày 2026-08-09, sau khi server khởi động). ⇒ Backend cần **build/chạy lại** thì FE
mới dùng được. Tương tự, **`DELETE /product/{id}` không tồn tại** ở cả source lẫn api-docs (405).

### Phân quyền — role phân cấp, đọc từ `summary` của api-docs

Backend fix cứng **thang bậc kế thừa**, role bên trái kế thừa **toàn bộ** quyền của role bên phải:

```
SUPER_ADMIN  >  ADMIN  >  STAFF  >  CUSTOMER  >  ANONYMOUS
```

`summary` của mỗi endpoint mang tiền tố **`[ROLE]`** = **role tối thiểu** được gọi endpoint đó,
theo cấu trúc `[ROLE] Tên api` (ví dụ `[ANONYMOUS] Đăng nhập`). Nhờ kế thừa, `[ADMIN]` nghĩa là
**ADMIN và SUPER_ADMIN** gọi được, còn STAFF thì không.

FE **suy quyền từ đúng thang bậc này**, không dùng ma trận quyền rời rạc và **không có API ma trận quyền**.
Cách làm: so sánh bậc của role người dùng với bậc tối thiểu của route/hành động
(`rank(SUPER_ADMIN)=4 … rank(ANONYMOUS)=0`, cho phép khi `rank(user) >= rank(required)`).

### API đã có (đủ để code Phase 7 bằng API thật)

Cột **Role** là role tối thiểu, lấy từ tiền tố `[ROLE]` trong `summary`.

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
| Nhân viên (toàn bộ) | `ADMIN` | `POST /staff` · `/staff/search` · `/staff/assign-role` · `/staff/update-status` · `/staff/{id}/reset-password` · `GET|PUT|DELETE /staff/{id}` |
| Audit log | `ADMIN` | `POST /audit-log/search` · `GET /audit-log/{id}` |

### API mới phát hiện khi khảo sát lại 2026-08-08 — domain sản phẩm & khách hàng

⚠️ Khác với khảo sát 2026-08-06 (lúc đó **chưa có**), backend giờ đã có API thật cho các domain sau.
Các phase liên quan (8, 9) **cần đổi từ mock sang API thật khi tới lượt code**, không phải tự động —
PLAN Phase 6 vẫn giữ nguyên lớp mock hiện có cho tới khi phase đó được chỉ định làm lại bằng API thật.

| Nhóm | Role đọc / Role ghi | Endpoint |
|---|---|---|
| Thương hiệu (brand) | `STAFF` / `SUPER_ADMIN` | `POST /brand/search` · `GET /brand/{id}` / `POST /brand` · `PUT /brand/{id}` · `DELETE /brand/{id}` · `POST /brand/update-status` |
| Danh mục (category) | `STAFF` / `SUPER_ADMIN` | `POST /category/search` · `GET /category/{id}` / `POST /category` · `PUT /category/{id}` · `DELETE /category/{id}` · `POST /category/update-status` |
| Màu (color) | `STAFF` / `SUPER_ADMIN` | `POST /color/search` · `GET /color/{id}` / `POST /color` · `PUT /color/{id}` · `DELETE /color/{id}` — **không có `update-status`** cho color |
| Size | `STAFF` / `SUPER_ADMIN` | `POST /size/search` · `GET /size/{id}` / `POST /size` · `PUT /size/{id}` · `DELETE /size/{id}` — **không có `update-status`** cho size |
| Sản phẩm cha | `STAFF` / `SUPER_ADMIN` | `POST /product/search` · `GET /product/{id}` (kèm bảng SKU) / `POST /product` · `PUT /product/{id}` · `POST /product/{id}/images` · `POST /product/{id}/generate-sku` |
| SKU | `STAFF` / `SUPER_ADMIN` | `POST /sku/search` · `GET /sku/{id}` · `GET /sku/by-ean/{ean}` (quét barcode) / `POST /sku/update-status` — **không có endpoint tạo/sửa/xoá SKU trực tiếp**, SKU chỉ sinh qua `product/{id}/generate-sku` |
| Khách hàng | `STAFF` / `ADMIN` | `POST /customer/search` · `GET /customer/{id}` · `POST /customer` (tạo tại quầy, `STAFF`) / `PUT /customer/{id}` (`ADMIN`) · `GET /customer/duplicates` (tra trùng SĐT, `ADMIN`) |

Pattern response: `product`/`brand`/`category`/`sku` dùng `BaseListResStatus*` (có `activeTotal`/
`inactiveTotal` như staff/branch); `customer`/`color`/`size` chỉ dùng `BaseListRes` (`total` + `data[]`).

**Chi tiết domain khách hàng — xác minh khi code Phase 8 (2026-08-09), đã đối chiếu api-docs +
source backend + gọi API thật:**

- **`CustomerResDTO` = `{id, fullName, phoneNumber, email, dob, gender, branchId, membershipPoint,
  status, activated, createdDate, branchName}`** *(cập nhật 2026-08-11: thêm `activated`)*.
  ⚠️ **KHÔNG có `code`, `tier`, `orderCount`, `totalSpent`, `lastPurchaseDate`** — dù mockup
  `10-khach-hang.png` vẽ 4 cột cuối. Hồ sơ khách map từ `SysUser`. *(Backend nay ĐÃ có domain đơn
  hàng ⇒ về lý thuyết tính được các chỉ số này, nhưng **`CustomerResDTO` vẫn chưa trả** — muốn có
  phải xin backend bổ sung.)*
- ⚠️ **`activated` giờ CÓ trong JSON** *(2026-08-11 — trước đây ghi "không xuất hiện", không còn
  đúng)*. Khách tạo tại quầy có **`activated: false`** ⇒ chưa đăng nhập storefront được cho tới khi
  tự kích hoạt. **`activated` KHÁC `status`**: `status` = khoá/mở bản ghi (do admin đặt),
  `activated` = đã kích hoạt tài khoản hay chưa (do khách tự làm). Màn Khách hàng **phải phân biệt
  hai thứ này**, đừng gộp thành một badge.
- `CreateCustomerReqDTO` bắt buộc `fullName` + `phoneNumber`; **`dob` là `date-time`** — gửi
  `"1995-04-12"` (date thuần) bị **từ chối `400 error.input.invalid`**, phải gửi
  `"1995-04-12T00:00:00Z"`; `email` bỏ trống ⇒ backend tự sinh `{phoneNumber}@example.com`.
  ⚠️ **`branchId` nay là TUỲ CHỌN với mọi role** — xem "Phase 3b" bên dưới.
- **`UpdateCustomerReqDTO` chỉ có `{fullName, email, dob, gender}`** — **không** đổi được
  `phoneNumber`/`branchId`/`status` (mapper backend `@Mapping(ignore)` các field này).
- `CustomerSearchReqDTO` = `{keyword, status, branchId}`; `branchId` nay là **filter tuỳ chọn cho
  mọi role** (xem "Phase 3b").
- `GET /customer/duplicates?phone=` là **`[ADMIN]`** (STAFF gọi ⇒ 403), trả
  `{exists, viewable, customer}`. Tạo trùng SĐT ⇒ `code:3`, `subKey: error.phone.existed`.
- **Không có endpoint xoá khách hàng, đổi trạng thái khách hàng, hay gộp (merge) hồ sơ trùng.**

#### ⚠️ **Phase 3b (2026-08-28) — KHÁCH HÀNG LÀ TOÀN CỤC, BỎ HẲN BRANCH DATA-SCOPE**

> Nguồn: `35.1.eloria-backend/docs/api/phase-3b-khach-toan-cuc-review.md`.
> **Mâu thuẫn với mô tả Phase 3 phía trên ⇒ Phase 3b thắng.** Schema **không đổi**, không migration.

`sys_user.branch_id` của khách **đổi ý nghĩa**: từ "chi nhánh sở hữu (dùng để chặn truy cập)" thành
**"chi nhánh đăng ký"** — chỉ là thông tin tham khảo, **có thể `NULL`**. Mục đích: tích điểm
(`membershipPoint`), hoá đơn, lịch sử mua **xuyên chi nhánh** trên **một** hồ sơ khách duy nhất.

| Endpoint | Trước (Phase 3) | **Sau (Phase 3b)** |
|---|---|---|
| `POST /customer/search` | STAFF/ADMIN bị ép về chi nhánh mình; chỉ SUPER_ADMIN lọc `branchId` | **Mọi role thấy toàn bộ khách**; `branchId` là filter **tuỳ chọn cho mọi role** |
| `GET /customer/{id}` | Khác chi nhánh ⇒ `403` | **Xem được mọi khách** |
| `PUT /customer/{id}` | ADMIN chỉ sửa khách chi nhánh mình | **ADMIN+ sửa được mọi khách** |
| `GET /customer/duplicates` | Khác chi nhánh ⇒ `exists:true, viewable:false, customer:null` | **`viewable` LUÔN `true`** khi `exists`, trả đủ hồ sơ |
| `POST /customer` | SUPER_ADMIN bắt buộc `branchId`; STAFF/ADMIN bị ép chi nhánh mình | **`branchId` tuỳ chọn**; bỏ trống ⇒ mặc định chi nhánh người tạo; **có thể `NULL`** |
| Gắn khách vào đơn (`POST`/`PUT /order`) | Khách khác chi nhánh ⇒ `403 error.forbidden` | **Gắn được khách bất kỳ**, không giới hạn chi nhánh |

- **RBAC không đổi** — STAFF đọc/tạo, ADMIN sửa; `@PreAuthorize` giữ nguyên. Chỉ **data-scope** đổi.
- ⚠️ **Breaking nhẹ cho FE**: `duplicates.viewable` **luôn `true`** khi `exists: true` (field vẫn
  giữ để tương thích client cũ) ⇒ **nhánh xử lý "trùng SĐT nhưng không xem được hồ sơ" đã chết**,
  đừng dựng UI cho nó nữa.
- ⚠️ **`error.branch.required` (`code:14`) khi tạo khách không còn phát sinh** — bỏ validate bắt buộc
  chi nhánh. Key i18n giữ lại chỉ để đọc log cũ.
- **Tính duy nhất SĐT vốn đã toàn cục** (`existsByPhoneNumber` không lọc branch) nên không phát sinh
  trùng mới khi mở phạm vi.
- **Không đụng tới** `update-segment` / `merge` / `update-status` / xoá mềm khách — vẫn chưa có.

⇒ **FE phải**: bỏ điều kiện chỉ-SUPER_ADMIN của bộ lọc chi nhánh ở màn Khách hàng · bỏ yêu cầu bắt
buộc `branchId` khi tạo khách · bỏ nhánh `viewable === false` · bỏ mọi ghi chú/UI ngụ ý khách bị
giới hạn theo chi nhánh (kể cả ô tra khách ở màn POS).

**Chi tiết domain sản phẩm — xác minh khi code Phase 9 (2026-08-09), đối chiếu api-docs + source
backend + gọi API thật:**

- **Phân quyền khác các domain khác: đọc `[STAFF]`, ghi `[SUPER_ADMIN]`** cho *toàn bộ*
  product/sku/category/brand/color/size — **ADMIN gọi API ghi cũng 403** (đã test).
- `ProductResDTO` = `{id, code, name, slug, price, shortDescription, description, gender, status,
  brandId, brandName, material, metadata, sizeGroup, images[], categories[], createdDate, lastModifiedDate}`.
  **Không có tồn kho, không có vòng đời SKU, không có ảnh đại diện riêng.**
  ⚠️ **`categories` LUÔN rỗng `[]` ở `POST /product/search`**, chỉ được populate ở `GET /product/{id}`.
  ⚠️ **`GET /product/{id}` KHÔNG trả kèm SKU** dù `summary` ghi "+ bảng SKU" — phải gọi
  `POST /sku/search` với `{productId}`.
- `material` là **enum fix cứng** `COTTON | LINEN | SILK | WOOL` — không có API danh mục chất liệu.
  Cũng **không có** API nhà cung cấp / bộ sưu tập mùa.
- `UpdateProductReqDTO` **bỏ `code`** (không sửa được mã); `CreateCategoryReqDTO` và
  `UpdateCategoryReqDTO` thì **cùng bộ field** (danh mục sửa được `code`).
- `POST /product/{id}/generate-sku` nhận `{colorIds[], sizeIds[]}`, **idempotent** (ô đã có SKU thì
  bỏ qua), trả **toàn bộ** SKU hiện có của sản phẩm.
- `POST /product/{id}/images` là **multipart** (field `files`, tối đa 10), **thay toàn bộ gallery**
  theo thứ tự file truyền lên ⇒ api-client phải bỏ header `Content-Type` khi body là `FormData`.
- `Sku.status` theo đúng **quy ước 3 giá trị chung** (xem mục "Quy ước `status` 3 giá trị"):
  bật/tắt qua `sku/update-status` (0/1), xoá mềm qua `DELETE /sku/{id}` — **hai API tách biệt**.
  Vòng đời New/Markdown/Ngừng KD trong mockup vẫn **chưa có** enum riêng (ghi chú `Sku.java`:
  "để dành cho sau"), đừng nhầm với `status`.
- ⚠️ **`SkuResDTO` = `{id, skuCode, ean, status, productId, productName, unitPrice, colorId,
  colorName, sizeId, sizeLabel, createdDate}`** — **`weightGram` đã bị xoá (2026-08-11)**, và
  **`id` nay là MÃ SKU trùng `skuCode`** (xem BREAKING ở đầu file). `ean` vẫn là field riêng cho
  barcode, **không** đổi theo.
- ⚠️ **`SkuResDTO` có thêm `unitPrice`** — field **mới, xuất hiện cùng domain đơn hàng (2026-08-11)**,
  khảo sát 2026-08-09 chưa có. Hiện **luôn `null`** trên dữ liệu thật: không API nào đặt được giá
  theo SKU (`CreateProductReqDTO` và `GenerateSkuReqDTO` đều không nhận field này) ⇒ chỗ nào cần
  giá bán phải **fallback về `Product.price`**, đừng hiển thị thẳng `unitPrice`.
- `color/search` và `size/search` trả `BaseListRes` (không `activeTotal`); `product`/`category`/
  `brand`/`sku` trả `BaseListResStatus`.
- **`GET /sku/{id}/barcode`** (`[STAFF]`) — trả **ảnh PNG EAN-13** (không bọc `BaseResponse`) để
  hiển thị/in tem. FE gọi qua `apiClient.getBlob()`; `apiClient.get()` sẽ hỏng vì `unwrap` đọc
  `body.code`. `DELETE /sku/{id}` (`[SUPER_ADMIN]`, xoá mềm) cũng đã có — **cập nhật 2026-08-10**,
  trước đó trả 405 vì server chạy bản build cũ.
- **Không có `DELETE /product/{id}`** (trả 405, không có ở cả source lẫn api-docs). Xoá danh mục/
  thương hiệu bị chặn khi còn ràng buộc: `error.category.hasChildren`, `error.brand.hasProducts`.
  `DELETE /color/{id}` và `DELETE /size/{id}` là **hard delete** (chặn nếu còn SKU tham chiếu).

### Domain Dashboard & Báo cáo — **MỚI 2026-08-29** (88 path), kiểm thử thật khi code Phase 12

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase7.md`. FE đã **đo thật đủ 5 endpoint,
> 3 role, và các case biên** — khớp tài liệu, trừ **1 điểm lệch** ghi ở cuối mục.

| Nhóm | Role tối thiểu | Endpoint |
|---|---|---|
| Dashboard | `STAFF` | `GET /dashboard/summary?fromDate&toDate[&branchId]` |
| BC bán hàng | `STAFF` | `POST /report/sales` |
| BC lãi gộp | `ADMIN` | `POST /report/profit` |
| BC xuất-nhập-tồn | `ADMIN` | `POST /report/inventory` |
| So sánh chi nhánh | `SUPER_ADMIN` | `GET /report/branch-comparison?fromDate&toDate` |

**Quy tắc số liệu (backend chốt — FE chỉ hiển thị, KHÔNG tự tính lại):**

- **Doanh thu chỉ tính đơn `COMPLETED`**, theo **ngày tạo đơn**. Đơn PENDING/CANCELLED không vào
  tiền, nhưng `statusBreakdown` **vẫn đếm** để xem pipeline.
- `grossSubtotal` = tiền gốc · `discountTotal` = tổng giảm (dòng + chung) ·
  **`netRevenue = grossSubtotal − discountTotal`** · **`revenue = totalAmount`** (đã gồm ship).
- `cogs` = giá vốn snapshot lúc bán · `grossProfit = netRevenue − cogs` ·
  `marginPercent = grossProfit / netRevenue × 100`.
- **Không phân trang**: trả trọn `rows` + các trường `total*`. Không có `page`/`size`/`sort`,
  không lồng `data.data` ⇒ **không dùng helper `search()`**, cũng đừng gắn `DataTable` sort vào.

⚠️ **`marginPercent` là `null` khi `netRevenue <= 0`** (đo thật: khoảng ngày rỗng ⇒
`totalMarginPercent: null`). Mọi chỗ hiển thị phải render `—`, đừng `.toFixed()` thẳng.

⚠️ **`missingCostQty > 0` ⇒ COGS thiếu ⇒ lãi gộp bị THỔI PHỒNG.** Backend yêu cầu FE cảnh báo;
đã dựng ở cả Dashboard lẫn tab Lãi gộp. Dữ liệu thật hiện `missingCostQty: 140/143` (hầu hết SKU
chưa có giá vốn) nên cảnh báo này **luôn hiện** cho tới khi nhập giá vốn — đúng, không phải bug.

⚠️ **`fromDate`/`toDate` BẮT BUỘC ở cả 5 endpoint.** Thiếu ⇒ `400 error.input.invalid` (`code:7`);
`fromDate > toDate` ⇒ `400` **`code:14`** (`Thiếu dữ liệu truyền vào` — thông báo không khớp lỗi
thật, đừng hiện thẳng cho người dùng). FE chặn sẵn khoảng ngày sai trước khi gọi.

⚠️ **Múi giờ**: backend gom nhóm ngày/tháng theo **giờ VN (UTC+7)** nhưng nhận tham số **UTC**.
FE quy đổi ở `lib/report-range.ts` — máy chạy đúng giờ VN thì khớp; máy lệch múi giờ sẽ lấy sai
biên ngày. **Đã biết, không tự bù trừ ở FE** để tránh sai kép nếu backend đổi cách quy đổi.

**Data-scope (đo thật bằng 3 tài khoản):** `scope` trả về là `STAFF_SELF | BRANCH | CHAIN`.
`branchId` **chỉ SUPER_ADMIN dùng được**; STAFF/ADMIN gửi lên **bị bỏ qua trong im lặng**
(ADMIN ép `branchId` chi nhánh khác vẫn nhận đúng chi nhánh mình) ⇒ **chỉ bày bộ lọc chi nhánh
cho SUPER_ADMIN**, bày cho role thấp hơn là đánh lừa người dùng. `GET /report/branch-comparison`
**không nhận `branchId`** và DTO của nó **không có `scope`** — luôn toàn chuỗi.

**Ý nghĩa `key`/`label` theo `groupBy`** (báo cáo bán hàng): `DAY` → `yyyy-MM-dd` · `MONTH` →
`yyyy-MM` · `BRANCH`/`STAFF` → `key` = id, `label` = tên (NV đã xoá ⇒ label rơi về id) ·
`CHANNEL` → `ONLINE|POS|OTHER` · `PRODUCT` → `key` = mã SKU, `label` = tên SP.

⚠️ **`shippingTotal` là `null` khi `groupBy = PRODUCT`** — phí ship thuộc về đơn, không chia được
về từng SKU. Đã đo thật.

⚠️ **Nhóm `PRODUCT` của BC lãi gộp không so sánh tuyệt đối được** với DAY/MONTH/BRANCH:
`netRevenue` cấp SKU = Σ `line_total` (đã trừ giảm-**dòng**, *không* trừ giảm-**chung** cả đơn)
⇒ tổng theo PRODUCT có thể **cao hơn** nhóm khác. Chỉ dùng xếp hạng tương đối giữa các SKU.

⚠️ **BC xuất-nhập-tồn trộn 3 mốc thời gian trong cùng một dòng** — đừng cộng trừ để "kiểm tra":
`inQty`/`outQty`/`transferOutQty` theo **ngày phiếu** (chỉ phiếu **đã duyệt**) · `soldQty` theo
**ngày đơn** · `currentTotal` là tồn **tại thời điểm gọi API**, không theo kỳ lọc. Phiếu
`TRANSFER` **chỉ ghi chiều xuất ở chi nhánh nguồn**, không có cột "chuyển đến".

**❗ Lệch tài liệu (đo thật 2026-08-29):** handoff §B2 ghi *"nhóm PRODUCT ⇒ `orderCount = null`"*
nhưng **API thật vẫn trả số** (`orderCount: 1`, `11`). Chỉ `shippingTotal` là `null` thật.
FE khai kiểu nullable và phòng cả hai nhánh — nếu backend sửa lại cho khớp tài liệu thì FE
không cần đổi.

⚠️ **`groupBy` chỉ nhận MỘT chiều** — không có `MONTH × BRANCH`. Biểu đồ "doanh thu theo tháng,
so sánh chi nhánh" của mockup `01` vì vậy phải gọi **1 request cho mỗi chi nhánh**
(`groupBy: MONTH` + `branchId`) rồi ghép ở FE. Chỉ làm được với **SUPER_ADMIN** (role khác không
truyền được `branchId`) và chỉ an toàn khi số chi nhánh nhỏ — xem `branch-month-chart.tsx`.

⚠️ **Báo cáo KHÔNG trả danh sách đơn** — cả 5 endpoint đều là số đã gom nhóm. Khối "Đơn hàng gần
đây" của mockup `01` phải lấy từ `POST /order/search`, không có đường nào khác.

⚠️ **`TopProductRow` không có danh mục sản phẩm** (`{skuId, skuCode, productName, itemsSold,
netRevenue}`) và **không có ảnh**. Tra thêm qua `/product/search` cũng vô ích vì `categories`
**luôn rỗng** ở API danh sách. Cột "Danh mục" của mockup ⇒ hiển thị `—`.

### Cập nhật 2026-08-30 — `groupBy: YEAR` + chặn kỳ quá dài + vá bug lãi gộp

Backend đã làm xong 3 việc FE đề xuất ở `docs/backend-request-year-granularity.md` (đã kiểm thử thật):

1. **`groupBy: YEAR`** — `EReportGroupBy` nay **7 giá trị**
   (`DAY|MONTH|YEAR|BRANCH|CHANNEL|STAFF|PRODUCT`). `key` dạng `yyyy`, cắt theo **giờ VN**.
   Áp dụng cho cả `/report/sales` và `/report/profit`.
2. **Trần độ dài kỳ** — mã lỗi **mới `error.report.rangeTooLong`** (HTTP 400, `code: 7`):
   `MAX_DAY_BUCKETS = 31` · `MAX_MONTH_BUCKETS = 24` · `MAX_YEAR_BUCKETS = 10`.
   Nhóm **không theo thời gian** (`BRANCH|CHANNEL|STAFF|PRODUCT`) **không bị giới hạn**.
3. 🐞 **Vá bug lãi gộp** — `/report/profit` với `groupBy = CHANNEL|STAFF` trước đây **lọt qua và
   trả dữ liệu gom theo NGÀY** nhưng vẫn dán nhãn `groupBy: "CHANNEL"` (sai số liệu trong im lặng).
   Nay trả **`400`** đúng như Javadoc đã cam kết. ⇒ `/report/sales` nhận **7** giá trị,
   `/report/profit` chỉ nhận **5**.

⚠️ **Backend đếm ô theo GIỜ VN, nhưng nhận tham số UTC** (`from.atZone(VN_ZONE).toLocalDate()`).
Gửi `toDate` là `2026-12-31T23:59:59Z` sẽ bị quy thành **`2027-01-01` giờ VN** ⇒ **thừa 1 ô** ⇒
chặn oan. FE tránh được nhờ `toIsoUtc(endOfDay(...))` sinh ra `T16:59:59Z` (đo thật trên máy giờ VN:
`2026-12-31T16:59:59Z` → `23:59:59` giờ VN, đúng biên). ⇒ **Test API bằng curl phải gửi
`T16:59:59Z`, đừng gõ tay `T23:59:59Z`** rồi tưởng FE sai.

⚠️ **FE chặn DAY ở 30, backend cho 31** — **cố ý**, không phải lệch: user chốt *"ngày không được
quá 30 ngày"*. Backend nới hơn 1 ô là hàng rào phòng thủ, FE mới là nơi ràng buộc nghiệp vụ.

**Chưa có (backend ghi "đợt sau", FE chưa cần lo):** nút **Export Excel/PDF**
(`POST /report/{type}/export` — hiện chỉ trả JSON) · giá vốn nâng cao FIFO/bình quân (hiện dùng
`product.cost_price` phẳng) · báo cáo size-curve / hàng chậm luân chuyển.

### Giá vốn sản phẩm (`costPrice`) — Phase 7 đợt 1, **kiểm thử API thật 2026-08-29**

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase7-cost.md`. FE đã **đo thật 9/9 case, khớp
> 100% tài liệu**. Đây là **nền tảng cho báo cáo lãi gộp** ở đợt sau, chưa dùng để hiển thị ở đâu khác.

`ProductResDTO` · `CreateProductReqDTO` · `UpdateProductReqDTO` đều có thêm **`costPrice`**
(number, **nullable**, `@DecimalMin(0)`). Quyền **không đổi**: đọc `[STAFF]`, ghi `[SUPER_ADMIN]`.

| Case | Đo thật |
|---|---|
| `POST` kèm `costPrice: 150000` | `costPrice: 150000` ✓ |
| `POST` bỏ trống | `costPrice: null` ✓ |
| `POST` `costPrice: -5` | `400` `code:7` `error.input.invalid` ✓ |
| `PUT` **bỏ hẳn** field | **giữ nguyên** giá cũ ✓ |
| `PUT` `costPrice: null` | **giữ nguyên** giá cũ ✓ |
| `PUT` `costPrice: 180000` | đổi thành `180000` ✓ |
| **`PUT` `costPrice: 0`** | **lưu đúng `0`** (không bị coi là rỗng) ✓ |
| STAFF `PUT` | `403` ✓ |

⚠️ **Không có cách nào XOÁ giá vốn về `null`** sau khi đã nhập — cả `undefined` lẫn `null` đều được
backend hiểu là "giữ nguyên" (partial-update chung của product). Chỉ đổi sang số khác được.
⇒ FE **không dựng nút "xoá giá vốn"**; ô để trống khi sửa nghĩa là *giữ nguyên*, và hint trong form
phải nói đúng như vậy (`costPriceKeepHint`), đừng để người dùng tưởng bỏ trống là xoá.

⚠️ **`0` KHÁC rỗng.** Chỗ nào đọc ô nhập phải so **`trim() === ''`**, tuyệt đối không dùng falsy
check (`!value`) — `0` là giá vốn hợp lệ và backend lưu đúng `0`, dùng `!value` sẽ nuốt mất.

⚠️ **Backend TRẢ `costPrice` cho cả STAFF** (đo thật: STAFF `GET /product/{id}` vẫn thấy `costPrice`)
— **không** ẩn field phía server. ⇒ Việc giấu giá vốn khỏi STAFF/ADMIN **hoàn toàn dựa vào FE**
(gate `canWrite` ở `product-detail-modal.tsx`). Đây là **che ở UI, không phải bảo mật** — nếu user
coi giá vốn là số liệu nhạy cảm thật thì phải **xin backend lọc field theo role**.

**Giá vốn KHÔNG xuất hiện ở màn bán hàng/đơn/hoá đơn** — backend tự chụp (snapshot) vào đơn lúc tạo,
cố tình không lộ cho khách. FE **không được** đưa `costPrice` sang POS/đơn hàng/hoá đơn.

### Domain Kho & Tồn kho — khảo sát api-docs + test API thật khi code Phase 10 (**2026-08-10**)

Backend **đã có API kho thật** (khác hoàn toàn khảo sát 2026-08-09 ghi "chưa có").

| Nhóm | Role | Endpoint |
|---|---|---|
| Tồn kho | `STAFF` | `POST /stock-item/search` · `GET /stock-item/alerts?branchId=` |
| Phiếu kho | `STAFF` | `POST /warehouse-ledger/search` · `GET /warehouse-ledger/{id}` · `POST /warehouse-ledger` · `POST /warehouse-ledger/{id}/submit` |
| Duyệt phiếu | `ADMIN` | `POST /warehouse-ledger/{id}/approve` · `POST /warehouse-ledger/{id}/reject` |
| Kiểm kê | `STAFF` | `POST /stock-count` |
| Xuất huỷ | `ADMIN` | `POST /stock-disposal` |

⚠️ **Đường dẫn thật là `/stock-count` và `/stock-disposal` ở gốc**, KHÔNG phải
`/stock-operation/stock-count` như tên class `StockOperationResource` gợi ý — đọc api-docs, đừng suy
từ tên file Java.

- **Một entity `WarehouseLedger` gánh cả nhập/xuất/chuyển** (`type` = `IN | OUT | TRANSFER`), không
  có entity "phiếu nhập" riêng. `TRANSFER` bắt buộc `toBranchId` khác chi nhánh nguồn.
- Vòng đời: `DRAFT → WAITING_APPROVAL → ACCEPTED | REJECTED`. **Chỉ `ACCEPTED` mới ghi tồn thật**
  (IN cộng, OUT trừ, TRANSFER trừ nguồn + cộng đích) — đã kiểm chứng: duyệt xong tồn tăng đúng số.
- ⚠️ **`lines` trả `null` ở `POST /warehouse-ledger/search`**, chỉ populate ở `GET /{id}`
  (giống hệt `categories` rỗng ở `product/search`). Mọi chỗ đọc `lines` từ danh sách phải phòng null.
  Hệ quả: **không dựng được cột "Tổng SL" ở bảng danh sách** nếu không muốn N+1 request.
- ⚠️ **Backend chặn tự duyệt phiếu do chính mình tạo** — `createdBy` là **username** (không phải id),
  lỗi `error.warehouseLedger.cannotApproveOwn` HTTP **403**. FE phải khoá nút trước, đừng để bấm rồi mới lỗi.
- `WarehouseLedgerLineReqDTO` là **danh sách dòng phẳng** `{skuId, quantity}` — **không có khái niệm
  ma trận size × màu** như mockup `14` mô tả. `quantity` luôn dương, chiều tăng/giảm do `type` quyết định.
- `StockItemResDTO` = `{id, skuId, skuCode, productName, colorName, sizeLabel, branchId, branchName,
  total, available, minStock}` *(⚠️ **`reserved` đã bị xoá 2026-08-14** — xem mục "Mô hình tồn kho").
  **`available` nay luôn bằng `total`**, không còn phép trừ nào.
  **`skuId` nay là MÃ SKU** (`SP001-BK-AO-L`), dùng cả ở filter `body.skuId` — đã test.
- ⚠️ **`minStock` KHÔNG còn nullable — luôn có số, mặc định `0`** *(đổi 2026-08-11; trước đây luôn
  `null`)*. Kiểm chứng: 20/20 dòng tồn đều `minStock: 0`. **Vẫn chưa có API nào để đặt ngưỡng** ⇒
  `GET /stock-item/alerts` (điều kiện `available <= min_stock`) giờ chỉ nổ khi **`available <= 0`**,
  tức trùng nghĩa "hết hàng" chứ chưa phải cảnh báo tồn thấp thật sự. `alertType` vẫn chỉ có
  `"LOW_STOCK"`. ⇒ FE **bỏ nhánh xử lý `minStock === null`**, nhưng vẫn chưa dựng được cảnh báo
  tồn thấp đúng nghĩa cho tới khi có API đặt ngưỡng.
- `POST /stock-count` nhận `{branchId, description, lines:[{skuId, countedQuantity}]}`, tự so với tồn
  hệ thống, trả **mảng 1–2 phiếu điều chỉnh DRAFT**. Không chênh lệch ⇒ lỗi `error.stock.countNoDiff`.
- subKey lỗi (từ `Constants.SUBKEY`): `error.warehouseLedger.{notExisted, invalidStatus, lineRequired,
  transferBranchRequired, transferSameBranch, cannotApproveOwn}` · `error.stock.{insufficient, countNoDiff}`.

### Domain Đơn hàng — **MỚI, khảo sát lại `/v3/api-docs/api` ngày 2026-08-11**

⚠️ **Đảo ngược kết luận 2026-08-10** ("chưa có entity/resource nào, mới chỉ khai enum"). Backend
**đã có domain đơn hàng đầy đủ** — 13 endpoint `/order/*` + `POST /websocket`. Đây là thứ **Phase 11
đang chờ**; PLAN mục B7 (trạng thái đơn lệch 3 nơi) nay **đã có lời giải từ backend**.

| Nhóm | Role | Endpoint |
|---|---|---|
| Giỏ & tạo đơn | `STAFF` | `POST /order/cart/preview` (tính tiền, không ghi DB) · `POST /order` (→PENDING, **TRỪ TỒN NGAY** — xem "Mô hình tồn kho") |
| Đọc | `STAFF` | `POST /order/search` · `GET /order/{id}` · `GET /order/{id}/invoice` (JSON để FE tự in) |
| Sửa/huỷ | `STAFF` | `PUT /order/{id}` (chỉ khi còn PENDING) · `POST /order/{id}/cancel` (hoàn tồn) · `POST /order/{id}/note` |
| Chuyển trạng thái | `STAFF` | `/confirm` (PENDING→CONFIRMED) · `/pack` (CONFIRMED→PACKED, **không trừ tồn lần hai**) · `/ship` (PACKED→SHIPPING) · `/complete` (SHIPPING + đã thu → COMPLETED) |
| Thanh toán | `STAFF` | `POST /order/{id}/payment` — ⚠️ **thu ĐÚNG 1 LẦN cho toàn bộ tiền** (đổi 2026-08-15, xem mục "Mô hình thanh toán") |

⚠️ **Cập nhật 2026-08-21**: dòng hàng nay có **`lines[].discountAmount`** (giảm giá 2 tầng) và có thêm
domain **tài khoản ngân hàng / VietQR** cho luồng thu tiền chuyển khoản — xem hai mục
"Giảm giá đơn hàng — 2 TẦNG" và "Domain Tài khoản ngân hàng & VietQR" bên dưới.

- **`EOrderStatus` thực tế có 8 giá trị**, không phải 4 như ghi nhận cũ:
  `PENDING | CONFIRMED | PACKED | SHIPPING | SHIPPED | COMPLETED | CANCELLED | REJECTED`
  ⇒ **B7 đã được backend chốt**, FE bám đúng 8 giá trị này, không tự map sang 5 trạng thái của mockup `04`.
- **`channel` ĐÃ CÓ**: `ONLINE | POS | OTHER` (khảo sát cũ ghi "BE không có `channel`" — **không còn đúng**),
  khớp 3 tab của mockup `04`. `paymentStatus` = `UNPAID | PAID | REFUNDED`;
  `paymentMethod` = `CASH | CARD | QR | VOUCHER | POINT | STORE_CREDIT | COD`; `type` = `PURCHASE | REFUND`.
- ⚠️ **Động tồn — ĐÃ ĐỔI KIẾN TRÚC 2026-08-14, xem mục "Mô hình tồn kho" bên dưới.**
  Ghi chép cũ ("`POST /order` giữ tồn qua `reserved`, `/pack` mới trừ thật") **KHÔNG CÒN ĐÚNG**.
- `CartPreviewLineResDTO` trả sẵn `available` + `insufficient` theo từng dòng ⇒ **màn POS không cần
  tự tra tồn**, cứ gọi preview là biết dòng nào thiếu hàng.
- `OrderSearchReqDTO` = `{keyword, status, orderStatus, paymentStatus, channel, branchId, fromDate, toDate}`
  — lưu ý **`orderStatus`** (vòng đời, chuỗi) tách khỏi **`status`** (0/1 bản ghi), đúng pattern
  `ledgerStatus` của phiếu kho.
- `OrderResDTO.shiftId` đã có sẵn field nhưng **chưa có API ca làm việc** ⇒ Phase 15 vẫn chờ.

#### Cập nhật 2026-08-14 (backend rà soát & fix Phase 6) — đã kiểm thử lại toàn bộ

- ⚠️ **`OrderResDTO` BỎ field `createdBy`** (breaking, đã xác nhận trên api-docs + JSON thật).
  Dùng **`staffId`** để biết ai tạo đơn. Riêng **`OrderPaymentResDTO` VẪN GIỮ `createdBy`**
  (username người thu tiền) — hai DTO khác nhau, đừng nhầm.
- **Mã lỗi mới: `error.concurrentModification` (HTTP 409)** — 2 thao tác đồng thời trên cùng đơn
  (pack × cancel, 2 lần thu tiền). Backend dùng optimistic lock `@Version` trên `order_sale`.
  FE gặp mã này nên **tải lại đơn rồi thử lại**, không phải lỗi người dùng.
  ⚠️ Xem cảnh báo về 500 ở mục dưới.
- **`PUT /order/{id}` nay đối soát lại `paymentStatus`**: sửa đơn làm tổng tiền **tăng** ⇒ về
  `UNPAID` (thu tiếp phần thiếu); **giảm** xuống ≤ số đã thu ⇒ `PAID`. Đã đo thật cả 2 chiều.
- **`POST /order/{id}/cancel`** ⇒ `paymentStatus = REFUNDED` nếu đơn đã thu. ⚠️ Từ 2026-08-15
  backend **tự sinh bản ghi hoàn tiền** — xem mục "Mô hình thanh toán" bên dưới.
- **`POST /order/{id}/note` bị chặn trên đơn `CANCELLED`** (`error.order.alreadyClosed`) — để
  không ghi đè mất lý do huỷ (backend lưu lý do vào chính `description`).
- **`customerId` khi tạo đơn nay được validate**: id không tồn tại / không phải role CUSTOMER ⇒
  `error.user.notExisted`. ⚠️ **Vế "khách khác chi nhánh ⇒ 403 `error.forbidden`" đã BỊ BỎ**
  (Phase 3b, 2026-08-28) — nay **gắn được khách bất kỳ vào đơn**, không giới hạn chi nhánh.
- **Xoá nhân viên bị chặn khi còn đơn chưa đóng** — `error.staff.referenced` (HTTP 400).
  Đơn đã COMPLETED/CANCELLED thì không chặn ⇒ huỷ/hoàn tất đơn xong mới xoá được.
- **Prefix mã đơn khi chi nhánh không có `code`** nay lấy 5 ký tự đầu viết tắt tên
  (`Chi nhánh Trung tâm` → `CNTT-…`), trước đây bị cắt còn 2 ký tự với tên nhiều từ.
- Tài liệu chi tiết module bán hàng: **`35.1.eloria-backend/docs/api/ban-hang-p6.md`** — có bảng
  subKey đầy đủ, quy tắc tồn/giá/thanh toán. Đọc file này trước khi code Phase 11.

##### ⚠️ Vấn đề backend còn tồn tại (đo thật 2026-08-14)

**Race nặng trên cùng MỘT đơn trả `500 error.other` thay vì `409`.** Optimistic lock `@Version`
**chặn đúng** (không bao giờ thu vượt tiền — đo 4/4 vòng), nhưng khi ≥3 request chồng nhau lên
cùng một đơn, MySQL sinh **InnoDB deadlock** (đã đọc `SHOW ENGINE INNODB STATUS`: 2 transaction
cùng `UPDATE order_sale … WHERE id=? AND version=0`). Spring gói thành `CannotAcquireLockException`,
**không phải** `ObjectOptimisticLockingFailureException` ⇒ không khớp handler 409 ⇒ rơi vào handler
`Exception` chung. Đo thật: 24 request đồng thời → **4× 200 · 4× 409 · 16× 500**.

⇒ **FE không được coi 500 ở luồng thanh toán là lỗi hệ thống tuyệt đối** — nhân viên thấy "lỗi hệ
thống" rồi bấm thu lại trong khi giao dịch có thể đã thành công. Phải **tải lại đơn để biết trạng
thái thật**. Backend nên bắt thêm `CannotAcquireLockException`/`DeadlockLoserDataAccessException`.

*(Lưu ý: đây là race trên **cùng một đơn** — hiếm trong vận hành thật. Race **tranh tồn giữa nhiều
đơn khác nhau** đã được kiểm chứng sạch: 6 đơn đồng thời → 2 thành công · 4 `error.stock.insufficient`
· 0 lỗi 500, tồn về 0 không âm.)*

### Vòng đời đơn tách theo kênh — **ĐỔI 2026-08-22: đơn POS TỰ HOÀN THÀNH khi thu tiền**

Bán tại quầy không có khâu giao vận ⇒ backend rút gọn vòng đời cho `channel === 'POS'`:

| Kênh | Vòng đời | FE phải làm gì |
|---|---|---|
| **`POS`** | `PENDING` --*payment*--> **`COMPLETED`** | **Chỉ gọi `POST /order/{id}/payment`.** Không gọi `confirm`/`pack`/`ship`/`complete` |
| `ONLINE` / `OTHER` | `PENDING → CONFIRMED → PACKED → SHIPPING → COMPLETED` | Đi đủ các bước như cũ |

- `POST /order/{id}/payment` với đơn POS **tự set `status = COMPLETED` + `completedDate`** trong
  cùng transaction (`OrderServiceImpl#payment`), bỏ qua cả 3 bước giữa.
- ⚠️ **Gọi `complete()` sau `pay()` trên đơn POS luôn lỗi `error.order.invalidStatus`** ⇒ FE
  **không bày nút vòng đời nào cho đơn POS** (`nextAction` trả `null` khi `channel === 'POS'`),
  đừng để người dùng bấm rồi mới báo lỗi.
- Đơn POS **đã huỷ/đã hoàn tất** thì bước thu tiền không đụng tới `status` (backend tự loại trừ
  `COMPLETED`/`CANCELLED`).

✅ **Đã kiểm thử trên server build mới 2026-08-22 — PASS toàn bộ:**

| Kịch bản | Kết quả đo thật |
|---|---|
| POS: tạo → `pay` | `PENDING` → **`COMPLETED`**, `completedDate` được set ✓ |
| POS: `complete` sau `pay` | `error.order.invalidStatus` ✓ (FE đã ẩn nút nên không bấm được) |
| POS: thu lần 2 | `error.order.alreadyPaid` ✓ |
| ONLINE: `pay` | vẫn `PENDING` — **không** tự hoàn thành ✓ |
| ONLINE: `confirm → pack → ship → complete` | chạy đủ 4 bước ✓ |
| Chiết khấu 2 tầng | `subtotal 500.000` · `discount 70.000` · `total 460.000` · `lineTotal 480.000` ✓ |
| VietQR | PNG **480×480** hợp lệ, HTTP 200 ✓ |
| Hoá đơn | đủ field kể cả `staffName` — **một lời gọi API là xong** ✓ |

⚠️ **Hệ quả cần biết: đơn POS đã thu tiền thì KHÔNG huỷ được nữa.** Vì `pay` đóng đơn thành
`COMPLETED` ngay, `POST /order/{id}/cancel` trả **`error.order.alreadyClosed`** ⇒ **không hoàn tiền
và không trả tồn được** qua API. Đo thật 2026-08-22. Trước đây đơn POS còn ở `PENDING` nên huỷ thoải
mái. FE hiện đã coi `COMPLETED` là trạng thái đóng (ẩn nút Huỷ + Thu tiền) nên **không ai bấm nhầm**,
nhưng nghiệp vụ **đổi/trả hàng tại quầy sẽ không có đường đi** cho tới khi có API đổi/trả riêng
(Phase 13, `type: REFUND` mới chỉ là enum). **Cần hỏi user/backend** nếu quầy có nhu cầu huỷ đơn vừa bán.

### Giảm giá đơn hàng — **2 TẦNG, khảo sát lại api-docs + kiểm thử thật 2026-08-21**

> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-discount-qr.md`. FE đã đo thật khớp 100%.

Trước đây đơn chỉ có **1 mức giảm chung**. Nay **2 tầng, đều nhập tay** (chưa có promo engine):

```
lineTotal (mỗi dòng)   = đơn giá × SL − lines[].discountAmount     ← TẦNG 1
subtotal (header)      = Σ (đơn giá × SL)          ← TIỀN GỐC, CHƯA trừ gì
discountAmount(header) = Σ lines[].discountAmount + giảm-chung     ← MỘT con số tổng
totalAmount            = max(0, subtotal − discountAmount + shippingFee)
```

- **Field mới duy nhất**: `lines[].discountAmount` (number ≥ 0, optional) — có ở cả 3 endpoint
  `POST /order/cart/preview`, `POST /order`, `PUT /order/{id}`.
- **Tầng 2** vẫn là `discountAmount` **hoặc** `discountPercent` ở cấp đơn; gửi cả hai thì **`%` thắng**,
  và `%` tính trên `subtotal` **gốc**.
- Backend tự clamp: giảm-dòng ∈ `[0, đơn giá × SL]`, dòng `isGift` ép 0, tổng giảm cap ≤ `subtotal`.
- `GET /order/{id}` và `GET /order/{id}/invoice` cũng trả `lines[].discountAmount` + `lines[].lineTotal`
  ⇒ **hoá đơn tách được chiết khấu từng sản phẩm**.

⚠️ **`subtotal` là GIÁ GỐC**, không phải "tạm tính sau giảm dòng". Con số "tổng đã giảm" hiển thị cho
khách chính là `discountAmount` ở header — **FE tuyệt đối không cộng lại 2 tầng**, backend đã gộp sẵn;
cộng thêm lần nữa là trừ hai lần.

⚠️ **FE phải gửi TÁCH 2 tầng** (`orderLines[].discountAmount` + `discountAmount` chung), và
**`CartPanel` (preview) với `CheckoutDialog` (tạo đơn) bắt buộc gửi giống hệt nhau** — lệch một chút
là số xem trước khác số thu thật. Vì vậy dòng hàng dạng-gửi-lên-backend được tính **một chỗ** ở
`CartProvider` (`orderLines`), không để mỗi màn tự map.

**Đo thật 2026-08-21** — 2 áo × 250.000, giảm dòng 20.000, giảm chung 10%:
`subtotal 500.000` · `discountAmount 70.000` (20.000 + 10%×500.000) · `totalAmount 430.000` ·
`lines[0].lineTotal 480.000`.

### Domain Tài khoản ngân hàng & VietQR — **MỚI 2026-08-21** (83 path)

| Nhóm | Role | Endpoint |
|---|---|---|
| Đọc | `STAFF` | `POST /bank-account/search` · `GET /bank-account/default` · `GET /bank-account/{id}` |
| **Ảnh QR đơn hàng** | `STAFF` | `GET /bank-account/order/{orderId}/qr` |
| Ghi | `SUPER_ADMIN` | `POST /bank-account` · `PUT /bank-account/{id}` · `POST /bank-account/{id}/set-default` · `POST /bank-account/update-status` · `DELETE /bank-account/{id}` |

- ⚠️ **`GET .../qr` trả PNG thuần, KHÔNG bọc `BaseResponse`** ⇒ bắt buộc `apiClient.getBlob()`
  (giống `GET /sku/{id}/barcode`); `get()` sẽ hỏng vì `unwrap` đọc `body.code`.
- Số tiền (`order.totalAmount`) và nội dung CK (`ELORIA` + mã đơn) **nhúng cứng trong ảnh** — FE không
  dựng, không sửa được. Caller phải tự `URL.revokeObjectURL`.
- Tài khoản **dùng chung toàn chuỗi, KHÔNG branch data-scope**; nhưng **đơn thì có** — STAFF/ADMIN chỉ
  lấy được QR của đơn chi nhánh mình (`error.forbidden`).
- Lỗi: `error.bankAccount.noDefault` (400, chưa cấu hình TK nhận tiền) · `error.order.notExisted` (404).
- ✅ **Đã chạy được từ 2026-08-21** (backend fix xong migration): `GET .../qr` trả **PNG 480×480**
  thật, `GET /bank-account/default` trả TK mặc định (MB Bank). Trước đó bảng `bank_account` chưa
  tồn tại nên trả 500 `error.other`. FE vẫn bắt **mọi** lỗi ở bước tải QR (không chỉ `noDefault`)
  để phòng môi trường chưa cấu hình TK.

### Luồng bán tại quầy — **ĐỔI 2026-08-29: tạo đơn xong hiện MODAL XEM TRƯỚC PHIẾU**

```
[Giỏ] → "Thanh toán" → CheckoutDialog (khách · giao hàng · hình thức thanh toán)
   → "Xác nhận & tạo đơn":  ① tạo hồ sơ khách vãng lai (nếu đủ tên+SĐT)  ② POST /order
   → OrderReceiptDialog (xem trước phiếu thật)
        ├─ "Xác nhận đã thanh toán" → POST /order/{id}/payment  (QR: mở QrPaymentDialog trước)
        ├─ "In hóa đơn"  ← **chỉ mở khoá sau khi PAID**
        ├─ "Xem đơn hàng" → /orders
        └─ "Tạo đơn mới"
```

- **`CheckoutDialog` chỉ tạo đơn**, không thu tiền. Mọi bước thu tiền nằm ở modal phiếu, nhờ vậy
  nhân viên luôn nhìn thấy nội dung phiếu trước khi xác nhận đã nhận tiền.
- **Khách đã có hồ sơ**: `CheckoutDialog` hiển thị lại tên + SĐT để đối chiếu (trước đây bị ẩn hẳn).
- ⚠️ **Khách vãng lai ⇒ tạo hồ sơ TRƯỚC khi tạo đơn**, không phải sau khi thu tiền: backend
  **không có API gắn khách vào đơn đã tạo** (`PUT /order/{id}` chỉ sửa được đơn còn `PENDING`, mà
  đơn POS nhảy thẳng `COMPLETED` ngay khi thu tiền). Tạo sau thì hồ sơ **không bao giờ nối được**
  với đơn vừa bán. Chỉ tạo khi có **đủ tên + SĐT hợp lệ**; tạo lỗi (hay gặp: `error.phone.existed`)
  thì **bỏ qua và bán tiếp** như khách vãng lai, không chặn bán hàng.
- Modal phiếu nạp `GET /order/{id}/invoice` — **cùng nguồn với bản in**, nên thứ xem trước luôn
  khớp thứ in ra, và bấm In không phải gọi API lần nữa.

### Luồng thanh toán QR (user chốt 2026-08-21)

```
[Đơn đã tạo] → GET /bank-account/order/{id}/qr → hiện ảnh cho khách quét
   → khách chuyển khoản → NV tự đối chiếu app ngân hàng
   → bấm "Xác nhận đã nhận tiền" → POST /order/{id}/payment {method:'QR'} → PAID
```

- **Hình thức `QR` KHÔNG thu thẳng** — phải qua dialog quét mã (`QrPaymentDialog`), áp dụng ở **cả**
  màn POS lẫn dialog chi tiết đơn. Tiền mặt/thẻ/COD vẫn thu thẳng như cũ.
- ⚠️ **Xác nhận là THỦ CÔNG**: backend **chưa có webhook banking** ⇒ FE không biết tiền đã về, nhân
  viên phải tự kiểm tra. Có webhook rồi thì thay chỗ này bằng polling/websocket, phần còn lại giữ nguyên.
- Ở POS, đơn được **tạo trước rồi mới hiện QR** ⇒ tồn đã trừ. Đóng dialog QR mà chưa xác nhận ⇒ báo ra
  ngoài là đơn **chưa thu tiền**, **tuyệt đối không tạo lại đơn**.

### In hoá đơn — **chỉ in khi đã `PAID`** (user chốt 2026-08-21)

- Nút "In hoá đơn" bị **disable khi `paymentStatus !== 'PAID'`**, kèm `title` giải thích — chặn ở **cả 2
  nơi**: dialog chi tiết đơn **và** dialog kết quả sau khi tạo đơn ở POS.
- ⚠️ **`InvoiceResDTO` chỉ có khối chi nhánh** — không có tên hệ thống, logo, hotline chung, chân trang.
  Javadoc backend ghi rõ *"letterhead/logo/QR ngân hàng do frontend tự gắn"* ⇒ FE khai ở
  **`storeConfig`** (`src/config/app.ts`, đọc từ `VITE_STORE_*`). Logo là **chữ** `é l o r i a`
  (lấy từ storefront `35.3.eloria-client`) — khoảng trắng giữa các ký tự là **cố ý**, đừng "sửa".
- ✅ **`InvoiceResDTO` có `staffName`** (field mới 2026-08-21) ⇒ in hoá đơn **chỉ cần gọi đúng một
  API `GET /order/{id}/invoice`**, không ghép thêm `/account/me` hay `GET /order/{id}`.
  ⚠️ Chỉ `InvoiceResDTO` có; `OrderResDTO` vẫn chỉ có `staffId` (UUID, không kèm tên).
- Khổ giấy in nhiệt **80mm**, cỡ chữ nền **13px** (trước 11–12px — người dùng phản hồi quá nhỏ).

⚠️ **Dữ liệu bẩn đã gặp (user chốt: để backend xử lý, FE không workaround)**: `branch.address` và
`staffName` trên dữ liệu seed đang bị **mojibake trong DB** (`Sá»‘ 1 ÄÆ°á»ng…`, `NhÃ¢n ViÃªn Má»™t`
— UTF-8 bị decode nhầm Latin-1 lúc **ghi**). Tên chi nhánh thì đúng. Hoá đơn in ra sẽ hiện y như
vậy; **không phải lỗi FE** — đừng thêm code "sửa" mã hoá ở FE, sẽ hỏng khi backend vá dữ liệu.

### Mô hình thanh toán — **ĐỔI 2026-08-15: THU ĐÚNG 1 LẦN, 1 HÌNH THỨC, TOÀN BỘ TIỀN**

> User chốt: bỏ hoàn toàn "thanh toán hỗn hợp / thu nhiều lần" của bản trước.
> Đã **kiểm thử API thật 23/23 PASS**.

**`POST /order/{id}/payment`:**

- **Body chỉ cần `{ "method": "QR" }`** (`CASH`/`CARD`/`COD`/… — **chuyển khoản dùng `QR`**).
  ⚠️ **Ngừng gửi `amount`** — backend luôn thu đúng `totalAmount`. `amount` vẫn còn trong DTO nhưng
  **bị bỏ qua hoàn toàn**: đo thật gửi `amount: 1` trên đơn 1.300.000 ⇒ vẫn ghi nhận đủ 1.300.000,
  **không báo lỗi**. Gửi gấp 99 lần cũng vậy.
- **Thu lần 2 trên đơn đã `PAID` ⇒ `error.order.alreadyPaid` (HTTP 400)** — mã lỗi **mới**.
  ⇒ FE phải **disable nút "Thu tiền" khi `paymentStatus === 'PAID'`**, đừng để bấm rồi mới báo lỗi.
- Thu tiền trên đơn `CANCELLED` ⇒ `error.order.alreadyClosed` (không đổi).
- ⚠️ **`error.order.paymentExceedsTotal` KHÔNG còn phát sinh** — backend tự lấy đúng số tiền nên
  không thể thu vượt. Key i18n giữ lại chỉ để đọc dữ liệu/log cũ.

**Hoàn tiền — không có endpoint riêng, không có nút "Hoàn tiền":**

- Huỷ đơn đã thu (`POST /order/{id}/cancel`) ⇒ backend **tự sinh bản ghi hoàn tiền** và đặt
  `paymentStatus = REFUNDED`. FE **chỉ hiển thị**, không phải gọi gì thêm.
- Đo thật: trước huỷ `paid=1.300.000, payments=1` → sau huỷ `paymentStatus=REFUNDED, paid=0,
  payments=2`; dòng hoàn có `description = "Hoàn tiền hủy đơn"`, cùng `method` với dòng thu.

**Cấu trúc `OrderResDTO.payments` (và trong invoice):**

- **Tối đa 2 phần tử** — DB có unique `ux_order_payment__order_status (order_id, status)` ⇒ mỗi đơn
  nhiều nhất **1 dòng `PAID` + 1 dòng `REFUNDED`**. Không còn danh sách nhiều dòng thu.
  ⇒ FE render đơn giản: một dòng *"Đã thanh toán (QR)"* và nếu có, một dòng *"Đã hoàn tiền"*.
- ⚠️ **`OrderPaymentResDTO.status` thực tế chỉ dùng 2 giá trị `PAID | REFUNDED`**, dù api-docs vẫn
  khai enum 3 giá trị `UNPAID | PAID | REFUNDED` (dùng chung enum với `order_sale.payment_status`).
  **Đừng dựng UI cho `UNPAID` ở cấp dòng payment** — dòng payment chỉ tồn tại khi đã thu.
- **`paidAmount` là số THỰC THU**: `= totalAmount` khi đã trả, **về `0` sau khi hoàn tiền**.
  ⇒ Đừng dùng `paidAmount > 0` để suy ra "đơn từng được thanh toán" — đơn đã hoàn tiền cũng `0`.
  Muốn biết đã từng thu thì đọc `payments[]` hoặc `paymentStatus === 'REFUNDED'`.
- Vòng đời `order_sale.payment_status`: **`UNPAID → PAID → REFUNDED`**. **Không còn `PARTIAL`.**

**Race 2 lần thu đồng thời** (đo thật): 1 request thành công, request kia trả
**`409 error.dataIntegrity.violation`** (unique constraint chặn) — *không phải* `alreadyPaid`.
Dữ liệu vẫn đúng: 1 dòng `PAID`, không thu vượt. FE nên xử lý cả hai mã lỗi như nhau: tải lại đơn.

### Mô hình tồn kho — **ĐỔI KIẾN TRÚC 2026-08-14: BỎ HẲN CƠ CHẾ GIỮ CHỖ**

> User chốt: **không đặt chỗ khi thêm vào giỏ** (khác đặt vé xem phim), **hết hàng thì báo lúc đặt
> đơn** (giống Shopee). Backend đã **xoá cột `stock_item.reserved` khỏi DB**, không chỉ khỏi API.

- ⚠️ **`reserved` BIẾN MẤT khỏi `StockItemResDTO` và `StockAlertResDTO`** — đã xác nhận trên
  api-docs, JSON thật, **và cả schema DB** (`SHOW COLUMNS FROM stock_item` không còn cột này).
  FE phải bỏ mọi tham chiếu `reserved`.
- **`available` giờ LUÔN BẰNG `total`.** Không còn phép trừ `total - reserved`. Đo thật: mọi dòng
  tồn đều `available === total`. Cột "Đang giữ" ở màn Tồn kho **không còn nguồn dữ liệu** ⇒ phải gỡ.
- ⚠️ **`POST /order` TRỪ TỒN THẬT NGAY LẬP TỨC** *(khác mô tả "chỉ báo hết hàng khi thanh toán")*.
  Đo thật: `total 58 → 53` ngay khi tạo đơn ở trạng thái `PENDING`.
  **`/pack` KHÔNG trừ lần hai** (đã kiểm chứng: `confirm 57 → pack 57`) — không có trừ kép.
- **Thiếu hàng ⇒ `error.stock.insufficient` (HTTP 400) NGAY tại `POST /order`**, đơn không được tạo
  và **tồn không bị hụt** (rollback sạch — đã đo). Đây là điểm chặn **duy nhất và sớm nhất**.
- **`/cancel` hoàn đủ tồn ở MỌI giai đoạn** (PENDING lẫn đã PACKED) — vì tồn đã trừ ngay từ đầu.
  Đo thật cả 2 case: `60 → 58 → 60`.
- `cart/preview` **vẫn** trả `available` + `insufficient` từng dòng để cảnh báo sớm trên UI, nhưng
  **preview không giữ chỗ** ⇒ giữa lúc preview và lúc bấm đặt đơn, tồn có thể đã bị đơn khác lấy mất.
  ⇒ **Màn POS phải xử lý `error.stock.insufficient` tại bước tạo đơn**, không được tin preview là chắc chắn.
- **Race tranh tồn đã kiểm chứng an toàn**: 6 đơn đồng thời cùng lấy nửa tồn → đúng 2 đơn thành công,
  4 đơn `error.stock.insufficient`, tồn về `0` **không âm**, không có lỗi 500 nào.

**Hệ quả tốt kèm theo:** bug *"phiếu kho điều chỉnh không duyệt được khi có tồn đang giữ"* (báo cáo
2026-08-14, do CHECK constraint `reserved <= total` mâu thuẫn với `decreaseTotalForAdjustment`)
**đã tự hết** — constraint nay rút gọn còn `CHECK (total >= 0)`. Kiểm chứng: kiểm kê giảm mạnh
`58 → 1` duyệt thành công.

⚠️ **Hệ quả cần cân nhắc ở Phase 11:** vì tồn bị trừ **ngay khi tạo đơn**, một đơn `PENDING` bị bỏ
quên sẽ **giam tồn vô thời hạn** — backend không có cơ chế tự huỷ/hết hạn đơn. Cần hỏi user cách xử lý.

📖 **Nguồn tham chiếu đầy đủ**: `35.1.eloria-backend/docs/api/ban-hang-p6.md` — backend đã cập nhật
tài liệu theo mô hình mới (§3 "Quy tắc tồn kho — mô hình KHÔNG giữ chỗ"). Đã đối chiếu: **khớp
hoàn toàn với kết quả đo thật của FE**.
- **`POST /websocket`** (`SendWsBodyDTO`) xuất hiện lần đầu — chưa rõ mục đích, **cần hỏi user/backend**
  trước khi dùng; không tự ý nối realtime.

**Vẫn chưa có** API: đổi/trả (`type: REFUND` mới chỉ là enum trên `OrderResDTO`, không có endpoint
riêng), khuyến mại, ca làm việc (shift), giá theo kênh ⇒ Phase 13/14/15 vẫn chờ backend.

Ngoài bậc role, backend còn **tự giới hạn phạm vi dữ liệu** (ghi trong `description` từng endpoint):
ADMIN chỉ thấy/tạo nhân viên chi nhánh mình và chỉ gán được role STAFF; điều chuyển chi nhánh chỉ SUPER_ADMIN.
FE vẫn phải chặn ở UI nhưng **không được coi đó là lớp bảo mật duy nhất**.

### Domain Khuyến mại & Coupon — **MỚI 2026-09-07** (100 path), đã kiểm thử API thật

> Nguồn: `35.1.eloria-backend/docs/api/khuyen-mai-p9.md`. FE đã chạy thử end-to-end
> (tạo KM → RUNNING → preview → cart/preview → coupon generate/export), dữ liệu test **đã dọn sạch**.

| Nhóm | Role tối thiểu | Endpoint |
|---|---|---|
| Đọc KM | `STAFF` | `POST /promotion/search` · `GET /promotion/{id}` |
| Thử áp KM cho giỏ | `STAFF` | `POST /promotion/preview` |
| Ghi KM | `ADMIN` | `POST /promotion` · `PUT /promotion/{id}` · `POST /promotion/{id}/update-status` |
| Coupon | `ADMIN` | `POST /coupon/generate` · `GET /coupon/export` (CSV) |

**MVP: chỉ `PERCENT`/`FIXED`, KHÔNG chồng KM — best-one-wins, mỗi đơn tối đa 1 KM.**
Engine chọn đúng 1 KM giảm nhiều nhất trong số KM tự động + coupon nhập.
Đo thật: coupon `FIXED 50.000` **thua** auto-promo `PERCENT 10% = 116.000`.

**Một bảng `promotion` gánh 3 vai** — đọc kỹ trước khi dựng UI:
`code = null` ⇒ **KM tự động** · `code` + `customerId = null` ⇒ **coupon công khai** ·
`code` + `customerId` ⇒ **coupon cá nhân**. `branchId = null` ⇒ toàn chuỗi.

⚠️ **`status` của KM là lifecycle enum `DRAFT|SCHEDULED|RUNNING|PAUSED|ENDED`, KHÔNG phải `0/1`**
— khác hẳn quy ước `EStatus` của mọi module trước. `PromotionSearchReqDTO` có **cả hai** field:
`status` (integer 0/1) **và** `promotionStatus` (enum) ⇒ lọc theo vòng đời phải dùng
**`promotionStatus`**, dùng nhầm `status` sẽ ra kết quả vô nghĩa.
**Không có xoá mềm, không có `DELETE`** — kết thúc KM = chuyển sang `ENDED`.
Tạo mới luôn ra `DRAFT`, phải `update-status` sang `RUNNING` mới có hiệu lực.
Chuyển hợp lệ: `DRAFT→SCHEDULED|RUNNING|ENDED` · `SCHEDULED→RUNNING|PAUSED|ENDED` ·
`RUNNING→PAUSED|ENDED` · `PAUSED→RUNNING|ENDED`; sai ⇒ `error.promotion.invalidStatus`.

⚠️ **`POST /promotion/{id}/update-status` trả `data: null`** dù api-docs khai `PromotionResDTO`
(đo thật). Trạng thái **có lưu đúng** (`GET` lại thấy `RUNNING`) ⇒ **bắt buộc refetch** sau khi đổi
trạng thái, tuyệt đối không gán response vào state.

⚠️ **Mã sai ⇒ `400 error.promotion.codeInvalid`** *(backend bổ sung 2026-09-08 theo yêu cầu của FE;
trước đó bị **nuốt im lặng** — ghi chép cũ "coupon sai không báo lỗi" **không còn đúng**)*.
Chỉ nổ khi **có gửi** `couponCode` mà mã không dùng được (không tồn tại / sai kênh / sai chi nhánh /
ngoài khung thời gian / chưa đủ `minAmount` / hết lượt). Không gửi mã ⇒ giữ nguyên hành vi cũ
(im lặng áp KM tự động). Mã **hợp lệ nhưng thua** best-one-wins một KM khác thì **không** bị coi là sai.
Kiểm chứng ở cả 4 endpoint: `POST /order`, `PUT /order/{id}`, `cart/preview`, `promotion/preview`.

⚠️ **Lỗi này làm hỏng CẢ request `cart/preview`** ⇒ gõ sai 1 ký tự là mất luôn khối tính tiền của giỏ.
FE vì vậy bắt riêng `subKey === 'error.promotion.codeInvalid'`, **giữ nguyên `preview` cũ** và chỉ bôi đỏ
ô mã (xem `cart-panel.tsx#couponError`) — nhân viên vẫn thấy tổng tiền để bán tiếp.

**Truy vết KM trên đơn** *(bổ sung 2026-09-08)*: `OrderResDTO` và `InvoiceResDTO` nay có
**`promotionId` · `promotionName` · `promotionCode`** ⇒ hoá đơn nói được **giảm vì đâu**.
`OrderSearchReqDTO.promotionId` lọc "các đơn đã dùng chương trình X".
⚠️ **`POST /order/search` trả `null`** cho cả 3 field (backend cố ý không join `promotion_log` ở danh
sách để tránh N+1) ⇒ **không dựng cột KM ở bảng Đơn hàng**, chỉ hiện ở dialog chi tiết/hoá đơn.

⚠️ **`GET /coupon/export` trả `text/csv` thuần, KHÔNG bọc `BaseResponse`** ⇒ phải dùng
`apiClient.getBlob()` (giống `sku/{id}/barcode` và `bank-account/order/{id}/qr`); `get()` sẽ hỏng vì
`unwrap` đọc `body.code`. `POST /coupon/generate` thì bọc bình thường, trả mảng chuỗi mã
(`{total, data: string[]}`), `count` ≤ 5000, mỗi mã = `codePrefix` + 8 ký tự ngẫu nhiên,
sinh ra đã ở `status = RUNNING` (**khác** KM thường sinh ra `DRAFT`).

**Tích hợp bán hàng** — `CreateOrderReqDTO` và `CartPreviewReqDTO` có thêm **`couponCode`**;
`CartPreviewResDTO` trả thêm **`promotionDiscount` · `promotionId` · `promotionName` ·
`promotionCode`**. Đo thật giỏ 2×`SP006-NV-QU-32` kênh POS với KM `ALL 10%`:
`subtotal 1.160.000` · `promotionDiscount 116.000` · `totalAmount 1.044.000`.
KM và **giảm giá tay (2 tầng) cộng dồn**, backend gộp cả hai vào `order_sale.discountAmount`,
cap ≤ `subtotal` ⇒ **FE không tự cộng lại**, đọc thẳng `discountAmount` header như quy ước cũ.
`PUT /order/{id}` (đơn PENDING) tự `release` KM cũ rồi áp lại; `/cancel` cũng `release` (hoàn quota).

**Branch scope:** non-SUPER_ADMIN **đọc** được KM toàn chuỗi + KM chi nhánh mình; **ADMIN tạo/sửa
chỉ chi nhánh mình** (truyền `branchId` khác ⇒ `error.promotion.branchForbidden`).
Đo thật RBAC: STAFF `POST /promotion` ⇒ **403**, STAFF `search` ⇒ **200**, ADMIN tạo ⇒ **200**.

subKey lỗi: `error.promotion.{notExisted, codeExisted, invalidValue, targetRequired, invalidDate,
invalidStatus, branchForbidden}`.

### Domain Quản lý giá (`sku_price`) — **MỚI 2026-09-07**, chưa có phase FE

> Nguồn: `35.1.eloria-backend/docs/api/quan-ly-gia-p8.md`.
>
> ❌ **USER CHỐT 2026-09-08: KHÔNG LÀM màn Quản lý giá.** Nhóm API này **cố ý bỏ trống**, không
> phải thiếu sót — **đừng tự dựng màn cho nó**. Giá bán tiếp tục dùng **`product.price`** (sửa ở form
> Sản phẩm); backend tự fallback khi `sku_price` rỗng nên **không phải đổi gì ở FE**.
> Hệ quả đã chấp nhận: không đặt giá riêng theo kênh · không lên lịch đổi giá · không điều chỉnh
> hàng loạt · **không có lịch sử đổi giá**. Xem PLAN mục **BE20** + hộp cuối Phase 17.

| Nhóm | Role | Endpoint |
|---|---|---|
| Đọc | `STAFF` | `POST /price/search` · `POST /price-change-log/search` |
| Ghi | `SUPER_ADMIN` | `POST /price` · `POST /price/bulk-adjust` · `DELETE /price/{id}` |

- Một dòng `sku_price` = giá của **1 SKU × 1 kênh** trong `[effectiveFrom, effectiveTo)`;
  `effectiveTo = null` ⇒ mở vô hạn. **Không chồng lấn**: set giá mới tự cắt `effectiveTo` dòng đang
  mở; đè lên dòng tương lai ⇒ `error.price.overlap`.
- **Không có branch data-scope** — giá dùng chung toàn chuỗi (giống catalog và bank account).
- ⚠️ **Bảng `sku_price` hiện RỖNG** (đo thật `total: 0`) ⇒ mọi đơn vẫn **fallback `product.price`**
  qua `SkuResDTO.unitPrice`. Hợp đồng API cũ **không đổi**, POS/đơn hàng chạy nguyên như trước.
- `POST /price/bulk-adjust` nhận `target` (`ALL|PRODUCT|CATEGORY|BRAND|SKU`, tái dùng
  `EPromotionTarget`) + `adjustType` (`PERCENT|FIXED`), trả **số SKU đã áp**; SKU không có base hoặc
  bị chồng lịch thì **bỏ qua im lặng**, không tính vào count.
- Đo thật RBAC: ADMIN `POST /price` ⇒ **403** (đúng, cần SUPER_ADMIN); STAFF `price/search` ⇒ **200**.
- subKey lỗi: `error.price.{notExisted, invalidRange, overlap, targetRequired, noBase}`.

### Tài khoản test (môi trường dev local)

Dùng để gọi thử API và kiểm tra RBAC theo từng role. Đăng nhập bằng `POST /v1.0/api/authenticate`
với body `LoginReqDTO` = `{username, password, rememberMe}` — field là **`username`**, không phải email.
**Luôn gửi `rememberMe: true`** (user đã chốt): backend chỉ set cookie `refresh_token` khi cờ này bật,
và FE **không hiển thị checkbox "Ghi nhớ đăng nhập"**.

| Username | Password | Role |
|---|---|---|
| `superadmin` | `Admin@123` | `SUPER_ADMIN` |
| `adminbranch` | `Admin@123` | `ADMIN` — thuộc *Chi nhánh Trung tâm* |
| `staffone` | `Admin@123` | `STAFF` — thuộc *Chi nhánh Trung tâm* |
| `hkadmin` | `Admin@123` | `ADMIN` — thuộc *HN - Hoàn Kiếm* *(tạo 2026-08-11 khi seed)* |

⚠️ **Cần ít nhất 2 ADMIN khác chi nhánh để test luồng duyệt phiếu kho**: backend chặn tự duyệt phiếu
do chính mình tạo, **và** ADMIN chỉ thấy phiếu của chi nhánh mình ⇒ phiếu của chi nhánh Hoàn Kiếm
chỉ `hkadmin` (hoặc SUPER_ADMIN, nếu không phải người tạo) mới duyệt được.

- Chỉ dùng cho backend local (`http://localhost:8080`). **Không** hardcode các tài khoản này vào code,
  không dùng làm giá trị mặc định của form đăng nhập, không đưa lên môi trường ngoài dev.
- Mọi thay đổi liên quan menu/route theo role (PLAN Phase 4) phải test đủ **cả 3 tài khoản**.

### Luồng dữ liệu dự kiến

```
page/feature  →  src/api/<module>.ts  →  src/lib/api-client.ts  →  backend
                 (service, đổi được          (auth header, refresh single-flight,
                  giữa mock ↔ API thật)       bóc response, xử lý 401/403/5xx, toast lỗi)
```

Không có component/hook nào được gọi `fetch`/`axios` trực tiếp. Lỗi được chuẩn hoá **một chỗ** ở api-client,
màn hình chỉ nhận `data` hoặc `ErrorResponse` đã chuẩn hoá.

### RBAC

Role đến **từ kết quả login**, không phải từ UI. Menu và route **sinh theo role**, chặn ở cả router guard
lẫn hiển thị. Cụm tab `STAFF | ADMIN | SA` trên top bar trong mockup **chỉ là demo của bản thiết kế —
không được implement** (CONVENTIONS mục 6.4).

### Thiết kế

[design/](design/) chứa 17 file PNG mockup — **nguồn sự thật về giao diện**. Trước khi code một màn,
phải mở đúng file mockup của màn đó. Mockup chỉ có **frame desktop, chỉ light theme**;
mobile chỉ cần "không vỡ", và **không làm dark theme** (CONVENTIONS mục 5 + 6).

## Quy ước kỹ thuật riêng của repo

- Alias `@/*` → `src/*` (khai báo ở cả [vite.config.ts](vite.config.ts) và [tsconfig.app.json](tsconfig.app.json)).
- **Tailwind CSS 4** — cấu hình nằm trong [src/index.css](src/index.css) qua CSS variables,
  **không có `tailwind.config.js`**. Design token màu khai báo tại đây, không hardcode hex trong component.
- shadcn/ui style `new-york`, base color `neutral`, icon `lucide` (xem [components.json](components.json)).
  Thêm component mới bằng CLI shadcn, đừng viết tay component trùng chức năng.
- ⚠️ **`bg-background` là màu XÁM nền trang (#F1F5F9), không phải trắng** — trắng là `bg-card`/
  `bg-popover`. Bản shadcn gốc dùng `bg-background` cho `DialogContent`, `SheetContent` và
  `Button variant="outline"` ⇒ các thành phần này **chìm vào nền, trông như trong suốt**.
  Đã sửa cả 3 sang `bg-card` (2026-08-09). Chạy `npx shadcn add` thêm component mới thì phải rà lại.
- ⚠️ **`SelectContent` đã đổi mặc định sang `position="popper"` + `side="bottom"` + `align="start"`**
  (2026-08-30, user chốt: *"dropdown phải hiển thị ở dưới box hiển thị chính"*). Bản shadcn gốc dùng
  `position="item-aligned"` — chế độ này của Radix đặt panel **chồng lên chính trigger** nên mở
  dropdown là che mất ô đang xem. Sửa **một chỗ** ở `components/ui/select.tsx` (92 nơi dùng, không
  nơi nào tự truyền `position`/`align`). Cùng lúc bỏ `h-[var(--radix-select-trigger-height)]` ở
  `SelectPrimitive.Viewport` — class đó của bản gốc ép panel cao đúng 1 dòng, cắt cụt danh sách.
  **Không** thêm `sideOffset` (class `translate-y-1` đã cho 4px; thêm nữa thành 8px, lệch với
  `Popover`/`DropdownMenu`), và **không** đặt `avoidCollisions={false}` (trigger sát đáy màn hình
  vẫn phải được lật lên trên, thà lật còn hơn cắt cụt). `npx shadcn add` ghi đè thì phải áp lại.
- Router chọn `BrowserRouter`/`HashRouter` theo env `VITE_USE_HASH_ROUTE` (xem [src/App.tsx](src/App.tsx)).
- TS strict + `noUnusedLocals`/`noUnusedParameters` đang bật ⇒ biến thừa làm **build fail**, không chỉ cảnh báo lint.
- `.env` bị gitignore; mẫu biến ở `.env.example`.

## Sau khi xong việc

Cuối mỗi task, tóm tắt: file đã đổi · quyết định kỹ thuật · giả định · phần chưa làm —
sẽ có **agent khác review** theo checklist ở CONVENTIONS mục 10.
