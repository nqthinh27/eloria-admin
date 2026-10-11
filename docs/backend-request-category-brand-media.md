# Yêu cầu backend — ảnh danh mục/thương hiệu (upload · chuẩn hoá chuỗi rỗng · lỗi 409 mặc định · làm rõ hợp đồng link)

> ✅ **ĐÃ ĐÓNG 2026-10-11** — backend giao ở P13.2 + P13.3 (`fe-handoff-phase13_2-admin.md`, `fe-handoff-phase13_3-admin.md`).
> FE đo lại thật cùng ngày (`superadmin`): BE31 upload/gỡ slot + logo trả DTO đầy đủ, body có field ảnh ⇒ 400 `error.input.invalid`;
> BE32 `""` ⇒ `null`; BE33 subKey `error.category.defaultConflict` (chưa dựng lại race trên UI); BE34 đã trả lời (`/media/**` do Nginx).
> P13.3 đi xa hơn đề xuất: **bỏ hẳn nhập link** ⇒ FE chỉ còn upload. Chi tiết hiện hành: `docs/backend/san-pham.md`.

> **Người gửi:** FE (Eloria Admin) · **Ngày:** 2026-10-10
> **Liên quan:** `35.1.eloria-backend/docs/api/fe-handoff-phase13_1-admin.md` · `docs/decisions/phase-13_1-category-media.md` · PLAN mục **BE31 · BE32 · BE33 · BE34**
> **Đã đo API thật** trên server local (`superadmin`, `localhost:8080`, `/v3/api-docs/api` đã có P13.1), đã đối chiếu source `FileService`, `CategoryServiceImpl`.

Cảm ơn backend đã giao P13.1 rất gọn: 9 field mới đều nullable nên màn cũ không vỡ; "bật default cho B tự gỡ A" chạy đúng
trong 1 request (đo thật: 1 PUT, bảng luôn đúng 1 dòng `isDefault`); `parentId` full-update đã được cảnh báo sẵn nên FE
tránh được bẫy. Phần dưới là 4 việc FE gặp khi dựng màn (Phase 22/23), độc lập nhau:

| # | Việc | Mức độ | Ưu tiên |
|---|---|---|---|
| **A** (BE32) | 🐞 `""` ⇒ `null` không nhất quán giữa các field | Lệch tài liệu, **không chặn** | Nên vá/ghi rõ |
| **B** (BE31) | Thêm endpoint upload ảnh cho danh mục + thương hiệu | Tính năng mới, additive | **Cần** — đang chặn nửa sau Phase 22/23 |
| **C** (BE33) | `409` khi 2 người cùng bật default dùng subKey chung, thông điệp sai ngữ cảnh | Cải thiện, không chặn | Thấp |
| **D** (BE34) | Làm rõ hợp đồng giá trị `imageLink*` + hành vi default INACTIVE | Câu hỏi | Trung bình |

---

# PHẦN A — `""` không đưa mọi field về `null` (BE32)

## A1. Hiện tượng (đo thật 2026-10-10)
Handoff ghi: gửi `""` ⇒ "Xoá ảnh (cột về `null`)". Đo `PUT /category/{id}` danh mục `AO-SM`, body gửi `""` cho cả
`imageLink1`, `imageLink2`, `coverLink1..5` (và trước đó `description:""` qua form):

| Field gửi `""` | Giá trị đọc lại từ `POST /category/search` |
|---|---|
| `imageLink1` | `null` ✅ (`imageUrl` cũng `null`) |
| `imageLink2` | `null` ✅ |
| `coverLink1..5` | **`""`** ❌ |
| `description` | **`""`** ❌ |

## A2. Vì sao đáng làm
Storefront/FE khác nhau trong cách coi `""`: nơi kiểm `!= null` sẽ tưởng "có ảnh" và vẽ khung ảnh vỡ (đặc biệt với
`coverLink*` ở danh mục mặc định). `compactCoverLinks` đã lọc `""` cho DTO store nên web hiện không lỗi, nhưng DTO admin
trả `""` lẫn `null` cho cùng một ý nghĩa "trống" làm FE phải đoán.

## A3. Đề xuất — chọn 1
**Cách 1 (khuyến nghị):** chuẩn hoá ở service: mọi field nội dung của category, sau `trim`, rỗng ⇒ lưu `null` (gồm
`description`, `coverLink1..5`), đồng nhất với `imageLink1/2`.
**Cách 2:** giữ nguyên hành vi, cập nhật `fe-handoff-phase13_1-admin.md` ghi rõ field nào về `null`, field nào giữ `""`.

> **FE đang làm gì:** form sửa chỉ gửi `""` cho ô **vừa bị xoá** (trước có giá trị), ô vốn trống thì bỏ field — để không biến
> mọi cột `null` thành `""`. FE đọc lại bằng `?? ''` nên chạy đúng với cả hai cách.

---

# PHẦN B — Endpoint upload ảnh cho danh mục và thương hiệu (BE31)

## B1. Hiện trạng (đo + đọc source 2026-10-10)
| Đối tượng | Có upload file? |
|---|---|
| Ảnh sản phẩm | ✅ `POST /product/{id}/images` (multipart theo slot `image1..10`) — `FileService.uploadProductImage` (`FileService.java:15`, `FileServiceImpl.java:99`) |
| Avatar nhân viên | ✅ `FileService.uploadAvatar` (`FileService.java:12`, `FileServiceImpl.java:81`) |
| **Danh mục** `imageLink1/2`, `coverLink1..5` | ❌ chỉ nhận **chuỗi link ≤500** |
| **Thương hiệu** `logoUrl` | ❌ chỉ nhận chuỗi link ≤256 |

