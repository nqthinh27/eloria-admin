# Ma trận phân quyền (RBAC)

> Tổng hợp **riêng của FE** — không thay thế tài liệu API backend. Nguồn sự thật là tiền tố
> `[ROLE]` trong `summary` của mỗi endpoint ([docs/backend/README.md](backend/README.md) mục
> RBAC); file này chỉ gom lại theo góc nhìn "màn nào / nút nào cần bậc gì" để tra nhanh.
>
> Mọi kiểm tra quyền trong code phải đi qua `hasRole()` — **không** so sánh role bằng `===` rải
> rác ở nhiều nơi (xem [src/config/roles.ts](../src/config/roles.ts)). Ẩn/hiện UI qua component
> `<Can minRole={...}>` ([src/components/can.tsx](../src/components/can.tsx)) hoặc cờ
> `const canX = hasRole(user?.role, ERole.XXX)`. Chặn luôn ở cấp **route** (gõ URL tay cũng
> không vào được) nằm ở [src/components/route-guards.tsx](../src/components/route-guards.tsx).
>
> ⚠️ FE chỉ chặn UI. Backend còn giới hạn thêm **phạm vi dữ liệu theo chi nhánh** (data-scope) —
> không coi việc ẩn nút ở đây là lớp bảo mật duy nhất.

## Thang bậc

```
SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS
```

Role bên trái kế thừa **toàn bộ** quyền của role bên phải. `CUSTOMER` là tài khoản khách mua
hàng bên storefront — đăng nhập được nhưng bị chặn ngay sau khi vào web admin
(`MIN_ROLE_FOR_ADMIN_APP = STAFF`, [roles.ts:34](../src/config/roles.ts)). Vì vậy các bảng dưới
đây không liệt kê cột `CUSTOMER`/`ANONYMOUS` trừ khi có hành động đặc biệt liên quan (đăng nhập).

Ký hiệu: **✅** = làm được (đạt bậc tối thiểu) · **—** = không có quyền · **👁** = chỉ xem/kế thừa
gián tiếp, không có UI ghi riêng cho role đó.

## Menu — vào được màn

| Màn | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Dashboard | — | ✅ | ✅ | [menu.ts:52](../src/config/menu.ts) — B9 (2026-08-29) bỏ nhánh STAFF dù backend cho gọi `GET /dashboard/summary` |
| POS / Ca làm việc / Đơn hàng / Đổi-trả | ✅ | ✅ | ✅ | [menu.ts:59-66](../src/config/menu.ts) |
| Nhân viên / Chi nhánh / Nhật ký (audit-log) | — | ✅ | ✅ | [menu.ts:74-80](../src/config/menu.ts) |
| Khách hàng | ✅ | ✅ | ✅ | [menu.ts:82](../src/config/menu.ts) |
| Tài khoản ngân hàng | — | — | ✅ | [menu.ts:84-89](../src/config/menu.ts) — ADMIN/STAFF không thấy menu, không vào được |
| Sản phẩm / Danh mục | ✅ | ✅ | ✅ | [menu.ts:96-105](../src/config/menu.ts) |
| Thương hiệu | — | — | ✅ | [menu.ts:108](../src/config/menu.ts) |
| Kho hàng | ✅ | ✅ | ✅ | [menu.ts:109](../src/config/menu.ts) |
| Khuyến mại | — | ✅ | ✅ | [menu.ts:110-114](../src/config/menu.ts) |

## Chi tiết theo hành động

### Đơn hàng ([src/pages/orders](../src/pages/orders))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Tạo / xem / sửa (PENDING) / huỷ / ghi chú / đổi trạng thái / thanh toán | ✅ | ✅ | ✅ | [don-hang.md:13-17](backend/don-hang.md) |
| In hoá đơn | ✅ | ✅ | ✅ | [don-hang.md:14](backend/don-hang.md) — kế thừa quyền xem, không gate riêng |
| Lọc danh sách theo chi nhánh | — | — | ✅ | `OrderListPage.tsx:86` biến `canFilterBranch` |

