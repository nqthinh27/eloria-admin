---
name: create-table
description: Dựng hoặc sửa màn danh sách dùng DataTable của repo (khai cột, STT, ghim cột, căn lề, sort phía server, toolbar, cột THAO TÁC, nạp lại sau khi ghi). Dùng khi tạo bảng mới, thêm/sửa cột, mở sort, thêm hành động vào bảng, hay khi một màn danh sách bị chê lệch chuẩn. Đây là bản chi tiết của CONVENTIONS mục 5.1 · 5.2 · 5.3 · 5.6.
---

# Dựng màn danh sách chuẩn (DataTable)

Luật gốc (tóm tắt, KHÔNG được vi phạm): CONVENTIONS mục 5.1 · 5.2 · 5.3 · 5.6. File này là bản chi
tiết + checklist thi công. Màn **card grid** (Chi nhánh, Sản phẩm) không áp mục THAO TÁC nhưng **vẫn
áp** mục nạp-lại-sau-ghi.

## Bước 0 — đọc trước, đừng code chay

1. **Mockup** của màn trong `design/` (bảng tra file ở CONVENTIONS mục 6.1). Màn không có mockup ⇒
   tái dùng pattern màn cùng loại (list = `04-don-hang`), không sáng tạo layout.
2. **File domain** trong `docs/backend/<domain>.md`: field DTO thật · **field nào sort được / field
   nào gây 500** (bảng ở `docs/backend/README.md` mục Sort) · quirks kiểu `lines: null`,
   `categories: []`, `paidAmount: null` ở API danh sách — **đừng dựng cột từ field mà list không trả**.
3. **Trang mẫu đạt chuẩn mới nhất**: `src/pages/returns/ReturnListPage.tsx` (+ `src/pages/staff/components/staff-columns.tsx`).
   Hạ tầng: `src/components/data-table/data-table.tsx` · `src/hooks/use-table-state.ts` ·
   `src/components/page-header.tsx`.

## Bước 1 — khai cột (mục 5.6)

- **KHÔNG khai cột STT** — `DataTable` tự chèn `__index`, đếm theo vị trí hiển thị
  (`(page−1)×size + vị trí + 1`). Đừng dùng `row.index` (sai khi sort client).
- Thứ tự bắt buộc: **STT (tự chèn) → cột MÃ → cột TÊN** → phần còn lại. DTO không có `code` ⇒ chọn
  trường định danh có nghĩa (Khách hàng ⇒ SĐT · Nhân viên ⇒ `username` · Nhật ký ⇒ `id`) và **ghi lý
  do ngay tại khối khai cột**.
- `DataTable` **ghim trái 3 cột đầu** (`pinnedColumnCount` mặc định 3). **Cột ghim BẮT BUỘC khai
  `size`** (vị trí `left` tính bằng tổng `size`, không đo DOM — quên là lệch cả dải). Cột ghim +
  THAO TÁC: `enableHiding: false`.
- **Mọi cột phải có tiêu đề** (cấm `header: ''`), i18n, `DataTable` tự ép CHỮ HOA + căn giữa —
  **không bọc** `header` trong `<div className="text-right">`.
- Căn lề nội dung qua **`meta: { align }`**, không bọc div trong `cell`:

  | Loại cột | align |
  |---|---|
  | STT · THAO TÁC | `center` |
  | Text thường (tên, mã, email, ngày giờ) | `left` (mặc định) |
  | Tiền tệ · số đếm/số lượng | `right` + class `tabular-nums` |
  | Badge trong cột hẹp cố định (trạng thái, vai trò, loại, kênh) | `center` |

- **Ẩn sẵn cột ít dùng** qua `useTableState(sorting, { <id>: false })` + **một câu lý do tại chỗ**.
  Bảng mà mọi cột đều là căn cứ nghiệp vụ (Phiếu kho, Nhật ký) thì hiện hết. Hiện trạng đang áp dụng:

  | Màn | Cột ẩn sẵn | Vì sao |
  |---|---|---|
  | Khách hàng | `branch` · `createdDate` | Phase 3b: khách toàn cục, chi nhánh chỉ là nơi đăng ký |
  | Nhân viên | `joinedDate` | thông tin hồ sơ, đã có trong modal chi tiết |
  | Đơn hàng | `channel` | đã là tab lọc ngay trên bảng |
  | Tồn kho | `total` · `minStock` | `total === available` từ 2026-08-14; chưa có API đặt ngưỡng |
  | Danh mục SP | `sortOrder` | chỉ dùng lúc sắp lại menu danh mục |
  | Khuyến mại | `type` · `channel` | `type` đọc được từ cột GIÁ TRỊ |
  | Ca làm việc | `openingCash` | người quản lý soi TIỀN KỲ VỌNG + LỆCH QUỸ |
| Thương hiệu | `description` | văn bản dài tới 500 ký tự, đã có trong modal chi tiết |

  *(Thêm màn mới có ẩn cột ⇒ cập nhật bảng này.)*

