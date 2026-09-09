# Yêu cầu backend — Ca làm việc: bổ sung API tra cứu lịch sử ca

> **Người gửi:** FE (Eloria Admin) · **Ngày:** 2026-09-09
> **Liên quan:** `docs/api/ca-lam-viec-p10.md` · PLAN Phase 15 mục **BE24**, **BE25**
> **Đã đo API thật** trên server local (`/v3/api-docs/api` = 104 path, 3 tài khoản test).

---

> ## ✅ **ĐÃ ĐƯỢC XỬ LÝ TOÀN BỘ — backend giao ngày 2026-09-09 (cùng ngày)**
>
> Backend làm **cả 3 phần A/B/C** và **thêm quy trình duyệt ca** mà tài liệu này không xin.
> api-docs lên **109 path**. FE đã kiểm thử thật **23/23 PASS** và code xong Phase 15.
> Tài liệu giữ lại làm **hồ sơ trao đổi**, không còn việc phải làm.
>
> | Phần | Xin gì | Backend giao |
> |---|---|---|
> | **A** | `work-shift/search` + `GET /{id}` | ✅ Đủ cả 2, kèm data-scope 3 role đúng như đề xuất |
> | **B** | `OrderSearchReqDTO.shiftId` | ✅ Đã có, đo thật lọc đúng |
> | **C** | Gắn ca cho `POST /order` | ✅ Chọn **Cách A** — `POST /order` tự gắn ca đang mở cho đơn `POS` của STAFF ⇒ kiểm quỹ đúng mà **không phải đổi luồng thanh toán 2 bước** |
>
> **Ngoài phạm vi đã xin**, backend còn thêm: quy trình **duyệt ca**
> (`WAITING_APPROVAL → OPEN`, 2 endpoint `approve`/`reject`) và **chốt ca hộ** (`{id}/close`).
> ⚠️ Đây là **breaking change** với bản đầu (mở ca không còn ra `OPEN` ngay) — FE đã đồng bộ.
>
> **Còn một điểm nhỏ chưa khớp** (không chặn gì): sort `staffName`/`branchName` ở
> `work-shift/search` vẫn trả **500** đúng như tài liệu §A3.1 dự đoán — FE đã khai
> `enableSorting: false` cho 2 cột này.

Cảm ơn team đã làm xong module ca làm việc — FE đã kiểm thử **22/22 case PASS** và **Phase 15 đã
code xong** với 4 endpoint hiện có. Tài liệu này xin thêm phần **tra cứu**, và báo một **điểm hở
nghiệp vụ** phát hiện khi đo thật.

| # | Việc | Mức độ | Ưu tiên |
|---|---|---|---|
| **A** | Thêm API tra cứu lịch sử ca (`search` + `getById`) | Tính năng mới, additive | **Cần** — đang chặn 1 màn |
| **B** | Thêm `shiftId` vào `OrderSearchReqDTO` | Thêm 1 field filter | Cần cho phần "đơn trong ca" |
| **C** | ⚠️ **Điểm hở**: `POST /order` không gắn ca ⇒ kiểm quỹ sai | **Nghiệp vụ**, cần chốt hướng | **Nên bàn sớm** |

---

# PHẦN A — Không tra cứu lại được ca đã chốt

## A1. Hiện trạng (đo thật 2026-09-09)

Module chỉ có **3 endpoint đọc/ghi ca**, tất cả đều xoay quanh **ca đang mở của chính người gọi**:

| Endpoint | Có | Ghi chú |
|---|---|---|
| `GET /work-shift/current` | ✅ | Chỉ ca **đang mở**, chỉ **của chính mình** |
| `POST /work-shift/open` | ✅ | |
| `POST /work-shift/close` | ✅ | |
| `POST /work-shift/search` | ❌ **404** | |
| `GET /work-shift/{id}` | ❌ **404** | |
| `GET /work-shift` | ❌ **404** | |

```bash
# Đo thật, tài khoản superadmin
POST /v1.0/api/work-shift/search  -> 404
GET  /v1.0/api/work-shift/{id}    -> 404
GET  /v1.0/api/work-shift         -> 404
```

