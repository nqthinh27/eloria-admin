---
name: update-api-doc
description: Khảo sát lại /v3/api-docs/api và ĐO API THẬT khi user ra lệnh (backend vừa thêm domain, đổi DTO, hay cần kiểm chứng lời backend báo). Diff số path, kiểm thử endpoint mới bằng tài khoản test đủ role, quét sort tìm field gây 500, đồng bộ types + docs/backend + history. CHỈ chạy khi user ra lệnh — agent không tự ý fetch api-docs (CONVENTIONS mục 1).
---

# Khảo sát api-docs + đo API thật

⚠️ **Điều kiện chạy: user ra lệnh.** Không tự ý fetch api-docs, không tự nối realtime, không hardcode
URL vào code. Backend dev local: `http://localhost:8080`, prefix `/v1.0/api`.

Phong cách bắt buộc (thói quen dự án): **mọi khẳng định phải có phép đo kèm theo** — request/response
nguyên văn, đếm PASS/FAIL kiểu `23/23 PASS`, ghi ngày đo. "Backend báo đã sửa" **không phải bằng
chứng** — đã 2 lần code xong nhưng chưa deploy (`DELETE /sku` 2026-08-09, BE27/BE30 2026-09-13):
đo vẫn lỗi thì ghi "**đã code, CHƯA lên server đang chạy**".

## Bước 1 — Fetch & diff

1. `GET http://localhost:8080/v3/api-docs/api` → lưu snapshot vào scratchpad.
2. Đếm path, so với lần trước (dòng mới nhất của [docs/history.md](../../../docs/history.md) —
   hiện 118 @ 2026-09-13). Liệt kê endpoint **mới / đổi schema / biến mất**.
3. Đọc tài liệu backend của domain mới: `35.1.eloria-backend/docs/api/*.md`; cần shape chính xác thì
   đọc source `35.1.eloria-backend/src/main/java/vn/com/eloria/` (entity/DTO/ServiceImpl).
   ⚠️ Đường dẫn endpoint đọc từ **api-docs**, đừng suy từ tên class Java (bài học `StockOperationResource`
   ⇒ đường thật là `/stock-count`).

## Bước 2 — Đo thật

Tài khoản test + quy ước gọi: `docs/backend/README.md` (login `POST /authenticate`, field
**`username`**, luôn `rememberMe: true`; lấy `data.token` làm Bearer).

Mỗi endpoint mới, đo tối thiểu:

| Lớp | Đo gì |
|---|---|
| Happy path | Gọi thành công, **dán JSON thật** vào ghi chép (ví dụ thật quý hơn schema) |
| RBAC | Gọi bằng đủ 4 tài khoản — role dưới mức `[ROLE]` phải 403; ghi bảng role × kết quả |
| Data-scope | ADMIN chi nhánh khác (`hkadmin`) — kỳ vọng 403 hoặc bị ép về chi nhánh mình; để ý pattern "gửi lên bị **bỏ qua im lặng**" |
| Case biên & lỗi | Từng `subKey` trong tài liệu backend: tái hiện được không, HTTP status nào; body thiếu field, trạng thái sai, gọi lặp (idempotent?), guard nào chạy trước |
| Vòng đời | Mutation có trạng thái ⇒ chạy **trọn vòng đời** xuôi + các nhánh cụt (REJECTED có hồi được không?) |
| Race (nếu đáng) | 2+ request đồng thời trên cùng bản ghi — phân biệt 409/400/500 |

**Endpoint `/search` mới — đo thêm:**
- **Quét sort**: mọi field DTO × ASC/DESC → ghi field nào 200, field nào **500** (DTO-only) →
  cập nhật bảng Sort ở `docs/backend/README.md`. Đây là nguồn cho `enableSorting: false`.
- `keyword` khớp những field nào (đừng suy diễn — mỗi module một kiểu).
- Field nào `null` ở list nhưng có ở `GET /{id}` (pattern `lines`/`categories`/`paidAmount`).
- Có `activeTotal`/`inactiveTotal` không.

**Cạm bẫy đo đã gặp** (đọc trước khi gõ curl):
- `page` **1-based** · `sort=field,ASC` **viết hoa** · field phân trang trong body ⇒ `400 code:7`.
- Ngày gửi UTC: cuối ngày VN là **`T16:59:59Z`**, gõ tay `T23:59:59Z` là lệch biên (bài học BC báo cáo).
- `size` vượt trần bị **cắt im lặng** — so `data.length` với `total`.
- Endpoint PNG/CSV không bọc `BaseResponse` — curl xem bytes/headers, đừng parse JSON.

## Bước 3 — Dọn dữ liệu test

Xoá/huỷ được thì dọn sạch và ghi "dữ liệu test đã dọn". Bản ghi lịch sử không xoá được (phiếu
đổi/trả, ca, đơn) ⇒ đưa về trạng thái đóng (REJECTED/CLOSED/COMPLETED), **liệt kê mã bản ghi** còn
sót để user biết (như handoff 2026-09-12). ⚠️ Đừng `DELETE` tài khoản test — xoá mềm **không có
đường khôi phục bằng API** (sự cố `staffone`).

## Bước 4 — Đồng bộ FE

1. `src/types/` + `src/api/<domain>.ts` khớp 100% DTO thật (không bịa field).
2. `subKey` mới ⇒ thêm key vào **cả `vi` lẫn `en`** (`src/i18n/`).
3. Breaking (field xoá/đổi tên/đổi kiểu) ⇒ **grep toàn `src/`** tìm chỗ còn dùng, sửa hết;
   DB seed lại ⇒ kiểm không nơi nào hardcode/cache id.
4. `npm run lint` + `npm run build`.

## Bước 5 — Cập nhật tài liệu (cùng đợt, không để sau)

1. `docs/backend/<domain>.md` — sửa thành **sự thật hiện tại** (kèm ngày đo). Domain mới ⇒ tạo file
   mới + thêm dòng vào bảng chỉ mục ở `docs/backend/README.md` **và** CLAUDE.md.
2. Ghi chép cũ thành sai ⇒ **sửa thẳng**, đừng chồng hộp "không còn đúng" (dòng thời gian đã có
   `docs/history.md` lo).
3. `docs/history.md` — thêm 1 dòng lên đầu bảng (ngày · sự kiện · số path · link).
4. PLAN mục B — đóng/mở BE# liên quan (đóng thì ghi ✅ + ngày + kết quả đo).

## Bước 6 — Báo cáo

Số path trước → sau · bảng endpoint mới (role tối thiểu lấy từ tiền tố `[ROLE]` trong `summary`) ·
breaking + ảnh hưởng FE · bảng kết quả đo (PASS/FAIL, RBAC, sort-500) · điểm lệch tài liệu backend ·
việc FE phải làm tiếp.
