# Dòng thời gian dự án — phase & khảo sát backend

> File này là **nhật ký một-dòng-mỗi-sự-kiện**, thay cho các hộp "Khảo sát lại ngày…" từng nằm trong
> CLAUDE.md. **Skill `handoff` ghi tiếp vào bảng này** khi kết thúc phiên (thêm dòng mới lên ĐẦU bảng,
> không sửa dòng cũ). Trạng thái hiện tại của từng domain: [docs/backend/](backend/) — file domain là
> nơi ghi *sự thật hiện tại*, file này chỉ ghi *chuyện gì xảy ra khi nào*.
>
> Chi tiết từng phase (mục tiêu, báo cáo cuối phase, các vòng review của user): [PLAN.md](../PLAN.md).
> Bàn giao chi tiết từng phiên gần đây: [docs/handoff/](handoff/).

| Ngày | Sự kiện | Chi tiết ở |
|---|---|---|
| 2026-09-13 | Luật **CONVENTIONS 5.7** (dropdown tìm kiếm: panel nổi · giới hạn cao · 10 mục/lượt; ô SKU luôn tra server) + hạ tầng `usePagedSearch`/`AsyncSuggest`/`useSkuOptions`. Đóng **BE26** (`returnedQuantity`), **BE28** (doanh thu sau hoàn), **BE29** (`sku keyword` khớp tên). Phát hiện 🐞 **BE30** (`groupBy=DAY` mất tiền hoàn — backend code xong, chưa deploy). `staffone` được reseed sống lại | [handoff phiên 09-13](handoff/phien-2026-09-13-luat-dropdown-va-va-phase-13.md) |
| 2026-09-12 | **Phase 13 Đổi/Trả XONG ⇒ TRỌN 17 PHASE HOÀN THÀNH.** Backend giao 9 endpoint `/return/**` (118 path), FE đo ~85 case khớp 100%. Luật **CONVENTIONS 5.6** (STT · tiêu đề · căn lề · ghim cột · ẩn cột), rà 9 bảng. Sự cố: `staffone` bị xoá mềm khi test | [handoff phiên 09-12](handoff/phien-2026-09-12-luat-bang-va-phase-13.md) · PLAN Phase 13 · [doi-tra.md](backend/doi-tra.md) |
| 2026-09-09 | **Phase 15 Ca làm việc XONG.** Backend giao 2 đợt trong ngày (104 → 109 path), đợt 2 thêm **quy trình duyệt ca** (breaking). FE đo 23/23 PASS. Đóng BE19/BE24/BE25 (`POST /order` tự gắn ca — Cách A của FE) | PLAN Phase 15 · [ca-lam-viec.md](backend/ca-lam-viec.md) · [backend-request-shift-history.md](backend-request-shift-history.md) |
| 2026-09-08 | Đóng Phase 14 sau 2 vòng review: luật **5.5** (ô tiền `MoneyInput` + hậu tố `đ`), backend thêm `error.promotion.codeInvalid` (BE22) + truy vết KM trên đơn (BE23). **User chốt KHÔNG LÀM màn Quản lý giá** (BE20). Kiểm chứng sort 60/60 request (Phase 16 ③). **Phase 16 Hoàn thiện XONG** (cảnh báo đơn treo · a11y · i18n) | PLAN Phase 14/16 · [khuyen-mai.md](backend/khuyen-mai.md) |
| 2026-09-07 | Backend lên **100 path**: domain **Khuyến mại** + **Quản lý giá**. **Phase 14 Khuyến mại XONG.** Luật **5.3** (cột THAO TÁC: Chi tiết + `(...)`) nâng thành luật chung, luật **5.4** (ngày `dd/MM/yyyy`, `DateInput`) | PLAN Phase 14 · [khuyen-mai.md](backend/khuyen-mai.md) · [gia.md](backend/gia.md) |
| 2026-08-30 | Backend thêm `groupBy: YEAR` + trần độ dài kỳ + vá bug profit CHANNEL/STAFF (BE15/BE16). **Phase 12 Dashboard & Báo cáo XONG** | PLAN Phase 12 · [bao-cao.md](backend/bao-cao.md) · [backend-request-year-granularity.md](backend-request-year-granularity.md) |
| 2026-08-29 | Backend lên **88 path**: 5 endpoint báo cáo/dashboard (BE9, làm trong ngày) + **`costPrice`** (đo 9/9). Luồng POS thêm **modal xem trước phiếu** (`OrderReceiptDialog`) | [bao-cao.md](backend/bao-cao.md) · [san-pham.md](backend/san-pham.md) |
| 2026-08-28 | **Phase 3b backend: khách hàng thành TOÀN CỤC** (bỏ branch data-scope). Khảo sát sort từ source (bảng field DTO-only gây 500). Luật bố cục toolbar + **5.1** (nạp lại giữ ngữ cảnh) + **5.2** (reload · ẩn cột · sort server) | [khach-hang.md](backend/khach-hang.md) · README.md mục Sort |
| 2026-08-22 | **Đơn POS tự COMPLETED khi thu tiền** (vòng đời tách theo kênh, đo 8/8). Hệ quả: đơn POS đã thu không huỷ được — sau này bịt bằng phiếu đổi/trả | [don-hang.md](backend/don-hang.md) |
| 2026-08-21 | Backend lên **83 path**: domain **bank account & VietQR** + **giảm giá 2 tầng** (`lines[].discountAmount`). User chốt luồng QR thủ công + chỉ in hoá đơn khi PAID | [ngan-hang-qr.md](backend/ngan-hang-qr.md) · [don-hang.md](backend/don-hang.md) |
| 2026-08-18 | **Phase 11 POS + Đơn hàng XONG.** BE1 nâng trần size 200 → 5000 · BE5 `channel` khi tạo đơn · BE8 chuẩn hoá `code`. Phát hiện BE6 (keyword không khớp tên) + BE7 (categoryId không roll-up) | PLAN Phase 11 |
| 2026-08-15 | **Mô hình thanh toán đổi: THU ĐÚNG 1 LẦN** (bỏ thanh toán hỗn hợp; đo 23/23). Chốt B7: 8 trạng thái đơn | [don-hang.md](backend/don-hang.md) |
| 2026-08-14 | **Đổi kiến trúc tồn kho: BỎ GIỮ CHỖ** (xoá cột `reserved` khỏi DB; `POST /order` trừ tồn ngay). Backend rà soát Phase 6: `OrderResDTO` bỏ `createdBy`, thêm `error.concurrentModification`. Ghi nhận race 500 (BE3) | [don-hang.md](backend/don-hang.md) · [kho.md](backend/kho.md) |
| 2026-08-11 | Sáng: 76 path, **domain đơn hàng xuất hiện đầy đủ**. Chiều: ⚠️ **BREAKING — `sku.id` = MÃ SKU** (`SP001-BK-AO-L`), DB xoá & seed lại (mọi id cũ đổi hết), xoá `weightGram`/`coverUrl`/`employeeId`, `minStock` hết nullable. FE kiểm 21/21 API + 12/12 UI | [san-pham.md](backend/san-pham.md) · [don-hang.md](backend/don-hang.md) |
| 2026-08-10 | Backend có **domain kho**. **Phase 10 Kho hàng XONG** (API thật). `DELETE /sku` + barcode lên server. Replan: đảo thứ tự phase 11–15 (bán online trước, mở ca để sau) | PLAN Phase 10 · [kho.md](backend/kho.md) |
| 2026-08-09 | ⚠️ **Đổi phân trang: `page`/`size`/`sort` sang query param** (body chỉ còn filter). Chốt quy ước **`status` 3 giá trị**. **Phase 8 Khách hàng + Phase 9 Sản phẩm XONG**. Phát hiện cap `size` 200 im lặng (sau này BE1 nâng 5000) | PLAN Phase 8/9 · README.md |
| 2026-08-08 | Khảo sát lần 2: backend có thêm **domain catalog + khách hàng**. **Phase 4 RBAC + 5 component + 6 mock + 7 Nhân viên & Chi nhánh XONG**. User review 2 vòng ⇒ chốt pattern `DetailModal` + cột THAO TÁC cố định (tiền thân luật 5.3) | PLAN Phase 7 |
| 2026-08-07 | **Phase 2 Auth + Phase 3 App shell XONG** | PLAN Phase 2/3 |
| 2026-08-06 | Khảo sát `/v3/api-docs/api` lần đầu · duyệt dependency (mục C) · **Phase 0 + 1 XONG** | PLAN mục A/C |
