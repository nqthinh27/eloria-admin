/**
 * Nối URL và chuẩn hoá đường dẫn ảnh — quy ước chung 3 repo (CONVENTIONS, 2026-10-29).
 * Backend có bản Java tương ứng: `CustomStringUtil.normalizeImagePath` / `joinUrl`.
 */

/**
 * Nối base với các đoạn path, bỏ `/` thừa ở chỗ nối: `joinUrl('/v1.0/api/', '/image')` = `/v1.0/api/image`.
 * Không đụng `//` của scheme (`https://`). Đoạn bắt đầu bằng `?` được nối thẳng.
 */
export function joinUrl(base: string, ...parts: string[]): string {
    return parts.reduce((acc, part) => {
        const p = part.trim().replace(/^\/+/, '')
        if (!p) return acc
        return p.startsWith('?') ? `${acc}${p}` : `${acc}/${p}`
    }, base.trim().replace(/\/+$/, ''))
}

/**
 * Dạng chuẩn duy nhất của đường dẫn ảnh backend: `/<thư mục>/<file>` — `\` thành `/`, gộp `//`,
 * đúng 1 `/` đầu, không `/` cuối. `product/a.jpg`, `//product//a.jpg` ⇒ `/product/a.jpg`.
 */
export function normalizeImagePath(path: string): string {
    const p = path.trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '')
    return p.startsWith('/') ? p : `/${p}`
}
