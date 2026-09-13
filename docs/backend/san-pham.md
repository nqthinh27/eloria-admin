# Backend — Sản phẩm · SKU · Danh mục · Thương hiệu · Màu · Size · Giá vốn

> Kiểm chứng bằng API thật khi code Phase 9 (2026-08-09); cập nhật 2026-08-10/11, 2026-08-29 (giá vốn),
> 2026-09-13 (BE29). Màn FE: Sản phẩm · Danh mục SP. Code FE: `src/api/product.ts`, `src/types/product.ts`,
> `src/pages/product/`. Quy ước chung + sort + status: [README.md](README.md).

## Endpoint & phân quyền

⚠️ **Phân quyền khác các domain khác: đọc `[STAFF]`, ghi `[SUPER_ADMIN]`** cho *toàn bộ* nhóm này —
**ADMIN gọi API ghi cũng 403** (đã test).

| Nhóm | Đọc / Ghi | Endpoint |
|---|---|---|
| Thương hiệu | `STAFF` / `SUPER_ADMIN` | `POST /brand/search` · `GET /brand/{id}` / `POST /brand` · `PUT /brand/{id}` · `DELETE /brand/{id}` · `POST /brand/update-status` |
| Danh mục | `STAFF` / `SUPER_ADMIN` | `POST /category/search` · `GET /category/{id}` / `POST /category` · `PUT /category/{id}` · `DELETE /category/{id}` · `POST /category/update-status` |
| Màu | `STAFF` / `SUPER_ADMIN` | `POST /color/search` · `GET /color/{id}` / `POST /color` · `PUT /color/{id}` · `DELETE /color/{id}` — **không có `update-status`** |
| Size | `STAFF` / `SUPER_ADMIN` | `POST /size/search` · `GET /size/{id}` / `POST /size` · `PUT /size/{id}` · `DELETE /size/{id}` — **không có `update-status`** |
| Sản phẩm cha | `STAFF` / `SUPER_ADMIN` | `POST /product/search` · `GET /product/{id}` / `POST /product` · `PUT /product/{id}` · `POST /product/{id}/images` · `POST /product/{id}/generate-sku` |
| SKU | `STAFF` / `SUPER_ADMIN` | `POST /sku/search` · `GET /sku/{id}` · `GET /sku/by-ean/{ean}` · `GET /sku/{id}/barcode` / `POST /sku/update-status` · `DELETE /sku/{id}` — **không có tạo/sửa SKU trực tiếp**, SKU chỉ sinh qua `generate-sku` |

Response: `product`/`brand`/`category`/`sku` dùng `BaseListResStatus` (có `activeTotal`/`inactiveTotal`);
`color`/`size` chỉ `BaseListRes`.

## Sản phẩm cha

- `ProductResDTO` = `{id, code, name, slug, price, costPrice, shortDescription, description, gender,
  status, brandId, brandName, material, metadata, sizeGroup, images[], categories[], createdDate,
  lastModifiedDate}`. **Không có tồn kho, không vòng đời SKU, không ảnh đại diện riêng.**
- ⚠️ **`categories` LUÔN rỗng `[]` ở `POST /product/search`**, chỉ populate ở `GET /product/{id}`.
- ⚠️ **`GET /product/{id}` KHÔNG trả kèm SKU** dù summary ghi "+ bảng SKU" — phải gọi `POST /sku/search` với `{productId}`.
- `material` là **enum fix cứng** `COTTON | LINEN | SILK | WOOL` — không có API danh mục chất liệu,
  cũng không có API nhà cung cấp / bộ sưu tập mùa.
- `UpdateProductReqDTO` **bỏ `code`** (không sửa được mã). `CreateCategoryReqDTO`/`UpdateCategoryReqDTO`
  cùng bộ field (danh mục sửa được `code`).
- `POST /product/{id}/generate-sku` nhận `{colorIds[], sizeIds[]}`, **idempotent** (ô đã có SKU thì bỏ
  qua), trả **toàn bộ** SKU hiện có của sản phẩm.
- `POST /product/{id}/images` là **multipart** (field `files`, tối đa 10), **thay toàn bộ gallery**
  theo thứ tự file ⇒ api-client bỏ header `Content-Type` khi body là `FormData`.
- **Không có `DELETE /product/{id}`** (405). Xoá danh mục/thương hiệu bị chặn khi còn ràng buộc:
  `error.category.hasChildren` · `error.brand.hasProducts`. `DELETE /color|size/{id}` là **hard delete**
  (chặn nếu còn SKU tham chiếu).
