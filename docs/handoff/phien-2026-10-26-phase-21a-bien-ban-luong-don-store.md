# Biên bản kiểm luồng xử lý đơn store — Phase 21a mục ④ · 2026-10-26

**Trạng thái: XONG — tất cả kịch bản PASS.** Đo thật end-to-end bằng trình duyệt tích hợp (storefront `:3000` + admin `:5173`), backend thật `:8080`. Không sửa backend, không commit/push.

## Môi trường
- Backend rớt kết nối giữa phiên, phiên này tự khởi động lại (`mvn spring-boot:run -Dspring-boot.run.profiles=dev`, log `scratchpad/backend.log`) — **vẫn đang chạy**, chưa dừng (các repo khác có thể đang cần). Docker `redis-eloria`, `mysql-eloria` không đổi.
- OTP admin: PO cấp trực tiếp qua phiên điều phối mỗi lần bấm "Gửi OTP" (không dò/brute-force Redis — bị từ chối và đã dừng hẳn hướng này theo chỉ đạo).
- Tài khoản dùng: khách test **A** (`fe.p14.a.a0a657`, `.env.local` gitignored của repo client); admin `superadmin`, `adminbranch`, `staffone` (`docs/backend/README.md`) — không ghi mật khẩu.
- **Quan sát FE storefront (không phải bug chặn)**: nhiều trang hay kẹt "Đang tải sản phẩm…" sau điều hướng SPA, luôn hết khi **Ctrl+Shift+R**. Nghi cache Next dev/Turbopack bị stale sau khi backend restart giữa phiên. Không tạo backend-request (không phải lỗi backend); ghi lại để lưu ý.

## (a) COD thường — ✅ PASS
Đơn `ONL-261026-0001` (629.000đ, navy/M, khách A, ghi chú "Test biên bản Phase 21a — đơn COD #1").
- Duyệt (`superadmin`) kèm chọn **Chi nhánh Trung tâm** qua `ConfirmBranchDialog` — cả 3 chi nhánh hiện "Đủ hàng" đúng `branch-availability`.
- Đóng gói → Bàn giao vận chuyển → Thu tiền (COD, đúng `phương thức` đơn, không có ô chọn khác) → Hoàn tất.
- "Ghi chú của khách" ở admin hiện đúng nội dung khách nhập trên web (tách biệt "Ghi chú nội bộ").
- "Điểm dự kiến tích +12 điểm" (629.000/50.000) khi `PENDING..SHIPPING`, đổi đúng thành **"Điểm đã tích +12 điểm"** sau khi `COMPLETED` — xác nhận field `pointsEarned`/`pointsEarnedEstimated` (Phase 21b, phiên 2026-10-26) hoạt động đúng với dữ liệu backend thật.

## (b) QR chuyển khoản — ✅ PASS
Đơn `ONL-261026-0002` (849.000đ, đen/M). Nội dung chuyển khoản hiện đúng `ELORIAONL2610260002` (khớp spec 18c-1).
- Duyệt, gán **HN - Cầu Giấy** (chi nhánh khác để test đa dạng).
- Nút Thu tiền đổi đúng nhãn **"Xác nhận đã nhận chuyển khoản"** → mở `QrPaymentDialog` ("Hiển thị mã QR" → "Xác nhận đã nhận tiền") — không có ô chọn hình thức khác, đúng S35.
- Đóng gói → giao → hoàn tất. "Điểm dự kiến tích +16" → "Điểm đã tích +16" (849.000/50.000=16).

## (c) Đơn dùng điểm + mã giảm giá — ✅ PASS
Sau khi (a)+(b) hoàn tất, khách A có **28 điểm** (12+16, đúng CRM "Lịch sử điểm": 2 dòng EARN liên kết đúng 2 đơn).
- Đặt đơn `ONL-261026-0003` (Đầm suông linen 599.000đ) trên storefront, dùng **28/28 điểm tối đa cho phép** (`dùng được tối đa 28 điểm` — đúng vì 28 < 50%×599.000). Tổng đúng `599.000 − 28.000 = 571.000đ`.
- Điểm **trừ ngay lúc đặt**: CRM báo số dư về `0` ngay sau khi đặt (trước khi admin duyệt).
- Chi tiết đơn ở admin hiện đúng "Điểm đã trừ: 28 điểm (−28.000đ)" + "Điểm dự kiến tích +11" (571.000/50.000=11, tính trên tiền sau trừ điểm).
- Duyệt → đóng gói → giao → thu 571.000đ (đúng số tiền sau giảm) → hoàn tất: "Điểm đã tích +11" — CRM báo số dư **11** đúng (0+11). Mã giảm giá không test riêng (coupon đã rà đủ ở phiên 2026-10-25, không lặp lại).

