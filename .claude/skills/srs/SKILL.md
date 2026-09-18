---
name: srs
description: Viết/cập nhật tài liệu SRS (Software Requirements Specification) cho một màn hoặc toàn web admin Eloria — tổng hợp từ nguồn sự thật phía FE (code src/pages + src/api + src/types + Router/menu, docs/backend/<domain>.md đã đo thật, mockup design/, PLAN + CONVENTIONS, handoff/history), đánh số FE-FR ổn định, tham chiếu chéo FR của SRS backend thay vì chép nghiệp vụ, kèm traceability matrix FE-FR ↔ màn/component ↔ endpoint ↔ mockup ↔ nguồn quyết định; luồng phức tạp nhúng sequence diagram bằng skill sequence-diagram. Dùng khi user nói "viết SRS", "đặc tả màn X", "tài liệu yêu cầu", "spec cho QA/bên thứ ba", "tài liệu bàn giao chức năng".
---

# Viết SRS từ nguồn sự thật (phía FE)

Nguyên tắc: **SRS mô tả hệ thống ĐANG có và đã kiểm chứng, không phải hệ thống tưởng tượng.** Mọi
requirement phải truy được về ít nhất một nguồn dưới đây; không có nguồn ⇒ **không bịa thành
requirement**, đưa vào mục "Câu hỏi mở".

| # | Nguồn | Cho biết |
|---|---|---|
| 1 | Code thật: `src/pages/<màn>/` · `src/api/<domain>.ts` · `src/types/` · `src/Router.tsx` · `src/config/menu.ts` · `src/i18n/locales/vi/*` | màn làm được gì, gate quyền, endpoint gọi, wording thật |
| 2 | `docs/backend/<domain>.md` (+ `README.md`) | hành vi API **đã đo thật**: status, subKey, data-scope, sort whitelist, quirks |
| 3 | Mockup `design/NN-*.png` (bảng tra CONVENTIONS 6.1) — **phải mở ảnh** | bố cục, cột, nút, wording thiết kế |
| 4 | `PLAN.md` mục phase + mục B · `CONVENTIONS.md` | quyết định user chốt, **lệch mockup có chủ đích**, BE# đang chờ, luật UI 5.x / RBAC 6.4 |
| 5 | `docs/handoff/*.md` · `docs/history.md` | ngày + lý do của quyết định; cái gì đã kiểm chứng bằng role nào |
| 6 | SRS backend `35.1.eloria-backend/docs/srs/srs-<module>.md` (nếu đã có) | **tham chiếu `FR-<MODULE>-NN`**, không chép lại nghiệp vụ |

Khi nguồn mâu thuẫn: code thật + `docs/backend` (đo thật) thắng doc cũ; PLAN "lệch mockup có chủ
đích" thắng mockup. Nhưng **code lệch mockup mà PLAN không ghi lý do ⇒ báo user trước** — có thể
là bug, SRS không được hợp thức hoá.

**Ranh giới FE ↔ BE:** SRS FE đặc tả *những gì người dùng thấy và làm được trên web admin* — màn,
route, menu theo role, bảng (cột · sort · ẩn · ghim), form + validate, trạng thái loading/empty/error,
thông báo (subKey ⇒ thông điệp), workaround cho BE# đang chờ, i18n, định dạng. Quy tắc nghiệp vụ
(công thức tiền, vòng đời, guard backend) ⇒ **trích 1–2 dòng + link** `docs/backend` / FR backend.

## Vị trí & đánh số

- File: `docs/srs/srs-<slug>.md`, một màn (hoặc cụm màn cùng domain) một file; toàn hệ thống:
  `docs/srs/srs-00-tong-quan.md` (kiến trúc FE, auth, RBAC, layout chung, luật bảng, i18n). Index
  `docs/srs/README.md` — 1 dòng/file (tạo nếu chưa có).
