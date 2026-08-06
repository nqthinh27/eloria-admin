/**
 * Nơi giữ access token — **chỉ trong bộ nhớ** (CONVENTIONS mục 2).
 *
 * Tuyệt đối KHÔNG ghi token xuống `localStorage`/`sessionStorage`/cookie.
 * Reload trang ⇒ mất token ⇒ khôi phục phiên bằng `POST /refresh` (cookie `refresh_token`
 * do backend quản lý). Refresh token không bao giờ đi qua JS.
 *
 * Tách khỏi AuthContext để `api-client` đọc được token mà không tạo import vòng.
 */

let accessToken: string | null = null

/** Gọi khi bị 401 không cứu được — dọn phiên rồi đá về màn đăng nhập. */
let onSessionExpired: (() => void) | null = null

export function getAccessToken(): string | null {
    return accessToken
}

export function setAccessToken(token: string | null): void {
    accessToken = token
}

export function clearAccessToken(): void {
    accessToken = null
}

/** AuthContext (Phase 2) đăng ký handler dọn state + điều hướng `/login`. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
    onSessionExpired = handler
}

export function notifySessionExpired(): void {
    clearAccessToken()
    onSessionExpired?.()
}
