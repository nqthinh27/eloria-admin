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

/** Khoá cấu hình FE đang dùng. Phí ship/freeship không làm (thu thủ công). */
export const SYSTEM_CONFIG_KEY = {
    /** Số tiền hàng để được 1 điểm — số nguyên dương (mặc định 50000). */
    LOYALTY_EARN_AMOUNT_PER_POINT: 'loyalty.earn_amount_per_point',
    /** Giá trị giảm (đ) của 1 điểm — số nguyên dương (mặc định 1000). */
    LOYALTY_REDEEM_RATE: 'loyalty.redeem_rate',
    /** Trần % tiền hàng sau khuyến mại được trừ bằng điểm — số nguyên 0..100 (mặc định 50). */
    LOYALTY_MAX_REDEEM_PERCENT: 'loyalty.max_redeem_percent',
} as const
