---
name: review-phase
description: Review code sau khi một agent hoàn thành task/phase (checklist CONVENTIONS mục 10), HOẶC rà soát toàn repo khi user vừa chốt một luật mới (rà soát luật — quét mọi màn bị ảnh hưởng, lập bảng Trước/Sau rồi sửa). Dùng khi user nói "review", "rà soát", "kiểm tra lại phase", "áp luật mới cho toàn bộ màn".
---

# Review phase / Rà soát luật

Hai chế độ. Cả hai đều kết thúc bằng `npm run lint` + `npm run build` và báo cáo dạng bảng.
Nguyên tắc chung: phát hiện vấn đề **ngoài phạm vi** ⇒ báo cáo (việc backend thì đề xuất thành mục
BE# ở PLAN mục B — dùng skill `request-backend`), **không tự sửa lan man**.

## Chế độ 1 — Review sau task/phase (CONVENTIONS mục 10)

**Đầu vào**: bản tóm tắt của agent thực thi (file đã đổi · quyết định kỹ thuật · giả định · phần chưa
làm — skill `handoff` sinh ra thứ này). Không có thì tự dựng từ `git diff`/`git log`.

**Checklist — soi từng mục, có bằng chứng file:line:**

1. **DTO/endpoint khớp nguồn sự thật** — đối chiếu `src/types/` + `src/api/` với
   `docs/backend/<domain>.md`. Không bịa field, không đổi tên field, không field "cho tiện" (mục 1).
2. **Auth không bị đổi** (mục 2): token in-memory, không đọc/ghi cookie refresh, `rememberMe: true`
   cứng, refresh single-flight.
3. **Response & lỗi** (mục 3): bóc `data` ở api-client; toast thành công theo từng màn (thao tác đọc
   không toast); **mọi `subKey` mới có key ở CẢ `vi` lẫn `en`**; `logInfo` không hiển thị cho user.
4. **Gọi API qua client dùng chung** (mục 4): không `fetch`/`axios` trực tiếp; không tự xử lý
   401/403/500 rời rạc; PNG/CSV dùng `getBlob()`.
5. **UI/UX** (mục 5): bám mockup `design/`; desktop/tablet đúng thiết kế, mobile không vỡ; chỉ light
   theme; token màu, không hex; đủ loading/empty/error/success; không hardcode chuỗi; `AbortSignal`
   trong mọi effect gọi API; **Network tab: không endpoint nào gọi trùng trong một màn**.
6. **Bảng** — soi theo skill `create-table` (5.1/5.2/5.3/5.6): ghi xong nạp lại + giữ ngữ cảnh ·
   reload/ẩn-hiện-cột/sort server đủ · cột ngoài whitelist đã `enableSorting: false` (whitelist:
   `docs/backend/README.md` mục Sort) · STT/ghim/`size`/`meta.align` đúng · "Chi tiết" ngoài menu,
   `(...)` rỗng không vẽ · ô ngày `DateInput`, ô tiền `MoneyInput` (5.4/5.5) · dropdown tìm kiếm
   theo 5.7.
7. **RBAC** (mục 6.4): menu + route sinh theo role, chặn cả URL thẳng; so bậc bằng hàm dùng chung
   (không `if role === 'ADMIN' || ...` rải rác); không implement tab role demo của mockup.
   Màn có phân quyền ⇒ **đăng nhập đủ các role liên quan** (tài khoản: `docs/backend/README.md`).
8. **Code** (mục 7): không `any`, không `@ts-ignore` thiếu ghi chú, không `console.log`,
   naming đúng (`kebab-case` components / `PascalCase` pages).
9. **Tài liệu** (mục 9): thay đổi kiến trúc ⇒ CONVENTIONS/CLAUDE.md/docs đã cập nhật **cùng commit**;
   thay đổi hành vi API ⇒ `docs/backend/<domain>.md` đã sửa.

**Đầu ra** — bảng phát hiện, sắp theo mức độ:

| # | File:line | Mức độ | Vi phạm mục | Vấn đề | Cách sửa đề xuất |
|---|---|---|---|---|---|

Mức độ: 🔴 **chặn** (sai luật cứng, sai dữ liệu, lỗi chạy thật) · 🟡 **nên sửa** (lệch chuẩn, nợ kỹ
thuật) · 🟢 **gợi ý**. Không có phát hiện ⇒ ghi rõ "0 vi phạm" kèm những gì đã soi.

## Chế độ 2 — Rà soát luật mới trên toàn repo

Khi user chốt một luật mới (thường sau một vòng review UI của user):

1. **Ghi luật vào CONVENTIONS** đúng mục, kèm ngày chốt + "(chốt với user YYYY-MM-DD)" — giữ nguyên
   hệ thống đánh số mục (code đang tham chiếu "CONVENTIONS mục x.y" ở ~60 chỗ, không được xáo số).
2. **Xác định phạm vi ảnh hưởng** bằng grep (ví dụ luật bảng ⇒ grep `useTableState|DataTable` trong
   `src/pages/`; luật ô tiền ⇒ grep `type="number"`), liệt kê **mọi** màn/emplacement bị ảnh hưởng —
   kể cả màn cũ đã đạt chuẩn (ghi "✅ đã đúng").
3. **Sửa từng nơi**, ưu tiên sửa ở **hạ tầng dùng chung** (DataTable, hook, helper) để luật được "ép
   cứng" thay vì nhắc từng màn — đúng khẩu vị đã dùng cho 5.6 (3 luật đầu do DataTable ép).
4. **Lập bảng Trước/Sau** cho từng nơi (format như handoff 2026-09-12: "Bảng | Sửa gì").
5. Luật bảng ⇒ cập nhật bảng "hiện trạng cột ẩn sẵn" trong skill `create-table` nếu có thay đổi.
6. Chạy lint + build; kiểm bằng UI thật nếu có trình duyệt, không có thì kiểm logic tầng API và
   **ghi rõ là chưa nhìn tận mắt** (đừng báo cáo quá mức đã kiểm chứng).
7. Kết quả ghi vào bàn giao phiên (skill `handoff`).
