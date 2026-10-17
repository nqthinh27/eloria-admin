# Backend — Đơn hàng · Thanh toán · Giảm giá · Luồng POS · Hoá đơn

> Nguồn: `35.1.eloria-backend/docs/api/ban-hang-p6.md` (đọc trước khi sửa sâu domain này).
> Kiểm chứng bằng API thật nhiều đợt 2026-08-11 → 2026-08-22 (mốc nào quan trọng có ghi ngày).
> Màn FE: POS · Đơn hàng. Code FE: `src/api/order.ts`, `src/types/order.ts`, `src/pages/{pos,orders}/`,
> `src/hooks/use-cart.ts`. Quy ước chung: [README.md](README.md) · QR/ngân hàng: [ngan-hang-qr.md](ngan-hang-qr.md)
> · khuyến mại trên đơn: [khuyen-mai.md](khuyen-mai.md) · trả hàng: [doi-tra.md](doi-tra.md).

## Endpoint

| Nhóm | Role | Endpoint |
|---|---|---|
| Giỏ & tạo đơn | `STAFF` | `POST /order/cart/preview` (tính tiền, không ghi DB) · `POST /order` (→PENDING, **TRỪ TỒN NGAY**) |
| Đọc | `STAFF` | `POST /order/search` · `GET /order/{id}` · `GET /order/{id}/invoice` (JSON để FE tự in) |
| Sửa/huỷ | `STAFF` | `PUT /order/{id}` (chỉ khi còn PENDING) · `POST /order/{id}/cancel` (hoàn tồn) · `POST /order/{id}/note` |
| Chuyển trạng thái | `STAFF` | `/confirm` · `/pack` · `/ship` · `/complete` (chỉ đơn ONLINE/OTHER) |
| Thanh toán | `STAFF` | `POST /order/{id}/payment` — thu **đúng 1 lần** toàn bộ tiền |
| Bán quầy gộp | `STAFF` | `POST /pos/order` — xem [ca-lam-viec.md](ca-lam-viec.md); **màn POS không dùng** (user chốt giữ luồng 2 bước) |

- `POST /websocket` (`SendWsBodyDTO`) — **chưa rõ mục đích (BE4)**, không tự ý nối realtime.

## Enum & DTO

- **`EOrderStatus` 8 giá trị** (B7 đã chốt — dùng thẳng, không map về 5 trạng thái mockup `04`):
  `PENDING | CONFIRMED | PACKED | SHIPPING | SHIPPED | COMPLETED | CANCELLED | REJECTED`.
- `channel` = `ONLINE | POS | OTHER` (khớp 3 tab mockup; FE gửi được khi tạo đơn — BE5) ·
  `paymentStatus` = `UNPAID | PAID | REFUNDED` (**không còn `PARTIAL`**) ·
  `paymentMethod` = `CASH | CARD | QR | VOUCHER | POINT | STORE_CREDIT | COD` · `type` = `PURCHASE | REFUND`
  (`REFUND` là enum chết — đổi/trả nằm ở bảng `return_request` riêng, không sinh đơn REFUND).
- `OrderSearchReqDTO` = `{keyword, status, orderStatus, paymentStatus, channel, branchId, fromDate,
  toDate, shiftId, promotionId}` — **`orderStatus`** (vòng đời) tách khỏi **`status`** (0/1 bản ghi).
- `OrderResDTO` **không có `createdBy`** (bỏ 2026-08-14) — dùng **`staffId`**. Riêng
  `OrderPaymentResDTO` **vẫn giữ `createdBy`** (username người thu) — hai DTO khác nhau.
- `OrderResDTO.customerNote` (P14, 2026-10-14): ghi chú **của khách** khi đặt đơn storefront, **tách
  khỏi `description`** (nội bộ). Đơn POS/admin luôn `null`; không có endpoint nào cho nhân viên sửa.
  Có ở mọi response `OrderResDTO` (đo thật 2026-10-14: `POST /order/search` + `GET /order/{id}`; đơn
  storefront có ghi chú trả đúng chuỗi, đơn không ghi chú trả `null`).