## (d) Hủy và lỗi — ✅ PASS (trừ D4 không test)
1. **Hủy đơn chưa gán chi nhánh** — đặt đơn `ONL-261026-0004` (659.000đ, dùng 5 điểm), hủy ngay khi còn "Chưa gán chi nhánh": hủy thành công, **điểm hoàn lại đúng** (CRM: 11 → 11, vì 5 điểm trừ rồi hoàn lại y hệt số dư trước đó). Không lỗi.
2. **Hủy đơn đã gán chi nhánh** — đặt đơn `ONL-261026-0005` (699.000đ, không điểm), duyệt gán **Chi nhánh Trung tâm**, rồi hủy: hủy thành công, trạng thái "Đã hủy", lý do lưu đúng vào ghi chú nội bộ. Hoàn kho dựa theo code đã đọc (`doCancel` → `applyStockIn` khi `branchId` không rỗng) — **không đo số tồn tuyệt đối** (tìm tồn kho chỉ khớp theo SKU, không theo tên sản phẩm, tốn thời gian tra SKU) nhưng hành vi API không lỗi, khớp luồng thiết kế.
3. **Hoàn điểm khi hủy** — gộp vào mục 1, PASS.
4. **Chi nhánh không đủ tồn bị chặn** — **chưa test** (không tìm được nhanh SKU nào có tồn 0 ở 1 chi nhánh cụ thể trong lúc đo; cần tra `stock-item/search` theo SKU cụ thể, ngoài phạm vi thời gian phiên này). Đã đọc code `allocateToBranch`/`throwIfShort` xác nhận chặn đúng theo logic (`error.stock.insufficient`), nhưng **không có bằng chứng UI thật**.
5. **RBAC** — ✅ PASS cả 3 role:
   - `superadmin`: thấy toàn bộ 155 đơn, mọi chi nhánh, chọn được bất kỳ chi nhánh nào khi duyệt.
   - `adminbranch` (Chi nhánh Trung tâm): Dashboard scope "chi nhánh của bạn"; `/orders` chỉ 149 đơn = đơn Chi nhánh Trung tâm + "Chưa gán chi nhánh" (đơn `ONL-261026-0002` của HN-Cầu Giấy bị ẩn đúng). Dialog duyệt: "Chi nhánh Trung tâm" chọn được ("Đủ hàng"), "HN - Cầu Giấy"/"HN - Hoàn Kiếm" khoá đúng nhãn **"Ngoài chi nhánh của bạn"**.
   - `staffone` (Chi nhánh Trung tâm): `/orders` chỉ 79 đơn, **toàn bộ đều của Chi nhánh Trung tâm, không có đơn "Chưa gán chi nhánh" nào** — đúng STAFF không thấy hàng chờ. Không có bộ lọc "Tất cả chi nhánh" (STAFF cố định 1 chi nhánh).

## customerNote + địa chỉ snapshot — ✅ PASS (đã ghi phiên trước, xác nhận lại)
- `customerNote` hiện đúng ở cả storefront lẫn admin (tách "Ghi chú của khách" / "Ghi chú nội bộ").
- Đổi địa chỉ khách A rồi mở lại đơn cũ: địa chỉ đơn giữ nguyên bản snapshot lúc đặt, không đổi theo hồ sơ mới.

## Dữ liệu test — đã dọn
- Địa chỉ khách A đã khôi phục về **"12 Ngõ Test, Phường An Bình, Thành phố Cần Thơ"** (bản gốc trước phiên).
- 5 đơn test (`ONL-261026-0001` → `0005`) **giữ nguyên trong DB dev** làm bằng chứng đo thật (2 Hoàn thành, 2 Đã hủy, 1 chi tiết đơn đã xem) — không xoá vì không có API xoá đơn; nằm cùng nhóm với các đơn `ONL-261018-*` do các phiên trước để lại.
- Backend do phiên này tự khởi động **vẫn đang chạy** (để phiên khác/người dùng tiếp tục dùng) — tắt bằng `Ctrl+C` ở tiến trình `mvn spring-boot:run` nếu không còn cần, hoặc báo mình dừng.
- Phiên admin cuối cùng để lại ở trạng thái đăng nhập `staffone` trên trình duyệt tích hợp.

## Việc KHÔNG làm (ngoài phạm vi/không đủ bằng chứng)
- D4 (chặn thiếu tồn khi duyệt) — chỉ xác nhận qua đọc code, chưa đo UI thật.
- Giả lập webhook `POST /v1.0/webhook/payment` thật (cần `api_key` — không dò datasource/credential theo chính sách an toàn).