### POS ([src/pages/pos](../src/pages/pos))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Bán quầy (gộp `/pos/order`) | ✅ | ✅ | ✅ | [ca-lam-viec.md:19](backend/ca-lam-viec.md) |
| Yêu cầu **mở ca** để bán (so bằng, không kế thừa) | ✅ | — | — | `PosPage.tsx:94-95` — ADMIN/SUPER_ADMIN bán không cần ca ([ca-lam-viec.md:62](backend/ca-lam-viec.md)) |
| Chọn chi nhánh khi bán / mở ca | — | — | ✅ | `PosPage.tsx:89`, `open-shift-card.tsx:43` — SUPER_ADMIN không có ca cố định nên bắt buộc chọn |

### Ca làm việc ([src/pages/shift](../src/pages/shift))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem ca của mình, tự chốt ca | ✅ | ✅ | ✅ | [ca-lam-viec.md:13-16](backend/ca-lam-viec.md) |
| Duyệt / từ chối ca, chốt ca hộ | — | ✅ | ✅ | `ShiftListPage.tsx:78` `canApprove` |
| Lọc theo chi nhánh | — | — | ✅ | `ShiftListPage.tsx:79` `canPickBranch` |

### Đổi / trả ([src/pages/returns](../src/pages/returns))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem, tạo yêu cầu đổi/trả | ✅ | ✅ | ✅ | [doi-tra.md:10-12](backend/doi-tra.md) |
| Duyệt / từ chối, hoàn tiền, nhận hàng vào kho | — | ✅ | ✅ | `ReturnListPage.tsx:81` `canApprove` |
| Lọc theo chi nhánh | — | — | ✅ | `ReturnListPage.tsx:82` `canPickBranch` |

### Kho ([src/pages/inventory](../src/pages/inventory))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem tồn kho, tạo/gửi duyệt phiếu kho, kiểm kê | ✅ | ✅ | ✅ | [kho.md:9-13](backend/kho.md) |
| Duyệt / từ chối phiếu kho | — | ✅ | ✅ | `LedgerTab.tsx:63` `canApprove` — chặn tự duyệt phiếu mình tạo (`error.warehouseLedger.cannotApproveOwn`) |
| Xuất huỷ (`POST /stock-disposal`) | — | ✅ | ✅ | [kho.md:13,51](backend/kho.md) |
| Lọc / chọn chi nhánh | — | — | ✅ | `StockTab.tsx:49`, `StockCountTab.tsx:45`, `LedgerTab.tsx:64` |

### Nhân viên ([src/pages/staff](../src/pages/staff))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Tạo / sửa / xoá / đổi trạng thái / reset mật khẩu / gán role | — | ✅ | ✅ | [README.md:176](backend/README.md) |
| Chọn/sửa chi nhánh nhân viên | — | — | ✅ | `staff-form-dialog.tsx:92`, `staff-detail-modal.tsx:42` |
| Gán role `SUPER_ADMIN` cho người khác | — | — | ✅ | `assign-role-dialog.tsx:30,65` — chỉ SUPER_ADMIN thấy option này |

### Chi nhánh ([src/pages/staff/BranchListPage.tsx](../src/pages/staff/BranchListPage.tsx))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem | ✅ | ✅ | ✅ | [README.md:173](backend/README.md) |
| Sửa | — | ✅ | ✅ | [README.md:174](backend/README.md); `<Can minRole={ERole.ADMIN}>` dòng 201 |
| Tạo / xoá / bật-tắt / điều chuyển | — | — | ✅ | [README.md:175](backend/README.md); `<Can minRole={ERole.SUPER_ADMIN}>` dòng 116, 210, 245 |

### Nhật ký (audit-log)

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem | — | ✅ | ✅ | [README.md:177](backend/README.md) |

### Khách hàng ([src/pages/customer](../src/pages/customer))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Tìm kiếm / xem, tạo tại quầy | ✅ | ✅ | ✅ | [khach-hang.md:11-12](backend/khach-hang.md) |
| Sửa thông tin | — | ✅ | ✅ | [khach-hang.md:13](backend/khach-hang.md); `CustomerListPage.tsx:59` `canEdit` |
| Tra trùng SĐT khi tạo mới | — | ✅ | ✅ | [khach-hang.md:14](backend/khach-hang.md); `customer-form-dialog.tsx:101` `canCheckDuplicate` — STAFF gọi ⇒ 403 |

### Sản phẩm / Danh mục ([src/pages/product](../src/pages/product))

