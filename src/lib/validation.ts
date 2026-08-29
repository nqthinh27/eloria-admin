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

/**
 * Chuẩn hoá trường dạng **mã** (`code`/SKU): bỏ khoảng trắng (cả ở giữa) rồi VIẾT HOA.
 *
 * Sao chép nguyên văn `CustomStringUtil.normalizeCode()` phía backend
 * (`input.trim().replaceAll("\s+","").toUpperCase()`, rỗng ⇒ `null`) — backend áp dụng cho
 * `code` lúc create/update của **Brand · Color · Size · Product · Category** từ 2026-08-18.
 *
 * FE áp **cùng luật, ngay lúc gõ**, để người dùng thấy đúng thứ sẽ được lưu: gõ `"sp 003"` mà
 * ô input vẫn hiện `"sp 003"` rồi bản ghi lại ra `SP003` là lệch kỳ vọng — tệ hơn nữa là hai mã
 * chỉ khác hoa/thường sẽ đụng `error.*.codeExisted` mà người dùng không hiểu vì sao.
 */
export function normalizeCode(input: string): string {
    return input.replace(/\s+/g, '').toUpperCase()
}
