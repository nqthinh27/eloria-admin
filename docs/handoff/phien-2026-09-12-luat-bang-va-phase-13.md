# Bàn giao phiên 2026-09-12 — Luật bảng dùng chung + Phase 13 (Đổi / Trả)

> **Nhánh:** `feat/luat-bang-va-phase-13` (tách từ `develop`) · **2 commit**
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning có sẵn của shadcn) · `npm run build` pass
> **Đã chạy thật** với backend local + 4 tài khoản test, chụp màn hình toàn bộ 10 bảng.

---

## ⚠️ ĐỌC TRƯỚC — 1 việc BẮT BUỘC làm ngay

### Tài khoản `staffone` đang bị xoá mềm, cần khôi phục bằng SQL

Khi kiểm thử mã lỗi `error.staff.hasOpenReturns`, tôi gọi `DELETE /staff/{id}` và nó **thành công**
(lúc đó `staffone` không còn phiếu đổi/trả nào đang mở) ⇒ `sys_user.status = -1`.

**Không khôi phục được bằng bất kỳ API nào** — đúng như CLAUDE.md đã ghi về quy ước `status` 3 giá trị:

| Cách thử | Kết quả |
|---|---|
| `POST /staff/update-status {status: 1}` | `400 error.user.notExisted` (bản ghi `-1` bị ẩn khỏi mọi truy vấn) |
| `GET /staff/{id}` | `400 error.user.notExisted` |
| `POST /staff` tạo lại cùng `username` | `400 error.username.existed` (dòng cũ vẫn giữ username) |
| Đăng nhập | `400 error.user.notAvailable` |

**Câu lệnh sửa** (tôi bị permission chặn, không chạy được):

```bash
docker exec mysql-eloria mysql -uroot -proot -e \
  "UPDATE eloria.sys_user SET status = 1 WHERE username = 'staffone';"
```

*(id của `staffone` là `00000000-0000-0000-0000-0000000a0003`, lấy được từ `staffId` của ca làm việc
và phiếu đổi/trả cũ.)*

### Hệ quả: 2 thứ của Phase 13 CHƯA được kiểm chứng ở role STAFF

Logic đã viết đúng theo RBAC **đo được ở tầng API** (STAFF `approve` ⇒ 403, STAFF `search`/`create`
⇒ 200), nhưng chưa nhìn tận mắt trên UI:

1. **STAFF tạo yêu cầu đổi/trả** — nút "Tạo yêu cầu" và toàn bộ form.
2. **`(...)` tự ẩn với STAFF** — STAFF không có hành động nào (duyệt/từ chối/quyết toán/nhận kho đều
   `[ADMIN]`) nên cột THAO TÁC chỉ còn nút "Chi tiết" (CONVENTIONS mục 5.3).

⇒ Khôi phục `staffone` xong thì **đăng nhập STAFF, vào `/returns`, kiểm 2 điểm trên**.

---

## Phần 1 — Luật bảng dùng chung (commit 1)

### Luật mới trong CONVENTIONS

- **Mục 5.6 (mới)** — 5 luật: ① cột STT ② tiêu đề bắt buộc + căn giữa ③ căn lề nội dung
  ④ thứ tự `STT → mã → tên` + ghim 3 cột đó khi cuộn ngang ⑤ ẩn sẵn cột ít dùng.
  **3 luật đầu do `DataTable` ép cứng**, màn hình không đặt khác được ⇒ không màn nào trôi kiểu riêng.
- **Mục 5.3 (cập nhật)** — "Chi tiết" là **nút mặc định** đứng riêng ngoài menu; **`(...)` không được
  vẽ khi rỗng** (tính theo *cả* quyền lẫn trạng thái bản ghi).

### Hạ tầng

| File | Đổi gì |
|---|---|
| `components/data-table/data-table.tsx` | Tự chèn cột STT · ép tiêu đề căn giữa · áp `meta.align` cho ô · ghim 3 cột đầu (sticky) |
| `components/data-table/types.ts` | Thêm `meta.align` |
| `hooks/use-table-state.ts` | Thêm tham số `initialVisibility` (cột ẩn sẵn) |

**3 chi tiết dễ làm sai nếu sửa lại sau này:**

