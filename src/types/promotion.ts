import type { SearchReq } from '@/types/common'

/** Loại khuyến mại theo cột "LOẠI" của `16-khuyen-mai.png` + PLAN Phase 14. */
export const EPromotionType = {
    PERCENT_OFF: 'PERCENT_OFF',
    AMOUNT_OFF: 'AMOUNT_OFF',
    FIXED_PRICE: 'FIXED_PRICE',
    BUY_X_GET_Y: 'BUY_X_GET_Y',
    COMBO: 'COMBO',
    FLASH_SALE: 'FLASH_SALE',
} as const
export type EPromotionType = (typeof EPromotionType)[keyof typeof EPromotionType]

/** Kênh áp dụng theo cột "KÊNH": Tất cả / Online / Tại quầy. */
export const EPromotionChannel = {
    ALL: 'ALL',
    ONLINE: 'ONLINE',
    IN_STORE: 'IN_STORE',
} as const
export type EPromotionChannel = (typeof EPromotionChannel)[keyof typeof EPromotionChannel]

/** Trạng thái suy ra từ khoảng thời gian — backend tính sẵn để FE không tự so ngày. */
export const EPromotionStatus = {
    UPCOMING: 'UPCOMING',
    RUNNING: 'RUNNING',
    ENDED: 'ENDED',
} as const
export type EPromotionStatus = (typeof EPromotionStatus)[keyof typeof EPromotionStatus]

/** `PromotionResDTO` — chưa có API (PLAN Phase 6), theo `16-khuyen-mai.png`. */
export type Promotion = {
    id: string
    code: string
    name: string
    type: EPromotionType
    /** `%` cho `PERCENT_OFF`, số tiền cho `AMOUNT_OFF`/`FIXED_PRICE`, `null` cho các loại khác. */
    discountValue: number | null
    channel: EPromotionChannel
    startDate: string
    endDate: string
    usageCount: number
    /** Cho phép cộng dồn với khuyến mại khác — PLAN Phase 14 "quy tắc chồng khuyến mại". */
    stackable: boolean
    priority: number
    status: EPromotionStatus
}

export type PromotionSearchReq = SearchReq & {
    promotionStatus?: EPromotionStatus
    promotionType?: EPromotionType
}

export type PromotionPayload = {
    name: string
    type: EPromotionType
    discountValue?: number
    channel: EPromotionChannel
    startDate: string
    endDate: string
    stackable: boolean
    priority: number
}

/** `PromoCodeResDTO` — mã giảm giá sinh hàng loạt thuộc 1 chương trình. */
export type PromoCode = {
    id: string
    promotionId: string
    code: string
    usageLimit: number
    usedCount: number
    expiryDate: string
}

export type GeneratePromoCodesPayload = {
    promotionId: string
    quantity: number
    usageLimit: number
    expiryDate: string
}