- **Đơn do khách đặt ở storefront** (P14): `channel=ONLINE`, `staffId=null`, `shiftId=null`,
  `status=PENDING`, `paymentStatus=UNPAID`, `paymentMethod=COD|QR`, `shippingFee=0`; `shippingAddress`
  = snapshot "số nhà, phường/xã, tỉnh/thành"; tồn **trừ ngay lúc khách đặt** (không phải lúc xác nhận)
  và hoàn lại nếu khách tự hủy khi còn `PENDING` + chưa thu tiền (`description = "Hủy: Khách tự hủy"`).
  Sau đó đi tiếp luồng P6 **không đổi**: confirm → pack → ship → payment → complete.
- `OrderResDTO.shiftId`: backend **tự gắn** cho đơn POS của STAFF (xem [ca-lam-viec.md](ca-lam-viec.md)).
- `GET /order/{id}` có **`lines[].returnedQuantity`** (BE26, 2026-09-13) — còn trả được =
  `quantity − returnedQuantity`; phiếu `PENDING_APPROVAL` tính vào, `REJECTED` không tính.
  ⚠️ Chỉ populate ở `GET /{id}` — `POST /order/search` vẫn `lines: null`.
- ⚠️ Các API **danh sách** cố ý không join (tránh N+1): `order/search` trả `lines: null`,
  `paidAmount: null`, `promotionId/Name/Code: null` ⇒ đừng dựng cột từ các field này.
- `customerId` khi tạo đơn được validate: không tồn tại / không phải CUSTOMER ⇒ `error.user.notExisted`.
  Gắn được **khách bất kỳ**, không giới hạn chi nhánh (Phase 3b).
- Mã đơn: prefix = `branch.code`, fallback viết tắt tên 5 ký tự (`Chi nhánh Trung tâm` → `CNTT-…`),
  dạng `HK-20260811-233611-0001`. **Từ Phase 18c** đơn tạo mới là `{CN}-{yyMMdd}-{seq4}` (vd `Q1-261018-0001`,
  online `ONL-261018-0001`), đơn cũ giữ mã cũ ⇒ FE chỉ hiển thị, không parse; `branch.code` tối đa 6 ký tự `A-Z0-9`.

## Vòng đời tách theo kênh — đơn POS TỰ HOÀN THÀNH khi thu tiền (2026-08-22, đo thật 8/8 kịch bản)

| Kênh | Vòng đời | FE phải làm |
|---|---|---|
| **`POS`** | `PENDING` --*payment*--> **`COMPLETED`** | **Chỉ gọi `POST /order/{id}/payment`.** Không gọi confirm/pack/ship/complete — gọi `complete` sau `pay` luôn lỗi `error.order.invalidStatus` ⇒ `nextAction` trả `null` khi `channel === 'POS'`, không bày nút |
| `ONLINE` / `OTHER` | `PENDING → CONFIRMED → PACKED → SHIPPING → COMPLETED` | Đi đủ các bước; `pay` không tự hoàn thành |

- `payment` trên đơn POS tự set `status = COMPLETED` + `completedDate` trong cùng transaction.
- ⚠️ **Hệ quả: đơn POS đã thu tiền KHÔNG huỷ được** (`/cancel` ⇒ `error.order.alreadyClosed`) ⇒ không
  hoàn tiền/trả tồn qua `/cancel`. ✅ Từ 2026-09-12 nghiệp vụ trả hàng đi qua **phiếu đổi/trả**
  ([doi-tra.md](doi-tra.md)) — đơn gốc giữ nguyên `COMPLETED`/`PAID`.

## Mô hình tồn kho — KHÔNG GIỮ CHỖ (đổi kiến trúc 2026-08-14)

> User chốt: không đặt chỗ khi thêm giỏ (giống Shopee, khác đặt vé). Cột `stock_item.reserved` đã bị
> **xoá khỏi DB**. `available` luôn bằng `total`.

- ⚠️ **`POST /order` TRỪ TỒN THẬT NGAY** khi tạo (đo: `58 → 53` ở trạng thái PENDING).
  **`/pack` KHÔNG trừ lần hai** (đo: `confirm 57 → pack 57`).