- Slug + tiền tố ID cố định:

  | Màn | Mockup | `docs/backend` | `src/pages` · `src/api` | PLAN phase | slug | Prefix |
  |---|---|---|---|---|---|---|
  | Đăng nhập & phiên | `00` | `README.md` § Đăng nhập | `auth/` · `auth.ts` + `contexts/AuthProvider.tsx` | 2 | `auth` | `AUTH` |
  | Dashboard & Báo cáo | `01` | `bao-cao.md` | `Dashboard.tsx` + `report/` · `report.ts` | 12 | `dashboard` | `DASH` |
  | POS (mở ca · bán hàng) | `02` `03` | `don-hang.md` · `ca-lam-viec.md` · `khuyen-mai.md` · `ngan-hang-qr.md` | `pos/` · `order.ts` `shift.ts` `promotion.ts` `bank-account.ts` | 11 · 15 | `pos` | `POS` |
  | Đơn hàng + chi tiết | `04` `05` | `don-hang.md` | `orders/` · `order.ts` | 11 | `don-hang` | `DONHANG` |
  | Đổi / Trả | `06` | `doi-tra.md` | `returns/` · `return.ts` | 13 | `doi-tra` | `DOITRA` |
  | Ca làm việc | *(pattern `04`)* | `ca-lam-viec.md` | `shift/` · `shift.ts` | 15 | `ca-lam-viec` | `CA` |
  | Nhân viên · Chi nhánh · Phân quyền · Nhật ký | `07` `08` `09` | `README.md` § Domain hệ thống | `staff/` · `staff.ts` `branch.ts` `audit-log.ts` | 7 | `nhan-vien-chi-nhanh` | `NHANSU` |
  | Khách hàng | `10` | `khach-hang.md` | `customer/` · `customer.ts` | 8 (+3b) | `khach-hang` | `KH` |
  | Sản phẩm · Danh mục | `11` `12` | `san-pham.md` | `product/` · `product.ts` | 9 | `san-pham` | `SP` |
  | Kho hàng | `13` `14` `15` | `kho.md` | `inventory/` · `inventory.ts` | 10 | `kho` | `KHO` |
  | Khuyến mại | `16` | `khuyen-mai.md` | `promotion/` · `promotion.ts` | 14 | `khuyen-mai` | `KM` |
  | Tổng quan hệ thống | — | `README.md` | `lib/` `contexts/` `components/` | 0–4 · 16 | `00-tong-quan` | `HT` |

  *(Bảng tra tại 2026-09-14 — xác nhận lại bằng `ls src/pages/<màn>` trước khi dùng.)*
- Requirement đánh số **`FE-FR-<PREFIX>-NN`** (vd `FE-FR-DOITRA-03`), phi chức năng
  **`FE-NFR-<PREFIX>-NN`**. Tiền tố `FE-` để phân biệt với `FR-<MODULE>-NN` của SRS backend khi đọc
  cạnh nhau. Số **ổn định vĩnh viễn** như BE#: không đánh lại khi sửa/xoá; requirement bỏ đi giữ số,
  ghi `(đã bỏ — lý do, ngày)`.
- SRS là **living doc**: sửa trực tiếp nội dung, ghi `## Changelog` cuối file (ngày + tóm tắt).
- User nói "SRS toàn hệ thống" ⇒ viết `srs-00-tong-quan.md` trước, rồi **mỗi màn một lần chạy
  skill** theo thứ tự menu — không nhồi nhiều màn vào một lượt.

## Bước 1 — Chốt phạm vi & gom nguồn

Xác định màn + domain + phase theo bảng tra. Đọc **theo thứ tự**:

1. **Mockup** — mở ảnh, ghi ra: khối, cột bảng, nút, badge, wording.
2. **`docs/backend/<domain>.md`** — endpoint + `[ROLE]`, status/subKey đã đo, sort whitelist, quirks
   (`lines: null`, cap `size`…), data-scope.
3. **PLAN mục phase** (hộp "ĐÃ XONG" + báo cáo cuối phase) — lệch mockup có chủ đích, quyết định
   user chốt, BE# liên quan (mục B).
