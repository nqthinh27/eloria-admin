import type { EGender, SysUser } from '@/types/common'

/** `LoginReqDTO`. `rememberMe` LUÔN gửi `true` — xem CONVENTIONS mục 2. `otp` bắt buộc từ Phase 19. */
export type LoginReq = {
    username: string
    password: string
    /** OTP 6 số gửi qua Zalo (backend `otp-length`). */
    otp: string
    rememberMe: boolean
}

/** `LoginResDTO` — nằm trong `data` của `BaseResponse`. */
export type LoginRes = {
    accessToken: string
    user: SysUser
}

/** Body bước 1 đăng nhập (`POST /authenticate/send-otp`). */
export type SendOtpReq = {
    username: string
    password: string
}

export const SendOtpStatus = {
    OTP_SENT: 'OTP_SENT',
    ZALO_LINK_REQUIRED: 'ZALO_LINK_REQUIRED',
} as const
export type SendOtpStatus = (typeof SendOtpStatus)[keyof typeof SendOtpStatus]

/**
 * `SendOtpResDTO`. Sai username/mật khẩu/đang khoá backend vẫn trả `OTP_SENT` y hệt ⇒ FE tuyệt đối
 * không suy luận gì từ response này. Mọi số giây lấy từ response (backend đổi được trong `application.yml`).
 */
export type SendOtpRes = {
    status: SendOtpStatus
    resendAfterSeconds: number
    /** Chỉ có ở `OTP_SENT`. */
    otpTtlSeconds: number | null
    /** Chỉ có ở `ZALO_LINK_REQUIRED`: mã 8 ký tự user nhắn `/otp <mã>` cho bot. */
    linkCode: string | null
    linkTtlSeconds: number | null
    /** Link mở chat với bot — có thể rỗng ở môi trường dev. */
    botLink: string | null
}

/** Dữ liệu cần để hiện hướng dẫn liên kết Zalo (đăng nhập lần đầu / đổi Zalo). */
export type ZaloLinkInfo = {
    linkCode: string
    linkTtlSeconds: number
    botLink: string | null
}

/** `ForgotPasswordReqDTO`. */
export type ForgotPasswordReq = {
    email: string
}

/** `ResetPasswordReqDTO` — `token` lấy từ query `?token=` của link trong email. */
export type ResetPasswordReq = {
    token: string
    newPassword: string
}

/** `PasswordChangeDTO`. */
export type ChangePasswordReq = {
    currentPassword: string
    newPassword: string
}

/** `UpdateMyProfileReqDTO` — KHÔNG có email/username/role/branchId/status; field lạ ⇒ 400. */
export type UpdateMyProfileReq = {
    fullName: string
    phoneNumber?: string
    dob?: string
    /** Vắng = giữ nguyên · `null` = xoá · giá trị = ghi (backend `JsonNullable`). */
    gender?: EGender | null
    /** `""` = xoá (backend đổi về `null`). */
    description?: string
}

/** Kết quả `POST /account/zalo/relink/send-otp`. */
export type RelinkSendOtpRes = {
    resendAfterSeconds: number
    otpTtlSeconds: number
}

/** Body `POST /account/zalo/relink` — tài khoản chưa liên kết Zalo chỉ cần mật khẩu (bỏ `otp`). */
export type RelinkZaloReq = {
    currentPassword: string
    otp?: string
}

/** `GET /account/zalo/status` — FE poll 3s/lần khi chờ đổi Zalo; không trả chat id. */
export type ZaloStatusRes = {
    zaloLinked: boolean
    zaloLinkedAt: string | null
}
