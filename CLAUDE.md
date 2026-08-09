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

### Tích hợp backend — khảo sát `/v3/api-docs/api` ngày **2026-08-06**, cập nhật **2026-08-08**, **2026-08-09**

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
  status, createdDate, branchName}`.** ⚠️ **KHÔNG có `code`, `tier`, `orderCount`, `totalSpent`,
  `lastPurchaseDate`** — dù mockup `10-khach-hang.png` vẽ 4 cột cuối. Hồ sơ khách map từ `SysUser`,
  và backend **chưa có entity đơn hàng nào** (`domain/` chỉ có SysUser, Branch, Brand, Category,
  Color, Product, RelProductCategory, SizeOption, Sku) ⇒ **không có nguồn để tính** các chỉ số đó.
  Field `activated` có trong DTO Java nhưng **không xuất hiện trong JSON** ⇒ đừng khai ở FE.
- `CreateCustomerReqDTO` bắt buộc `fullName` + `phoneNumber`; `email` bỏ trống ⇒ backend tự sinh
  `{phoneNumber}@example.com`; **SUPER_ADMIN bắt buộc truyền `branchId`** (thiếu ⇒ `code:14`,
  `subKey: error.branch.required`), STAFF/ADMIN bị ép về chi nhánh của mình.
- **`UpdateCustomerReqDTO` chỉ có `{fullName, email, dob, gender}`** — **không** đổi được
  `phoneNumber`/`branchId`/`status` (mapper backend `@Mapping(ignore)` các field này).
- `CustomerSearchReqDTO` = `{keyword, status, branchId}`; **`branchId` chỉ có tác dụng với
  SUPER_ADMIN**. STAFF/ADMIN luôn chỉ thấy khách chi nhánh mình (backend tự chặn).
- `GET /customer/duplicates?phone=` là **`[ADMIN]`** (STAFF gọi ⇒ 403), trả
  `{exists, viewable, customer}`: khách **ngoài chi nhánh** trả `exists:true, viewable:false,
  customer:null` (không lộ hồ sơ). Tạo trùng SĐT ⇒ `code:3`, `subKey: error.phone.existed`.
- **Không có endpoint xoá khách hàng, đổi trạng thái khách hàng, hay gộp (merge) hồ sơ trùng.**

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
- `color/search` và `size/search` trả `BaseListRes` (không `activeTotal`); `product`/`category`/
  `brand`/`sku` trả `BaseListResStatus`.
- **`GET /sku/{id}/barcode`** (`[STAFF]`) — trả **ảnh PNG EAN-13** (không bọc `BaseResponse`) để
  hiển thị/in tem. FE gọi qua `apiClient.getBlob()`; `apiClient.get()` sẽ hỏng vì `unwrap` đọc
  `body.code`. `DELETE /sku/{id}` (`[SUPER_ADMIN]`, xoá mềm) cũng đã có — **cập nhật 2026-08-10**,
  trước đó trả 405 vì server chạy bản build cũ.
- **Không có `DELETE /product/{id}`** (trả 405, không có ở cả source lẫn api-docs). Xoá danh mục/
  thương hiệu bị chặn khi còn ràng buộc: `error.category.hasChildren`, `error.brand.hasProducts`.
  `DELETE /color/{id}` và `DELETE /size/{id}` là **hard delete** (chặn nếu còn SKU tham chiếu).

**Vẫn chưa có** API: giá theo kênh riêng biệt, kho/tồn kho, POS, đơn hàng, đổi/trả, khuyến mại, ca
làm việc (shift) ⇒ các phase đó (10–14) vẫn chạy trên **lớp mock sau service layer** (PLAN Phase 6).

Ngoài bậc role, backend còn **tự giới hạn phạm vi dữ liệu** (ghi trong `description` từng endpoint):
ADMIN chỉ thấy/tạo nhân viên chi nhánh mình và chỉ gán được role STAFF; điều chuyển chi nhánh chỉ SUPER_ADMIN.
FE vẫn phải chặn ở UI nhưng **không được coi đó là lớp bảo mật duy nhất**.

### Tài khoản test (môi trường dev local)

Dùng để gọi thử API và kiểm tra RBAC theo từng role. Đăng nhập bằng `POST /v1.0/api/authenticate`
với body `LoginReqDTO` = `{username, password, rememberMe}` — field là **`username`**, không phải email.
**Luôn gửi `rememberMe: true`** (user đã chốt): backend chỉ set cookie `refresh_token` khi cờ này bật,
và FE **không hiển thị checkbox "Ghi nhớ đăng nhập"**.

| Username | Password | Role |
|---|---|---|
| `superadmin` | `Admin@123` | `SUPER_ADMIN` |
| `adminbranch` | `Admin@123` | `ADMIN` |
| `staffone` | `Admin@123` | `STAFF` |

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
- Router chọn `BrowserRouter`/`HashRouter` theo env `VITE_USE_HASH_ROUTE` (xem [src/App.tsx](src/App.tsx)).
- TS strict + `noUnusedLocals`/`noUnusedParameters` đang bật ⇒ biến thừa làm **build fail**, không chỉ cảnh báo lint.
- `.env` bị gitignore; mẫu biến ở `.env.example`.

## Sau khi xong việc

Cuối mỗi task, tóm tắt: file đã đổi · quyết định kỹ thuật · giả định · phần chưa làm —
sẽ có **agent khác review** theo checklist ở CONVENTIONS mục 10.
