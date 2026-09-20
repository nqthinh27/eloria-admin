# Bàn giao phiên 2026-09-20 — Dashboard: nối số thật cho "Tình trạng kho"

> **Nhánh:** `develop` · **chưa commit** (user chưa yêu cầu)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` xanh
> **Đã kiểm chứng bằng gì:** **API thật** (`superadmin`, `adminbranch`, `hkadmin`). **CHƯA mở Dashboard trên trình duyệt** —
> chưa nhìn tận mắt khối mới, tooltip, hay trạng thái khi đổi kỳ / lọc chi nhánh.

## Bối cảnh
Backend giao `docs/api/fe-handoff-dashboard-warehouse-status.md` (repo backend): `GET /dashboard/summary` thêm
`newCustomers`, `pendingApproval`, `warehouseStatus{activeSkuCount, availableStock, outOfStockSkuCount, slowMovingSkuCount}`.
Thuần additive, không đổi field cũ. Đây là mục 2.4 của `docs/handoff/phase-12-report-api-request.md` (đã đánh dấu đã giao).

## File đổi

| File | Đổi gì |
|---|---|
| `src/types/report.ts` | `DashboardSummary` thêm 3 field; type mới `WarehouseStatus` (kèm ghi chú phạm vi từng số) |
| `src/pages/Dashboard.tsx` | Bỏ `UnavailableStat` (`—`), thêm `StockStat` (số + tooltip phạm vi); khối "Tình trạng kho" đọc số thật; sửa doc comment đầu file |
| `src/i18n/locales/{vi,en}/report.ts` | Thay nhóm `unavailable` bằng `stockStatus` (nhãn + 4 tooltip) |
| `docs/backend/bao-cao.md` · `PLAN.md` (ghi chú Phase 12) · `docs/handoff/phase-12-report-api-request.md` (2.4) · `docs/history.md` | Ghi sổ |

## Quyết định kỹ thuật đáng nhớ
1. **Tooltip nói rõ phạm vi từng số** — 6 dòng cùng một thẻ nhưng 3 nhóm khác nhau: kho + chờ duyệt là **snapshot hiện tại**
   (không đổi theo kỳ), khách mới **theo kỳ nhưng toàn chuỗi** (không đổi khi lọc chi nhánh), chậm luân chuyển là **60 ngày trượt**.
   Cái giá: dòng mô tả của thẻ chỉ nói chung "kho & hàng chờ duyệt: tại thời điểm hiện tại"; chi tiết nằm ở tooltip (phải rê chuột).
2. **Không tự cộng "chờ duyệt" đổi/trả + chiết khấu ở FE** — backend nói rõ cách đếm của 2 luồng đó chưa chuẩn hoá; `pendingApproval` chỉ là phiếu kho.
   Nhãn vẫn là "Hàng chờ duyệt" như mockup, tooltip ghi rõ "chỉ phiếu kho".
3. **Bỏ hẳn nhóm i18n `unavailable`** (không còn nơi nào dùng) thay vì để rác. `report.common.notAvailable` vẫn giữ vì `marginPercent = null` còn dùng.
4. **Field mới khai bắt buộc (không nullable)** — đo thật cả 3 role đều trả; backend đã deploy.

## Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
- Giữ **thứ tự 6 dòng cũ** của khối (SKU · tồn · hết hàng · chậm · khách mới · chờ duyệt), gộp chung một thẻ như trước.
- Số hiển thị bằng `formatNumber` (ngăn cách hàng nghìn), không tô màu cảnh báo cho "hết hàng"/"chậm luân chuyển".
- Chưa thêm link bấm từ "Hàng chờ duyệt" sang màn Kho.

## Kiểm chứng
**Đã đo API thật:**
- Chuỗi (SUPER_ADMIN): activeSku 27 · tồn 1680 · hết 2 · chậm 13 · khách mới 5 · chờ duyệt 2.
- Theo chi nhánh: Trung tâm 15/1336/1/5 + Hoàn Kiếm 12/344/1/8 + Cầu Giấy 0/0/0/0 ⇒ **cộng đúng bằng chuỗi** (27, 1680, 2).
- Đối chiếu `stock-item/search`: tổng `total` = 1680, SKU `total=0` = 2 ⇒ khớp.
- `newCustomers` = 5 ở mọi chi nhánh (đúng "toàn chuỗi"); kỳ 1 ngày ⇒ 0 (đúng "theo kỳ").
- `adminbranch` ⇒ `scope BRANCH`, số của Trung tâm; `hkadmin` ⇒ số của Hoàn Kiếm.

**Chưa kiểm chứng:** giao diện thật; `slowMovingSkuCount` chưa tự tính lại từ đơn COMPLETED (tin backend);
`pendingApproval` chưa đối chiếu với `warehouse-ledger/search` (2 phiếu chờ duyệt, chưa mở xem);
số liệu ở trạng thái loading/lỗi (dùng chung khung `data` cũ nên không đổi hành vi).

## Việc còn lại / cần bạn chốt

| # | Việc | Mức độ |
|---|---|---|
| 1 | Mở Dashboard xem khối "Tình trạng kho" + tooltip, đổi kỳ & lọc chi nhánh | **Nên làm trước khi review** |
| 2 | Còn `—`/thiếu so với mockup: "% so hôm qua" · "mục tiêu doanh thu" · "nhập/xuất kho tuần này" — vẫn chờ backend (chưa đăng ký mã BE#) | Thấp |
| 3 | `pendingApproval` chưa gồm duyệt chiết khấu / đổi-trả (backend hẹn kỳ sau) — có thể xin bổ sung | Tuỳ chọn |

## Dữ liệu test còn sót
Không — chỉ gọi đọc (GET).
