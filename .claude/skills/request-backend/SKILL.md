---
name: request-backend
description: Soạn tài liệu yêu cầu backend (docs/backend-request-*.md) khi FE thiếu API, gặp bug backend, hay cần đổi hành vi — đo thật lấy bằng chứng trước, viết theo template chuẩn của repo, đăng ký mã BE# ở PLAN mục B; kèm quy trình đóng yêu cầu khi backend giao hàng. Dùng khi user nói "xin backend", "soạn yêu cầu cho backend", "báo bug backend", hay khi phát hiện việc FE không tự làm được.
---

# Soạn yêu cầu gửi backend

Nguyên tắc (CONVENTIONS mục 1 + thói quen dự án):
- FE **không tự chế API giả** — thiếu thì báo user + soạn yêu cầu, trong lúc chờ chỉ workaround có ghi chú.
- **Mọi yêu cầu phải kèm phép đo thật**: request/response nguyên văn, ngày đo, tài khoản/role. Đọc
  được source backend thì trích kèm `file:dòng` (tăng sức thuyết phục và giúp backend sửa nhanh —
  xem `docs/backend-request-year-granularity.md` trích thẳng `ReportServiceImpl` ~dòng 252).
- **Bug đặt trước tính năng** trong tài liệu — "sai số liệu âm thầm" nguy hiểm hơn thiếu tính năng.
- Ghi rõ cái gì **KHÔNG chặn** và FE đang workaround thế nào — backend biết được phép ưu tiên.
- Giọng: lịch sự, số liệu, không đổ lỗi; có khen phần đã làm tốt (xem mở đầu `backend-request-shift-history.md`).

## Bước 1 — Đăng ký BE#

Mở PLAN mục B, bảng "Việc chờ backend": lấy **mã BE# kế tiếp** (đang tới BE30), thêm dòng
`| **BE##** | <mô tả ngắn, kèm bằng chứng đo> | ⏳ Chờ backend. <Chặn gì / không chặn gì> |`.
Yêu cầu nhiều việc ⇒ mỗi việc một BE# riêng (để đóng độc lập).

## Bước 2 — Viết `docs/backend-request-<slug>.md`

```markdown
# Yêu cầu backend — <chủ đề ngắn>

> **Người gửi:** FE (Eloria Admin) · **Ngày:** YYYY-MM-DD
> **Liên quan:** `docs/api/<tài liệu backend>.md` · PLAN mục **BE##**[, **BE##**]
> **Đã đo API thật** trên server local (`/v3/api-docs/api` = NNN path[, đã đối chiếu source `<class>`]).

Tài liệu gồm N việc độc lập, có thể làm riêng:

| # | Việc | Mức độ | Ưu tiên |
|---|---|---|---|
| **A** | 🐞 Vá bug … | **Bug đang có trên bản chạy** | **Nên vá sớm** |
| **B** | Thêm … | Tính năng mới, additive | Cần — đang chặn <màn/phase> |

# PHẦN A — …
## A1. Hiện tượng / Hiện trạng (đo thật YYYY-MM-DD)
   <bảng endpoint có/không · request/response nguyên văn · các cách đã thử>
## A2. Nguyên nhân (nếu đọc được source — trích code + file:dòng)
## A3. Vì sao đáng làm (hậu quả nghiệp vụ, viết cho người không đọc code hiểu được)
## A4. Đề xuất — chọn 1 trong N
   **Cách 1 (khuyến nghị): …** <DTO/endpoint/validate cụ thể đến mức copy được>
   **Cách 2: …** <đánh đổi>
> **FE đang làm gì:** <workaround hiện tại + giới hạn của nó>
```

Đề xuất **cụ thể đến mức backend copy được** (shape DTO, subKey mới đề xuất, thông báo lỗi tiếng
Việt), nhưng chốt phương án là quyền backend — vì thế mới có mục "chọn 1 trong N" + khuyến nghị.

## Bước 3 — Khi backend báo đã giao

1. **Đo thật lại từng phần** — đúng quy trình skill `update-api-doc`. ⚠️ "Đã code" ≠ "đã deploy":
   đo vẫn lỗi ⇒ ghi "**backend đã code xong nhưng CHƯA lên server đang chạy**" và giữ BE# ở ⚠️
   (tiền lệ: `DELETE /sku` 2026-08-09, BE27/BE30 2026-09-13).
2. Chèn **hộp lên ĐẦU** file yêu cầu:
   ```markdown
   > ## ✅ **ĐÃ ĐƯỢC XỬ LÝ — backend giao ngày YYYY-MM-DD**
   > | Phần | Xin gì | Backend giao |
   > <kèm: phần backend làm NGOÀI phạm vi xin (breaking?) · điểm còn lệch chưa khớp>
   ```
   Giữ nguyên phần thân làm hồ sơ trao đổi.
3. Đóng BE# ở PLAN mục B: ✅ + ngày + kết quả đo (kiểu "đo thật `"linen"` ⇒ 12").
4. Cập nhật `docs/backend/<domain>.md` (sự thật hiện tại) + nối phần FE hưởng lợi (gỡ workaround —
   như BE26 gỡ `loadReturnable()` N+1) + thêm dòng `docs/history.md`.
