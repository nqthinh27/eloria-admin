type AppConfigType = {
    /** Tên hiển thị của ứng dụng (logo, tiêu đề trang). */
    name: string
    /** Mô tả ngắn — dùng ở màn đăng nhập. */
    description: string
}

export const appConfig: AppConfigType = {
    name: import.meta.env.VITE_APP_NAME ?? "Eloria Admin",
    description: "Cổng quản trị hệ thống nội bộ",
}

/** Base path khi deploy vào thư mục con — dùng để dựng URL tới asset trong `public/`. */
export const baseUrl = import.meta.env.VITE_BASE_URL ?? ""

/** Base URL của API. Luôn same-origin, xem CONVENTIONS mục 2. */
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/v1.0/api"

/** Bật mock cho các module backend chưa có API (PLAN Phase 6). */
export const useMock = import.meta.env.VITE_USE_MOCK === "true"
