import { runtimeEnv } from './runtime-env'

type AppConfigType = {
    /** Tên hiển thị của ứng dụng (logo, tiêu đề trang). */
    name: string
    /** Mô tả ngắn — dùng ở màn đăng nhập. */
    description: string
}

export const appConfig: AppConfigType = {
    name: runtimeEnv('VITE_APP_NAME') ?? "Eloria Admin",
    description: "Cổng quản trị hệ thống nội bộ",
}

/**
 * Base path khi deploy vào thư mục con — dùng để dựng URL tới asset trong `public/`.
 *
 * ⚠️ **Build-time**, không đổi được lúc chạy: Vite ghi đường dẫn asset thẳng vào `index.html`
 * lúc build. Muốn đổi phải build lại image với `--build-arg VITE_BASE_URL=...`.
 */
export const baseUrl = import.meta.env.VITE_BASE_URL ?? ""

/** Base URL của API. Luôn same-origin, xem CONVENTIONS mục 2. */
export const apiBaseUrl = runtimeEnv('VITE_API_BASE_URL') ?? "/v1.0/api"

/** Bật mock cho các module backend chưa có API (PLAN Phase 6). */
export const useMock = runtimeEnv('VITE_USE_MOCK') === "true"

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
    brandMark: runtimeEnv('VITE_STORE_BRAND_MARK') ?? "é l o r i a",
    /** Hotline chung toàn chuỗi. Bỏ trống ⇒ hoá đơn tự lùi về SĐT chi nhánh. */
    hotline: runtimeEnv('VITE_STORE_HOTLINE') ?? "0865 698 683",
    website: runtimeEnv('VITE_STORE_WEBSITE') ?? "eloria.com.vn",
    email: runtimeEnv('VITE_STORE_EMAIL') ?? "eloria.co.support@gmail.com",
    /** Chính sách đổi trả in ở chân hoá đơn. */
    returnPolicyDays: Number(runtimeEnv('VITE_STORE_RETURN_DAYS') ?? 7),
} as const
