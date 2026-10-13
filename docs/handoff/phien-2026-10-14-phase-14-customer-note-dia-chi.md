# Bàn giao phiên 2026-10-14 — Bám backend P14: `customerNote` + địa chỉ khách

> **Nhánh:** `develop` · **chưa commit** (user chưa yêu cầu)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` ✅
> **Đã kiểm chứng bằng gì:** API thật `localhost:8080` bằng `superadmin` — chỉ **đọc** (`POST /order/search`,
> `POST /customer/search`). **Chưa nhìn tận mắt trên UI** (xem mục Kiểm chứng).

Nguồn: `35.1.eloria-backend/docs/api/fe-handoff-phase14-admin.md` +
`docs/decisions/phase-14-store-checkout.md`. Backend P14 **chỉ thêm field**, không đổi/bỏ field nào,
không có endpoint admin mới.

## Phần 1 — Hiển thị 2 field mới

### File mới / đổi

| File | Đổi gì |
|---|---|
| `src/types/order.ts` | `Order.customerNote: string \| null` (chỉ đọc) |
| `src/types/customer.ts` | `Customer.address / provinceCode / wardCode` (đều `string \| null`) |
| `src/hooks/use-address-names.ts` *(mới)* | Tra **tên** tỉnh/phường từ mã; cache promise theo phiên; lỗi ⇒ `null`, không ném |
| `src/pages/orders/components/order-detail-dialog.tsx` | Khối "Ghi chú của khách" (nền trung tính, chỉ đọc) đặt **ngay trên** khối ghi chú nội bộ màu vàng; không dựng khi `null` |
| `src/pages/customer/components/customer-detail-modal.tsx` | Ô "Địa chỉ giao hàng" (readOnly, full width) = `address, phường/xã, tỉnh/thành` |
| `src/i18n/locales/{vi,en}/{order,customer}.ts` | `order.detail.customerNote(+Hint)` · `customer.detail.address(+Empty)` — đủ cả 2 ngôn ngữ |
| `docs/backend/{don-hang,khach-hang}.md` · `PLAN.md` · `docs/history.md` | Ghi sổ contract mới + đóng Phase 20 mục 4 / Phase 21a mục 5 |

### Quyết định kỹ thuật đáng nhớ

1. **Hook tra tên riêng, không nhét vào modal.** Backend chỉ trả mã; `branch-form-dialog` đã có logic
   tải tỉnh/phường nhưng gắn chặt với form chọn. Tách `useAddressNames` để dùng lại (sau này chi
   nhánh, đơn…). Cái giá: thêm 1 module-level cache — chấp nhận vì danh mục hành chính gần như
   bất biến, và cache lưu *promise* nên 2 modal mở sát nhau dùng chung một request.
2. **Thiếu tên ⇒ hiện phần còn lại, không báo lỗi.** Tra tỉnh/phường hỏng (mạng, mã không còn trong
   danh mục) chỉ làm địa chỉ ngắn đi, không dựng toast — đây là thông tin phụ trong modal xem.
3. **Địa chỉ khách chỉ đọc.** Backend nói rõ "nhân viên chưa sửa được địa chỉ khách ở admin"
   (còn trong mục *Chưa làm* của decision P14) ⇒ không thêm ô sửa, không thêm field vào
   `UpdateCustomerReq`.
4. **`customerNote` ở khối riêng, tách hẳn ghi chú nội bộ** (nền trung tính vs vàng). Đây là yêu cầu
   của Phase 20 mục 4 — tránh nhân viên nhầm lời khách với ghi chú của cửa hàng; dialog sửa
   `description` vẫn chỉ tác động ghi chú nội bộ.
5. **Không đụng cột bảng/sort.** Cả 2 field chỉ hiện ở modal chi tiết; không thêm cột nên không phát
   sinh việc đo whitelist sort.

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)

- Thứ tự hiển thị địa chỉ khách `số nhà, phường/xã, tỉnh/thành` — khớp thứ tự backend snapshot vào
  `shippingAddress` của đơn.
- Khách chưa có địa chỉ ⇒ hiện "Khách chưa cập nhật địa chỉ" (thay vì ẩn ô) để nhân viên biết đơn
  online của khách đó sẽ bị `400 error.checkout.addressRequired` ở storefront.
- Chưa thêm subKey `error.checkout.*`/`error.order.notCancellable` vào `i18n/errors.ts`: đó là
  lỗi **phía store**, admin không gọi các endpoint đó.

### Kiểm chứng

- ✅ Đo API thật (superadmin, dev local): `POST /customer/search` trả đủ 3 key mới
  (`address, provinceCode, wardCode`); `POST /order/search` có key `customerNote`.
- ✅ **Nhìn tận mắt trên UI (review-phase 2026-10-14, role `ADMIN` Chi nhánh Trung tâm, Chrome,
  dev local)** — sau khi backend tạo dữ liệu P14 (`FE Test P14 A/B` + 5 đơn ONLINE, không phải do
  phiên này tạo):
  - Modal khách `FE Test P14 A`: "Địa chỉ giao hàng" = `12 Ngõ Test, Phường An Bình, Thành phố Cần
    Thơ`; khách `NQT` (không địa chỉ) = "Khách chưa cập nhật địa chỉ"; chế độ **Sửa** vẫn giữ nguyên ô
    địa chỉ (không bị biến thành input).
  - Dialog đơn `…-014417-0016`: khối "Ghi chú của khách — Gọi trước khi giao" nằm trên khối "Ghi chú
    nội bộ" (vàng, "Không có ghi chú"); đơn `…-0017` (không ghi chú) **không** dựng khối.
  - Network: sau reload, đúng **1** `provinces` + **1** `wards?provinceCode=92`, không gọi trùng;
    Console không lỗi.
- ⚠️ **Chưa kiểm:** ghi chú nhiều dòng (`whitespace-pre-line`) và chuỗi dài; giao diện EN (chỉ đối
  chiếu key VI/EN bằng grep); role `STAFF`/`SUPER_ADMIN` (không đổi gating nên không kỳ vọng khác).

## Việc còn lại / cần bạn chốt

| # | Việc | Mức độ |
|---|---|---|
| 1 | ~~Kiểm bằng mắt modal khách + dialog đơn~~ ✅ đã làm ở review-phase cùng ngày (xem Kiểm chứng); còn lại: ghi chú nhiều dòng + EN | 🟢 |
| 2 | **Phase 21a mục ④ — biên bản luồng đơn store** (confirm → pack → ship → thu COD/QR → complete) với đơn do khách tự đặt; đặc biệt kiểm: tồn đã trừ từ lúc đặt nên `confirm` **không trừ lần 2**, và hủy từ admin hoàn đúng 1 lần | Chặn đóng Phase 21a |
| 3 | Admin sửa/nhập địa chỉ giúp khách tại quầy | Chờ backend (decision P14 ghi "chưa có") — chưa đăng ký BE#, hỏi bạn có muốn xin không |
| 4 | Dữ liệu `shippingFee = 0` của đơn store: dialog đã ẩn dòng phí ship khi `0`, không cần đổi | — |

## Dữ liệu test còn sót

Không có — phiên này chỉ gọi API đọc.
