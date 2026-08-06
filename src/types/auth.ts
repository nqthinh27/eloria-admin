import type { SysUser } from '@/types/common'

/** `LoginReqDTO`. `rememberMe` LUÔN gửi `true` — xem CONVENTIONS mục 2. */
export type LoginReq = {
    username: string
    password: string
    rememberMe: boolean
}

/** `LoginResDTO` — nằm trong `data` của `BaseResponse`. */
export type LoginRes = {
    accessToken: string
    user: SysUser
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
