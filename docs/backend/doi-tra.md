# Backend — Đổi / Trả / Hoàn tiền

> Nguồn: `35.1.eloria-backend/docs/api/doi-tra-p11.md`. Ra 2026-09-12 (118 path). FE đo thật **~85 case**
> (trọn vòng đời · đổi ngang/lệch giá · trả không hoá đơn · RBAC 4 tài khoản · data-scope · tích hợp quỹ
> ca · mọi đường lỗi) — **khớp tài liệu 100%**. Màn FE: Đổi/Trả. Code FE: `src/api/return.ts`,
> `src/types/return.ts`, `src/pages/returns/`. Quy ước chung: [README.md](README.md).

| Nhóm | Role tối thiểu | Endpoint |
|---|---|---|
| Đọc | `STAFF` | `POST /return/search` · `GET /return/{id}` |
| Tạo yêu cầu **trả** | `STAFF` | `POST /return` |
| Tạo yêu cầu **đổi** | `STAFF` | `POST /return/exchange` (ngang giá) · `POST /return/exchange-diff` (lệch giá) |
| Duyệt / từ chối | **`ADMIN`** | `POST /return/{id}/approve` · `/reject` |
| Quyết toán tiền | **`ADMIN`** | `POST /return/{id}/refund` |
| Nhận hàng vào kho | **`ADMIN`** | `POST /return/{id}/receive-stock` |

## Vòng đời

```
(STAFF) create → PENDING_APPROVAL ─(ADMIN+ approve)→ APPROVED ─┬─ /refund ────────┐
                        └─────────(ADMIN+ reject)─→ REJECTED   └─ /receive-stock ─┴→ COMPLETED
```

- ⚠️ **`APPROVED → COMPLETED` là TỰ ĐỘNG, không có endpoint "hoàn tất"**: chuyển khi xong **cả hai**
  việc — quyết toán tiền *(bỏ qua nếu phiếu không phát sinh tiền)* **và** nhận hàng vào kho, thứ tự nào
  cũng được (đo cả 2 chiều).
- Phiếu **không sửa, không xoá** (bản ghi lịch sử tiền/hàng) — sai thì từ chối rồi tạo phiếu mới.
  `REJECTED` là ngõ cụt (`error.return.invalidStatus` nếu duyệt lại).
- ⚠️ **Backend KHÔNG chặn tự duyệt** — ADMIN tạo rồi tự duyệt được (đo thật), **khác hẳn phiếu kho**.
  Đừng khoá nút ở FE.
- ⚠️ `reject` ghi lý do vào **`description`** (dạng `"Từ chối: …"`), **không** vào `reason` (`reason`
  giữ lý do khách trả hàng) ⇒ màn chi tiết đổi nhãn field theo `status`, giống ca `REJECTED`.
- Mã phiếu: `TH-{branchCode}-{yyyyMMdd}-{seq}` (trả) · `DOI-…` (đổi), fallback viết tắt tên chi nhánh.

## Tiền — nằm trên phiếu, KHÔNG đụng `order_payment`

```
returnedAmount   = tiền hàng khách trả về (giá khách THỰC TRẢ)
deliveredAmount  = tiền hàng giao mới (0 với phiếu trả thuần)
refundAmount     = phải trả lại khách    │ tối đa 1 trong 2 khác 0
collectAmount    = phải thu thêm         ┘
```

- **Đơn gốc giữ nguyên `COMPLETED`/`PAID`/`paidAmount`** — phiếu trả là bản ghi độc lập. **Phí ship không hoàn.**
- **Giá quyết toán đã phân bổ chiết khấu + KM của đơn gốc**:
  `hệ số = (subtotal − discountAmount) / Σ lineTotal`; `giá/đv = (lineTotal / qty) × hệ số`.
  Đo thật: đơn `1.000.000 − giảm 120.000`, dòng `lineTotal 980.000` qty 2 ⇒ trả 1 cái được **440.000**.
  ⇒ **FE tuyệt đối không tự tính lại giá hoàn.**
- ⚠️ **FE LUÔN dùng `/return/exchange-diff`, không bao giờ `/exchange`** — FE không đoán được ngang giá
  hay lệch giá (giá do backend phân bổ); đoán sai thì `/exchange` trả `error.return.exchangePriceDiff`
  vô nghĩa với người dùng. Đo thật: `/exchange-diff` nhận **cả hai**, ngang giá trả `refund = collect = 0`.
- ⚠️ `STORE_CREDIT` · `POINT` · `VOUCHER` chưa hỗ trợ ⇒ `error.return.methodNotSupported` — FE chỉ bày
  `CASH` · `CARD` · `QR` · `COD`.
- Quyết toán **1 lần duy nhất** (`error.return.alreadyRefunded`); phiếu đổi ngang giá gọi vào ⇒
  `error.return.nothingToSettle` ⇒ FE tự ẩn nút "Quyết toán".

