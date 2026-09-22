/*
 * Cấu hình LÚC CHẠY — xem `src/config/runtime-env.ts`.
 *
 * Bản trong repo cố ý để RỖNG: ở dev, `src/config/runtime-env.ts` sẽ lùi về `.env`
 * (`import.meta.env`). File tồn tại chỉ để `index.html` không 404 khi chạy `npm run dev`.
 *
 * Trong container, file này bị `docker/30-eloria-runtime-config.sh` GHI ĐÈ lúc khởi động
 * bằng các biến khai ở khối `environment` của docker-compose.yml. Đừng sửa tay để cấu hình
 * production — sửa compose.
 */
window.__ELORIA_CONFIG__ = {}
