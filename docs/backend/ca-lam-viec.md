# Backend — Ca làm việc & Bán quầy

> Nguồn: `35.1.eloria-backend/docs/api/ca-lam-viec-p10.md`. Ra 2026-09-09 **hai đợt trong ngày** —
> đợt 2 thêm **quy trình duyệt ca** (breaking so với đợt 1). FE đo thật **23/23 PASS** (vòng đời ·
> kiểm quỹ · RBAC 4 tài khoản · data-scope · mọi đường lỗi), dữ liệu test đã dọn.
> Màn FE: Ca làm việc · thanh trạng thái ca ở POS. Code FE: `src/api/shift.ts`, `src/types/shift.ts`,
> `src/pages/shift/`, `src/pages/pos/components/{open-shift-card,shift-*,close-shift-dialog}.tsx`.
> ⚠️ Lớp mock Phase 6 từng **bịa sai** đường dẫn lẫn field (`/shift/*`, `note`, `cashVariance`) — đã xoá,
> đừng lấy làm tham chiếu. Đường dẫn thật là **`/work-shift/*`**.

| Nhóm | Role tối thiểu | Endpoint |
|---|---|---|
| Ca đang hoạt động của tôi | `STAFF` | `GET /work-shift/current` |
| **Yêu cầu** mở ca | `STAFF` | `POST /work-shift/open` |
| Tự chốt ca của mình | `STAFF` | `POST /work-shift/close` |
| Tra cứu lịch sử ca | `STAFF` | `POST /work-shift/search` · `GET /work-shift/{id}` |
| **Duyệt / từ chối ca** | **`ADMIN`** | `POST /work-shift/{id}/approve` · `/reject` |
| **Chốt ca hộ nhân viên** | **`ADMIN`** | `POST /work-shift/{id}/close` |
| Bán quầy gộp | `STAFF` | `POST /pos/order` |

## Vòng đời ca (có duyệt)

```
(STAFF) open → WAITING_APPROVAL ─(ADMIN+ approve)→ OPEN ─(close | {id}/close)→ CLOSED
                      └──────────(ADMIN+ reject)─→ REJECTED
```

- `EShiftStatus` **5 giá trị**: thêm `WAITING_APPROVAL`, `REJECTED` (đợt 2). Mở ca **không ra `OPEN`
  ngay** — nhân viên chưa bán được cho tới khi ADMIN duyệt.
- Mỗi nhân viên **tối đa 1 ca đang hoạt động** (`WAITING_APPROVAL` *hoặc* `OPEN`).
- Ca là **bản ghi lịch sử — không sửa, không xoá**. Ca `REJECTED` là **ngõ cụt**: duyệt lại ⇒
  `error.workShift.invalidStatus`, phải mở ca mới (đo thật).
- `INCOMING` (ca đặt trước) **chưa dùng ở MVP** — không endpoint nào tạo ra ⇒ đừng bày trong bộ lọc.
- ⚠️ **`openedAt` được ĐẶT LẠI lúc DUYỆT** (đo: yêu cầu 15:41:55 → duyệt 15:42:12 ⇒ `openedAt = 15:42:12`)
  — đây là giờ bắt đầu ca thật.
- `GET /work-shift/current` trả ca ở **cả 2 trạng thái hoạt động** ⇒ phải đọc `status` mới biết bán
  được chưa. Trả **`data: null`** khi không có ca — **trạng thái bình thường, không phải lỗi/404**.
- ⚠️ `closingCash`/`expectedCash`/`cashDifference` đều **`null` khi ca chưa chốt** — phòng null mọi chỗ
  hiển thị, đừng `.toLocaleString()` thẳng.
- Mã ca `CA-{branchCode}-{yyyyMMdd}-{seq}` (Redis INCR), fallback viết tắt tên chi nhánh (`CA-CNTT-…`)
  — giống quy tắc prefix mã đơn.
- `reject` nhận `{reason}`, backend **ghi lý do vào chính `description`** ⇒ màn chi tiết đổi nhãn field
  theo `status` (ca `REJECTED` ⇒ "Lý do từ chối").

## Kiểm quỹ (backend tính — FE KHÔNG tự tính lại)

```
expectedCash   = openingCash + Σ tiền mặt net (PAID − REFUNDED) của đơn GẮN CA này
                 ↑ CHỈ CASH — QR/CARD/COD không vào
cashDifference = closingCash − expectedCash      ← ÂM = THIẾU QUỸ
```

