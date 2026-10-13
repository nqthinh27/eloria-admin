# Backend — Khách hàng (CRM)

> Kiểm chứng bằng API thật khi code Phase 8 (2026-08-09); **Phase 3b (2026-08-28) đổi data-scope —
> phần đó thắng mọi mô tả cũ**. Màn FE: Khách hàng, ô tra khách ở POS. Code FE: `src/api/customer.ts`,
> `src/types/customer.ts`, `src/pages/customer/`. Quy ước chung: [README.md](README.md).

## Endpoint

| Việc | Role | Endpoint |
|---|---|---|
| Tìm kiếm · xem | `STAFF` | `POST /customer/search` · `GET /customer/{id}` |
| Tạo (tại quầy) | `STAFF` | `POST /customer` |
| Sửa | `ADMIN` | `PUT /customer/{id}` |
| Tra trùng SĐT | `ADMIN` | `GET /customer/duplicates?phone=` (STAFF gọi ⇒ 403) |

**Không có**: xoá khách · đổi trạng thái khách · gộp (merge) hồ sơ trùng · `update-segment`.

## DTO

- `CustomerResDTO` = `{id, fullName, phoneNumber, email, dob, gender, branchId, membershipPoint,
  status, activated, createdDate, branchName, address, provinceCode, wardCode}`.
  **Địa chỉ giao hàng (P14, 2026-10-14):** mỗi khách **đúng 1 địa chỉ** do khách tự nhập ở storefront
  (không bắt buộc ⇒ cả 3 field `null`). Backend chỉ trả **mã** tỉnh/phường (`id` của
  `/administrative-address/provinces` + `/wards?provinceCode=`) — FE tra tên qua `useAddressNames`.
  **Admin chưa sửa được** địa chỉ khách (BE chưa có endpoint) ⇒ chỉ hiển thị. Khách cũng tự đổi được
  email/SĐT ở storefront ⇒ đừng coi 2 field này là bất biến. Đơn đã đặt giữ **snapshot** địa chỉ lúc
  đặt (`OrderResDTO.shippingAddress`). Đo thật 2026-10-14: `POST /customer/search` có đủ 3 key; khách
  đặt từ storefront (vd `FE Test P14 A/B`) mang `provinceCode=92`, `wardCode=31150` (Phường An Bình,
  TP Cần Thơ), khách tạo tại quầy/cũ thì cả 3 là `null`.
  ⚠️ **KHÔNG có `code`, `tier`, `orderCount`, `totalSpent`, `lastPurchaseDate`** — dù mockup
  `10-khach-hang.png` vẽ 4 cột cuối (đã chốt hiển thị `—`/bỏ). Muốn có phải xin backend.
- ⚠️ **`activated` KHÁC `status`**: `status` = khoá/mở bản ghi (admin đặt) · `activated` = khách đã tự
  kích hoạt tài khoản storefront chưa (khách tạo tại quầy có `activated: false`). Màn Khách hàng phải
  phân biệt 2 badge, không gộp.
- `CreateCustomerReqDTO`: bắt buộc `fullName` + `phoneNumber`; **`dob` là `date-time`** — gửi
  `"1995-04-12"` bị `400`, phải `"1995-04-12T00:00:00Z"`; `email` bỏ trống ⇒ backend tự sinh
  `{phoneNumber}@example.com`; `branchId` **tuỳ chọn với mọi role** (Phase 3b).
- `UpdateCustomerReqDTO` chỉ có `{fullName, email, dob, gender}` — **không** đổi được
  `phoneNumber`/`branchId`/`status` (mapper `@Mapping(ignore)`).
- `CustomerSearchReqDTO` = `{keyword, status, branchId}` — `branchId` là filter tuỳ chọn cho mọi role.
- Tạo trùng SĐT ⇒ `code:3`, `subKey: error.phone.existed`. Tính duy nhất SĐT là **toàn cục**.

## Phase 3b (2026-08-28) — KHÁCH HÀNG LÀ TOÀN CỤC, BỎ HẲN BRANCH DATA-SCOPE

> Nguồn: `35.1.eloria-backend/docs/api/phase-3b-khach-toan-cuc-review.md`. Schema không đổi.
> `sys_user.branch_id` của khách đổi nghĩa: "chi nhánh sở hữu" → **"chi nhánh đăng ký"** (tham khảo,
> có thể `NULL`). Mục đích: tích điểm, hoá đơn, lịch sử mua **xuyên chi nhánh** trên một hồ sơ duy nhất.

| Endpoint | Sau Phase 3b |
|---|---|
| `POST /customer/search` | **Mọi role thấy toàn bộ khách**; `branchId` là filter tuỳ chọn cho mọi role |
| `GET /customer/{id}` | Xem được mọi khách (hết 403 khác chi nhánh) |
| `PUT /customer/{id}` | ADMIN+ sửa được mọi khách |
| `GET /customer/duplicates` | **`viewable` LUÔN `true`** khi `exists` — nhánh "trùng SĐT nhưng không xem được" đã chết, đừng dựng UI cho nó |
| `POST /customer` | `branchId` tuỳ chọn; bỏ trống ⇒ mặc định chi nhánh người tạo; có thể `NULL` |
| Gắn khách vào đơn | Gắn được khách bất kỳ, không giới hạn chi nhánh |

- **RBAC không đổi** (STAFF đọc/tạo, ADMIN sửa) — chỉ **data-scope** đổi.
- `error.branch.required` khi tạo khách **không còn phát sinh** — key i18n giữ lại chỉ để đọc log cũ.
- **Hệ quả FE đã áp**: bỏ điều kiện chỉ-SUPER_ADMIN của bộ lọc chi nhánh · bỏ bắt buộc `branchId` khi
  tạo · bỏ nhánh `viewable === false` · bỏ mọi UI ngụ ý khách bị giới hạn chi nhánh (kể cả ô tra khách POS).