`FileService` chỉ có đúng 2 phương thức ở trên, không có gì cho danh mục/thương hiệu.

## B2. Vì sao đáng làm
Admin muốn đổi ảnh danh mục phải tự có sẵn link (host ở đâu?) rồi dán vào. FE không kiểm được **dung lượng/định dạng**, chỉ
kiểm được kích thước + tỉ lệ sau khi tải ảnh qua trình duyệt. Chuẩn ảnh CMS (`35.3.eloria-client/docs/image-spec.md` §5)
yêu cầu chặn file quá nặng/sai định dạng **trước khi gửi** — chỉ làm được khi có upload.

## B3. Đề xuất — chọn 1
**Cách 1 (khuyến nghị): tái dùng mô hình ảnh sản phẩm**
- `POST /v1.0/api/category/{id}/images` — `[SUPER_ADMIN]`, multipart, field `image1`, `image2`, `cover1..5` (khớp ô trên form);
  chỉ cập nhật slot có gửi; response `CategoryResDTO`. Trần 2 MB/file, 4 MB/request, kiểm nội dung thật, không SVG (như sản phẩm).
- `DELETE /v1.0/api/category/{id}/images/{slot}` — slot `image1|image2|cover1..5`.
- `POST /v1.0/api/brand/{id}/logo` — multipart một field `logo`; `DELETE /brand/{id}/logo`.
- Ghi song song `imageUrl` như P13.1 đang làm với `imageLink1`.
**Cách 2:** một endpoint chung `POST /v1.0/api/file/image` trả về đường dẫn lưu, FE dán đường dẫn đó vào `imageLink*`/`logoUrl`
(ít endpoint hơn, nhưng file mồ côi khi admin bỏ giữa chừng).

> **FE đang làm gì:** `ImageLinkField` — ô nhập link + đo kích thước/tỉ lệ + xem trước. Khi có endpoint, FE chỉ thay phần nhập
> bằng nút chọn file (đã có sẵn `inspectImageFile` kiểm trước khi gửi); hint/xem trước giữ nguyên.

---

# PHẦN C — `409` khi 2 người cùng bật danh mục mặc định (BE33)

## C1. Hiện trạng
Handoff: HTTP 409 `{"code":7,"subKey":"error.dataIntegrity.violation"}`. Message i18n hiện tại của subKey này:
*"Dữ liệu đang được sử dụng ở nơi khác, không thể thực hiện thao tác."* — sai ngữ cảnh với tình huống "default vừa bị người
khác đổi". (FE **chưa dựng lại được** tình huống 2 phiên đồng thời; mô tả lấy từ handoff backend, đã review mã xử lý.)

## C2. Đề xuất
Subkey riêng khi vi phạm unique của cờ default, ví dụ **`error.category.defaultConflict`** — *"Danh mục mặc định vừa được người
khác thay đổi. Vui lòng tải lại danh sách."* Giữ HTTP 409. `error.dataIntegrity.violation` giữ cho các vi phạm ràng buộc khác.

> **FE đang làm gì:** bắt `status 409 + error.dataIntegrity.violation` **chỉ khi đang bật default**, tắt toast mặc định, hiện câu
> đúng ngữ cảnh rồi nạp lại. Khi có subKey riêng FE sẽ đổi điều kiện bắt và bỏ nhánh đặc biệt.

---

# PHẦN D — Hai điểm cần làm rõ (BE34)

**D1. Hợp đồng giá trị `imageLink1/2`, `coverLink1..5`.** Dữ liệu seed là đường dẫn gốc `"/media/cat/ao-tile-1.webp"`.
Đo: `GET /v1.0/api/image?imageUrl=%2Fmedia%2Fcat%2Fao-tile-1.webp` ⇒ **HTTP 400**; `GET localhost:8080/media/cat/ao-tile-1.webp`
⇒ 401. Admin (cùng origin với `/v1.0/api`) vì thế **không xem trước được** ảnh seed; admin cũng không biết nên nhập dạng nào
(URL tuyệt đối? `/media/...` của storefront? tên file do `/image` phục vụ?). Xin backend chốt dạng chuẩn và (nếu là đường dẫn
của storefront) cho biết origin để admin dựng URL xem trước.

**D2. Danh mục mặc định đang `INACTIVE`.** Handoff nói cờ default chỉ nhả khi **xoá mềm**; `findFirstByIsDefaultTrue()` không lọc
status. Hỏi: khi default bị chuyển `INACTIVE`, storefront có coi như **0 default** (ẩn khối ngang Trang chủ) không? FE hiện đang
giả định "có" — banner cảnh báo + popup xác nhận hiện khi chuyển default sang INACTIVE. Xác nhận giúp FE khỏi cảnh báo sai.

---

## Tóm tắt cho backend

| Mã | Việc | Phương án khuyến nghị |
|---|---|---|
| BE32 | `""` ⇒ `null` đồng nhất cho `description`, `coverLink*` | Cách 1 |
| BE31 | Upload ảnh danh mục + thương hiệu | Cách 1 (theo slot như sản phẩm) |
| BE33 | subKey riêng cho 409 default | `error.category.defaultConflict` |
| BE34 | Chốt dạng giá trị link + hành vi default INACTIVE | Trả lời bằng văn bản |
