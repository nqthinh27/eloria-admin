import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/*
 * `<StrictMode>` được BẬT (user chốt 2026-08-09).
 *
 * **Không cần tắt khi build production** — React tự loại bỏ toàn bộ hành vi của StrictMode ở bản
 * production: `npm run build` set `NODE_ENV=production`, React dùng `react-dom.production` nên
 * `<StrictMode>` trở thành wrapper rỗng (không chạy effect 2 lần, không cảnh báo, không tốn
 * hiệu năng). Đã kiểm chứng bằng số liệu thật: mở màn `/products` trên `vite preview` (bản build)
 * và `vite dev` đều **8 request như nhau**, không có endpoint nghiệp vụ nào bị lặp.
 *
 * Vì sao giữ bật: ở dev, StrictMode chạy effect 2 lần để lộ effect **không idempotent** — đúng loại
 * bug đã gặp ở Phase 2 (app treo vĩnh viễn sau F5 vì dùng cờ `if (done) return` trong bootstrap
 * phiên; bug đó có ở CẢ production, StrictMode chỉ giúp phát hiện sớm). Repo chưa có test runner
 * nên đây là lớp lưới an toàn tự động duy nhất cho loại lỗi này.
 *
 * ⚠️ Hệ quả cần biết khi soi tab Network lúc dev: request có thể hiện **gấp đôi**. Đó là dấu hiệu
 * effect chưa idempotent (thiếu cleanup/AbortController/nhớ promise) — **hãy sửa effect**, đừng tắt
 * StrictMode để giấu triệu chứng. Muốn đếm số request thật của người dùng cuối thì đo trên bản
 * build: `npm run build && npx vite preview` (đã cấu hình proxy `/v1.0` cho preview trong
 * vite.config.ts).
 */
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