4. **`src/Router.tsx` + `src/config/menu.ts`** — route, `minRole`, `redirectTo`, vị trí menu.
5. **Page + `components/`** — mọi hành động (nút · menu `(...)` · dialog), gate `hasRole`/`<Can>`,
   điều kiện theo trạng thái bản ghi, key `toastSuccess`, cột ẩn sẵn, `enableSorting`.
6. **`src/api/<domain>.ts`** — JSDoc từng method (`[ROLE] method path` + quirk) là bản tóm tắt hợp
   đồng đáng tin nhất; **`src/types/<domain>.ts`** — DTO dùng ở màn.
7. **`src/i18n/locales/vi/<ns>.ts`** — wording thật để trích nguyên văn; `errors.ts` — subKey đã map.
8. **`docs/handoff/` + `docs/history.md`** — ngày quyết định; đã kiểm chứng bằng tài khoản/role nào.
9. **SRS backend** nếu có — lấy mã `FR-*` để tham chiếu.

Màn lớn (POS, Kho) có thể fan-out Explore để liệt kê hành động/file, nhưng **gate quyền, nhánh lỗi,
điều kiện ẩn nút phải tự đọc code**.

## Bước 2 — Viết theo khung chuẩn

Tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh, wording UI **nguyên văn theo i18n `vi`**. Khung (rút
gọn từ IEEE 29148 cho vừa dự án):