Đo thật: mở ca 500k + CASH 1.000k + CASH 450k + **QR 450k** ⇒ `expectedCash = 1.950.000` (QR không
cộng), đếm 1.900k ⇒ `cashDifference = −50.000`. ✓ Tiền hoàn từ phiếu đổi/trả cũng vào công thức
(xem [doi-tra.md](doi-tra.md): `/refund` tự gắn `shiftId` của người quyết toán).

## Gắn ca cho đơn — quy tắc quan trọng nhất với FE

- Mọi đơn `channel = POS` do **STAFF** tạo — qua `POST /order` **hoặc** `POST /pos/order` — đều
  **bắt buộc có ca `OPEN`** (chưa mở ⇒ `error.workShift.notOpen`) và được backend **tự gắn `shiftId`**
  ⇒ luồng thu tiền **2 bước** của màn POS vào đúng `expectedCash` (đo cả 2 đường, lệch quỹ 0).
- ⚠️ **ADMIN/SUPER_ADMIN bán POS KHÔNG cần ca** (họ là người duyệt) — đơn của họ `shiftId: null`,
  tiền không vào ca nào. **Thiết kế backend, không phải bug.**
- ⚠️ `POST /pos/order` là endpoint **gộp**: ép `channel = POS`, gắn ca, trừ tồn, **thu ngay 1 lần**
  (mặc định `CASH`) ⇒ đơn tự `COMPLETED`; body dùng nguyên `CreateOrderReqDTO` (giảm giá 2 tầng +
  `couponCode` chạy — đo thật). **Màn POS hiện KHÔNG dùng** (user chốt giữ luồng 2 bước để còn bước
  xác nhận đã thu, nhất là QR — chưa có webhook banking).
- ⚠️ `branchId` trong body `/pos/order` **BỊ BỎ QUA HOÀN TOÀN** — chi nhánh luôn lấy từ ca đang mở,
  kể cả SUPER_ADMIN (đo thật).

## RBAC & data-scope (đo thật 4 tài khoản)

- Đọc + mở + tự chốt: `[STAFF]`; **duyệt/từ chối/chốt hộ: `[ADMIN]`** (STAFF tự duyệt ⇒ 403).
- `branchId` khi mở ca: **chỉ SUPER_ADMIN dùng được và BẮT BUỘC** (thiếu ⇒ `error.branch.required`,
  code 14); STAFF/ADMIN gửi lên **bị bỏ qua im lặng** ⇒ chỉ bày bộ chọn/lọc chi nhánh cho SUPER_ADMIN.
- Phạm vi `search`/`{id}`: **STAFF chỉ thấy ca của CHÍNH MÌNH** (xem ca người khác ⇒
  `error.workShift.branchForbidden` 403) · **ADMIN chỉ chi nhánh mình** (đo: `hkadmin` duyệt ca chi
  nhánh khác ⇒ 403) · SUPER_ADMIN toàn chuỗi. *(Khác màn Đổi/Trả — bên đó STAFF thấy mọi phiếu chi nhánh.)*

## Sort & lọc

- ⚠️ Sort `staffName` ⇒ **HTTP 500** (DTO-only; BE27 — backend báo đã sửa `staffName → staff.fullName`
  2026-09-13 nhưng **chưa deploy**, đo vẫn 500) ⇒ cột NHÂN VIÊN `enableSorting: false`.
  `branchName` thì **sort được** (đo 2026-09-13 trả 200, sắp đúng) — FE khoá chỉ vì bảo thủ.
  Sort được: `code` · `status` · `openingCash` · `closingCash` · `expectedCash` · `cashDifference` ·
  `openedAt` · `closedAt` · `createdDate`.
- Lọc đơn theo ca: `POST /order/search` body `{shiftId}`. ⚠️ Kết quả vẫn `paidAmount: null` như mọi
  API danh sách ⇒ **không cộng tiền từ danh sách này** — số chuẩn của ca là `expectedCash` backend tính.

subKey lỗi: `error.workShift.{alreadyOpen, notOpen, notFound, invalidStatus, branchForbidden}` ·
`error.branch.required` · `error.stock.insufficient` (bán quầy hết hàng — rollback sạch cả đơn, đo
thật tồn không đổi khi 1/2 dòng thiếu).