## Tích hợp quỹ ca (đo thật)

`/refund` **tự gắn `shiftId`** = ca đang mở của người quyết toán, tiền vào thẳng công thức chốt ca
(mở ca 500k → hoàn 500k CASH → chốt ca `expectedCash = 0`, lệch 0 ✓ — nhớ `expectedCash` luôn `null`
khi ca chưa chốt). `POST /return/search` có filter **`shiftId`** để đối soát.

## Tồn kho

| Loại dòng | Đụng tồn lúc nào | Chiều |
|---|---|---|
| `DELIVERED` (hàng giao mới khi đổi) | **approve** | **Trừ** — hết hàng ⇒ `error.stock.insufficient` |
| `RETURNED` + `RESALABLE` | **receive-stock** | **Cộng**, qua phiếu kho **`IN` + `ACCEPTED` tự sinh** (mã `PN-*`) |
| `RETURNED` + `DEFECTIVE` | — | Không cộng tồn (muốn ghi huỷ ⇒ `POST /stock-disposal`) |

- Đo đủ 3 chiều: đổi size ⇒ approve trừ tồn SKU mới `80 → 79` · nhận `RESALABLE` ⇒ `90 → 91` + phiếu
  `PN-676090` · nhận `DEFECTIVE` ⇒ tồn không đổi, `warehouseLedgerId = null`.
- ⚠️ Mọi dòng `RETURNED` phải có tình trạng — thiếu ⇒ `error.return.conditionRequired`;
  `defaultCondition` áp cho dòng không liệt kê. `receive-stock` chỉ gọi được 1 lần
  (`error.return.stockAlreadyReceived`).
- ⚠️ Guard **trạng thái chạy trước**: gọi `receive-stock` trên phiếu `COMPLETED` trả
  `error.return.invalidStatus` chứ không phải `stockAlreadyReceived` ⇒ FE xử lý 2 mã như nhau.

## Đối chiếu với đơn gốc

- ✅ `GET /order/{id}` có **`lines[].returnedQuantity`** (BE26, 2026-09-13) — còn trả được =
  `quantity − returnedQuantity`; phiếu `PENDING_APPROVAL` tính vào, `REJECTED` không tính (đo thật).
  `POST /order/search` vẫn `lines: null`.
- **Trả/đổi KHÔNG hoá đơn**: bỏ `orderId` ⇒ mỗi dòng bắt buộc `skuId` **và** `unitAmount` (nhập tay) —
  thiếu ⇒ `error.return.lineInvalid`. Không có ràng buộc "trả vượt số đã mua" (không có đơn đối chiếu);
  ADMIN duyệt là chốt chặn duy nhất.
- ⚠️ **`lines` trả `null` ở `POST /return/search`** (tránh N+1) ⇒ không dựng cột SẢN PHẨM ở bảng như
  mockup `06` vẽ; dialog cần `lines` (nhận hàng vào kho) phải `getById` trước khi mở.

## RBAC & data-scope (đo thật 4 tài khoản)

- Đọc + tạo: `[STAFF]`; duyệt/từ chối/quyết toán/nhận kho: `[ADMIN]` (STAFF gọi ⇒ 403 ⇒ `(...)` của
  STAFF tự ẩn, chỉ còn nút "Chi tiết").
- ⚠️ **STAFF thấy MỌI phiếu của chi nhánh mình**, không chỉ phiếu mình tạo — **khác** màn Ca làm việc.
- ADMIN chi nhánh khác ⇒ 403 `error.forbidden` cả `approve` lẫn `GET /{id}`. `branchId` chỉ SUPER_ADMIN.

## Sort

⚠️ `staffName` và `lines` gây **HTTP 500** (BE27) ⇒ 2 cột đó `enableSorting: false`. Sort được (đo 200):
`code` · `status` · `type` · `reason` · `returnedAmount` · `deliveredAmount` · `refundAmount` ·
`collectAmount` · `refundedAt` · `approvedAt` · `createdDate` · `id` · `orderId` · `orderCode` ·
`customerName` · `branchName`.

## Ngoài phạm vi (backend ghi rõ, cố ý)

Store credit · KM không được gỡ khi trả hàng (`usage_count`, `membershipPoint` giữ nguyên) · không có
thời hạn đổi/trả · **đổi hàng không sinh đơn bán mới** ⇒ SKU giao mới không vào doanh thu.
Doanh thu sau hoàn ở báo cáo: xem [bao-cao.md](bao-cao.md) (BE28/BE30).

subKey lỗi: `error.return.{notExisted, invalidStatus, lineRequired, lineInvalid, orderNotReturnable,
orderLineNotFound, quantityExceeded, exchangePriceDiff, alreadyRefunded, nothingToSettle,
methodNotSupported, stockAlreadyReceived, conditionRequired}` · `error.stock.insufficient` ·
`error.concurrentModification` · `error.staff.hasOpenReturns`.
