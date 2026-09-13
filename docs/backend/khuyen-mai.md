# Backend — Khuyến mại & Coupon

> Nguồn: `35.1.eloria-backend/docs/api/khuyen-mai-p9.md`. Kiểm chứng end-to-end 2026-09-07/08
> (dữ liệu test đã dọn). Màn FE: Khuyến mại + ô nhập mã ở POS. Code FE: `src/api/promotion.ts`,
> `src/types/promotion.ts`, `src/pages/promotion/`. Quy ước chung: [README.md](README.md).

| Nhóm | Role tối thiểu | Endpoint |
|---|---|---|
| Đọc KM | `STAFF` | `POST /promotion/search` · `GET /promotion/{id}` |
| Thử áp KM cho giỏ | `STAFF` | `POST /promotion/preview` |
| Ghi KM | `ADMIN` | `POST /promotion` · `PUT /promotion/{id}` · `POST /promotion/{id}/update-status` |
| Coupon | `ADMIN` | `POST /coupon/generate` · `GET /coupon/export` (CSV) |

## Mô hình

- **MVP: chỉ `PERCENT`/`FIXED`, KHÔNG chồng KM — best-one-wins**, mỗi đơn tối đa 1 KM. Engine chọn KM
  giảm nhiều nhất trong số KM tự động + coupon nhập (đo thật: coupon FIXED 50.000 **thua** auto 10% = 116.000).
- **Một bảng `promotion` gánh 3 vai**: `code = null` ⇒ KM tự động · `code` + `customerId = null` ⇒
  coupon công khai · `code` + `customerId` ⇒ coupon cá nhân. `branchId = null` ⇒ toàn chuỗi.
- ⚠️ **`status` của KM là lifecycle enum `DRAFT|SCHEDULED|RUNNING|PAUSED|ENDED`, KHÔNG phải 0/1** —
  khác mọi module khác. `PromotionSearchReqDTO` có **cả** `status` (int) lẫn `promotionStatus` (enum)
  ⇒ lọc vòng đời dùng **`promotionStatus`**. **Không có xoá mềm/DELETE** — kết thúc = `ENDED`.
- Tạo mới luôn ra `DRAFT`, phải `update-status` sang `RUNNING` mới hiệu lực. Chuyển hợp lệ:
  `DRAFT→SCHEDULED|RUNNING|ENDED` · `SCHEDULED→RUNNING|PAUSED|ENDED` · `RUNNING→PAUSED|ENDED` ·
  `PAUSED→RUNNING|ENDED`; sai ⇒ `error.promotion.invalidStatus`.
- ⚠️ **`update-status` trả `data: null`** dù api-docs khai DTO (BE18) — trạng thái có lưu đúng ⇒
  **bắt buộc refetch**, không gán response vào state.
- BE21: list KM không có `activeTotal`/đếm theo trạng thái ⇒ 3 thẻ đếm của mockup `16` đã gỡ (user chốt).

## Coupon

- `POST /coupon/generate`: bọc BaseResponse bình thường, trả `{total, data: string[]}`; `count` ≤ 5000;
  mỗi mã = `codePrefix` + 8 ký tự ngẫu nhiên; **sinh ra đã `RUNNING`** (khác KM thường ra `DRAFT`).
- ⚠️ `GET /coupon/export` trả **CSV thuần** ⇒ `apiClient.getBlob()`.

## Mã sai — `error.promotion.codeInvalid` (400, backend bổ sung 2026-09-08 theo yêu cầu FE)

- Chỉ nổ khi **có gửi** `couponCode` mà mã không dùng được (không tồn tại / sai kênh / sai chi nhánh /
  ngoài khung giờ / chưa đủ `minAmount` / hết lượt). Không gửi mã ⇒ im lặng áp KM tự động. Mã **hợp lệ
  nhưng thua best-one-wins** thì KHÔNG bị coi là sai. Có ở cả 4 endpoint: `POST /order` ·
  `PUT /order/{id}` · `cart/preview` · `promotion/preview`.
- ⚠️ Lỗi này làm hỏng **cả request `cart/preview`** ⇒ FE bắt riêng `subKey === 'error.promotion.codeInvalid'`,
  **giữ nguyên `preview` cũ**, chỉ bôi đỏ ô mã (`cart-panel.tsx#couponError`) — nhân viên vẫn thấy tổng tiền.

## Tích hợp bán hàng

- `CreateOrderReqDTO`/`CartPreviewReqDTO` thêm `couponCode`; `CartPreviewResDTO` trả
  `promotionDiscount` · `promotionId` · `promotionName` · `promotionCode`.
- KM và **giảm giá tay 2 tầng cộng dồn** — backend gộp cả hai vào `order_sale.discountAmount`
  (cap ≤ subtotal) ⇒ FE đọc thẳng `discountAmount` header, **không tự cộng lại**.
- `PUT /order/{id}` (đơn PENDING) tự `release` KM cũ rồi áp lại; `/cancel` cũng `release` (hoàn quota).
- Truy vết trên đơn: `OrderResDTO`/`InvoiceResDTO` có `promotionId/Name/Code`;
  `OrderSearchReqDTO.promotionId` lọc đơn theo chương trình. ⚠️ `POST /order/search` trả **null** cho
  3 field (tránh N+1) ⇒ **không dựng cột KM ở bảng Đơn hàng**, chỉ hiện ở dialog chi tiết/hoá đơn.
- Đo thật: giỏ 2×`SP006-NV-QU-32` POS, KM `ALL 10%` ⇒ `subtotal 1.160.000` ·
  `promotionDiscount 116.000` · `totalAmount 1.044.000`.

## Branch scope & RBAC (đo thật)

- Non-SUPER_ADMIN **đọc** được KM toàn chuỗi + KM chi nhánh mình; **ADMIN tạo/sửa chỉ chi nhánh mình**
  (`branchId` khác ⇒ `error.promotion.branchForbidden`). STAFF `POST /promotion` ⇒ 403, `search` ⇒ 200.

subKey lỗi: `error.promotion.{notExisted, codeExisted, codeInvalid, invalidValue, targetRequired,
invalidDate, invalidStatus, branchForbidden}`.
