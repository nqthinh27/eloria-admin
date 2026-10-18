# Bàn giao phiên 2026-10-18 — Phase 26: đăng nhập OTP Zalo · menu tài khoản (xong FE, đã nối API thật)

> **Nhánh:** `develop` · **chưa commit** (theo yêu cầu phiên điều phối: không commit/push)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` sạch (chỉ cảnh báo CSS có sẵn).
> **Đã kiểm chứng bằng gì:** (1) UI thật trên `npm run dev` lúc còn mock: hàng OTP → Gửi OTP → modal QR + mã + đếm ngược hiển thị đúng (ảnh QR của PO có hiển thị). (2) Sau khi **gỡ mock** (BE báo 19a–19c xong): curl vào backend của BE (cổng 8081) — `send-otp` sai user trả HTTP 200 `OTP_SENT` đúng shape (field không áp dụng là `null`); `authenticate` sai OTP trả HTTP 401 `error.login.fail`; password <4 ký tự ⇒ 400 `error.input.invalid` (FE hiện câu chung). **Chưa** đăng nhập thành công end-to-end, **chưa** thử 3 modal tài khoản và nút Gỡ liên kết Zalo trên trình duyệt với backend thật — cần OTP Zalo thật của PO.

## ✅ Mock đã gỡ
Ban đầu FE dựng bằng mock (`MOCK-P26`) vì backend chưa có code; sau khi BE báo 19a–19c xong + đo thật, đã xoá `src/mocks/auth-mfa-mock.ts`, cờ `mockAuthMfa`, `VITE_MOCK_AUTH_MFA` và mọi nhánh mock ở `api/auth.ts`, `api/staff.ts`. Hiện **không còn mock nào** của Phase 26 (`grep MOCK-P26` rỗng). `npm run dev` cần backend có Phase 19 + `VITE_API_PROXY_TARGET` trỏ đúng cổng.

## Phần 1 — Phase 26 (9 mục)

### File mới
| File | Vai trò |
|---|---|
| `src/hooks/use-countdown.ts` | `useCountdown()` → `{remaining, start(s), stop}` (mốc kết thúc tuyệt đối, tự dọn interval) + `formatCountdown` |
| `src/components/zalo/zalo-link-instructions.tsx` | Khối QR tĩnh `public/zalo-bot-qr.png` + link **Mở Zalo Bot** + `/otp CODE` + **Sao chép** (fallback chọn text) + đếm ngược + **Lấy mã mới**. Dùng chung đăng nhập và đổi Zalo |
| `src/pages/auth/components/zalo-link-dialog.tsx` | Modal liên kết Zalo ở màn đăng nhập (nút **Tôi đã nhận OTP** ⇒ đóng + focus ô OTP; không poll) |
| `src/components/shell/account/change-password-dialog.tsx` | Đổi mật khẩu ⇒ toast + `logout()` |
| `src/components/shell/account/profile-dialog.tsx` | Tài khoản của tôi (DetailModal: xem → Sửa; đổi ảnh đại diện upload ngay) |
| `src/components/shell/account/zalo-relink-dialog.tsx` | Đổi Zalo: MK + OTP Zalo cũ ⇒ QR ⇒ poll `GET /account/zalo/status` 3s |

### File đổi
| File | Đổi gì |
|---|---|
| `src/types/auth.ts` | `LoginReq.otp`, `SendOtpReq/Res`, `ZaloLinkInfo`, `UpdateMyProfileReq`, `RelinkSendOtpRes`, `RelinkZaloReq`, `ZaloStatusRes` |
| `src/types/common.ts` · `staff.ts` | `SysUser`: `phoneNumber`, `zaloLinked`, `zaloLinkedAt`; `Staff`: `zaloLinked`, `zaloLinkedAt` (BE đã xác nhận cả hai) |
| `src/api/auth.ts` | `sendLoginOtp`, `login(otp)`, `updateMe`, `updateAvatar`, `relinkSendOtp`, `relink`, `zaloStatus` |
| `src/api/staff.ts` · `branch.ts` | `staffApi.resetZalo`; `branchApi.getById(id, signal?)` |
| `src/contexts/AuthProvider.tsx` · `auth-context.ts` | `login(u, p, otp)`; thêm `updateUser(user)` |
| `src/pages/auth/Login.tsx` | Hàng Mã OTP (1 ô + nút Gửi OTP cùng hàng + đếm ngược), nhánh `ZALO_LINK_REQUIRED`, một câu lỗi chung, câu gợi ý khoá cố định |
| `src/components/shell/account-menu.tsx` | +3 mục (UserRound/KeyRound/MessageCircle), modal render ngoài `DropdownMenuContent` |
| `src/components/detail-modal.tsx` | `onSave(values, form)` — truyền thêm `form` để màn gắn lỗi tại ô (tương thích ngược) |
| `src/pages/staff/*` | Menu (...) **Gỡ liên kết Zalo** (ẩn khi `zaloLinked=false`) + `ConfirmDialog`; nhãn Zalo trong `staff-detail-modal` |
| `src/i18n/locales/{vi,en}/{auth,menu,staff,errors}.ts` | Key mới cân VI/EN; `error.login.fail` đổi chữ; thêm `error.account.reauthFail` |
| `docs/backend/README.md` · `CONVENTIONS.md` mục 2 · `CLAUDE.md` · `PLAN.md` | Contract P19, tài khoản test cần OTP thật, trạng thái Phase 26 |

### Quyết định kỹ thuật đáng nhớ
1. **Dựng contract-first bằng mock rồi gỡ khi BE xong** (theo yêu cầu phiên điều phối); mock chỉ chạy ở DEV, đã xoá hết.
2. **Phân loại lỗi đăng nhập:** chỉ tách 429 (câu "thao tác quá nhanh") và lỗi hạ tầng (mạng/timeout/5xx — hiện `error.message`); **mọi thứ còn lại** (kể cả 403 "không phải tài khoản admin" do FE tự chặn CUSTOMER) ⇒ câu chung. Lý do: không để lộ gì về tài khoản; hạ tầng thì người dùng cần biết để thử lại.
3. **Không reset cooldown khi sửa username/mật khẩu** (plan): cooldown backend theo username+IP; reset sẽ hứa gửi được khi backend còn chặn.
4. **Poll đổi Zalo so `zaloLinkedAt` với mốc lúc bắt đầu** (không so đồng hồ client). Dùng chuỗi `setTimeout` nối tiếp (không `setInterval`) để lần poll chậm không chồng nhau; dừng khi đóng modal / mã hết hạn.
5. **`OTP_LENGTH = 6` hằng ở `Login.tsx` và `zalo-relink-dialog.tsx`** (backend `otp-length` không trả trong response; plan nói "theo otp-length"). Cái giá: backend đổi độ dài ⇒ sửa 2 chỗ.
6. **Mở rộng `DetailModal.onSave(values, form)`** thay vì dựng form riêng cho hồ sơ: giữ pattern "xem → Sửa" toàn hệ thống; lỗi SĐT trùng gắn tại ô qua `form.setError`.
7. **Ảnh đại diện upload ngay khi chọn file** (không đợi Lưu), theo `POST /sys-user/update-avatar` (multipart `file`, trả URL). Repo **chưa có `IMAGE_SPEC` cho avatar** ⇒ chỉ kiểm jpg/png/webp ≤2MB.
8. **Tên chi nhánh ở hồ sơ** tra `GET /branch/{id}` (`[STAFF]`) mỗi lần mở modal vì `SysUser` chỉ có `branchId`.

9. **Thông báo ở màn đăng nhập dùng toast** (PO yêu cầu sau khi bàn giao): bỏ `Alert` lỗi và dòng chữ "Đã gửi OTP…" dưới ô OTP; lỗi đăng nhập/gửi OTP ⇒ `toastErrorMessage` (hàm mới ở `lib/toast.ts`), "Đã gửi OTP"/"Hãy liên kết Zalo" ⇒ `toastSuccess`/`toastInfo`. Lỗi validate từng ô (zod) vẫn hiện tại ô. Nội dung câu giữ nguyên (vẫn trung tính, vẫn một câu lỗi chung).

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
- Nút **Gỡ liên kết Zalo** nằm trong menu `(...)` (luật 5.3 cấm nút thứ ba trên cột), **không** bọc `Can` vì cả màn Nhân viên đã là ADMIN+ (route guard); backend vẫn chặn gỡ người cùng/cao bậc.
- Câu gợi ý khoá đặt dưới form dạng chữ thuần (không link) — vì link "Quên mật khẩu?" đã có ở nhãn ô mật khẩu.
- Đổi mật khẩu dùng `PASSWORD_PATTERN` (6–50 ký tự, hoa+thường+ký tự đặc biệt) như màn đặt lại mật khẩu; `PasswordChangeDTO` backend không khai ràng buộc.

### Kiểm chứng
- ✅ lint + build (cả sau khi gỡ mock). ✅ UI thật (lúc còn mock): hàng OTP, nút Gửi OTP, modal QR (ảnh QR của PO hiển thị), mã `/otp ABCD2345`, "Mã hết hạn sau 1:00", nút "Gửi lại (25s)".
- ❌ **Chưa nhìn tận mắt:** đăng nhập thành công; modal Tài khoản/Đổi mật khẩu/Đổi Zalo; nút Gỡ liên kết Zalo ở màn Nhân viên; mobile; bản EN; hết hạn mã ⇒ "Lấy mã mới".

## PO kiểm tay (cần OTP Zalo thật)
1. Đo API đầy đủ bằng skill `update-api-doc` khi PO ra lệnh (hiện mới đối chiếu `send-otp` + lỗi `authenticate`); `botLink` có thể `""` ở dev ⇒ FE ẩn nút Mở Zalo Bot.
2. Đăng nhập: đã liên kết (nhận OTP, nút gửi lại khoá đúng giây backend trả) · chưa liên kết (QR → `/otp <mã>` → OTP → vào app; để mã hết hạn → **Lấy mã mới**).
3. Chụp 2 ca "sai username" vs "sai mật khẩu" ở bước Gửi OTP — phải **không khác chữ nào**; sai 5 lần ⇒ dù đúng vẫn câu chung, không chữ "khoá".
4. Network: không response nào có chat id Zalo; mã liên kết chỉ có trong response `ZALO_LINK_REQUIRED`.
5. Đổi mật khẩu ⇒ toast + về `/login`; tab thứ 2 request kế tiếp bị đẩy về `/login`; sai mật khẩu hiện tại báo tại ô (xác nhận subKey thật là `error.password.incorrect`).
6. Hồ sơ: sửa xong topbar đổi ngay; SĐT trùng báo tại ô (xác nhận subKey chứa `phone`); xác nhận `/account/me` trả `phoneNumber`.
7. Đổi Zalo sang Zalo khác ⇒ modal tự báo thành công (poll 3s); lần login sau OTP về Zalo mới.
8. ADMIN gỡ Zalo nhân viên ⇒ nhân viên đăng nhập thấy modal QR; STAFF không vào được màn.
9. Deploy **cùng đợt** backend 19b (bản FE cũ không đăng nhập được).

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | PO chạy checklist kiểm tay ở trên với Zalo thật | Chặn đóng phase |
| 2 | `IMAGE_SPEC` cho ảnh đại diện (hiện chỉ kiểm định dạng/2MB) | Thấp |
| 3 | `OTP_LENGTH` chưa lấy từ backend — có muốn BE trả `otpLength` trong `SendOtpResDTO`? | Thấp |
| 4 | Câu "Quên mật khẩu?" cố định dưới form có thể đổi thành link nếu PO muốn | Thấp |