1. **STT đếm theo vị trí HIỂN THỊ**, không dùng `row.index` của TanStack (`row.index` là vị trí
   trong mảng *trước khi sort* ⇒ bảng sort phía client sẽ ra số nhảy cóc). Vì vậy cột `__index`
   **cố ý không khai `cell`**, giá trị render thẳng trong thân bảng.
2. **Cột được ghim BẮT BUỘC khai `size`** — vị trí `left` của cột ghim sau tính bằng **tổng `size`**
   các cột trước nó, không đo DOM. Quên `size` là lệch cả dải ghim khi cuộn.
3. **Vạch phân cách dải ghim chỉ hiện khi đã cuộn** (`useScrolledX`), nếu không bảng vừa khung sẽ có
   một đường dọc lạc lõng giữa bảng.

### Đã rà 9 bảng

| Bảng | Sửa gì |
|---|---|
| Nhân viên | thêm cột định danh `username`; ẩn NGÀY VÀO |
| Khách hàng | **tách SĐT** khỏi ô ghép tên+SĐT thành cột định danh riêng; ẩn CHI NHÁNH + NGÀY TẠO |
| **Ca làm việc** | **sửa vi phạm 5.3**: "Chi tiết" đang nằm *trong* `(...)`, nay ra ngoài; `header: ''` → `THAO TÁC`; 3 cột tiền căn phải; ẩn TIỀN ĐẦU CA |
| Đơn hàng | bỏ `<div text-right>` bọc tiêu đề (nay bị ép giữa); ẩn KÊNH (đã là tab lọc) |
| Tồn kho | 3 cột số căn phải; ẩn TỔNG (trùng KHẢ DỤNG) + TỒN TỐI THIỂU |
| Phiếu kho · Danh mục · Khuyến mại · Nhật ký | thêm `size` cho cột ghim, căn lề, ẩn cột thừa; Nhật ký thêm cột `MÃ` (`#id`) |

### 🐞 Bug có sẵn được vá nhân tiện

Preflight của Tailwind đặt `text-transform: none` cho `button` ⇒ **mọi tiêu đề cột sort được trong
toàn app đều KHÔNG in hoa**, dù `<th>` có class `uppercase`. Chỉ lộ ra ở bảng Khuyến mại vì chuỗi
i18n màn đó viết thường ("Mã KM"). Đã khai lại `uppercase` trên nút sort trong `DataTable`.

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)

- Cột badge (trạng thái/vai trò/loại/kênh) ⇒ căn **giữa**; cột số đếm ⇒ căn **phải** như cột tiền.
- Trường định danh khi DTO không có `code`: Khách hàng ⇒ **SĐT** · Nhân viên ⇒ **`username`** ·
  Nhật ký hệ thống ⇒ **`id`** (đã hiện sẵn ở tiêu đề modal chi tiết).

---

## Phần 2 — Phase 13: Đổi / Trả / Hoàn tiền (commit 2)

Backend giao 9 endpoint `/return/**` ngày 2026-09-12 (api-docs **118 path**).
**Đã kiểm thử ~85 case bằng API thật trước khi code — khớp tài liệu 100%, không có điểm lệch nào.**
Chi tiết đầy đủ ở **CLAUDE.md mục "Domain Đổi / Trả / Hoàn tiền"**.

### File mới

```
src/types/return.ts                  ← viết lại theo DTO thật (mock cũ bịa sai hoàn toàn)
src/api/return.ts
src/i18n/locales/{vi,en}/return.ts   ← namespace mới + 13 subKey lỗi ở errors.ts
src/pages/returns/
├─ ReturnListPage.tsx
└─ components/
   ├─ return-create-dialog.tsx       ← lớn nhất, gộp 4 nghiệp vụ
   ├─ return-detail-modal.tsx
   ├─ return-refund-dialog.tsx
   ├─ return-receive-stock-dialog.tsx
   └─ return-reject-dialog.tsx
```

**Đã xoá:** `src/mocks/return.ts` (bịa `EXCHANGE_SAME_PRICE`/`BANK_TRANSFER` — backend không có) ·
`src/pages/Placeholder.tsx` (`/returns` là route giữ chỗ **cuối cùng**, file thành code chết và
`noUnusedLocals` sẽ làm fail build).