## Bước 2 — sort (mục 5.2 ③)

- Mặc định **`enableSorting: false` cho mọi cột**; chỉ mở cột nằm trong whitelist ở
  `docs/backend/README.md` mục Sort. Field DTO-only (`productName`, `available`, `paidAmount`,
  `staffName`…) sort là **HTTP 500** — người dùng chỉ thấy "lỗi hệ thống".
- Sort là **phía server** (đẩy vào `SearchPagination.sort` dạng `field,ASC|DESC`); cấm sort mặc định
  của TanStack chạy tự do (chỉ sắp trang hiện tại ⇒ sai với nhiều trang).
- Tên field truyền lên là **tên field DTO backend** — lệch với id cột thì khai `meta.sortField`.
- **Đổi sort ⇒ `setPage(1)`** (đổi truy vấn — khác hẳn mutation ở Bước 4).

## Bước 3 — toolbar & hành động (mục 5 + 5.3)

- **Tác động dữ liệu** (Thêm · Xuất · Nhập · Duyệt hàng loạt) ⇒ `PageHeader` slot `actions`.
  **Điều khiển bảng** (Tải lại · Hiển thị cột) ⇒ `DataTableToolbar` slot `tableControls`, lấy từ
  `useDataTableControls()` — search/filter bên trái, cụm điều khiển bên phải.
- Cột THAO TÁC: **đúng 2 thành phần** — ① nút **"Chi tiết"** (icon `Eye`, luôn có, không ẩn theo
  quyền) ② menu **`(...)`** gom toàn bộ hành động còn lại, **chỉ vẽ khi còn ≥ 1 hành động** tính theo
  *cả quyền lẫn trạng thái bản ghi* (pattern `hasMenu = canX && …`; rỗng thì không vẽ nút, kể cả
  disabled). Cấm nút hành động thứ ba trên cột. Khai `enableHiding: false` + `enableSorting: false` +
  `size` cố định + `meta.align: 'center'`, tiêu đề `THAO TÁC`.
- Modal chi tiết theo `DetailModal` (`src/components/detail-modal.tsx`): xem có 2 nút "Sửa" + "Đóng";
  "Sửa" = inline edit tại chỗ; field không sửa được vẫn hiện dạng `disabled`, không ẩn.
- Ngoại lệ: bảng không có bản ghi mở được (Tồn kho — không có `GET /stock-item/{id}`) ⇒ **bỏ hẳn cột
  THAO TÁC**, đừng dựng nút Chi tiết mở màn trống.

## Bước 4 — nạp lại sau khi ghi (mục 5.1) & reload

- `load` là `useCallback` có dep là chính state phân trang/lọc; **mutation xong chỉ `await load()`**
  ⇒ giữ nguyên `page`/`size`/`sort`/filter/`keyword`/tab/scroll. **Cấm `setPage(1)` sau khi ghi.**
- Xoá bản ghi cuối trang cuối ⇒ **kẹp `page` về trang cuối còn dữ liệu** (xem `CategoryListPage`).
- Màn nhiều danh sách liên quan ⇒ nạp lại **tất cả** danh sách bị ảnh hưởng (POS bán xong nạp lại tồn).
- Nút **Tải lại** đi qua `tableState.runRefresh(...)`: bảng mờ + spinner "Đang tải lại…" đè lên dữ
  liệu cũ (không nháy skeleton — skeleton chỉ cho lần nạp đầu), xong toast "Tải lại dữ liệu thành
  công". **Reload sau mutation KHÔNG toast** "đã cập nhật" (mutation đã có toast riêng).

## Bước 5 — chuẩn chung

- Đủ 4 trạng thái: loading (skeleton) / empty / error / success. i18n **cả `vi` lẫn `en`**.
- Tiền: `formatVnd()` · ngày: `formatDate()` / `formatDateTime()` (`HH:mm:ss dd/MM/yyyy`) —
  helper ở `src/lib/format.ts`, không tự format.
- Mọi `useEffect` gọi API truyền `AbortSignal` + huỷ trong cleanup; `if (signal?.aborted) return`.
- Ô chọn trong filter theo CONVENTIONS mục 5.7 (`SearchSelect`/`AsyncSuggest`; SKU luôn `useSkuOptions`).

## Nghiệm thu

1. `npm run lint` + `npm run build` sạch.
2. Tab Network: vào màn, **không endpoint nào gọi 2 lần**; thao tác ghi xong thấy đúng 1 lần gọi lại
   API danh sách, bảng đứng nguyên trang/sort/scroll.
3. Bấm thử sort từng cột đã mở — không có 500.
4. Màn có phân quyền ⇒ xem bằng đủ role liên quan (tài khoản test: `docs/backend/README.md`):
   role không có hành động nào thì `(...)` biến mất, chỉ còn "Chi tiết".