- Thiếu hàng ⇒ `error.stock.insufficient` (400) **ngay tại `POST /order`**, đơn không tạo, tồn không hụt
  (rollback sạch). Đây là điểm chặn duy nhất và sớm nhất.
- `/cancel` hoàn đủ tồn ở **mọi giai đoạn** (PENDING lẫn PACKED — đo `60 → 58 → 60`).
- `cart/preview` trả `available` + `insufficient` từng dòng (màn POS không cần tự tra tồn) nhưng
  **không giữ chỗ** ⇒ POS phải xử lý `error.stock.insufficient` tại bước tạo đơn, không tin preview.
- Race tranh tồn giữa nhiều đơn: **an toàn** (6 đơn đồng thời → 2 OK, 4 insufficient, tồn về 0 không âm).
- ⚠️ **Đơn `PENDING` bị bỏ quên GIAM TỒN vô thời hạn** — backend không tự huỷ/hết hạn đơn.
  FE đã dựng cảnh báo đơn treo (`lib/stale-order.ts`, Phase 16).

## Mô hình thanh toán — THU ĐÚNG 1 LẦN, 1 HÌNH THỨC, TOÀN BỘ TIỀN (2026-08-15, đo 23/23 PASS)

- Body chỉ cần `{"method": "QR"}` (chuyển khoản dùng `QR`). ⚠️ **Ngừng gửi `amount`** — còn trong DTO
  nhưng **bị bỏ qua hoàn toàn** (gửi `amount: 1` trên đơn 1.300.000 vẫn thu đủ, không lỗi).
- Thu lần 2 trên đơn `PAID` ⇒ `error.order.alreadyPaid` ⇒ FE **disable nút Thu tiền khi PAID**.
  Thu trên đơn `CANCELLED` ⇒ `error.order.alreadyClosed`. `error.order.paymentExceedsTotal` không còn
  phát sinh (key i18n giữ để đọc log cũ).
- **Hoàn tiền không có endpoint riêng, không có nút "Hoàn tiền"**: huỷ đơn đã thu ⇒ backend tự sinh
  bản ghi hoàn + `paymentStatus = REFUNDED` (dòng hoàn `description = "Hoàn tiền hủy đơn"`, cùng `method`).
- `payments[]` **tối đa 2 phần tử** (unique `(order_id, status)`): nhiều nhất 1 dòng `PAID` + 1 dòng
  `REFUNDED`. `OrderPaymentResDTO.status` thực tế chỉ 2 giá trị đó — đừng dựng UI `UNPAID` cấp dòng.
- **`paidAmount` là số THỰC THU**: về `0` sau hoàn ⇒ đừng dùng `paidAmount > 0` suy "từng thanh toán";
  đọc `payments[]` hoặc `paymentStatus === 'REFUNDED'`.
- `PUT /order/{id}` đối soát lại `paymentStatus`: tổng tăng ⇒ về `UNPAID`; giảm ≤ đã thu ⇒ `PAID`.
- `POST /order/{id}/note` bị chặn trên đơn `CANCELLED` (`error.order.alreadyClosed` — giữ lý do huỷ
  trong `description`).
- **Race**: 2 lần thu đồng thời ⇒ 1 OK + 1 `409 error.dataIntegrity.violation`; xử lý như
  `error.concurrentModification` (409, optimistic lock `@Version`): **tải lại đơn rồi thử lại**.
  ⚠️ **BE3**: ≥3 request chồng nhau trên cùng đơn có thể ra **`500 error.other`** (InnoDB deadlock) —
  FE không coi 500 ở luồng thanh toán là lỗi tuyệt đối, phải tải lại đơn để biết trạng thái thật,
  đừng để nhân viên bấm thu lại mù quáng.

## Giảm giá — 2 TẦNG, đều nhập tay (2026-08-21, đo thật)

```
lineTotal (mỗi dòng)   = đơn giá × SL − lines[].discountAmount        ← TẦNG 1
subtotal (header)      = Σ (đơn giá × SL)                             ← TIỀN GỐC, CHƯA trừ gì
discountAmount(header) = Σ giảm-dòng + giảm-chung (+ khuyến mại)      ← MỘT con số tổng, backend gộp sẵn
totalAmount            = max(0, subtotal − discountAmount + shippingFee)
```

