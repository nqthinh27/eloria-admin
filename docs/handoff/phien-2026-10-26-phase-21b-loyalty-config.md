# Bàn giao — Phase 21 mục ① phần `loyalty.*` ở `/store-settings` · 2026-10-26

**Chưa commit/push.** Cổng: `npm run lint` 0 lỗi (5 warning cũ của `ui/`), `npm run build` qua.

## Đã làm
- Thẻ **Điểm thưởng** mới (`pages/system/components/LoyaltyCard.tsx`, gắn dưới thẻ chi nhánh trong `StoreSettingsPage`): 3 ô `loyalty.earn_amount_per_point` (MoneyInput, đ), `loyalty.redeem_rate` (MoneyInput, đ), `loyalty.max_redeem_percent` (MoneyInput hậu tố `%`). Validate client: 2 ô tiền nguyên > 0, % nguyên 0..100; Lưu riêng (PUT 3 khoá một lần), không đụng `store.branch_id`; ví dụ động "4×earn tiền hàng ⇒ +4 điểm, 4 điểm = 4×redeem"; ghi chú đổi luật chỉ áp cho đơn sau, không tính lại điểm cũ.
- `SYSTEM_CONFIG_KEY` thêm 3 khoá; i18n `storeSettings.loyalty.*` + `toast.loyaltySaved` (VI+EN); `error.systemConfig.valueInvalid` (VI+EN).
- `use-point-rules.ts` có **cache cấp module** ⇒ thêm `resetPointRulesCache()`, gọi sau khi lưu; POS/`PointRulesNote` lấy luật mới ở lần mount kế tiếp (vào lại POS). Component đang mở sẵn không tự cập nhật.

## Còn mở
- **Chưa đo với backend thật** (đăng nhập admin cần OTP Zalo): chưa kiểm GET trả 3 khoá, PUT 200, 400 `valueInvalid` khi giá trị rác, và giá trị biên (0 / 100 / 101).
- **PO chốt cùng ngày: gỡ ô `store.branch_id`** (backend P14.1 không còn dùng). Đã xoá thẻ chi nhánh, ConfirmDialog, `useBranch`, `SYSTEM_CONFIG_KEY.STORE_BRANCH_ID` và i18n liên quan; `/store-settings` chỉ còn thẻ Điểm thưởng. Tài liệu lịch sử (history, handoff Phase 24, docs/backend/README) giữ nguyên làm vết.
