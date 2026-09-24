# Bàn giao phiên 2026-09-25 — Đồng bộ backend: khuyến mại & preview giỏ

> **Nhánh:** `develop` · chưa commit
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` pass
> **Đã kiểm chứng bằng gì:** chỉ đọc `git diff` + `docs/api/fe-handoff-channel-required-preview.md` của repo backend (working tree chưa commit). **Không đo API thật, không chụp UI.**

## Phần 1 — Cột "Kênh áp dụng" mặc định hiện
- `PromotionListPage.tsx`: `useTableState([], { type: false })` (bỏ `channel: false`).
- Yêu cầu "POS đưa về tại quầy": rà code, cart-panel + checkout-dialog **đã** gửi `channel: POS` ở cả preview lẫn tạo đơn ⇒ không sửa. Nếu user vẫn thấy sai ⇒ nghi backend chạy bản cũ / lỗi ở chỗ khác chưa xác định.

## Phần 2 — Đồng bộ backend 2026-09-25
| File | Đổi gì |
|---|---|
| `types/order.ts` · `types/promotion.ts` | `channel` thành bắt buộc ở `CartPreviewReq` / `PromotionPreviewReq` |
| `PromotionListPage.tsx` | Mục "Sửa" chỉ hiện khi `status === DRAFT` |
| `promotion-form-dialog.tsx` | Validate `startDate ≥ hôm nay` (so chuỗi `yyyy-MM-dd`, giờ máy) |
| `i18n/*/promotion.ts` · `errors.ts` | `startDatePast`, `dateOrder` (được bằng), `notEditable`, `channelRequired`, `invalidDate` rõ nghĩa hơn |
| `docs/backend/khuyen-mai.md` | Ghi các rule mới |

### Quyết định kỹ thuật
1. Ẩn "Sửa" thay vì để bấm rồi lỗi — theo cách `PROMOTION_STATUS_TRANSITIONS` đã làm. Giá cost: KM đã chạy muốn đổi rule phải kết thúc + tạo mới (backend không có đường khác).
2. Validate ngày bằng giờ máy người dùng, backend dùng giờ VN — lệch chỉ khi máy ở múi giờ khác; backend vẫn là chốt chặn cuối.

### Giả định tôi tự quyết
- Không hiển thị gì thêm về cron (không cần đổi UI); người dùng chỉ thấy trạng thái đổi sau khi tải lại.
- Sửa KM DRAFT cũ có `startDate` đã qua sẽ bị form chặn tới khi đổi ngày — khớp backend.

### Kiểm chứng
- Chưa đo API thật (cần user ra lệnh — skill `update-api-doc`). Chưa chụp UI.

## Việc còn lại
| # | Việc | Mức độ |
|---|---|---|
| 1 | Đo API thật các rule mới khi backend deploy (`notEditable`, `channelRequired`, ngày) | Trung bình |
| 2 | ⚠️ `application-dev.yml` của backend đang có đổi cổng 3307 + mật khẩu DB thật chưa commit — báo chủ repo backend | Cao (bảo mật, ngoài repo này) |
