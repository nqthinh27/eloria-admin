import type { EOrderChannel, OrderLineReq } from '@/types/order'
import type { EntityStatus } from '@/types/common'

/**
 * Domain khuyến mại & coupon — **API thật** (backend Phase 9, khảo sát `/v3/api-docs/api`
 * 2026-09-07, đã kiểm thử end-to-end). Nguồn: `35.1.eloria-backend/docs/api/khuyen-mai-p9.md`.
 *
 * ⚠️ **Toàn bộ type cũ dựng ở Phase 6 (mock) đã bị thay** — chúng đoán sai gần hết:
 * `PERCENT_OFF`/`AMOUNT_OFF`/`FIXED_PRICE`/`BUY_X_GET_Y`/`COMBO`/`FLASH_SALE`,
 * `channel: ALL|ONLINE|IN_STORE`, `stackable`, `priority`, `discountValue`, `PromoCode` —
 * **không cái nào tồn tại** ở backend. Đừng khôi phục lại từ git history.
 */

/**
 * `EPromotionType` — backend **chỉ có 2 loại**.
 *
 * ⚠️ MVP không có *đồng giá / mua X tặng Y / combo / flash sale* (mockup `16` có vẽ cột LOẠI với
 * "Mua X tặng Y") — mô hình backend không hỗ trợ, xem PLAN Phase 14.
 */
export const EPromotionType = {
    /** Giảm theo phần trăm, `value` ∈ (0, 100]. */
    PERCENT: 'PERCENT',
    /** Giảm số tiền cố định, `value` > 0. */
    FIXED: 'FIXED',
} as const
export type EPromotionType = (typeof EPromotionType)[keyof typeof EPromotionType]

/**
 * `EPromotionTarget` — phạm vi hàng được tính giảm. `ALL` thì không cần `targetId`.
 * Backend dùng chung enum này cho cả `price/bulk-adjust`.
 */
export const EPromotionTarget = {
    ALL: 'ALL',
    PRODUCT: 'PRODUCT',
    CATEGORY: 'CATEGORY',
    BRAND: 'BRAND',
    SKU: 'SKU',
} as const
export type EPromotionTarget = (typeof EPromotionTarget)[keyof typeof EPromotionTarget]

/**
 * `EPromotionStatus` — **vòng đời chương trình**, KHÔNG phải `EntityStatus` 0/1.
 *
 * ⚠️ Đây là chỗ dễ nhầm nhất của module: mọi module trước dùng `status` số (`1` ACTIVE /
 * `0` INACTIVE / `-1` DELETED), riêng khuyến mại dùng **enum chuỗi 5 giá trị**.
 * `PromotionSearchReq` có **cả hai** field ⇒ lọc theo vòng đời phải dùng `promotionStatus`.
 *
 * **Không có xoá mềm, không có `DELETE`** — kết thúc chương trình = chuyển sang `ENDED`.
 */
export const EPromotionStatus = {
    /** Vừa tạo, chưa có hiệu lực. Backend luôn set `DRAFT` khi `POST /promotion`. */
    DRAFT: 'DRAFT',
    /** Đã lên lịch, chờ tới `startDate`. */
    SCHEDULED: 'SCHEDULED',
    /** Đang chạy — **chỉ trạng thái này mới được engine áp vào đơn**. */
    RUNNING: 'RUNNING',
    /** Tạm dừng, có thể bật lại. */
    PAUSED: 'PAUSED',
    /** Đã kết thúc — trạng thái cuối, không quay lại được. */
    ENDED: 'ENDED',
} as const
export type EPromotionStatus = (typeof EPromotionStatus)[keyof typeof EPromotionStatus]

/**
 * Chuyển trạng thái hợp lệ (backend chặn, sai ⇒ `error.promotion.invalidStatus`).
 * FE dùng bảng này để **chỉ hiện đúng những nút chuyển được**, không để người dùng bấm rồi mới lỗi.
 */
export const PROMOTION_STATUS_TRANSITIONS: Record<EPromotionStatus, EPromotionStatus[]> = {
    DRAFT: ['SCHEDULED', 'RUNNING', 'ENDED'],
    SCHEDULED: ['RUNNING', 'PAUSED', 'ENDED'],
    RUNNING: ['PAUSED', 'ENDED'],
    PAUSED: ['RUNNING', 'ENDED'],
    /** Trạng thái cuối — không chuyển đi đâu được nữa. */
    ENDED: [],
}

/**
 * `PromotionResDTO`.
 *
 * **Một bảng gánh 3 vai** — phân biệt bằng `code` + `customerId`:
 * - `code === null` ⇒ **KM tự động** (engine tự tìm, khách không cần nhập gì).
 * - `code !== null` + `customerId === null` ⇒ **coupon công khai**.
 * - `code !== null` + `customerId !== null` ⇒ **coupon cá nhân** (riêng 1 khách).
 *
 * `branchId === null` ⇒ áp dụng **toàn chuỗi**.
 */
