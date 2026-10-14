# Bàn giao phiên 2026-10-15 — Thu tiền đơn online + duyệt đơn chưa gán chi nhánh (S35/S36)

> **Nhánh:** `develop` · **0 commit** (chưa commit — user chưa yêu cầu)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning có sẵn) · `npm run build` xanh
> **Đã kiểm chứng bằng gì:** UI thật trên Chrome (http://localhost:5173, SUPER_ADMIN `superadmin`) với
> các đơn online test do phiên client đặt (khách `thinhnb2712`). ADMIN `hkadmin` + STAFF `staffone` thử trên trình duyệt tích hợp.

## Phần 1 — Dialog "Thu tiền đơn …" khoá hình thức cho đơn ONLINE

Bối cảnh: dialog mặc định "Tiền mặt" cho mọi đơn ⇒ đơn online khách chọn VietQR/COD dễ bị ghi sai.
User chốt 2026-10-15: đơn kênh Online **không hiển thị ô chọn**, dùng đúng `paymentMethod` của đơn.

### File đổi

| File | Đổi gì |
|---|---|
| `src/pages/orders/components/order-detail-dialog.tsx` | `lockedMethod` (= `order.paymentMethod` khi `channel === ONLINE`) · `effectiveMethod` · dialog render chữ chỉ đọc thay `Select` khi khoá · `openPayDialog` reset lựa chọn về CASH mỗi lần mở |
| `src/i18n/locales/{vi,en}/order.ts` | key `order.action.payMethodLocked` |
| `docs/backend/don-hang.md` | mục "Luồng thanh toán QR" thêm luật đơn ONLINE + ghi chú backend chưa validate |

### Quyết định kỹ thuật

1. **Giữ dialog trung gian** (không nhảy thẳng QR khi bấm "Thu tiền"): nhân viên vẫn thấy số tiền +
   hình thức trước khi thao tác; với QR nút chính đổi thành "Hiển thị mã QR" ⇒ luồng QR y như cũ.
2. **Chỉ khoá với `ONLINE`**, không khoá `OTHER`: user chỉ chốt kênh Online.
3. **`openPayDialog` reset về CASH**: trước đây lựa chọn cũ của đơn trước còn sót khi mở đơn POS
   khác; reset tránh ghi nhầm. Đơn POS vẫn mặc định Tiền mặt như trước.

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)

- Đơn `ONLINE` có `paymentMethod = null` (dữ liệu cũ) ⇒ **vẫn cho chọn** thay vì chặn thu tiền.
- Câu chú thích dưới hình thức: "Đơn online thu đúng hình thức khách đã chọn khi đặt hàng."

### Kiểm chứng

- `CNTT-20261015-003409-0003` (QR): dialog hiện "Chuyển khoản / QR" chỉ đọc, nút "Hiển thị mã QR" →
  mã VietQR → "Xác nhận đã nhận tiền" ⇒ khối Thanh toán "Đã thanh toán (Chuyển khoản / QR)". ✅
- `CNTT-20261015-003409-0004` (COD): dialog hiện "Thu hộ khi giao (COD)" chỉ đọc, nút "Thu tiền" ⇒
  "Đã thanh toán (Thu hộ khi giao (COD))". ✅
- **Đơn POS: CHƯA nhìn tận mắt** — không có đơn POS chưa thanh toán, không tạo mới để khỏi trừ kho.
  Nhánh POS chỉ đổi ở chỗ reset lựa chọn về CASH khi mở; `Select` giữ nguyên code cũ.

## Phần 2 — Đơn online chưa gán chi nhánh: chọn chi nhánh khi duyệt (backend S36)

Hợp đồng: `35.1.eloria-backend/docs/api/fe-handoff-s35-s36-admin.md` (phiên client đo thật trên 8080).
Tóm tắt FE ở [don-hang.md](../backend/don-hang.md) mục "Đơn online chưa gán chi nhánh".

### File mới / đổi

| File | Đổi gì |
|---|---|
| `src/pages/orders/components/confirm-branch-dialog.tsx` (mới) | Dialog duyệt: nạp `branch-availability`, danh sách radio, chỉ chọn `enough && selectable`, badge Đủ hàng / Thiếu hàng / Ngoài chi nhánh của bạn, dòng `SKU: còn x / cần y`; lỗi `confirm` ⇒ giữ mở + nạp lại tồn |
| `order-detail-dialog.tsx` | `isUnassigned` (ONLINE + `branchId` null) ⇒ "Xác nhận đơn" mở `ConfirmBranchDialog`, còn lại giữ `ConfirmDialog` cũ; ô Chi nhánh hiện "Chưa gán chi nhánh" |
| `OrderListPage.tsx` | cột Chi nhánh: badge warning cho đơn ONLINE chưa gán; bộ lọc chi nhánh hiện cho **ADMIN+** với mục "Chưa gán chi nhánh" ⇒ `unassigned: true` (danh sách chi nhánh vẫn chỉ SUPER_ADMIN) |
| `src/api/order.ts` · `src/types/order.ts` | `confirm(id, {branchId?})`, `branchAvailability(id)`; type `ConfirmOrderReq`, `BranchAvailability(Line)`, `OrderSearchReq.unassigned` |
| `src/i18n/locales/{vi,en}/errors.ts` | `error.order.branchRequired`, `error.order.branchAlreadyAssigned`, `error.payment.methodRequired` |
| `src/i18n/locales/{vi,en}/order.ts` | `list.unassigned(Filter)`, `action.confirmBranch.*` |