```markdown
# SRS — <Tên màn>

> **Route:** `/returns` · **Mockup:** `design/06-doi-tra.png` · **Domain backend:** `docs/backend/doi-tra.md`
> **Phase:** 13 (xong YYYY-MM-DD) · **SRS backend:** `srs-returns.md` (nếu có) · **Cập nhật:** YYYY-MM-DD
> **Đã kiểm chứng:** API thật + UI role nào (dẫn handoff) · phần chỉ suy luận từ RBAC ghi rõ

## 1. Giới thiệu — mục đích màn, phạm vi (màn nào/tab nào thuộc file này), thuật ngữ, link nguồn
## 2. Actor & phân quyền — bảng role × (vào màn? · thấy dữ liệu nào (data-scope) · hành động nào)
   + cơ chế chặn: menu ẩn · `RoleRoute minRole` · nút gate · backend 403 là chốt cuối
## 3. Yêu cầu chức năng — mỗi FE-FR một mục:
   ### FE-FR-DOITRA-01 — <tên hành động>
   *Mô tả* · *Tiền điều kiện* (role, trạng thái bản ghi, ca đang mở, dữ liệu cần có)
   *Luồng chính* (đánh số: hành động người dùng → UI → API `method path` → phản hồi UI: toast key,
   đóng dialog, nạp lại giữ ngữ cảnh 5.1)
   *Luồng thay thế / lỗi* — bảng `Tình huống · HTTP/subKey · FE hiển thị · Nguồn đo`
   *Quy tắc UI* (validate zod, format `DateInput`/`MoneyInput`, điều kiện ẩn nút theo trạng thái)
   *Quy tắc nghiệp vụ* (trích ngắn + link docs/backend § / FR backend — KHÔNG chép công thức dài)
   *Endpoint* · *Mockup & lệch mockup có chủ đích (lý do, nguồn PLAN)*
   *Sequence diagram* — bắt buộc với luồng phức tạp (xem quy tắc dưới), vẽ bằng skill `sequence-diagram`
## 4. Yêu cầu giao diện — bố cục theo mockup; bảng: thứ tự cột · ghim · ẩn sẵn (lý do) · cột sort
   được (whitelist) · toolbar · cột THAO TÁC; form/dialog: field · bắt buộc · validate; trạng thái
   loading / empty / error; i18n VI+EN; responsive desktop/tablet
## 5. Yêu cầu dữ liệu — DTO dùng ở màn (tên type, field mang nghĩa nghiệp vụ), field list KHÔNG trả
   (`lines: null`…), enum trạng thái ↔ badge; không chép nguyên `src/types`
## 6. NFR — chỉ cái màn thực enforce: RBAC chặn cả URL · `AbortSignal` mọi effect · không gọi trùng
   endpoint · so `data.length` với `total` · token in-memory · i18n đủ 2 ngôn ngữ · a11y
## 7. Phụ thuộc backend & workaround — bảng `BE# · Ảnh hưởng màn · FE đang làm gì · Gỡ khi nào`
## 8. Traceability matrix — BẮT BUỘC (không có = chưa xong):
   | FE-FR | Màn / Component (file) | Endpoint | Mockup | FR backend / docs/backend § | Nguồn quyết định (PLAN/handoff) | Trạng thái |
   Trạng thái: DONE · WORKAROUND(BE#) · DEFERRED · (đã bỏ)
## 9. Ngoài phạm vi / Deferred — user chốt không làm (vd Quản lý giá, 4 tab Báo cáo), backend ghi
   ngoài phạm vi, phần mockup cố ý không implement (tab role demo 6.4)
## 10. Câu hỏi mở — điều chưa chốt cần user/PO trả lời (rỗng ⇒ ghi "Không")
## Changelog — YYYY-MM-DD · tóm tắt
```

**Sequence diagram — khi nào bắt buộc:** luồng có **≥ 2 lời gọi API nối tiếp**, hoặc có **nhánh lỗi
làm đổi trạng thái/tiền/tồn**, hoặc là luồng phiên (đăng nhập · bootstrap F5 · refresh · hết phiên).
Điển hình: thanh toán POS + QR, duyệt/quyết toán/nhận kho phiếu trả, mở/chốt/duyệt ca, huỷ đơn đã
thu, duyệt phiếu kho, áp mã KM. **Gọi skill `sequence-diagram`** (trace code thật, bảng chú thích
`file:dòng`), gắn vào đúng mục FE-FR — không vẽ chay trong SRS. Luồng CRUD đơn giản (1 API, lỗi chỉ
toast) ⇒ không vẽ, mô tả bằng luồng chính là đủ.

## Bước 3 — Tự đối chiếu trước khi nộp

- Mỗi FE-FR truy được ≥ 1 nguồn? Có mục nào viết từ trí nhớ ⇒ xoá hoặc chuyển "Câu hỏi mở".
- **Đếm method trong `src/api/<domain>.ts`** so với cột Endpoint của matrix — method nào chưa có FE-FR
  ⇒ bổ sung hoặc ghi lý do bỏ qua. Endpoint trong matrix phải grep thấy trong `src/api/`, không nhớ.
- **Đếm hành động trên màn** (nút header · menu `(...)` · dialog · tab) — mỗi hành động có FE-FR?
- Mỗi subKey trong SRS tồn tại ở `src/i18n/locales/vi/errors.ts` hoặc `docs/backend/<domain>.md`
  (grep xác nhận); status HTTP ghi kèm chỉ khi `docs/backend` đã đo — chưa đo ⇒ ghi "chưa đo".
- Mỗi sequence diagram có đoạn dẫn + bảng chú thích `file:dòng` (chuẩn skill `sequence-diagram`).
- Wording trong SRS khớp i18n `vi`; cột bảng khớp code (kể cả cột ẩn sẵn + lý do); sort chỉ ghi cột
  trong whitelist `docs/backend/README.md` § Sort.
- Mục 2 ghi rõ đã kiểm chứng bằng **tài khoản/role nào** (lấy từ handoff) — chưa nhìn tận mắt thì
  nói thẳng.

## Bước 4 — Cập nhật con trỏ

- Cập nhật `docs/srs/README.md` (1 dòng/file: tên màn · file · ngày cập nhật · số FE-FR).
- **KHÔNG sửa** CLAUDE.md · CONVENTIONS · PLAN · `docs/backend/` từ skill này — SRS là tài liệu
  **phái sinh**, không phải nơi ra quyết định.
- Phát hiện lệch (code ↔ mockup ↔ docs/backend ↔ PLAN) ⇒ liệt kê cho user dạng bảng `Nơi · Code
  đang · Nguồn nói · Đề xuất`, không tự sửa bên nào; lỗi thuộc backend ⇒ đề xuất BE# qua skill
  `request-backend`.
- Kết phiên bằng skill `handoff` (thêm dòng `docs/history.md` + bàn giao) như mọi task khác.
