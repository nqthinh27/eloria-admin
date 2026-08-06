import { z } from 'zod'

/**
 * Regex sao chép nguyên văn từ constraint của backend (`CreateStaffReqDTO`, `ResetPasswordReqDTO`).
 * Lệch với backend ⇒ form pass nhưng API vẫn 400, nên đổi ở đây phải đối chiếu lại api-docs.
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,50}$/
export const PHONE_PATTERN = /^0\d{9}$/

export const USERNAME_MIN_LENGTH = 6
export const USERNAME_MAX_LENGTH = 50

/**
 * Mật khẩu mới (đăng ký, đặt lại, đổi mật khẩu).
 * `messageKey` là khoá i18n — resolver dịch lúc render, không nhúng chuỗi cứng vào schema.
 */
export function passwordSchema(messageKey = 'auth.validation.passwordRule') {
    return z.string().regex(PASSWORD_PATTERN, messageKey)
}

export function phoneSchema(messageKey: string) {
    return z.string().regex(PHONE_PATTERN, messageKey)
}