## A2. Vì sao đây là vấn đề

Ca **đã chốt** thì **không còn đường nào đọc lại**: `current` trả `null` ngay sau khi chốt
(đo thật). Nghĩa là **`expectedCash` · `closingCash` · `cashDifference` chỉ đọc được ĐÚNG MỘT LẦN**
— trong response của `POST /work-shift/close`.

Hệ quả thực tế:

- Nhân viên chốt ca xong, lỡ đóng cửa sổ ⇒ **mất vĩnh viễn** số liệu kiểm quỹ của ca đó.
- Quản lý **không thể** rà lại "ca nào lệch quỹ", "nhân viên nào hay thiếu tiền" — dù dữ liệu
  **đã nằm trong bảng `work_shift`**, chỉ là không có đường lấy ra.
- Không đối chiếu được ca với doanh thu ngày.

FE hiện phải **cảnh báo thẳng trên giao diện** rằng đây là lần duy nhất xem được các con số —
đó là cách chữa cháy, không phải cách đúng.

## A3. Đề xuất

### A3.1. `POST /work-shift/search` — `[STAFF]`

Theo đúng pattern `/search` chung của hệ thống (`page`/`size`/`sort` ở **query param**, body chỉ
chứa filter), trả `BaseListRes<WorkShiftResDTO>`:

```jsonc
// POST /v1.0/api/work-shift/search?page=1&size=20&sort=openedAt,DESC
{
  "keyword":  "CA-CNTT",     // khớp code ca / tên nhân viên
  "status":   "CLOSED",      // EShiftStatus, optional
  "branchId": "…",           // optional
  "staffId":  "…",           // optional
  "fromDate": "2026-09-01T00:00:00Z",   // theo openedAt
  "toDate":   "2026-09-09T16:59:59Z"
}
```

**Data-scope** xin theo đúng quy ước sẵn có của các module khác:
STAFF ⇒ chỉ ca **của chính mình** · ADMIN ⇒ ca của **chi nhánh mình** · SUPER_ADMIN ⇒ toàn chuỗi
(và dùng được `branchId`).

⚠️ Xin lưu ý quy tắc **sort** đã ghi ở CLAUDE.md: `sort` giải theo tên field **entity**, nên
`staffName`/`branchName` (nếu là field DTO-only) sẽ ném `PropertyReferenceException` ⇒ **HTTP 500**.
Nếu 2 field đó không sort được, FE sẽ khai `enableSorting: false` — chỉ cần team **xác nhận giúp**
danh sách field sort được.

### A3.2. `GET /work-shift/{id}` — `[STAFF]`

Trả `WorkShiftResDTO` của một ca bất kỳ (cùng data-scope như trên). Dùng cho màn chi tiết ca.

**Không cần** thêm `PUT`/`DELETE`/`update-status` — FE đồng ý ca là **bản ghi lịch sử, không sửa**.

---

# PHẦN B — `OrderSearchReqDTO` chưa có `shiftId`

## B1. Hiện trạng

```bash
POST /v1.0/api/order/search  body {"shiftId":"…"}
-> 400 {"code":7,"subKey":"error.input.invalid","logInfo":"Request body không hợp lệ hoặc sai định dạng"}
```

`OrderSearchReqDTO` hiện có: `keyword` · `status` · `orderStatus` · `paymentStatus` · `channel` ·
`branchId` · `fromDate` · `toDate` · `promotionId` — **không có `shiftId`**, dù
`OrderResDTO.shiftId` đã trả về bình thường.

## B2. Đề xuất

Thêm **1 field** `shiftId` vào `OrderSearchReqDTO` (giống hệt cách `promotionId` đã được thêm ở
P9 — đã dùng rất tốt). Có nó thì màn chi tiết ca liệt kê được **các đơn đã bán trong ca**, khớp
với con số kiểm quỹ.

