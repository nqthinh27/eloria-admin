/**
 * `GET/PUT /system-config` — cấu hình cấp hệ thống, **chỉ `[SUPER_ADMIN]`**
 * (đo thật 2026-10-11; backend P13, `fe-handoff-phase13-admin.md` mục 1).
 */

/** `SystemConfigResDTO` — một dòng cấu hình. Khoá đã seed sẵn, không tạo thêm qua API. */
export type SystemConfigItem = {
    key: string
    value: string
    description: string | null
}

/** `SystemConfigUpdateReqDTO` — phần tử của mảng body `PUT`. */
export type SystemConfigUpdateItem = {
    key: string
    /**
     * ⚠️ **Không được rỗng/null** — backend `@NotBlank` ⇒ HTTP 400 `error.http.400` (không có subKey).
     * Nghĩa là: đã đặt rồi thì **không thể xoá về "chưa đặt"** qua API, chỉ đổi sang giá trị khác.
     */
    value: string
}

/** Khoá cấu hình FE đang dùng. Các khoá còn lại (phí ship, freeship) thuộc Phase 21 (R3). */
export const SYSTEM_CONFIG_KEY = {
    /** UUID chi nhánh bán online — PDP storefront báo còn/hết hàng theo chi nhánh này. */
    STORE_BRANCH_ID: 'store.branch_id',
} as const
