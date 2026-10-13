import { resolveImageSrc } from '@/lib/image-spec'

/**
 * Chuyển đổi `src` ảnh trong HTML thân bài giữa **dạng lưu** và **dạng hiển thị ở admin**.
 *
 * Backend lưu ảnh chèn trong bài là đường dẫn tương đối `/post/<file>` (`content-image`) và
 * **chỉ chấp nhận đúng dạng đó** khi sanitize. Nhưng trình duyệt ở admin không phục vụ `/post/*`,
 * ảnh phải đi qua `GET /image?imageUrl=…` mới hiện được. Hai hàm này đảo qua lại:
 *
 * - `toDisplayHtml`: dạng lưu → dạng hiển thị (nạp vào editor / khung xem trước).
 * - `toStoredHtml`: dạng hiển thị → dạng lưu (trước khi gửi API).
 */
const STORED_IMG = /(<img\b[^>]*?\bsrc=")(\/post\/[^"]+)(")/gi
const DISPLAY_IMG = /(<img\b[^>]*?\bsrc=")[^"]*?\/image\?imageUrl=([^"&]+)(")/gi

export function toDisplayHtml(html: string): string {
    return html.replace(STORED_IMG, (_m, head: string, src: string, tail: string) => {
        return `${head}${resolveImageSrc(src)}${tail}`
    })
}

export function toStoredHtml(html: string): string {
    return html.replace(DISPLAY_IMG, (_m, head: string, encoded: string, tail: string) => {
        try {
            return `${head}${decodeURIComponent(encoded)}${tail}`
        } catch {
            return `${head}${encoded}${tail}`
        }
    })
}

/** `href` hợp lệ theo whitelist backend: `http(s)://`, `mailto:`, `tel:`, `/path` (không `//`), `#anchor`. */
export function isAllowedHref(value: string): boolean {
    return /^(https?:\/\/\S+|mailto:\S+|tel:\S+|\/(?!\/)\S*|#\S+)$/i.test(value)
}
