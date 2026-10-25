import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { pointApi } from '@/api/point'
import { formatNumber, formatVnd } from '@/lib/format'
import { EOrderStatus, type Order } from '@/types/order'
import { EPointTransactionType } from '@/types/point'

/**
 * Hai dòng điểm thưởng trong khối tiền của chi tiết đơn (Phase 16).
 * - **Điểm đã trừ**: `pointsRedeemed`/`pointsDiscount` của `OrderResDTO` (tiền đã nằm trong `discountAmount`).
 * - **Điểm đã tích** (đơn `COMPLETED` có khách): `OrderResDTO` không có field này ⇒ tra dòng `EARN`
 *   của đơn trong lịch sử điểm khách (50 giao dịch EARN mới nhất — đơn quá cũ sẽ hiện "chưa ghi nhận").
 */
export function OrderPointsRows({ order }: { order: Order }) {
    const { t } = useTranslation('point')
    const [earned, setEarned] = useState<number | null | undefined>(undefined)

    const eligible = order.status === EOrderStatus.COMPLETED && !!order.customerId

    useEffect(() => {
        if (!eligible || !order.customerId) return
        const controller = new AbortController()
        setEarned(undefined)
        pointApi
            .searchByCustomer(
                order.customerId,
                { type: EPointTransactionType.EARN },
                { page: 1, size: 50, sort: ['createdDate,desc'] },
                controller.signal,
            )
            .then((res) => {
                const hit = (res.data ?? []).find((row) => row.orderId === order.id)
                setEarned(hit ? hit.points : null)
            })
            .catch(() => {
                if (!controller.signal.aborted) setEarned(null)
            })
        return () => controller.abort()
    }, [eligible, order.customerId, order.id])

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
            {eligible && earned !== undefined && (
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('point.order.earned')}</dt>
                    <dd className="tabular-nums">
                        {earned === null
                            ? t('point.order.earnedUnknown')
                            : t('point.order.earnedValue', { points: formatNumber(earned) })}
                    </dd>
                </div>
            )}
        </>
    )
}