### 6 quyết định kỹ thuật đáng nhớ

1. **Phiếu đổi LUÔN gửi qua `/return/exchange-diff`, KHÔNG BAO GIỜ `/return/exchange`.**
   Giá quyết toán do backend phân bổ (chiết khấu 2 tầng + KM của đơn gốc) ⇒ FE **không đoán được**
   ngang giá hay lệch giá; đoán sai thì `/exchange` trả `error.return.exchangePriceDiff` — lỗi vô
   nghĩa với người dùng. Đo thật: `/exchange-diff` xử lý **cả hai**, ngang giá trả `refund = collect = 0`.
2. **Số "còn trả được" phải tự tính bằng N+1 request** (`ReturnCreateDialog#loadReturnable`) —
   backend không trả sẵn, xem **BE26**. Phiếu `REJECTED` không tính.
3. **Không dựng cột SẢN PHẨM** dù mockup `06` có vẽ — `/return/search` trả **`lines: null`**.
   Hệ quả: dialog "Nhận hàng vào kho" phải `getById` trước khi mở.
4. **Chỉ bày 4 hình thức quyết toán** (`CASH`/`CARD`/`QR`/`COD`) — 3 cái còn lại trả
   `error.return.methodNotSupported`.
5. **Ẩn nút "Quyết toán"** khi phiếu không phát sinh tiền (`nothingToSettle`) hoặc đã quyết toán.
6. **KHÔNG khoá nút duyệt với phiếu do chính mình tạo** — module này backend **cho phép tự duyệt**
   (đo thật), khác hẳn phiếu kho Phase 10.

### Đã chạy trọn vòng đời qua UI thật

Tạo phiếu (`TH-CNTT-20260912-008`) → duyệt → quyết toán `CASH` → nhận kho ⇒ **`COMPLETED`**,
sinh phiếu kho `IN`/`ACCEPTED`. Và xác nhận chặn đúng: đơn đã trả hết hiện
*"Đã mua 1 · đã trả 1 · còn trả được 0"* với nút chọn bị khoá.

---

## Việc còn lại / cần bạn chốt

### 1. Khôi phục `staffone` + kiểm 2 điểm ở role STAFF *(xem đầu file)*

### 2. Ba điểm gửi backend — đã ghi ở PLAN mục B

| Mã | Vấn đề | Mức độ |
|---|---|---|
| **BE26** | `OrderDetailResDTO` thiếu `returnedQuantity` ⇒ FE phải N+1 để biết dòng đơn còn trả được mấy cái | ⏳ không chặn, đã workaround |
| **BE27** | `sort=staffName` / `sort=lines` trên `/return/search` ⇒ **HTTP 500** | ⏳ không chặn, đã khoá sort 2 cột |
| **BE28** | ⚠️ **Báo cáo doanh thu (P7) CHƯA trừ hàng trả** — `report/sales` · `report/profit` · `dashboard/summary` vẫn tính trên `order_sale` COMPLETED ⇒ **doanh thu bị thổi phồng đúng bằng tiền đã hoàn**. Báo cáo xuất-nhập-tồn thì **đã đúng**. | ❗ **cần bạn chốt**: xin backend trừ hàng trả, hay chấp nhận và ghi chú trên màn Báo cáo |

### 3. Dữ liệu test còn trong DB — không dọn được

8 phiếu mang lý do `FE-TEST` (`TH-CNTT-20260912-001…008`, `DOI-CNTT-20260912-002/003/007`).
Phiếu đổi/trả là **bản ghi lịch sử, backend cố ý không có `DELETE`** — sai thì từ chối chứ không xoá.
Tồn kho và quỹ ca **đã về đúng** (mọi phiếu đều đã `COMPLETED`/`REJECTED`).
Muốn sạch hẳn thì xoá thẳng ở DB (`return_detail` trước, rồi `return_request`, và phiếu kho `PN-*`
sinh kèm).

### 4. Phase 17 (Mở rộng Khuyến mại) — phần mở rộng tuỳ chọn duy nhất còn lại

Trọn 17 phase đã xong. Xem PLAN mục Phase 17 nếu muốn làm tiếp.
