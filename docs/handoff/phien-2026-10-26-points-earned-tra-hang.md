# Bàn giao — `pointsEarned` ở đơn/hoá đơn + cảnh báo Trả hàng · 2026-10-26

**Chưa commit/push.** `npm run lint` 0 lỗi (5 warning cũ), `npm run build` qua. **Chưa kiểm với backend thật** (cần OTP Zalo).

## Đã làm
1. `types/order.ts`: thêm `pointsEarned`, `pointsEarnedEstimated` (chỉ có ở chi tiết đơn/response thao tác, không có ở `search`).
2. `orders/components/order-points-rows.tsx`: bỏ hẳn cách tra 50 giao dịch EARN (không còn gọi API); đọc `pointsEarned` từ đơn — `null`/`0` ẩn dòng, `pointsEarnedEstimated` ⇒ nhãn "Điểm dự kiến tích".
3. `pos/components/order-receipt-dialog.tsx`: thêm dòng điểm tích (cùng quy tắc) trong hoá đơn.
4. Trả hàng: `returns/components/return-create-dialog.tsx` hiện cảnh báo vàng "Trả/đổi KHÔNG hoàn điểm đã dùng, KHÔNG thu hồi điểm đã tích" **chỉ khi** đơn gốc có `pointsRedeemed` hoặc `pointsEarned` > 0.
5. i18n `point`: `order.earnedEstimated`, `return.noPointsRefund` (VI+EN).

## Vì sao chọn cảnh báo có điều kiện (Trả hàng)
Dialog tạo phiếu **đã gọi `orderApi.getById`** khi chọn đơn gốc (`pickOrder`) nên có sẵn dữ liệu điểm, không tốn query thêm ⇒ theo quy tắc PO chỉ hiện khi đơn có điểm. Chưa làm cảnh báo ở modal chi tiết phiếu trả / luồng hoàn tiền (không có đơn gốc đầy đủ sẵn trong dữ liệu đó).

## Còn mở
- Kiểm tay: đơn COMPLETED có điểm, đơn đang xử lý (dự kiến), đơn < 50.000đ (0 ⇒ ẩn), đơn không khách (ẩn); POS sau tạo/thu tiền; tạo phiếu trả từ đơn có/không có điểm.
- Phiếu trả không gắn đơn gốc (nguồn khác) không có cảnh báo.
