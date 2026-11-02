# Bàn giao phiên 2026-11-02 — Ảnh đại diện theo màu (tab Ảnh sản phẩm)

> **Nhánh:** không đổi · **chưa commit**
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` (`tsc -b` + vite) pass.
> Cảnh báo CSS `Unexpected ")"` và chunk >500kB của build là có sẵn, không do thay đổi này.
> **Đã kiểm chứng bằng gì:** chỉ lint + typecheck + build. **Chưa chạy trên trình duyệt, chưa gọi API thật**
> (lúc làm `localhost:8080` chưa lên; phiên `eloria-backend` đang làm API, chưa báo sẵn sàng).

## ⚠️ ĐỌC TRƯỚC

- **Mục 3 của brief (cảnh báo ở dialog sửa màu) CHƯA làm** vì admin **không có** dialog/màn sửa màu: `colorApi` chỉ có
  `search`, menu không có mục màu, `api/product.ts` ghi rõ "chưa có màn CRUD riêng cho color/size — ngoài phạm vi (mockup
  không vẽ)". Dựng màn mới sẽ trái CONVENTIONS mục 5/6 nên không tự làm. Backend có `PUT /color/{id}`; nếu PO muốn có
  cảnh báo thì phải có quyết định thêm màn Màu (hoặc cảnh báo ở nơi khác đang đổi mã màu).

## Phần 1 — Khối "Ảnh đại diện theo màu"

### File mới / đổi
| File | Đổi gì |
|---|---|
| `src/pages/product/components/product-color-images.tsx` (mới) | Component khối: nạp `GET color-images`, mỗi màu = swatch + tên + mã + dải thumbnail chọn (radiogroup, ô "Chưa gắn" + 1 ô/ảnh), nút lưu `PUT`. Trạng thái loading / lỗi + tải lại / chưa SKU / chưa ảnh |
| `src/pages/product/components/product-detail-modal.tsx` | Gắn khối vào cuối tab Ảnh; thêm `colorImagesReload`, tăng sau khi xoá ảnh thành công |
| `src/api/product.ts` | `productApi.getColorImages`, `productApi.updateColorImages` |
| `src/types/product.ts` | `ProductColorImage`, `ColorImageMapReq` |
| `src/i18n/locales/{vi,en}/product.ts` | khối `product.colorImages.*`, toast `colorImagesSaved` |
| `src/i18n/locales/{vi,en}/errors.ts` | `error.product.colorImageInvalid` |
| `docs/backend/san-pham.md`, `docs/history.md` | ghi hợp đồng + dòng nhật ký |

### Quyết định kỹ thuật
1. **Số slot = vị trí + 1 trong `current.images`, ảnh của slot `n` là `images[n-1]`.** Lý do: tab Ảnh hiện không có
   số slot từng ảnh (`images[]` đã lọc slot rỗng); `handleUpload`/thay/xoá đều suy slot theo cách này và chỉ cho xoá ảnh
   cuối để không có lỗ hổng. Dùng lại đúng cách đó thay vì tự đoán khác. Cái giá: nếu dữ liệu có lỗ hổng (vd seed, hoặc backend
   xoá giữa), thumbnail có thể lệch. Giảm nhẹ: slot do backend trả mà không có ảnh tương ứng ⇒ hiện chữ "Ảnh N không còn" màu đỏ.
   Sửa tận gốc cần backend trả `imagesBySlot` (đã nêu trong `san-pham.md`).
2. **Khối tách file riêng** vì modal đã 780+ dòng. Tự nạp dữ liệu (mount khi mở tab Ảnh, vì `TabsContent` unmount tab ẩn)
   nên không thêm gọi API ở tab khác.
3. **`PUT` thay toàn bộ** ⇒ luôn gửi đủ mọi màu đã gắn từ nháp, màu "Chưa gắn" không đưa vào map.
4. **Nạp lại sau xoá ảnh** bằng `reloadToken` tăng *sau* `loadDetail()`, vì backend tự gỡ phần tử trỏ tới slot đã xoá; nháp chưa lưu
   sẽ bị bỏ khi nạp lại (chấp nhận, vì map cũ là sai).
5. **Lưu bị `error.product.colorImageInvalid`** ⇒ api-client toast, rồi tự nạp lại để nháp khớp dữ liệu thật.
6. **Quyền:** không phải `SUPER_ADMIN` thì vẫn xem được nhưng các ô chọn `disabled` và ẩn nút lưu (field không sửa được hiện
   dạng disabled, CONVENTIONS mục 5.3; nút ghi ẩn như các nút ghi khác của modal). Endpoint GET là `[STAFF]` nên mọi role mở được modal đều gọi được.
7. Thumbnail dùng `MediaView` (slot có thể là video), `apiImageUrl` cho URL.

### Giả định tôi tự quyết
- Thumbnail rộng 48px, tỉ lệ 2:3 như lưới ảnh; số ở góc dưới phải là số slot.
- Chuỗi vi/en tự viết (không có trong mockup).
- Màu đứng theo thứ tự backend trả, FE không sắp xếp lại.
- Không dùng `ClickableImage`/lightbox ở thumbnail vì bấm vào là để chọn (cùng lý do ngoại lệ mã QR/ảnh chọn ở CONVENTIONS mục 5).

### Kiểm chứng
- Đã chạy: lint, `tsc -b`, `vite build`.
- Đối chiếu bằng văn bản với `35.1.eloria-backend/docs/api/fe-handoff-phase13_5-admin.md` (backend báo đã đo HTTP thật, hợp đồng không đổi): shape GET/PUT, lỗi, hành vi xoá ảnh khớp với code; thêm `Product.colorImages?` (chỉ đọc). `localhost:8080` vẫn không lên khi kiểm (dev DB cần restart để chạy Liquibase 134) và đăng nhập cần OTP Zalo thật nên không tự đăng nhập được.
- **Chưa làm:** mở trình duyệt xem giao diện; gọi `GET/PUT color-images` thật; kiểm tra xoá ảnh ⇒ nạp lại khối; thử role ADMIN (chỉ đọc);
  xác nhận backend trả đúng shape trong hợp đồng.

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | Chạy thử với API thật khi `eloria-backend` báo sẵn sàng (gắn màu, lưu, xoá ảnh, ADMIN chỉ đọc), ghi vào đây | Cao |
| 2 | Cảnh báo đổi mã màu: cần PO chốt có thêm màn sửa Màu ở admin hay không (hiện không có chỗ để gắn cảnh báo) | Trung bình |
| 3 | Backend trả `imagesBySlot` để bỏ giả định "không có lỗ hổng slot" | Thấp |

## Dữ liệu test còn sót
Không có (chưa gọi API ghi nào).
