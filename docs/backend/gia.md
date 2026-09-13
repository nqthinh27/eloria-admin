# Backend — Quản lý giá (`sku_price`) — ❌ KHÔNG LÀM MÀN FE

> ❌ **USER CHỐT 2026-09-08: KHÔNG LÀM màn Quản lý giá** (PLAN mục BE20 + hộp cuối Phase 17).
> Nhóm API này **cố ý bỏ trống**, không phải thiếu sót — **đừng tự dựng màn cho nó**.
> Giá bán tiếp tục dùng **`product.price`** (sửa ở form Sản phẩm); backend tự fallback khi `sku_price`
> rỗng nên FE không phải đổi gì. Hệ quả đã chấp nhận: không giá riêng theo kênh · không lên lịch đổi
> giá · không điều chỉnh hàng loạt · không lịch sử đổi giá.
>
> Nguồn: `35.1.eloria-backend/docs/api/quan-ly-gia-p8.md`. File này giữ để tra cứu nếu sau này user mở lại.

| Nhóm | Role | Endpoint |
|---|---|---|
| Đọc | `STAFF` | `POST /price/search` · `POST /price-change-log/search` |
| Ghi | `SUPER_ADMIN` | `POST /price` · `POST /price/bulk-adjust` · `DELETE /price/{id}` |

- Một dòng `sku_price` = giá của **1 SKU × 1 kênh** trong `[effectiveFrom, effectiveTo)`;
  `effectiveTo = null` ⇒ mở vô hạn. **Không chồng lấn**: set giá mới tự cắt `effectiveTo` dòng đang mở;
  đè lên dòng tương lai ⇒ `error.price.overlap`.
- **Không branch data-scope** — giá dùng chung toàn chuỗi (giống catalog, bank account).
- ⚠️ Bảng `sku_price` hiện **RỖNG** (đo `total: 0`) ⇒ mọi đơn fallback `product.price` qua
  `SkuResDTO.unitPrice` (luôn `null`). Hợp đồng API cũ không đổi, POS/đơn chạy nguyên như trước.
- `POST /price/bulk-adjust`: `target` (`ALL|PRODUCT|CATEGORY|BRAND|SKU`, tái dùng `EPromotionTarget`) +
  `adjustType` (`PERCENT|FIXED`), trả **số SKU đã áp**; SKU không có base / chồng lịch bị **bỏ qua im lặng**.
- Đo thật RBAC: ADMIN `POST /price` ⇒ 403; STAFF `price/search` ⇒ 200.
- subKey: `error.price.{notExisted, invalidRange, overlap, targetRequired, noBase}`.
