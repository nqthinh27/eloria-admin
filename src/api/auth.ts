import { apiClient } from '@/lib/api-client'
import type {
    ChangePasswordReq,
    ForgotPasswordReq,
    LoginReq,
    LoginRes,
    ResetPasswordReq,
} from '@/types/auth'
import type { SysUser } from '@/types/common'

/**
 * Service xác thực. Toàn bộ endpoint đã có API thật (không mock).
 * Tên/shape lấy từ `/v3/api-docs/api`.
 */
export const authApi = {
    /**
     * `[ANONYMOUS] POST /authenticate`.
     * Backend chỉ set cookie `refresh_token` khi `rememberMe: true`, nên caller
     * không được phép truyền `false` — xem CONVENTIONS mục 2.
     */
    login(payload: Omit<LoginReq, 'rememberMe'>) {
        return apiClient.post<LoginRes>(
            '/authenticate',
            { ...payload, rememberMe: true } satisfies LoginReq,
            // Màn đăng nhập hiển thị lỗi inline trong form, không dùng toast.
            { skipErrorToast: true, skipAuthRefresh: true },
        )
    },

    /**
     * `[CUSTOMER] POST /logout` — thu hồi refresh token và xoá cookie.
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

    /** `[CUSTOMER] GET /account/me`. */
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

    /** `[CUSTOMER] POST /account/change-password`. */
    changePassword(payload: ChangePasswordReq) {
        return apiClient.post<null>('/account/change-password', payload, { skipErrorToast: true })
    },
}