- `lines[].discountAmount` (≥ 0, optional) có ở cả `cart/preview`, `POST /order`, `PUT /order/{id}`.
- Tầng 2: `discountAmount` **hoặc** `discountPercent` cấp đơn; gửi cả hai thì **`%` thắng**, `%` tính
  trên `subtotal` gốc. Backend tự clamp: giảm-dòng ∈ `[0, đơn giá × SL]`, dòng `isGift` ép 0, tổng ≤ subtotal.
- ⚠️ **`subtotal` là GIÁ GỐC** — "tổng đã giảm" hiển thị cho khách chính là `discountAmount` header.
  **FE tuyệt đối không cộng lại 2 tầng** (cộng nữa là trừ hai lần).
- FE gửi **tách 2 tầng**, và `CartPanel` (preview) với `CheckoutDialog` (tạo đơn) **bắt buộc gửi giống
  hệt nhau** ⇒ dòng hàng dạng-gửi-backend tính **một chỗ** ở `CartProvider` (`orderLines`).
- Đo thật: 2 áo × 250.000, giảm dòng 20.000, giảm chung 10% ⇒ `subtotal 500.000` ·
  `discountAmount 70.000` · `totalAmount 430.000` · `lines[0].lineTotal 480.000`.

## Luồng bán tại quầy (user chốt 2026-08-29: tạo đơn xong hiện MODAL XEM TRƯỚC PHIẾU)

```
[Giỏ] → "Thanh toán" → CheckoutDialog (khách · giao hàng · hình thức thanh toán)
   → "Xác nhận & tạo đơn":  ① tạo hồ sơ khách vãng lai (nếu đủ tên+SĐT)  ② POST /order
   → OrderReceiptDialog (xem trước phiếu thật, nạp GET /order/{id}/invoice — cùng nguồn với bản in)
        ├─ "Xác nhận đã thanh toán" → POST /order/{id}/payment  (QR: mở QrPaymentDialog trước)
        ├─ "In hóa đơn"  ← chỉ mở khoá sau khi PAID
        ├─ "Xem đơn hàng" → /orders          └─ "Tạo đơn mới"
```

- `CheckoutDialog` **chỉ tạo đơn**, không thu tiền — mọi bước thu nằm ở modal phiếu.
- ⚠️ **Khách vãng lai ⇒ tạo hồ sơ TRƯỚC khi tạo đơn** — backend không có API gắn khách vào đơn đã tạo
  (`PUT` chỉ sửa đơn PENDING mà đơn POS nhảy thẳng COMPLETED khi thu). Chỉ tạo khi đủ tên + SĐT hợp lệ;
  tạo lỗi (hay gặp `error.phone.existed`) thì **bỏ qua, bán tiếp** như khách vãng lai — không chặn bán.

## Luồng thanh toán QR (user chốt 2026-08-21)

- Hình thức `QR` **KHÔNG thu thẳng** — phải qua `QrPaymentDialog` (cả POS lẫn dialog chi tiết đơn):
  `GET /bank-account/order/{id}/qr` → khách quét → NV **tự đối chiếu app ngân hàng** (chưa có webhook)
  → bấm "Xác nhận đã nhận tiền" → `payment {method:'QR'}`. Tiền mặt/thẻ/COD thu thẳng.
- **Đơn `ONLINE` thu đúng `paymentMethod` của đơn** (user chốt 2026-10-15): dialog Thu tiền **không
  có ô chọn hình thức**, chỉ hiện chữ (QR ⇒ sang `QrPaymentDialog`; COD ⇒ thu thẳng `{method:'COD'}`).
  Đơn `ONLINE` thiếu `paymentMethod` (dữ liệu cũ) và đơn `POS`/`OTHER` vẫn cho chọn.
  **Backend S35 (2026-10-15)**: đơn `ONLINE` **bỏ qua** `method` gửi lên (gửi `{}` được, gửi khác
  không lỗi) — dòng thanh toán luôn = phương thức khách chọn. Đơn `POS`/`OTHER` thiếu `method` ⇒
  `400 error.payment.methodRequired`. FE vẫn gửi đúng `paymentMethod` của đơn.

