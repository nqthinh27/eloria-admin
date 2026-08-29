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

/**
 * **Letterhead hoá đơn** — thông tin thương hiệu cấp *hệ thống*, dùng cho bản in
 * (`printInvoice`).
 *
 * ⚠️ Phải khai ở FE vì **backend không trả**: `InvoiceResDTO` chỉ có khối *chi nhánh*
 * (`branchName`/`branchPhone`/`branchAddress`) và javadoc của nó ghi rõ
 * *"letterhead/logo/QR ngân hàng do frontend tự gắn"*.
 *
 * Giá trị mặc định lấy từ storefront `35.3.eloria-client` (`src/lib/constants/site.ts`) để hai
 * project không lệch thương hiệu. Đổi được qua biến môi trường mà không phải build lại code.
 */
export const storeConfig = {
    /**
     * Logo **dạng chữ** (plain text), không phải ảnh — đúng như wordmark của storefront.
     * Khoảng trắng giữa các ký tự là **cố ý**: đó chính là hình thức của logo, không phải lỗi
     * gõ. Giữ nguyên chuỗi này khi in.
     */
    brandMark: import.meta.env.VITE_STORE_BRAND_MARK ?? "é l o r i a",
    /** Hotline chung toàn chuỗi. Bỏ trống ⇒ hoá đơn tự lùi về SĐT chi nhánh. */
    hotline: import.meta.env.VITE_STORE_HOTLINE ?? "0865 698 683",
    website: import.meta.env.VITE_STORE_WEBSITE ?? "eloria.com.vn",
    email: import.meta.env.VITE_STORE_EMAIL ?? "eloria.co.support@gmail.com",
    /** Chính sách đổi trả in ở chân hoá đơn. */
    returnPolicyDays: Number(import.meta.env.VITE_STORE_RETURN_DAYS ?? 7),
} as const
