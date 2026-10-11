import { baseUrl } from '@/config/app'

/**
 * Phát hiện "đã có bản deploy mới" cho tab admin đang mở (PLAN Phase 24 mục 5).
 *
 * Build sinh `version.json` (`{ version }`, nginx `no-store`) cùng mã `__APP_VERSION__` nhúng trong
 * bundle. Tab thấy hai mã lệch nhau ⇒ bundle đang chạy là bản cũ.
 *
 * ⚠️ Đây là **file tĩnh của chính app**, không phải API backend nên không đi qua `api-client`
 * (api-client lo Bearer/refresh/`BaseResponse` — không liên quan ở đây) — ngoại lệ có chủ đích của
 * quy tắc "cấm fetch ngoài api-client" (CONVENTIONS mục 4).
 */

/** Mã phiên bản của bundle đang chạy. */
export const CURRENT_VERSION: string = __APP_VERSION__

/**
 * Mã phiên bản đang được server phục vụ; `null` khi không đọc được (dev server không có file này,
 * mất mạng, bị chặn…) — caller coi như "không biết", **không** coi là có bản mới.
 */
export async function fetchServerVersion(signal?: AbortSignal): Promise<string | null> {
    try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/version.json?t=${Date.now()}`, {
            cache: 'no-store',
            signal,
        })
        if (!response.ok) return null
        // Host SPA có thể trả `index.html` cho file không tồn tại ⇒ không phải JSON.
        const body: unknown = await response.json()
        if (typeof body === 'object' && body !== null && 'version' in body) {
            const { version } = body as { version: unknown }
            return typeof version === 'string' && version ? version : null
        }
        return null
    } catch {
        return null
    }
}
