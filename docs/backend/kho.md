# Backend — Kho: Tồn kho · Phiếu kho · Kiểm kê · Xuất huỷ

> Kiểm chứng bằng API thật khi code Phase 10 (2026-08-10); mô hình tồn **đổi 2026-08-14** (bỏ giữ chỗ —
> chi tiết tương tác đơn↔tồn ở [don-hang.md](don-hang.md)). Màn FE: Kho hàng (3 tab). Code FE:
> `src/api/inventory.ts`, `src/types/inventory.ts`, `src/pages/inventory/`. Quy ước chung: [README.md](README.md).

## Endpoint

| Nhóm | Role | Endpoint |
|---|---|---|
| Tồn kho | `STAFF` | `POST /stock-item/search` · `GET /stock-item/alerts?branchId=` |
| Phiếu kho | `STAFF` | `POST /warehouse-ledger/search` · `GET /warehouse-ledger/{id}` · `POST /warehouse-ledger` · `POST /warehouse-ledger/{id}/submit` |
| Duyệt phiếu | `ADMIN` | `POST /warehouse-ledger/{id}/approve` · `/reject` |
| Kiểm kê | `STAFF` | `POST /stock-count` |
| Xuất huỷ | `ADMIN` | `POST /stock-disposal` |

⚠️ Đường dẫn thật là **`/stock-count`, `/stock-disposal` ở gốc** — KHÔNG phải
`/stock-operation/...` như tên class `StockOperationResource` gợi ý. Đọc api-docs, đừng suy từ tên file Java.

## Phiếu kho (`WarehouseLedger`)

- **Một entity gánh cả nhập/xuất/chuyển**: `type = IN | OUT | TRANSFER`; không có entity "phiếu nhập"
  riêng. `TRANSFER` bắt buộc `toBranchId` khác chi nhánh nguồn.
- Vòng đời: `DRAFT → WAITING_APPROVAL → ACCEPTED | REJECTED`. **Chỉ `ACCEPTED` mới ghi tồn thật**
  (IN cộng · OUT trừ · TRANSFER trừ nguồn + cộng đích) — đã kiểm chứng.
- ⚠️ **`lines` trả `null` ở `POST /warehouse-ledger/search`**, chỉ populate ở `GET /{id}` ⇒ mọi chỗ đọc
  `lines` từ danh sách phải phòng null; **không dựng được cột "Tổng SL"** ở bảng nếu không muốn N+1.
- ⚠️ **Backend chặn tự duyệt phiếu do chính mình tạo** — `createdBy` là **username** (không phải id),
  lỗi `error.warehouseLedger.cannotApproveOwn` HTTP 403. **FE khoá nút trước**, đừng để bấm rồi lỗi.
  *(Khác hẳn phiếu đổi/trả — module đó CHO tự duyệt, xem [doi-tra.md](doi-tra.md).)*
- `WarehouseLedgerLineReqDTO` là **danh sách dòng phẳng** `{skuId, quantity}` — không có ma trận
  size × màu như mockup `14`. `quantity` luôn dương, chiều do `type` quyết định.
- Lưu ý vận hành: phiếu đổi/trả nhận hàng `RESALABLE` sẽ **tự sinh** một phiếu `IN`/`ACCEPTED` (mã `PN-*`).

## Tồn kho (`stock_item`)

- `StockItemResDTO` = `{id, skuId, skuCode, productName, colorName, sizeLabel, branchId, branchName,
  total, available, minStock}`. **`skuId` là MÃ SKU** (`SP001-BK-AO-L`), dùng cả ở filter `body.skuId`.
- ⚠️ **`reserved` đã bị XOÁ khỏi DTO lẫn DB** (2026-08-14, bỏ cơ chế giữ chỗ) ⇒
  **`available` luôn bằng `total`** — cột "Đang giữ" không còn nguồn dữ liệu.
- **`minStock` luôn có số, mặc định `0`** (không còn nullable từ 2026-08-11). **Chưa có API đặt ngưỡng**
  (BE2) ⇒ `GET /stock-item/alerts` (điều kiện `available <= min_stock`) chỉ nổ khi `available <= 0` —
  trùng nghĩa "hết hàng", chưa phải cảnh báo tồn thấp thật. `alertType` chỉ có `"LOW_STOCK"`.
- Backend **không có `GET /stock-item/{id}`** — một dòng tồn là số liệu tổng hợp SKU × chi nhánh,
  không phải bản ghi xem được ⇒ bảng Tồn kho **không có cột THAO TÁC** (ngoại lệ đã ghi ở CONVENTIONS mục 5.3).

## Kiểm kê & xuất huỷ

- `POST /stock-count` nhận `{branchId, description, lines:[{skuId, countedQuantity}]}`, tự so với tồn
  hệ thống, trả **mảng 1–2 phiếu điều chỉnh DRAFT**. Không chênh lệch ⇒ `error.stock.countNoDiff`.
- `POST /stock-disposal` (`[ADMIN]`) — ghi xuất huỷ (hàng đổi/trả `DEFECTIVE` muốn ghi huỷ thì dùng cái này).

## subKey lỗi

`error.warehouseLedger.{notExisted, invalidStatus, lineRequired, transferBranchRequired,
transferSameBranch, cannotApproveOwn}` · `error.stock.{insufficient, countNoDiff}`.