⚠️ Khác các domain còn lại: toàn bộ hành vi **ghi** của nhóm sản phẩm yêu cầu thẳng
`SUPER_ADMIN`, ADMIN không có quyền ghi trung gian.

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem sản phẩm / danh mục | ✅ | ✅ | ✅ | [san-pham.md:9](backend/san-pham.md) |
| Tạo / sửa / xoá SKU, đổi trạng thái vòng đời, xem giá vốn | — | — | ✅ | [san-pham.md:9,64,76](backend/san-pham.md); `ProductListPage.tsx:63` `canWrite`; giá vốn chỉ hiện với SUPER_ADMIN (`product-detail-modal.tsx:315-419`) |
| Tạo / sửa / xoá danh mục | — | — | ✅ | `CategoryListPage.tsx:47` `canWrite` |

### Thương hiệu ([src/pages/brands](../src/pages/brands))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem + toàn bộ ghi | — | — | ✅ | [menu.ts:108](../src/config/menu.ts) — cả màn gate ở menu/route, không có `hasRole` riêng trong trang |

### Giá (pricing)

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Xem giá + lịch sử đổi giá | ✅ | ✅ | ✅ | [gia.md:13](backend/gia.md) |
| Tạo giá, ghi đè giá hàng loạt (`bulk-adjust`), xoá | — | — | ✅ | [gia.md:14](backend/gia.md) — đo thật: ADMIN gọi `POST /price` ⇒ 403 |

### Khuyến mại ([src/pages/promotion](../src/pages/promotion))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Đọc khuyến mại, thử áp cho giỏ | ✅ | ✅ | ✅ | [khuyen-mai.md:9-10](backend/khuyen-mai.md) |
| Tạo / sửa / đổi trạng thái KM, tạo & xuất coupon | — | ✅ | ✅ | [khuyen-mai.md:11-12](backend/khuyen-mai.md); `PromotionListPage.tsx:74` `canWrite` |
| Chọn chi nhánh khi tạo KM | — | — | ✅ | `promotion-form-dialog.tsx:181` `canChooseBranch` — ADMIN bị ép về chi nhánh của mình |

### Tài khoản ngân hàng / QR ([src/pages/bank-accounts](../src/pages/bank-accounts))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Đọc, lấy ảnh QR đơn hàng | ✅ | ✅ | ✅ | [ngan-hang-qr.md:9-10](backend/ngan-hang-qr.md) |
| Tạo / sửa / đặt mặc định / đổi trạng thái / xoá | — | — | ✅ | [ngan-hang-qr.md:11](backend/ngan-hang-qr.md) — cả màn gate ở menu, không có UI cho role thấp hơn |

### Báo cáo ([src/pages/report](../src/pages/report))

| Hành động | STAFF | ADMIN | SUPER_ADMIN | Nguồn |
|---|:-:|:-:|:-:|---|
| Dashboard, BC bán hàng | 👁 | ✅ | ✅ | [bao-cao.md:11-12,17](backend/bao-cao.md) — backend cho STAFF gọi `GET /dashboard/summary` nhưng menu FE chặn ở ADMIN (quyết định B9, 2026-08-29) |
| BC lãi gộp, BC xuất-nhập-tồn | — | ✅ | ✅ | [bao-cao.md:13-14](backend/bao-cao.md) |
| So sánh chi nhánh, bộ lọc chi nhánh trên mọi báo cáo | — | — | ✅ | [bao-cao.md:15,46,51-52](backend/bao-cao.md); `Dashboard.tsx:137` `canFilterBranch` |

## Việc chưa rõ / cần xác nhận

- `src/pages/auth/*` (Login/ForgotPassword/ResetPassword) không yêu cầu role (`ANONYMOUS`) —
  không có nút nào trong các trang này bị ẩn theo role, nên không lập bảng riêng.
- Chưa thấy hành động "hoàn tiền trực tiếp" ở màn Đơn hàng ngoài phạm vi Đổi/trả
  (`/return/{id}/refund`) — nếu nghiệp vụ này tồn tại ở nơi khác, cần bổ sung.
- [khach-hang.md:45](backend/khach-hang.md) ghi "ADMIN+ sửa được mọi khách" nhưng không thấy mốc
  nào yêu cầu riêng `SUPER_ADMIN` cho khách hàng — coi như ADMIN đã đủ cho toàn bộ domain này.
