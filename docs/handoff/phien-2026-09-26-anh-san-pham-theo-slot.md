# Bàn giao phiên 2026-09-26 — Ảnh sản phẩm theo slot (backend hardening file)

> **Nhánh:** `develop` · chưa commit
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` pass
> **Đã kiểm chứng bằng gì:** chỉ đọc `docs/api/fe-handoff-file-security-hardening.md` của repo backend. **Không đo API thật, không chụp UI.**

## ⚠️ ĐỌC TRƯỚC
Backend đổi contract **BREAKING**: bản FE cũ (`files[]`) sẽ hỏng upload ảnh sản phẩm ngay khi backend deploy — cần deploy FE này cùng lúc.

## Phần 1 — Ảnh sản phẩm theo slot
| File | Đổi gì |
|---|---|
| `api/product.ts` | `uploadImages(id, [{slot,file}])` gửi field `imageN`; thêm `deleteImage(id, slot)` |
| `product-detail-modal.tsx` | Tab Ảnh: "Tải ảnh lên" nối vào slot trống kế tiếp (1 request nhiều field); nút **Thay** trên mỗi ảnh; nút **Xoá** (có ConfirmDialog) chỉ ở ảnh **cuối**; `accept` chỉ jpg/png/gif/webp; khoá nút khi đủ 10 ảnh |
| `i18n/*/product.ts` | hint mới + `replace/delete/deleteTitle/deleteDescription/imageDeleted` |
| `i18n/*/errors.ts` | `error.file.typeNotAllowed`, `error.rateLimit.exceeded` (429 tự hiện toast qua map subKey) |
| `docs/backend/san-pham.md` | Ghi contract mới |

### Quyết định kỹ thuật
1. **Slot = vị trí trong `images` + 1.** `images[]` đã lọc slot rỗng nên không biết slot thật. Đúng khi gallery liền mạch (dữ liệu cũ điền tuần tự).
2. **Chỉ cho xoá ảnh cuối** — xoá giữa tạo lỗ hổng ⇒ lần sau "Thay" sẽ ghi nhầm slot (mất ảnh sai). Cái giá: muốn bỏ ảnh giữa phải xoá từ cuối lên và tải lại. Gỡ hạn chế khi backend trả `imagesBySlot`.
3. Không làm kéo-thả đổi thứ tự — backend chưa có API.
4. Không đụng avatar: FE không có màn upload avatar.

### Giả định tôi tự quyết
- Ảnh cũ hiện có liền mạch từ slot 1.
- Response `DELETE` không dùng (luôn refetch chi tiết).

### Kiểm chứng
- Chưa chạy với backend thật; chưa nhìn UI. Chưa bắt riêng HTTP 429 ở api-client — chỉ dựa vào `subKey` → i18n (nếu backend thiếu `subKey` thì rơi về `message` của backend).

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | Xin backend trả `imagesBySlot` (hoặc slot cho từng ảnh) để gỡ hạn chế "chỉ xoá ảnh cuối" — chưa đăng ký mã BE# ở PLAN mục B | Trung bình |
| 2 | Xin API đổi thứ tự ảnh nếu cần kéo-thả | Thấp |
| 3 | Đo API thật khi backend deploy (skill `update-api-doc`) | Trung bình |

## Phần 2 — Card sản phẩm (user chốt 2026-09-26)
- Bấm card ⇒ **xem ảnh lớn** (`product-image-viewer.tsx`: ~80% màn hình, nền mờ, ‹ › / phím ←→). SP chưa có ảnh ⇒ mở modal chi tiết.
- Nút **⋮** (dọc) cạnh giá ⇒ mở modal chi tiết hiện có (không menu tuỳ chọn — user bỏ nút 👁 và các option).

## Phần 3 — Trần dung lượng upload (backend `error.file.tooLarge`, HTTP 413)
- Backend: 2MB/file · 4MB/request. FE chặn file > 2MB trước khi gửi (huỷ cả lượt) và **chia lô** request ≤ ~3.9MB (`chunkBySize`), gửi tuần tự; lô lỗi thì dừng, lô trước đã lưu vẫn nạp lại.
- i18n: `error.file.tooLarge`, `product.images.fileTooLarge`. Chưa đo API thật.
