# Bàn giao phiên 2026-09-20 — Phase 18: Quản lý Tài khoản ngân hàng (SUPER_ADMIN)

> **Nhánh:** `develop` · **chưa commit** (user chưa yêu cầu)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` xanh
> **Đã kiểm chứng bằng gì:** **API thật** (`localhost:8080`, tài khoản `superadmin`) cho hành vi backend.
> **CHƯA mở UI trên trình duyệt** — chưa chụp màn hình, chưa bấm thử từng nút; mới có lint + build + đọc code.

## Phần 1 — Màn `/bank-accounts`

### File mới / đổi

| File | Đổi gì |
|---|---|
| `src/pages/bank-account/BankAccountPage.tsx` | **Mới.** Bảng + toolbar (tìm keyword, lọc trạng thái) + banner "chưa có TK mặc định" + 3 `ConfirmDialog` |
| `src/pages/bank-account/components/bank-account-columns.tsx` | **Mới.** Cột + THAO TÁC (Chi tiết + menu `(...)`) |
| `src/pages/bank-account/components/bank-account-form-dialog.tsx` | **Mới.** Form Thêm/Sửa (zod: BIN 6 số, độ dài theo DTO); cờ "mặc định" chỉ ở form Thêm |
| `src/pages/bank-account/components/bank-account-detail-modal.tsx` | **Mới.** `DetailModal` xem + sửa tại chỗ |
| `src/i18n/locales/{vi,en}/bankAccount.ts` | **Mới.** Namespace `bankAccount`; đăng ký ở `src/i18n/index.ts` |
| `src/i18n/locales/{vi,en}/errors.ts` | Thêm `error.bankAccount.{notExisted,existed,inactive,noDefault}` |
| `src/i18n/locales/{vi,en}/menu.ts` | `menu.bankAccounts` |
| `src/config/menu.ts` · `src/Router.tsx` | Mục menu nhóm HỆ THỐNG + route bọc `RoleRoute minRole=SUPER_ADMIN` |
| `src/api/bank-account.ts` | `updateStatus` sửa type `BankAccount` → `null` (đo thật: `data: null`), nhận `EntityStatus`; ghi chú cảnh báo tắt/xoá TK mặc định |
| `src/types/bank-account.ts` | Sửa comment "chưa có màn hình" |
| `docs/backend/ngan-hang-qr.md` · `PLAN.md` · `CLAUDE.md` · `docs/history.md` | Đặc tả + đóng Phase 18 |

### Quyết định kỹ thuật đáng nhớ
1. **Chỉ SUPER_ADMIN có màn** — guard cả menu lẫn route (user chốt). `getDefault`/`orderQr` `[STAFF]` không đụng.
2. **Banner "không có mặc định" tính từ `search({status: ACTIVE}, size 100)`, không dùng `GET /default`** —
   `/default` ném `noDefault` ⇒ api-client toast lỗi mỗi lần vào màn. Cái giá: thêm 1 lần gọi `search`
   (body khác nhau, không trùng) ở mỗi lần vào màn/ghi. Trần 100 TK là dư cho một chuỗi cửa hàng.
3. **Cảnh báo chữ đỏ trong `ConfirmDialog` khi tắt/xoá TK đang mặc định** — backend không chặn (đã đo).
   Chọn cảnh báo thay vì chặn hẳn để SUPER_ADMIN vẫn đổi được TK (tắt cái cũ trước rồi đặt cái mới).
4. **Cột MẶC ĐỊNH `enableSorting: false`** dù backend sort `isDefault` trả 200 — sort theo cờ boolean
   không có giá trị (đã có badge + banner).
5. **"Đặt mặc định" ẩn khi TK đã tắt hoặc đã là mặc định** (backend từ chối TK tắt: `error.bankAccount.inactive`).
6. Sửa tại chỗ ở `DetailModal` **không có validate zod** (component dùng chung không hỗ trợ) — dựa vào
   backend (`error.input.invalid`, 400). Form Sửa từ menu `(...)` thì có zod đầy đủ.

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
- Vị trí menu: nhóm **HỆ THỐNG**, sau "Khách hàng"; icon `Landmark`.
- Cột: SỐ TÀI KHOẢN (định danh, ghim) → NGÂN HÀNG (kèm BIN chữ phụ) → CHỦ TK → MẶC ĐỊNH → TRẠNG THÁI → NGÀY TẠO. Không có mockup.
- Mọi cột hiện sẵn (bảng vài dòng, không cột "ít dùng").
- `PAGE_SIZE = 10`.

### Kiểm chứng
**Đã đo API thật (superadmin), dữ liệu đã dọn:**
- Sort `bankName`/`accountNumber`/`accountName`/`status`/`createdDate`/`isDefault` × ASC/DESC ⇒ **12/12 HTTP 200**.
- Tạo trùng `(bankBin, accountNumber)` ⇒ `code 3`, `error.bankAccount.existed`. BIN sai ⇒ 400 `error.input.invalid`.
- `update-status` response `{code:1, data:null}`.
- **Tắt TK đang mặc định thành công** ⇒ `GET /default` ⇒ 400 `error.bankAccount.noDefault`; search không còn dòng nào `isDefault`.
- `set-default` TK đã tắt ⇒ `error.bankAccount.inactive`.

**Chưa kiểm chứng:** UI trình duyệt (bố cục, banner, dialog cảnh báo, guard 403 khi ADMIN/STAFF gõ URL,
nút Tải lại, kẹp trang khi xoá dòng cuối, đủ 4 trạng thái). Không thử với role ADMIN/STAFF.
Không đo `DELETE` trên TK **đang mặc định** (chỉ xoá TK test đã tắt, không mặc định); hành vi "xoá TK mặc định
không bị chặn" vẫn là suy ra từ source `BankAccountServiceImpl.delete`.

## Việc còn lại / cần bạn chốt

| # | Việc | Mức độ |
|---|---|---|
| 1 | Mở `/bank-accounts` bằng `superadmin` và `admin`/`staff` xem tận mắt (UI + 403) | **Nên làm trước khi review** |
| 2 | Backend không chặn tắt/xoá TK mặc định ⇒ có thể xin BE chặn hoặc tự chuyển mặc định sang TK khác (chưa đăng ký mã BE#; dùng skill `request-backend` nếu muốn) | Tuỳ chọn |
| 3 | `error.bankAccount.*` mới thêm vào `errors.ts` — `qr-payment-dialog` bắt mọi lỗi nên không đổi hành vi; nhưng toast lỗi `noDefault` từ nay hiện chữ i18n thay vì `message` của backend | Thấp |

## Dữ liệu test còn sót
Không còn TK test nào hiện ra. TK test `9990001112` (id `91b54d44-…`) đã **xoá mềm** (`status=-1`) nên vẫn
nằm trong bảng DB nhưng không hiện ở API. TK gốc `MB Bank 7680188689999` đã được đặt lại làm mặc định
(đối chiếu bằng `search`: 1 dòng, `isDefault=true`, `status=1`).
