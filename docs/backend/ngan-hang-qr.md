# Backend — Tài khoản ngân hàng & VietQR

> Xuất hiện 2026-08-21 (83 path), chạy được từ cùng ngày sau khi backend fix migration.
> Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-discount-qr.md`. Dùng ở luồng thu tiền QR
> ([don-hang.md](don-hang.md)). Code FE: `src/api/bank-account.ts`.

| Nhóm | Role | Endpoint |
|---|---|---|
| Đọc | `STAFF` | `POST /bank-account/search` · `GET /bank-account/default` · `GET /bank-account/{id}` |
| **Ảnh QR đơn hàng** | `STAFF` | `GET /bank-account/order/{orderId}/qr` |
| Ghi | `SUPER_ADMIN` | `POST /bank-account` · `PUT /bank-account/{id}` · `POST /bank-account/{id}/set-default` · `POST /bank-account/update-status` · `DELETE /bank-account/{id}` |

- ⚠️ **`GET .../qr` trả PNG thuần (480×480), KHÔNG bọc `BaseResponse`** ⇒ bắt buộc
  `apiClient.getBlob()`; caller tự `URL.revokeObjectURL`.
- Số tiền (`order.totalAmount`) và nội dung CK (`ELORIA` + mã đơn) **nhúng cứng trong ảnh** — FE
  không dựng, không sửa được.
- Tài khoản **dùng chung toàn chuỗi, KHÔNG branch data-scope**; nhưng **đơn thì có** — STAFF/ADMIN chỉ
  lấy được QR của đơn chi nhánh mình (`error.forbidden`).
- Lỗi: `error.bankAccount.noDefault` (400, chưa cấu hình TK nhận tiền) · `error.order.notExisted` (404).
  FE bắt **mọi** lỗi ở bước tải QR (không chỉ `noDefault`) để phòng môi trường chưa cấu hình.
- Chưa có màn quản trị TK ngân hàng ở FE (chỉ SUPER_ADMIN ghi được; hiện cấu hình tay/seed).
