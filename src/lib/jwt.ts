/**
 * Đọc `exp` của JWT **chỉ để đoán token còn dùng được không** (không xác thực chữ ký — việc đó
 * của backend). Token không giải mã được ⇒ coi như chưa biết hạn.
 */

/** `exp` (giây epoch) của JWT; `null` nếu không đọc được. */
export function readJwtExpiry(token: string): number | null {
    const payload = token.split('.')[1]
    if (!payload) return null
    try {
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
        const json = decodeURIComponent(
            Array.from(atob(padded), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
        )
        const exp = (JSON.parse(json) as { exp?: unknown }).exp
        return typeof exp === 'number' ? exp : null
    } catch {
        return null
    }
}

/**
 * `true` khi token đã hết hạn hoặc sẽ hết trong `skewSeconds` tới.
 * Không đọc được hạn ⇒ `false` (cứ thử, backend sẽ báo nếu sai).
 */
export function isTokenExpiringSoon(token: string, skewSeconds = 60, nowMs = Date.now()): boolean {
    const exp = readJwtExpiry(token)
    if (exp === null) return false
    return exp * 1000 - nowMs <= skewSeconds * 1000
}
