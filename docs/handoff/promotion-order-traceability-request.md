# Yêu cầu bổ sung: truy vết khuyến mại trên đơn hàng & hoá đơn

> **Ngày:** 2026-09-07 · **Từ:** FE `35.2.eloria-admin` · **Tới:** BE `35.1.eloria-backend`
> **Liên quan:** BE Phase 9 (Khuyến mại & Promotion Engine) · FE Phase 14 (đã xong)
> **Mức độ:** không chặn phát triển, nhưng **chặn nghiệp vụ đối soát và in hoá đơn cho khách**

> ## ✅ **ĐÃ ĐƯỢC XỬ LÝ (2026-09-08)** — tài liệu này giữ lại để đọc lịch sử
>
> Backend đã làm **cả 3 mục**: 3 field truy vết vào `OrderResDTO` + `InvoiceResDTO` ·
> **Cách A** cho mã sai (`400 error.promotion.codeInvalid`) · `OrderSearchReqDTO.promotionId`.
> FE đã kiểm chứng bằng API thật (7/7 PASS) và nối xong UI — xem báo cáo rà soát ở
> `PLAN.md` mục *"Rà soát FE sau khi backend xử lý yêu cầu truy vết KM (2026-09-08)"*.
>
> ⚠️ **Một điểm cần biết khi đọc lại**: lỗi `codeInvalid` làm hỏng **cả request** `cart/preview`,
> nên FE phải bắt riêng mã lỗi này để giỏ không mất khối tính tiền khi khách gõ sai một ký tự.


## 0. Tóm tắt trong 30 giây

Engine khuyến mại **đã chạy đúng** — FE đã kiểm thử end-to-end 10/10 case, không có lỗi.
Vấn đề duy nhất: **sau khi đơn được tạo, không còn cách nào biết đơn đó đã áp khuyến mại nào.**

`OrderResDTO` và `InvoiceResDTO` chỉ có **một con số `discountAmount` gộp**, không có
`promotionId` / `promotionName` / `promotionCode` — dù `CartPreviewResDTO` (bước xem trước)
thì **có đủ**. Thông tin bị mất đúng ở bước ghi vào DB.

**Xin bổ sung 3 field vào `OrderResDTO` + `InvoiceResDTO`** (mục 3). Đây là **thêm field, không
phá vỡ gì** — client cũ bỏ qua field mới vẫn chạy nguyên.

---

## 1. Những gì ĐANG CHẠY TỐT (FE đã đo thật, không cần backend sửa)

Ghi lại để backend khỏi mất công kiểm tra lại — toàn bộ đo trên server local ngày 2026-09-07:

| # | Kịch bản | Kết quả đo | |
|---|---|---|---|
| 1 | `cart/preview` khi có KM tự động `RUNNING` | `subtotal 1.160.000` → `promotionDiscount 116.000` → `totalAmount 1.044.000`, kèm `promotionName` | ✅ |
| 2 | `POST /order` — KM tự động | `subtotal 1.300.000` → `discountAmount 130.000` → `totalAmount 1.170.000`, **không cần FE gửi gì thêm** | ✅ |
| 3 | Quota `usageCount` sau khi tạo đơn | `0 → 1`, tiêu thụ đúng 1 lượt | ✅ |
| 4 | Thanh toán đơn POS | `PENDING → COMPLETED`, `paidAmount = totalAmount = 1.170.000` (đã trừ KM) | ✅ |
| 5 | Coupon `FIXED 300.000` vs auto `PERCENT 10% = 130.000` | Engine chọn **300.000** — best-one-wins đúng | ✅ |
| 6 | Tạo đơn kèm `couponCode` hợp lệ | `discountAmount 300.000`, `totalAmount 1.000.000` | ✅ |
| 7 | KM khai `channel: POS`, preview đơn `ONLINE` | `promotionDiscount 0`, `promotionName null` — **không rò rỉ chéo kênh** | ✅ |
| 8 | Huỷ đơn có KM | `release` quota, trả tồn | ✅ |
| 9 | RBAC | STAFF tạo KM ⇒ 403; ADMIN tạo ⇒ 200, bị ép `branchId` chi nhánh mình | ✅ |
| 10 | KM `ENDED` | Không áp vào đơn nào nữa | ✅ |