## Đơn online chưa gán chi nhánh — chọn chi nhánh khi duyệt (backend S36, 2026-10-15)

Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-s35-s36-admin.md` (phiên client đo thật).

- Đơn storefront mới: mã `ONL-…`, `branchId`/`branchName` = `null`, **chưa trừ kho** (giữ chỗ trên tồn
  toàn chuỗi). Đơn cũ đã gán chi nhánh giữ luồng cũ.
- `POST /order/{id}/confirm {branchId}` — **bắt buộc** khi đơn chưa gán (thiếu ⇒ `error.order.branchRequired`);
  gán chi nhánh + trừ kho tại đó trong 1 transaction. Lỗi: `error.stock.insufficient`, `error.branch.inactive`,
  `403 error.forbidden` (ADMIN chọn chi nhánh khác), `error.order.branchAlreadyAssigned` (đơn đã gán, gửi chi nhánh khác).
- `GET /order/{id}/branch-availability` ⇒ `[{branchId, branchName, enough, selectable, lines[{skuId, skuCode,
  productName, required, available}]}]`, đủ hàng xếp trước. FE (`ConfirmBranchDialog`) chỉ cho chọn
  `enough && selectable`, chi nhánh thiếu hiện `còn / cần` từng SKU; `confirm` lỗi ⇒ nạp lại tồn
  (không hiện `logInfo` — CONVENTIONS mục 3).
- `POST /order/search` thêm `unassigned: true` (hàng chờ, ưu tiên hơn `branchId`). Phạm vi (user chốt 2026-10-15):
  SUPER_ADMIN + ADMIN thấy đơn chưa gán (ADMIN search mặc định = chi nhánh mình + đơn chưa gán); STAFF không.
  FE: bộ lọc chi nhánh có mục "Chưa gán chi nhánh" cho ADMIN+; cột Chi nhánh hiện badge cho đơn ONLINE `branchName` null.
- Invoice đơn chưa gán: `branchName/branchPhone/branchAddress = null` (`print-invoice` đã bỏ qua khi null).
- Ở POS đơn được **tạo trước rồi mới hiện QR** ⇒ tồn đã trừ. Đóng dialog chưa xác nhận ⇒ đơn **chưa
  thu tiền**, **tuyệt đối không tạo lại đơn**. Chi tiết ảnh QR: [ngan-hang-qr.md](ngan-hang-qr.md).

## In hoá đơn — chỉ in khi đã `PAID` (user chốt 2026-08-21)

- Nút "In hoá đơn" **disable khi `paymentStatus !== 'PAID'`** + `title` giải thích — ở **cả** dialog
  chi tiết đơn và dialog kết quả POS.
- `InvoiceResDTO` chỉ có khối chi nhánh — letterhead/logo/hotline/chân trang do FE gắn từ
  **`storeConfig`** (`src/config/app.ts`, đọc `VITE_STORE_*`). Logo là **chữ** `é l o r i a` —
  khoảng trắng giữa ký tự là cố ý, đừng "sửa".
- ✅ `InvoiceResDTO` có **`staffName`** ⇒ in hoá đơn chỉ cần **một** lời gọi `GET /order/{id}/invoice`.
  (`OrderResDTO` vẫn chỉ có `staffId`.) Có cả `promotionId/Name/Code` + `lines[].discountAmount`/`lineTotal`
  ⇒ hoá đơn tách được chiết khấu từng dòng và nói được giảm vì đâu.
- Khổ in nhiệt **80mm**, cỡ chữ nền **13px** (user phản hồi 11–12px quá nhỏ).
- ⚠️ Dữ liệu seed có mojibake (`branch.address`, `staffName` dạng `Sá»‘ 1 ÄÆ°á»ng…`) — lỗi ghi DB phía
  backend, **user chốt FE không workaround** (đừng thêm code "sửa" mã hoá).
