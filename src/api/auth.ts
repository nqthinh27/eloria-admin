import { apiClient } from '@/lib/api-client'
import type {
    ChangePasswordReq,
    ForgotPasswordReq,
    LoginReq,
    LoginRes,
    RelinkSendOtpRes,
    RelinkZaloReq,
    ResetPasswordReq,
    SendOtpReq,
    SendOtpRes,
    UpdateMyProfileReq,
    ZaloLinkInfo,
    ZaloStatusRes,
} from '@/types/auth'
import type { SysUser } from '@/types/common'

/**
 * Service xác thực. Tên/shape lấy từ `/v3/api-docs/api` và contract backend Phase 19
 * (`35.1.eloria-backend/PLAN-storefront.md`) — backend 19a–19c đã đo thật 2026-10-18.
 */
export const authApi = {
    /**
     * `[ANONYMOUS] POST /authenticate/send-otp` — bước 1 đăng nhập.
     *
     * Luôn HTTP 200: sai username/mật khẩu/đang khoá backend vẫn trả `OTP_SENT` y hệt (chống dò tài khoản)
     * ⇒ caller KHÔNG được suy luận gì từ response. Field không áp dụng là `null` (không bị bỏ).
     * 429 = vượt rate-limit (5/phút/username, 20/phút/IP).
     */
    sendLoginOtp(payload: SendOtpReq) {
        return apiClient.post<SendOtpRes>('/authenticate/send-otp', payload, {
            skipErrorToast: true,
            skipAuthRefresh: true,
        })
    },

    /**
     * `[ANONYMOUS] POST /authenticate` — bước 2, `otp` bắt buộc. Mọi thất bại: HTTP 401, subKey `error.login.fail`.
     *
     * Backend chỉ set cookie `refresh_token` khi `rememberMe: true`, nên caller
     * không được phép truyền `false` — xem CONVENTIONS mục 2.
     */
    login(payload: Omit<LoginReq, 'rememberMe'>) {
        return apiClient.post<LoginRes>(
            '/authenticate',
            { ...payload, rememberMe: true } satisfies LoginReq,
            // Màn đăng nhập tự hiện toast với câu lỗi chung — tắt toast mặc định của api-client.
            { skipErrorToast: true, skipAuthRefresh: true },
        )
    },

    /**
     * `[STAFF] POST /logout` — thu hồi refresh token và xoá cookie.
     *
     * Endpoint này BẮT BUỘC có `Authorization`, mà lúc đăng xuất access token
     * thường đã hết hạn ⇒ dễ nhận 401. Vì vậy tắt refresh và tắt toast:
     * caller phải dọn state phía client dù request có hỏng.
     */
    logout() {
        return apiClient.post<null>('/logout', undefined, {
            skipErrorToast: true,
            skipAuthRefresh: true,
        })
    },

    /** `[STAFF] GET /account/me`. */
    me() {
        return apiClient.get<SysUser>('/account/me')
    },

    /**
     * Bản dùng riêng cho lúc khôi phục phiên khi tải trang.
     *
     * Chưa đăng nhập bao giờ thì không có cookie ⇒ `/account/me` trả 401 và refresh
     * cũng hỏng. Đó là đường đi BÌNH THƯỜNG, không phải sự cố, nên phải tắt toast —
     * nếu không người dùng mở app lần đầu đã thấy ngay "Phiên đăng nhập không hợp lệ".
     */
    meSilent() {
        return apiClient.get<SysUser>('/account/me', { skipErrorToast: true })
    },

    /**
     * `[STAFF] PUT /account/me` — sửa hồ sơ của chính mình (Phase 19c).
     * Không đổi được `email`/`username`/`role`/`branchId`/`status` (field lạ ⇒ 400 `error.input.invalid`);
     * SĐT trùng ⇒ `EXISTED` + subKey `error.phone.existed`.
     */
    updateMe(payload: UpdateMyProfileReq) {
        return apiClient.put<SysUser>('/account/me', payload, { skipErrorToast: true })
    },

    /**
     * `[STAFF] POST /sys-user/update-avatar` (multipart, field `file`) — trả URL ảnh mới.
     * Backend giới hạn 5 lần/phút.
     */
    updateAvatar(file: File) {
        const form = new FormData()
        form.append('file', file)
        return apiClient.post<string>('/sys-user/update-avatar', form)
    },

    /**
     * `[ANONYMOUS] POST /forgot-password`.
     * Backend luôn trả thành công dù email có tồn tại hay không (chống dò tài khoản)
     * ⇒ màn hình phải hiển thị thông báo trung tính.
     */
    forgotPassword(payload: ForgotPasswordReq) {
        return apiClient.post<null>('/forgot-password', payload, { skipErrorToast: true })
    },

    /**
     * `[ANONYMOUS] POST /reset-password`.
     * `token` lấy từ query `?token=` của link `clientBaseUrl/reset-password?token=...` trong email.
     */
    resetPassword(payload: ResetPasswordReq) {
        return apiClient.post<null>('/reset-password', payload, { skipErrorToast: true })
    },

    /**
     * `[STAFF] POST /account/change-password`. Thành công ⇒ backend (19a) thu hồi MỌI token, kể cả
     * token hiện tại ⇒ caller phải `logout()` về `/login`.
     */
    changePassword(payload: ChangePasswordReq) {
        return apiClient.post<null>('/account/change-password', payload, { skipErrorToast: true })
    },

    /**
     * `[STAFF] POST /account/zalo/relink/send-otp` — OTP về Zalo HIỆN TẠI (không body).
     * Tài khoản chưa liên kết thì backend không gửi gì ⇒ UI bỏ qua bước OTP.
     */
    relinkSendOtp() {
        return apiClient.post<RelinkSendOtpRes>('/account/zalo/relink/send-otp', undefined, {
            skipErrorToast: true,
        })
    },

    /**
     * `[STAFF] POST /account/zalo/relink` — xác thực lại bằng mật khẩu + OTP Zalo cũ, trả mã liên kết.
     * Sai ⇒ HTTP 400 (cố ý không 401 để không bị đăng xuất) subKey `error.account.reauthFail`.
     */
    relink(payload: RelinkZaloReq) {
        return apiClient.post<ZaloLinkInfo>('/account/zalo/relink', payload, { skipErrorToast: true })
    },

    /** `[STAFF] GET /account/zalo/status` — poll 3s/lần khi chờ đổi Zalo; không trả chat id. */
    zaloStatus(signal?: AbortSignal) {
        return apiClient.get<ZaloStatusRes>('/account/zalo/status', { signal, skipErrorToast: true })
    },
}