### Quyết định kỹ thuật

4. **Không hiện `logInfo`** khi `error.stock.insufficient` dù phiên client gợi ý — CONVENTIONS mục 3
   cấm. Thay bằng nạp lại `branch-availability` ⇒ thấy ngay chi nhánh nào thiếu SKU nào.
5. **Danh sách radio thay vì `Select`**: cần hiện số thiếu từng SKU dưới mỗi chi nhánh; `SelectItem`
   không chứa được khối nhiều dòng gọn.
6. Thu tiền đơn online **vẫn gửi đúng `paymentMethod`** (backend S35 bỏ qua, nên an toàn cả khi backend cũ).

### Giả định tôi tự quyết

- ADMIN có bộ lọc chi nhánh rút gọn (Tất cả / Chưa gán) — user chốt 2026-10-15 (Q8): ADMIN thấy hàng chờ, chỉ chọn được chi nhánh mình khi đủ hàng; STAFF không thấy.
- Badge "Chưa gán chi nhánh" chỉ cho đơn ONLINE; đơn kênh khác thiếu chi nhánh vẫn hiện "—".

### Kiểm chứng (Chrome, SUPER_ADMIN)

- Danh sách: 3 đơn `ONL-…` hiện badge; lọc "Chưa gán chi nhánh" ra đúng 3 đơn. ✅
- `ONL-20261015-010539-0005` (Chờ xử lý): "Xác nhận đơn" ⇒ Trung tâm + Cầu Giấy "Đủ hàng" (chọn sẵn
  Trung tâm), Hoàn Kiếm "Thiếu hàng — DM05-NV-AO-M: còn 3 / cần 5", khoá không chọn được. ✅
- **CHƯA bấm duyệt thật** (sẽ trừ kho) — để phiên client test end-to-end (phiên client đã duyệt 0005 → Cầu Giấy rồi huỷ).
- Vai **ADMIN `hkadmin`** (Hoàn Kiếm, trình duyệt tích hợp): bộ lọc chi nhánh chỉ có "Tất cả / Chưa gán chi nhánh";
  danh sách thấy 2 đơn `ONL-…` chưa gán (đã huỷ) với badge; lọc "Chưa gán" ra đúng 2 đơn. ✅
- Vai ADMIN `hkadmin` duyệt `ONL-20261015-012159-0006` (2 × DM05-NV-AO-M, cả 3 chi nhánh đủ hàng): dialog chỉ cho
  chọn **HN - Hoàn Kiếm** (Trung tâm, Cầu Giấy hiện "Ngoài chi nhánh của bạn") ⇒ bấm duyệt ⇒ "Đã xác nhận",
  Chi nhánh = HN - Hoàn Kiếm. ✅ Sau đó **huỷ đơn** (lý do "Don test S36 - don du lieu") để trả tồn — tồn kho
  Hoàn Kiếm 3→1→3 **chưa đối chiếu tận mắt** (không mở màn Kho).
- Vai STAFF `staffone` (Trung tâm): không có bộ lọc chi nhánh, danh sách chỉ đơn Trung tâm, không thấy đơn chưa gán. ✅

## Việc còn lại / cần bạn chốt

| # | Việc | Mức độ |
|---|---|---|
| 1 | ~~S35 backend~~ — **đã xong** 2026-10-15 (đơn ONLINE bỏ qua `method`) | Đóng |
| 2 | Test end-to-end duyệt đơn chưa gán (duyệt thật, thiếu hàng do bán mất, ADMIN chọn chi nhánh khác ⇒ 403) — phiên client làm | Cao |
| 4 | ~~Q8~~ — user chốt 2026-10-15: SUPER_ADMIN + ADMIN thấy, STAFF không (khớp UI) | Đóng |
| 3 | Kiểm mắt dialog Thu tiền trên một đơn POS chưa thanh toán | Thấp |

## Dữ liệu test còn sót

- `CNTT-20261015-003409-0003` (QR) và `CNTT-20261015-003409-0004` (COD): nay **PAID**, vẫn `PENDING`
  (Chờ xử lý). Để user quyết giữ / xác nhận / huỷ — không tự huỷ.
- `ONL-20261015-010539-0005`: phiên client đã duyệt → huỷ. `ONL-20261015-012159-0006`: tôi duyệt (Hoàn Kiếm) rồi huỷ theo yêu cầu phiên client.
