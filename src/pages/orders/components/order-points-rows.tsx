import { useTranslation } from 'react-i18next'

import { formatNumber, formatVnd } from '@/lib/format'
import type { Order } from '@/types/order'

/**
 * Hai dòng điểm thưởng trong khối tiền của chi tiết đơn (Phase 16).
 * - **Điểm đã trừ**: `pointsRedeemed`/`pointsDiscount` của `OrderResDTO` (tiền đã nằm trong `discountAmount`).
 * - **Điểm đã tích**: `pointsEarned` của `OrderResDTO`; `pointsEarnedEstimated` ⇒ ghi "dự kiến";
 *   `null`/`0` ⇒ ẩn dòng.
 */
export function OrderPointsRows({ order }: { order: Order }) {
    const { t } = useTranslation('point')

    return (
        <>
            {!!order.pointsRedeemed && (
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('point.order.redeemed')}</dt>
                    <dd className="text-destructive tabular-nums">
                        {t('point.order.redeemedValue', {
                            points: formatNumber(order.pointsRedeemed),
                            money: formatVnd(order.pointsDiscount ?? 0),
                        })}
                    </dd>
                </div>
            )}
            {!!order.pointsEarned && (
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                        {order.pointsEarnedEstimated ? t('point.order.earnedEstimated') : t('point.order.earned')}
                    </dt>
                    <dd className="tabular-nums">
                        {t('point.order.earnedValue', { points: formatNumber(order.pointsEarned) })}
                    </dd>
                </div>
            )}
        </>
    )
}