⇒ **Luồng áp khuyến mại khi thanh toán KHÔNG cần backend làm thêm gì.** Phần dưới chỉ là truy vết.

---

## 2. Vấn đề: thông tin khuyến mại bị mất sau khi tạo đơn

### 2.1 Bằng chứng

Cùng một giỏ hàng, so sánh 2 bước liền nhau:

**`POST /order/cart/preview`** — có đủ thông tin:

```json
{ "subtotal": 1300000, "promotionDiscount": 300000,
  "promotionId": "8f2c…", "promotionName": "E2E Coupon", "promotionCode": "E2EUKWW9SSD",
  "totalAmount": 1000000 }
```

**`POST /order`** (cùng giỏ, cùng mã) — mất sạch:

```json
{ "subtotal": 1300000, "discountAmount": 300000, "totalAmount": 1000000 }
```

FE đã liệt kê **toàn bộ key** của cả 2 DTO, không có key nào khớp `promo|coupon`:

- `OrderResDTO` → chỉ có `discountAmount`
- `InvoiceResDTO` → `branchName, branchPhone, branchAddress, orderCode, orderDate, customerName,
  customerPhone, staffName, shippingAddress, note, lines, subtotal, discountAmount, shippingFee,
  totalAmount, paymentMethod, paymentStatus, paidAmount, payments`

Dữ liệu **có tồn tại trong DB** — bảng `promotion_log` unique `(promotion_id, order_id)` chính là
mối nối cần thiết. Chỉ là **không được trả ra API**.

### 2.2 Hệ quả nghiệp vụ

| Ai | Không làm được gì |
|---|---|
| **Thu ngân / khách** | Hoá đơn in ra chỉ ghi *"Giảm giá: 300.000đ"* — **không nói giảm vì đâu**. Khách hỏi "sao được giảm 300k?" thì nhân viên không trả lời được. |
| **Kế toán / đối soát** | Không biết đơn nào đã dùng mã nào ⇒ không đối soát được chi phí khuyến mại theo chương trình. |
| **Quản lý** | `promotion.usageCount` cho biết mã được dùng **bao nhiêu lần**, nhưng **không biết dùng ở đơn nào**, không lần ngược được khi nghi ngờ gian lận. |
| **CSKH** | Khách khiếu nại "tôi nhập mã mà không thấy giảm" — không có cách nào tra lại đơn đó đã áp mã gì. |

### 2.3 Một khoảng trống nữa: mã sai bị nuốt im lặng

Đo thật — gửi `couponCode: "MA-KHONG-TON-TAI"` khi tạo đơn:

```
⇒ HTTP 200, đơn ĐƯỢC TẠO BÌNH THƯỜNG, discountAmount = 65.000 (rơi về KM tự động)
```

Backend **không báo lỗi, không cảnh báo**. Tương tự ở `promotion/preview`: mã sai trả
`{applied: false, discountAmount: 0}` — **y hệt** trường hợp không nhập mã.

⇒ FE **không có cách nào phân biệt** "mã sai" với "không có KM nào khớp". Khách gõ nhầm 1 ký tự
thì thanh toán vẫn trôi, đến lúc nhìn hoá đơn mới phát hiện không được giảm.

---

## 3. Đề xuất — 3 field, không phá vỡ gì

### 3.1 Bổ sung vào `OrderResDTO` và `InvoiceResDTO`

```java
/** Id chương trình KM đã áp; null nếu đơn không có KM. */
private UUID promotionId;
/** Tên chương trình — để in lên hoá đơn, vd "Flash Sale cuối tuần". */
private String promotionName;
/** Mã KM khách đã nhập; null khi là KM tự động (khách không nhập gì). */
private String promotionCode;
```