*(Ghi chú nhỏ: `paidAmount` hiện trả `null` ở `POST /order/search` — FE hiểu là cố ý tránh N+1
như `lines`/`payments`. Nếu tiện thì cho `paidAmount` có số ở danh sách sẽ đỡ FE phải gọi
`GET /order/{id}` từng đơn để cộng tiền; **không bắt buộc**.)*

---

# PHẦN C — ⚠️ `POST /order` không gắn ca ⇒ tiền kỳ vọng khi chốt ca bị thiếu

## C1. Hiện tượng (đo thật, quan trọng nhất trong tài liệu này)

Backend tính:

```
expectedCash = openingCash + Σ tiền mặt net của đơn CÓ shiftId = ca này
```

Nhưng **`POST /order` không gắn `shiftId`** (luôn `null`), và **không yêu cầu đang mở ca**:

```bash
# staffone, KHÔNG mở ca
POST /order {"channel":"POS","paymentMethod":"CASH","lines":[…]}
-> 200, status PENDING, shiftId = null      # tạo được bình thường
```

Kịch bản đo thật đầy đủ:

| Bước | Kết quả |
|---|---|
| Mở ca, `openingCash = 0` | ✓ |
| Tạo đơn `POST /order` **trong lúc ca đang mở**, thu `CASH` 500.000 qua `POST /order/{id}/payment` | đơn `COMPLETED`, `paidAmount = 500.000`, **`shiftId = null`** |
| Chốt ca, đếm được 0 | **`expectedCash = 0`** ⇒ két "khớp" |

⇒ Nếu nhân viên thu **thật** 500.000 tiền mặt, hệ thống báo **thiếu quỹ đúng 500.000**
(hoặc "khớp" trong khi két dư 500.000 — tuỳ họ nhập gì). **Số kiểm quỹ không dùng được.**

## C2. Vì sao FE không tự chữa được

- FE **không thể** tự cộng tiền: `POST /order/search` trả `paidAmount = null`, **và** không lọc
  được theo `shiftId` (Phần B) ⇒ muốn cộng phải gọi `GET /order/{id}` cho **từng** đơn, mà vẫn
  không biết đơn nào thuộc ca nào.
- `POST /pos/order` **có** gắn ca, nhưng nó **thu tiền ngay lúc tạo đơn** ⇒ mất bước "xác nhận đã
  nhận tiền" thủ công mà nghiệp vụ đang cần (đặc biệt với chuyển khoản QR: nhân viên phải đối
  chiếu app ngân hàng trước khi ghi nhận — backend **chưa có webhook banking**).

## C3. Đề xuất — xin team chọn giúp 1 trong 2

**Cách A (FE đề xuất): `POST /order` tự gắn ca đang mở của người tạo.**
Nếu người gọi đang có ca `OPEN` thì set `shift_id` cho đơn; không có ca thì để `null` như hiện nay
(**tương thích ngược hoàn toàn**, không phá luồng bán online). Cách này giữ nguyên luồng thanh
toán 2 bước mà vẫn cho `expectedCash` đúng.

**Cách B: tách riêng bước thu tiền cho `/pos/order`.**
Cho `POST /pos/order` một cờ kiểu `autoPay: false` để tạo đơn gắn ca **nhưng chưa thu tiền**, rồi
FE thu qua `POST /order/{id}/payment` như cũ.

Cách A gọn hơn và không đụng vào hợp đồng API nào đang chạy. Nếu team thấy việc gắn ca ngầm là
không mong muốn thì Cách B cũng giải quyết trọn vấn đề.

---

## Tóm tắt

| Việc | Cần gì | Chặn cái gì |
|---|---|---|
| **A** | `POST /work-shift/search` + `GET /work-shift/{id}` | Màn **Lịch sử ca** (user đã yêu cầu) |
| **B** | Thêm `shiftId` vào `OrderSearchReqDTO` | Khối "đơn trong ca" của màn chi tiết ca |
| **C** | Chốt hướng A **hoặc** B | **Tính đúng đắn của số kiểm quỹ** — ảnh hưởng tiền thật |

Phần **C** không chặn code nhưng ảnh hưởng trực tiếp tới con số tiền, nên FE xin ưu tiên bàn trước.