- ⚠️ **BE7**: `product/search?categoryId=` **không roll-up lên danh mục cha** — lọc theo `AO` trả 0 dù
  có sản phẩm ở danh mục con `AO-SM`. FE tạm chỉ hiện **danh mục lá** ở hàng pill POS.

## SKU

- ⚠️ **BREAKING 2026-08-11: `sku.id` là MÃ SKU, không phải UUID** — dạng
  `{productCode}-{colorCode}-{sizeCode}`, ví dụ thật `SP001-BK-AO-L`. Phần cuối là **`sizeOption.code`**
  (`AO-L`), *không phải* `label` (`L`). **`sku.id === sku.skuCode`** ⇒ hiển thị thẳng `id` cho người
  dùng được. Mã dùng làm path param (`GET /sku/SP001-BK-AO-L`) và mọi `skuId` trong body/response
  (order lines, stock-item, warehouse-ledger, stock-count, stock-disposal) đều là chuỗi mã này.
- `SkuResDTO` = `{id, skuCode, ean, status, productId, productName, unitPrice, colorId, colorName,
  sizeId, sizeLabel, createdDate}` — **`weightGram` đã bị xoá** (2026-08-11). `ean` là field riêng cho
  barcode, không đổi theo mã.
- ⚠️ **`unitPrice` hiện luôn `null`** trên dữ liệu thật (bảng `sku_price` rỗng — xem [gia.md](gia.md))
  ⇒ chỗ cần giá bán phải **fallback `Product.price`**, đừng hiển thị thẳng `unitPrice`.
- `Sku.status` theo đúng quy ước 3 giá trị chung: bật/tắt qua `sku/update-status` (0/1), xoá mềm qua
  `DELETE /sku/{id}` (`[SUPER_ADMIN]`, có trên server từ 2026-08-10). Vòng đời New/Markdown/Ngừng KD
  trong mockup **chưa có** enum riêng — đừng nhầm với `status`.
- ✅ **`keyword` của `sku/search` soi `sku.id` · `ean` · `product.name` · `product.code`** (BE29,
  2026-09-13 — đo thật `"linen"` ⇒ 12, `"Áo sơ mi"` có dấu ⇒ 12). Trước đó chỉ khớp mã + EAN.
  ⇒ Ô chọn SKU **luôn tra phía server** (CONVENTIONS mục 5.7, hook `useSkuOptions`) mà gõ tên vẫn tìm được.
- `GET /sku/{id}/barcode` (`[STAFF]`) trả **PNG thuần** ⇒ `apiClient.getBlob()` (xem README).
- Ô chọn SKU bắt buộc hiện **mã SKU trong nhãn** — một sản phẩm sinh hàng chục SKU trùng hệt tên
  (đo thật 2026-09-13: 67 SKU chỉ có 7 tên khác nhau).

## Giá vốn `costPrice` — nền cho báo cáo lãi gộp (đo thật 9/9 case, 2026-08-29)

`ProductResDTO` · `CreateProductReqDTO` · `UpdateProductReqDTO` đều có `costPrice` (number,
**nullable**, `@DecimalMin(0)`). Quyền không đổi: đọc `[STAFF]`, ghi `[SUPER_ADMIN]`.

| Case | Đo thật |
|---|---|
| `POST` kèm `costPrice: 150000` | lưu `150000` ✓ |
| `POST` bỏ trống | `null` ✓ |
| `POST` `costPrice: -5` | `400 error.input.invalid` ✓ |
| `PUT` bỏ hẳn field / `PUT null` | **giữ nguyên giá cũ** ✓ |
| `PUT costPrice: 0` | **lưu đúng `0`** ✓ |
| STAFF `PUT` | `403` ✓ |

- ⚠️ **Không có cách XOÁ giá vốn về `null`** sau khi nhập — `undefined` lẫn `null` đều là "giữ nguyên".
  ⇒ FE không dựng nút "xoá giá vốn"; hint form nói rõ *ô trống = giữ nguyên* (`costPriceKeepHint`).
- ⚠️ **`0` KHÁC rỗng** — đọc ô nhập phải so `trim() === ''`, cấm falsy check (`!value`).
- ⚠️ **Backend TRẢ `costPrice` cho cả STAFF** (BE10) — việc giấu giá vốn dựa hoàn toàn vào FE
  (gate `canWrite` ở `product-detail-modal.tsx`): **che ở UI, không phải bảo mật**.
- **Giá vốn KHÔNG xuất hiện ở POS/đơn/hoá đơn** — backend tự snapshot vào đơn lúc tạo. FE không được
  đưa `costPrice` sang các màn đó.