export type Promotion = {
    id: string
    /** `null` ⇒ KM tự động. Có giá trị ⇒ coupon (khách phải nhập mã). */
    code: string | null
    name: string
    type: EPromotionType
    /** `%` khi `PERCENT` (0–100), số tiền khi `FIXED`. */
    value: number
    target: EPromotionTarget
    /** `null` khi `target === 'ALL'`. */
    targetId: string | null
    channel: EOrderChannel
    /** `null` ⇒ toàn chuỗi. */
    branchId: string | null
    branchName: string | null
    /** Ngưỡng tiền tối thiểu của giỏ để KM được áp. `null` ⇒ không ngưỡng. */
    minAmount: number | null
    /** Trần số tiền giảm — chỉ có nghĩa với `PERCENT`. `null` ⇒ không trần. */
    maxDiscount: number | null
    /** Tổng lượt dùng tối đa. `null` ⇒ không giới hạn. */
    usageLimit: number | null
    /** Đã dùng bao nhiêu lượt — cột "ĐÃ DÙNG" của mockup `16`. */
    usageCount: number
    /** Giới hạn lượt trên mỗi khách. `null` ⇒ không giới hạn. */
    perCustomerLimit: number | null
    /** Có giá trị ⇒ coupon cá nhân, chỉ khách này dùng được. */
    customerId: string | null
    status: EPromotionStatus
    startDate: string | null
    endDate: string | null
    createdDate: string
    lastModifiedDate: string
}

/**
 * `PromotionSearchReqDTO`.
 *
 * ⚠️ Có **cả `status` (0/1) lẫn `promotionStatus` (enum)**. Lọc theo vòng đời chương trình
 * **phải dùng `promotionStatus`** — dùng nhầm `status` sẽ ra kết quả vô nghĩa.
 */
export type PromotionSearchReq = {
    keyword?: string
    /** `EntityStatus` 0/1 của bản ghi — **không phải** vòng đời KM. Màn hiện tại không dùng. */
    status?: EntityStatus
    /** Vòng đời chương trình — đây mới là thứ bộ lọc "Trạng thái" của mockup cần. */
    promotionStatus?: EPromotionStatus
    channel?: EOrderChannel
    branchId?: string
}

/**
 * `CreatePromotionReqDTO`. Bắt buộc: `name`, `type`, `value`, `target`, `channel`.
 * Backend luôn tạo ở `DRAFT` — muốn chạy phải gọi `updateStatus` sang `RUNNING`.
 */
export type CreatePromotionReq = {
    /** Bỏ trống ⇒ KM tự động. Điền ⇒ thành coupon dùng mã. */
    code?: string | null
    name: string
    type: EPromotionType
    value: number
    target: EPromotionTarget
    targetId?: string | null
    channel: EOrderChannel
    branchId?: string | null
    minAmount?: number | null
    maxDiscount?: number | null
    usageLimit?: number | null
    perCustomerLimit?: number | null
    customerId?: string | null
    startDate?: string | null
    endDate?: string | null
}

/** `UpdatePromotionReqDTO` — **cùng bộ field** với create (khác `Product`: sửa được cả `code`). */
export type UpdatePromotionReq = CreatePromotionReq

/** `PromotionStatusReqDTO` — body của `POST /promotion/{id}/update-status`. */
export type PromotionStatusReq = {
    status: EPromotionStatus
}

/**
 * `PromotionPreviewReqDTO` — thử áp KM cho một giỏ, **không tiêu thụ quota**.
 * Dùng chung `OrderLineReq` với domain đơn hàng để không lệch shape dòng hàng.
 */
export type PromotionPreviewReq = {
    branchId?: string | null
    /** Mặc định `ONLINE` nếu bỏ trống. */
    channel?: EOrderChannel
    customerId?: string | null
    couponCode?: string | null
    lines: OrderLineReq[]
}

/**
 * `PromotionResultDTO` — kết quả engine **best-one-wins** (mỗi đơn tối đa 1 KM).
 *
 * ⚠️ **Coupon sai KHÔNG báo lỗi**: mã không tồn tại trả `200` với `applied: false` —
 * **y hệt** trường hợp không nhập mã. Backend không phân biệt hai ca này, nên chỗ nào cho
 * người dùng nhập mã thì **FE phải tự báo "mã không hợp lệ"** khi có nhập mà `applied === false`.
 */
export type PromotionResult = {
    applied: boolean
    promotionId: string | null
    promotionName: string | null
    /** Mã của KM được áp; `null` khi KM được áp là loại tự động. */
    code: string | null
    discountAmount: number
}

/**
 * `CouponGenerateReqDTO` — sinh hàng loạt coupon.
 *
 * Mỗi mã là **một dòng `promotion` riêng**, sinh ra đã ở `status = RUNNING`
 * (**khác** KM thường luôn bắt đầu ở `DRAFT`).
 */
export type CouponGenerateReq = {
    name: string
    /** Số mã cần sinh — backend chặn ≤ 5000. */
    count: number
    /** Tiền tố mã; backend nối thêm 8 ký tự ngẫu nhiên phía sau. */
    codePrefix?: string | null
    type: EPromotionType
    value: number
    target: EPromotionTarget
    targetId?: string | null
    channel: EOrderChannel
    branchId?: string | null
    minAmount?: number | null
    maxDiscount?: number | null
    /** Lượt dùng tối đa **của từng mã** (khác `usageLimit` tổng của KM thường). */
    usageLimitPerCode?: number | null
    perCustomerLimit?: number | null
    startDate?: string | null
    endDate?: string | null
}

/** Query của `GET /coupon/export` — trả CSV, xem `couponApi.exportCsv`. */
export type CouponExportQuery = {
    keyword?: string
    promotionStatus?: EPromotionStatus
    channel?: EOrderChannel
    branchId?: string
}
