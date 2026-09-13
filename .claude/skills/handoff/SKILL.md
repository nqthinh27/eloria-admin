---
name: handoff
description: Kết thúc task/phase/phiên làm việc — chạy cổng lint+build, viết bàn giao docs/handoff/phien-*.md (file đổi, quyết định, giả định tự quyết, việc còn lại), thêm dòng vào docs/history.md, cập nhật trạng thái PLAN. Dùng khi xong việc, user nói "bàn giao", "handoff", "kết thúc phiên", "đóng phase", "tổng kết".
---

# Bàn giao cuối task / cuối phiên

Mục đích: agent review (skill `review-phase`) và phiên làm việc sau có đủ ngữ cảnh mà **không phải
đọc lại transcript**. Nguyên tắc số 1: **báo cáo trung thực đúng mức đã kiểm chứng** — cái gì đo bằng
API thật, cái gì nhìn tận mắt trên UI, cái gì mới chỉ suy luận từ RBAC ⇒ ghi tách bạch, kèm role/tài
khoản đã dùng. Việc bị chặn/chưa làm ⇒ ghi rõ vì sao, đừng im.

## Bước 1 — Cổng kiểm tra

`npm run lint` (0 lỗi — 5 warning có sẵn của shadcn được phép) và `npm run build`. Fail ⇒ sửa xong
mới bàn giao; không sửa được ⇒ ghi 🔴 ngay đầu file bàn giao.

## Bước 2 — Viết `docs/handoff/phien-YYYY-MM-DD-<slug>.md`

Slug ngắn theo nội dung chính (vd `phien-2026-09-12-luat-bang-va-phase-13.md`). Template:

```markdown
# Bàn giao phiên YYYY-MM-DD — <Tên việc chính>

> **Nhánh:** `<branch>` · **N commit**
> **Cổng kiểm tra:** `npm run lint` … · `npm run build` …
> **Đã kiểm chứng bằng gì:** API thật? UI thật (chụp màn hình)? role/tài khoản nào?

## ⚠️ ĐỌC TRƯỚC — việc BẮT BUỘC cho phiên sau        ← chỉ khi có (sự cố, dữ liệu hỏng, việc dở dang)

## Phần N — <từng khối việc>
### Luật mới (nếu có) — mục CONVENTIONS nào, chốt với user ngày nào
### File mới / đổi / xoá — dạng cây hoặc bảng "File | Đổi gì"
### Quyết định kỹ thuật đáng nhớ — đánh số, MỖI CÁI KÈM LÝ DO (cái giá là gì, vì sao chọn)
### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)   ← bắt buộc có mục này, dù rỗng
### Kiểm chứng — đã chạy thật những gì; cái gì CHƯA nhìn tận mắt và vì sao

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |        ← việc backend thì gắn mã BE# (đăng ký ở PLAN mục B — skill request-backend)

## Dữ liệu test còn sót (nếu có) — liệt kê mã bản ghi, vì sao không dọn được
```

## Bước 3 — Ghi sổ

1. **`docs/history.md`**: thêm **1 dòng lên ĐẦU bảng** (ngày · sự kiện cô đọng · link file bàn giao /
   PLAN / docs/backend liên quan). Không sửa dòng cũ.
2. **PLAN.md**: đóng phase ⇒ đánh ✅ + ngày ở bảng mục D và tiêu đề mục phase; báo cáo cuối phase ghi
   vào mục phase đó. BE# mới phát sinh / vừa đóng ⇒ cập nhật bảng mục B.
3. Phiên có thay đổi **hành vi API** ⇒ chắc chắn `docs/backend/<domain>.md` đã sửa; thay đổi **kiến
   trúc FE** ⇒ CONVENTIONS/CLAUDE.md cập nhật **cùng commit** (CONVENTIONS mục 9).
   ⚠️ **Không ghi lịch sử vào CLAUDE.md** — CLAUDE.md chỉ giữ trạng thái hiện tại.

## Bước 4 — Tóm tắt trong chat

4 gạch đầu dòng đúng thứ user quen đọc: **file đã đổi · quyết định kỹ thuật · giả định · phần chưa
làm** + link file bàn giao. Nhắc: sẽ có agent khác review (skill `review-phase`).

## Nếu user yêu cầu commit

Message kiểu repo: `feat|fix|docs|refactor: <mô tả tiếng Việt>`, các vế nối bằng ` · ` hoặc ` + `
(vd `feat: luật bảng dùng chung — STT · tiêu đề · căn lề · ghim cột · ẩn cột`). Code + tài liệu đi
**cùng một commit**. Kết message bằng dòng Co-Authored-By hiện hành của phiên. Không commit khi user
chưa yêu cầu.
