# Bàn giao — Phase 21b (điểm thưởng ở admin) · 2026-10-25

Hợp đồng: `35.1.eloria-backend/docs/api/fe-handoff-phase16-admin.md` + `…-coupon.md`. **Chưa commit/push/deploy** (PO chỉ commit khi được yêu cầu).
Cổng kiểm tra: `npm run lint` 0 lỗi (5 warning cũ của `ui/`), `npm run build` qua. **Chưa kiểm tay** (xem cuối).

## Đã làm
1. **POS thu tiền** — `pos/components/points-redeem-field.tsx` gắn vào `OrderReceiptDialog` (bước "Xác nhận đã thanh toán", vì đơn POS đã tạo UNPAID rồi mới thu). Đơn vãng lai ⇒ chỉ hiện dòng báo, không có ô nhập. Có khách ⇒ hiện số dư (`customer.membershipPoint`, ≈ ×`redeemValuePerPoint`), ô nhập chặn ở `maxRedeemable` (`GET /order/{id}/points-preview?pointsToRedeem=0`), nút "Trừ tối đa", tính thử debounce 300ms; số điểm/tiền giảm/số phải thu **lấy từ preview của server**, hiện cảnh báo nếu server clamp. `PosPage.payCreatedOrder` gửi `pointsToRedeem` (chỉ khi >0); response `Order` mới thay `created` ⇒ phiếu nạp lại, thêm dòng "Điểm đã trừ".
2. **CRM** — `customer/components/point-history.tsx` nhúng vào `CustomerDetailModal` qua prop mới `extraSection` của `DetailModal` (số dư điểm đã có sẵn ở modal). Lọc EARN/REDEEM/REVERT, phân trang 10/trang, `+N` xanh/`−N` đỏ, link `/orders?open=<id>`.
3. **Chi tiết đơn** — `orders/components/order-points-rows.tsx`: "Điểm đã trừ" (`pointsRedeemed`/`pointsDiscount`) + "Điểm đã tích" cho đơn COMPLETED có khách.
4. **Coupon** — rà `promotion-form-dialog` / list / `coupon-generate-dialog`: **đã đủ** mã, `minAmount`, `usageLimit`, `perCustomerLimit`, `customerId` (mã cá nhân), sinh hàng loạt, hiển thị lượt dùng; `error.promotion.codeInvalid` đã có i18n. Không đổi gì.
5. **Chú thích luật điểm** — `components/point-rules-note.tsx` (số từ `GET /points/rules`, hook `use-point-rules`, mặc định 50.000/1.000/50% nếu tải lỗi) hiện ở POS và ở khối Lịch sử điểm. i18n namespace mới `point` (VI+EN); lỗi `error.points.*`, `error.order.pointsNotEditable` thêm đủ 2 ngôn ngữ.
- Types/API: `types/point.ts`, `api/point.ts` (`rules`, `searchByCustomer`), `orderApi.pointsPreview`, `OrderPaymentReq.pointsToRedeem`, `Order.pointsRedeemed/pointsDiscount`.

## Quyết định tự chốt / lệch handoff
- **QR và COD không dùng điểm ở POS** (ô bị khoá kèm lời giải thích): QR đóng đơn qua webhook, không đi `POST /payment` có `pointsToRedeem`, và mã QR đã chốt `totalAmount` lúc tạo đơn; COD không thu tại quầy. Handoff backend không nói rõ trường hợp QR ⇒ cần PO/BE xác nhận.
- **"Điểm đã tích" ở chi tiết đơn không có field trong `OrderResDTO`** (handoff không nêu) ⇒ tra dòng EARN của đơn trong 50 giao dịch EARN mới nhất của khách; không thấy ⇒ "Chưa ghi nhận". Đơn quá cũ có thể hiện sai là chưa ghi nhận. Đề xuất BE thêm `pointsEarned` vào `OrderResDTO` (hoặc filter `orderId` ở points/search).
- Lịch sử điểm là **khối dưới modal**, không phải tab (DetailModal không có tab).
- Màn Trả hàng: handoff §4 yêu cầu dòng cảnh báo "Trả hàng không hoàn/thu hồi điểm" — **chưa làm** (ngoài danh sách việc phiên này).
- Màn Sửa đơn admin không tồn tại ⇒ `pointsNotEditable` chỉ có i18n lỗi.
- Cấu hình `loyalty.*` ở `/store-settings` (Phase 21b mục ①): chưa làm.

## Chưa đo/kiểm
- Chưa chạy luồng thật: đăng nhập admin cần OTP Zalo nên phiên này không đăng nhập được. Cần PO/QA kiểm: POS có khách (trừ điểm, số thu = server), POS vãng lai, CRM lịch sử điểm, chi tiết đơn COMPLETED, STAFF xem được.
- `npm install` bổ sung 48 gói bị thiếu trong `node_modules` (`@stomp/stompjs`, `@tiptap/*`) để build chạy; `package.json`/lock không đổi.
