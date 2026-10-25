import type { BaseListRes } from '@/types/common'

/** `GET /points/rules` `[STAFF]` — số lấy từ API, đừng hardcode (SUPER_ADMIN đổi qua `system-config`). */
export type PointRules = {
    /** Tiền hàng để được 1 điểm (mặc định 50.000đ). */
    earnAmountPerPoint: number
    /** Giá trị giảm của 1 điểm (mặc định 1.000đ). */
    redeemValuePerPoint: number
    /** Trần % tiền hàng sau KM được trừ bằng điểm (mặc định 50). */
    maxRedeemPercent: number
}

export enum EPointTransactionType {
    EARN = 'EARN',
    REDEEM = 'REDEEM',
    REVERT = 'REVERT',
}

/** Một dòng `point_transaction`. `points` **có dấu** (EARN/REVERT dương, REDEEM âm). */
export type PointTransaction = {
    id: string
    type: EPointTransactionType
    points: number
    /** Số dư ngay sau giao dịch. */
    balanceAfter: number
    /** EARN = tiền hàng đã tính điểm; REDEEM/REVERT = tiền giảm tương ứng. */
    amount: number
    description: string | null
    orderId: string | null
    /** Snapshot — vẫn hiển thị khi đơn bị huỷ. */
    orderCode: string | null
    createdDate: string
}

/** Body chỉ chứa filter; `type` bỏ trống = tất cả. */
export type PointTransactionSearchReq = {
    type?: EPointTransactionType
}

export type PointTransactionList = BaseListRes<PointTransaction>
