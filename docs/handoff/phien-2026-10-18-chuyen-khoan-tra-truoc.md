# Bàn giao phiên 2026-10-18 — Luồng chuyển khoản: "Chờ xác nhận" ngay, chưa thanh toán

> **Nhánh:** `develop` · **chưa commit** (theo yêu cầu: để chủ dự án review)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` ✅
> **Đã kiểm chứng bằng gì:** **chỉ lint + build.** Không đo API thật, không nhìn UI thật.

## ⚠️ ĐỌC TRƯỚC
- Phiên này đổi hướng giữa chừng: ban đầu làm theo "chuyển khoản chưa trả = `AWAITING_PAYMENT`/Chờ thanh toán" (đúng source
  backend lúc đó), rồi **chủ dự án chốt lại**: đơn CK vào **"Chờ xác nhận" ngay**, `paymentStatus=UNPAID`, chưa báo khách;
  `PAID` mới báo khách (admin xác nhận tay hoặc webhook). **Đã hoàn nguyên toàn bộ phần AWAITING_PAYMENT** (enum, tông màu,
  nhãn, lỗi `awaitingPayment`).
- **Backend đã xác nhận contract cuối** (`35.1.eloria-backend/docs/api/fe-handoff-phase18e-admin.md`): không status/type/payload mới, hướng `AWAITING_PAYMENT` đã bỏ — FE hiện tại khớp. Chỉ email khách đổi.

## File đổi (so với HEAD)
| File | Đổi gì |
|---|---|
| `src/i18n/locales/{vi,en}/order.ts` | `status.PENDING`: "Chờ xử lý" → **"Chờ xác nhận"** / "Pending confirmation"; `action.confirmTransfer`; `detail.transferUnpaidHint` |
| `src/pages/orders/components/order-detail-dialog.tsx` | Đơn `channel≠POS` + `QR` + `UNPAID`: nút "Thu tiền" → "Xác nhận đã nhận chuyển khoản" + dòng giải thích. Nút "Xác nhận đơn" **giữ nguyên** |
| `docs/backend/don-hang.md` · `PLAN.md` (Phase 25) · `docs/history.md` | Ghi luồng chốt |

Không đổi (vẫn đúng): chuông (đơn mới vẫn xuất hiện như trước), WS/`useOrderRealtime`, `QrPaymentDialog`, cột "Chưa thanh toán" ở danh sách.

## Quyết định kỹ thuật
1. **Không thêm enum/field mới** — dùng `paymentMethod/paymentStatus/channel` sẵn có; FE độc lập tên trạng thái của backend.
2. **Đổi nhãn `PENDING` thành "Chờ xác nhận"** theo cách chủ dự án gọi; ảnh hưởng danh sách, chi tiết, Dashboard.
3. Điều kiện nút CK loại `POS` (thu ngay tại quầy, không phải "chờ khách chuyển").

## Giả định / đã được backend xác nhận
- ✅ Chuông `ORDER_CREATED` bắn ngay khi khách đặt (kể cả CK chưa trả), `ORDER_PAID` khi thu; WS không đổi (contract 18e).
- ✅ Backend không chặn `confirm` đơn QR chưa trả — FE không chặn; **chưa làm cảnh báo trước khi duyệt** (gợi ý tuỳ chọn trong contract mục 2).
- ⏳ Mọi thứ chưa đo thật phía FE (xem Kiểm chứng).

## Kiểm chứng
Đã: lint + build. **Chưa:** UI/API thật (danh sách, chi tiết, webhook, thu tay, chuông, EN), vai ADMIN/STAFF.

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | Đo thật: khách đặt CK → chuông + "Chưa thanh toán"; webhook/xác nhận tay → "Đã thanh toán" realtime | MEDIUM |
| 2 | (Tuỳ chọn) cảnh báo trước khi duyệt đơn CK chưa trả; badge "Chưa thanh toán (CK)" riêng ở danh sách; 3 key `store.contact_*` ở màn Cấu hình hệ thống (contract mục 3) | LOW |
