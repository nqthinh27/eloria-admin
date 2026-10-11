/**
 * Chữa lỗi "Failed to fetch dynamically imported module" khi tab mở từ bản cũ bấm sang màn chưa tải
 * (file chunk hash cũ đã bị xoá sau deploy). Vite bắn `vite:preloadError` ⇒ reload **một lần** để
 * lấy `index.html` + bundle mới.
 *
 * Cờ ở `sessionStorage` chống vòng lặp: bản mới vẫn lỗi (mạng, server hỏng) thì không reload mãi —
 * để lỗi hiện ra như bình thường. Cờ được xoá khi trang đã chạy ổn đủ lâu.
 */
const RELOAD_FLAG = 'eloria-preload-reloaded'
/** Sau ngần này ms chạy không lỗi ⇒ coi như reload đã thành công, cho phép tự chữa lần sau. */
const RESET_AFTER_MS = 10_000

export function installStaleBundleGuard() {
    window.addEventListener('vite:preloadError', (event) => {
        let alreadyReloaded = false
        try {
            alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
            if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, '1')
        } catch {
            // sessionStorage bị chặn ⇒ không có cờ chống lặp ⇒ thà không tự reload.
            return
        }
        if (alreadyReloaded) return
        // Chặn Vite ném lỗi lên UI — sắp reload rồi.
        event.preventDefault()
        window.location.reload()
    })

    window.setTimeout(() => {
        try {
            sessionStorage.removeItem(RELOAD_FLAG)
        } catch {
            // bỏ qua
        }
    }, RESET_AFTER_MS)
}
