/**
 * **Cấu hình lúc chạy** — cho phép đổi biến môi trường ở server mà KHÔNG build lại image.
 *
 * Vì sao cần: image được build ở máy local rồi push lên registry, `docker-compose.yml` chạy ở
 * server chỉ `pull` chứ không `build`. Mà Vite *nướng* `import.meta.env.VITE_*` thành hằng số
 * ngay lúc `vite build` ⇒ tới server thì bundle đã đông cứng, khối `environment` của compose
 * không tác động được nữa.
 *
 * Cách giải: container sinh file `config.js` lúc khởi động (`docker/30-eloria-runtime-config.sh`)
 * từ các biến khai trong compose, `index.html` nạp file này bằng script **thường** (không phải
 * module) nên nó chạy xong trước khi bundle React khởi động.
 *
 * Thứ tự ưu tiên:
 * 1. `window.__ELORIA_CONFIG__[key]` — giá trị từ docker-compose.yml (production)
 * 2. `import.meta.env[key]` — file `.env` lúc dev (`public/config.js` để rỗng nên không che mất)
 * 3. Giá trị mặc định khai trong code (xem `src/config/app.ts`)
 *
 * ⚠️ Khoá **có mặt nhưng rỗng** là giá trị hợp lệ, không phải "chưa khai" — vd
 * `VITE_STORE_HOTLINE: ""` nghĩa là cố ý bỏ trống để hoá đơn lùi về SĐT chi nhánh. Vì vậy chỉ
 * so `undefined`, tuyệt đối không dùng falsy/`||`.
 *
 * ⚠️ `VITE_BASE_URL` **không** nằm ở đây: nó quyết định đường dẫn asset được Vite ghi thẳng vào
 * `index.html` lúc build, đổi lúc chạy là hỏng trang. Đó là tham số build (`--build-arg`).
 */

/** Các biến đổi được lúc chạy. Thêm khoá mới phải khai thêm ở `docker/30-eloria-runtime-config.sh`. */
export type RuntimeEnvKey =
    | 'VITE_APP_NAME'
    | 'VITE_USE_HASH_ROUTE'
    | 'VITE_API_BASE_URL'
    | 'VITE_USE_MOCK'
    | 'VITE_STORE_BRAND_MARK'
    | 'VITE_STORE_HOTLINE'
    | 'VITE_STORE_WEBSITE'
    | 'VITE_STORE_EMAIL'
    | 'VITE_STORE_RETURN_DAYS'

declare global {
    interface Window {
        /** Do `config.js` gán. Vắng mặt khi mở trang bằng file tĩnh không qua container. */
        __ELORIA_CONFIG__?: Partial<Record<RuntimeEnvKey, string>>
    }
}

/** Đọc một biến theo thứ tự ưu tiên ở doc đầu file. `undefined` ⇒ để nơi gọi tự chọn mặc định. */
export function runtimeEnv(key: RuntimeEnvKey): string | undefined {
    const fromContainer = window.__ELORIA_CONFIG__?.[key]
    if (fromContainer !== undefined) return fromContainer
    return import.meta.env[key]
}
