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
- Màn quản trị TK ngân hàng: **đã làm (PLAN Phase 18, 2026-09-20)** — `src/pages/bank-account/`, route
  `/bank-accounts`, chỉ SUPER_ADMIN. Đặc tả ở mục dưới.

## Hành vi ghi — đọc từ source (`BankAccountServiceImpl`), **đã đo API thật 2026-09-20** (superadmin)

> Đã đo: sort 6 field × 2 chiều đều 200 (kể cả `isDefault`) · trùng BIN+số TK ⇒ `existed` · BIN sai ⇒
> 400 · `update-status` trả `data: null` · tắt TK mặc định ⇒ mất mặc định, `GET /default` ⇒ 400
> `noDefault` · `set-default` TK tắt ⇒ `inactive`. **Chưa đo:** `DELETE` trên TK đang mặc định (suy từ source).

| Việc | Hành vi |
|---|---|
| **Tạo** | Trùng `(bankBin, accountNumber)` (bỏ qua bản đã xoá) ⇒ `error.bankAccount.existed`. Luôn tạo `ACTIVE`. Tự thành **mặc định** nếu `isDefault: true` **hoặc chưa có TK mặc định ACTIVE nào**. |
| **Sửa** | Cùng kiểm tra trùng (loại chính nó). **Không đổi được `isDefault`/`status`**. |
| **Đặt mặc định** | TK phải `ACTIVE`, tắt ⇒ `error.bankAccount.inactive`. Backend tự bỏ cờ của TK khác. |
| **Bật/tắt** | Tắt (`status=0`) ⇒ backend **tự bỏ cờ mặc định** của TK đó ⇒ có thể rơi vào trạng thái *không có mặc định* ⇒ QR đơn hàng lỗi `noDefault`. **Không có cách nào tự chọn TK khác thay thế.** |
| **Xoá** | Xoá mềm (`status=-1`) + bỏ cờ mặc định — **xoá được cả TK đang mặc định** (không chặn) ⇒ cùng rủi ro `noDefault`. |
| **Tên chủ TK** | Backend chuẩn hoá: **bỏ dấu + IN HOA** ⇒ FE hiển thị giá trị trả về, không tự chuẩn hoá. |
| **Validate** | `bankBin` đúng **6 chữ số** · `bankName` ≤ 100 · `accountNumber` ≤ 30 · `accountName` ≤ 150 · cả 4 bắt buộc. |
| **Tìm kiếm** | `keyword` khớp `bankName`/`accountNumber`/`accountName`; `status` lọc 0/1. Response là `BaseListResStatus` (có `activeTotal`/`inactiveTotal`). Sort an toàn: `bankName`, `accountNumber`, `accountName`, `isDefault`, `status`, `createdDate` *(field entity — cần đo lại khi code)*. |

SubKey lỗi: `error.bankAccount.{notExisted|existed|inactive|noDefault}` — **thêm đủ VI + EN** vào
`src/i18n/locales/*/errors.ts` (kiểm tra key nào đã có trước khi thêm).

## Đặc tả màn **Tài khoản ngân hàng** (Phase 18)

- **Chỉ SUPER_ADMIN thấy màn này** — `minRole: ERole.SUPER_ADMIN` cho **mục menu và route** (guard
  cả URL gõ tay ⇒ 403). ADMIN/STAFF **không có menu, không vào được**; họ vẫn dùng dữ liệu TK
  ngân hàng gián tiếp ở luồng tạo đơn/thu QR (`getDefault` + `orderQr`, giữ nguyên `[STAFF]`).
- Không mockup ⇒ dựng theo pattern list (`04-don-hang`) + skill **create-table**; form thêm/sửa
  dùng `detail-modal` như màn Nhân viên/Chi nhánh.
- **Cột**: STT · Ngân hàng (`bankName` + BIN dưới dạng chữ phụ) · Số tài khoản · Chủ tài khoản ·
  Mặc định (badge) · Trạng thái · Ngày tạo · THAO TÁC. Toolbar: tìm `keyword` + lọc `status` + nút *Thêm*.
- **Thao tác mỗi dòng**: Sửa · Đặt làm mặc định *(ẩn nếu đã là mặc định hoặc TK đang tắt)* ·
  Bật/Tắt · Xoá (đều qua `confirm-dialog`).
- **Bảo vệ FE bắt buộc** (backend không chặn — xem bảng trên): khi **tắt/xoá TK đang mặc định**
  ⇒ dialog cảnh báo rõ *"Sau thao tác này hệ thống sẽ không còn tài khoản mặc định, POS không tạo
  được QR cho tới khi đặt lại"*. Nếu bảng không có dòng nào mặc định ⇒ hiện banner cảnh báo đầu trang.
- Nạp lại bảng sau mỗi thao tác ghi (giữ page/filter/sort). Không dựng UI "Đã xoá", không gửi `-1`.
- Nên hiện **xem trước QR** của TK đang chọn? — **không làm**: backend chỉ sinh QR theo *đơn*, không
  có endpoint QR theo TK.