**Nguồn dữ liệu đã có sẵn**, không cần thêm bảng: `promotion_log` đã lưu `(promotion_id, order_id)`
với ràng buộc unique, join ngược về `promotion` là ra `name` + `code`.

⚠️ **Đặt tên trùng `CartPreviewResDTO`** (`promotionId`/`promotionName`/`promotionCode`) để FE dùng
chung một kiểu dữ liệu cho cả bước xem trước lẫn đơn đã tạo — đừng đặt tên khác nhau giữa 2 DTO.

**Không phá vỡ**: đây là thêm field vào response. Client cũ bỏ qua field lạ, FE hiện tại khai
optional nên deploy lệch thứ tự cũng không sao.

### 3.2 Phân biệt mã sai với không có KM

Xin **một trong hai** (backend chọn cái nào dễ hơn, FE làm theo được cả hai):

**Cách A — trả subKey riêng** *(FE ưu tiên, rõ ràng nhất)*

```
POST /order            + couponCode không tồn tại/hết hạn/hết lượt
POST /order/cart/preview  ⇒  400  error.promotion.codeInvalid
```

Chỉ chặn khi khách **có nhập mã** mà mã không dùng được. Không nhập mã thì giữ nguyên hành vi hiện
tại (im lặng áp KM tự động nếu có).

**Cách B — thêm cờ vào response** *(nhẹ hơn, không đổi mã HTTP)*

```java
/** true khi client có gửi couponCode nhưng mã không áp được. */
private Boolean couponRejected;
/** Lý do: NOT_FOUND | EXPIRED | USAGE_LIMIT | MIN_AMOUNT | WRONG_CHANNEL | WRONG_BRANCH */
private String couponRejectReason;
```

⚠️ Nếu chọn cách B thì **`PromotionResultDTO` của `/promotion/preview` cũng cần** 2 field này —
hiện `applied: false` không phân biệt được "mã sai" với "không có KM nào".

### 3.3 (Tuỳ chọn — ưu tiên thấp) Lọc đơn theo khuyến mại

`OrderSearchReqDTO` thêm `promotionId` để lọc *"tất cả đơn đã dùng chương trình X"*. Rất hữu ích
khi đối soát hiệu quả một chương trình, nhưng **chưa chặn gì** — có thể để đợt sau.

---

## 4. Ưu tiên

| # | Việc | Mức | Vì sao |
|---|---|---|---|
| 1 | 3 field `promotion*` vào **`InvoiceResDTO`** | 🔴 Cao | Hoá đơn đưa tận tay khách, đang ghi giảm giá mà không nói vì sao |
| 2 | 3 field `promotion*` vào **`OrderResDTO`** | 🔴 Cao | Màn chi tiết đơn + đối soát kế toán |
| 3 | Phân biệt mã sai (3.2) | 🟡 Vừa | Khách gõ nhầm là mất khuyến mại trong im lặng |
| 4 | Lọc `promotionId` (3.3) | 🟢 Thấp | Tiện cho báo cáo, chưa chặn |

## 5. FE sẽ làm gì sau khi có

1. **Ô nhập mã giảm giá ở màn POS** (`design/03-pos-ban-hang.png`) — gọi `cart/preview` với
   `couponCode`, hiện tên KM + số tiền giảm ngay trên giỏ, báo lỗi nếu mã sai (cần 3.2).
2. **Dòng "Khuyến mại: <tên KM> (mã ABC) −300.000đ"** trên hoá đơn in và dialog chi tiết đơn.
3. Bỏ ghi chú tạm ở `PLAN.md` mục **BE22**.

FE **không cần backend đổi gì khác** — engine, quota, best-one-wins, branch scope đều đã đúng.

---

## 6. Ghi chú kiểm thử

Toàn bộ số liệu trong tài liệu này đo trên **server local** ngày **2026-09-07** bằng tài khoản
`superadmin`, SKU `SP003-WH-QU-30` (chi nhánh *HN - Hoàn Kiếm*, tồn 50).
**Dữ liệu test đã được dọn**: đơn test đã huỷ, KM/coupon test đã chuyển `ENDED`, tồn đã hoàn.
