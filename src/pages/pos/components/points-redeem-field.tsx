import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { customerApi } from '@/api/customer'
import { orderApi } from '@/api/order'
import { usePointRules } from '@/hooks/use-point-rules'
import { formatNumber, formatVnd } from '@/lib/format'
import { EPaymentMethod, type Order, type PointsPreview } from '@/types/order'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PointRulesNote } from '@/components/point-rules-note'

/**
 * Ô **dùng điểm thưởng** ở bước thu tiền POS (Phase 16). Chỉ cho nhập khi đơn **gắn khách** và thu
 * bằng tiền mặt/thẻ. Số điểm/tiền hiển thị lấy từ `GET /order/{id}/points-preview` — server là nguồn
 * chân lý (clamp theo số dư + trần %); UI chỉ chặn sớm cho nhân viên đỡ nhập lố.
 *
 * ⚠️ QR/COD **không** trừ điểm ở bước này: QR đóng đơn qua webhook (không đi `POST /payment` có
 * `pointsToRedeem`) và số tiền trên mã QR đã chốt theo `totalAmount` lúc tạo đơn.
 */
export function PointsRedeemField({
    order,
    value,
    onChange,
    disabled,
}: {
    order: Order
    /** Số điểm nhân viên đã nhập (0 = không dùng). */
    value: number
    onChange: (points: number) => void
    disabled?: boolean
}) {
    const { t } = useTranslation('point')
    const rules = usePointRules()
    const customerId = order.customerId
    const methodAllowed =
        order.paymentMethod === EPaymentMethod.CASH || order.paymentMethod === EPaymentMethod.CARD

    const [balance, setBalance] = useState<number | null>(null)
    const [preview, setPreview] = useState<PointsPreview | null>(null)
    const [previewFailed, setPreviewFailed] = useState(false)

    /* Số dư điểm của khách (có sẵn ở `CustomerResDTO.membershipPoint`). */
    useEffect(() => {
        if (!customerId) return
        const controller = new AbortController()
        void customerApi
            .getById(customerId)
            .then((customer) => {
                if (!controller.signal.aborted) setBalance(customer.membershipPoint ?? 0)
            })
            .catch(() => {})
        return () => controller.abort()
    }, [customerId])

    /* `maxRedeemable` (min(số dư, trần %)) — gọi một lần với 0 để biết ngưỡng của đơn này. */
    useEffect(() => {
        if (!customerId || !methodAllowed) return
        const controller = new AbortController()
        orderApi
            .pointsPreview(order.id, 0, controller.signal)
            .then((data) => {
                setPreview(data)
                setBalance(data.balance)
            })
            .catch(() => {})
        return () => controller.abort()
    }, [customerId, methodAllowed, order.id])

    const [serverPreview, setServerPreview] = useState<PointsPreview | null>(null)

    /* Tính thử mỗi khi số điểm đổi (debounce nhẹ). */
    useEffect(() => {
        if (!customerId || !methodAllowed || value <= 0) {
            setServerPreview(null)
            setPreviewFailed(false)
            return
        }
        const controller = new AbortController()
        const timer = window.setTimeout(() => {
            orderApi
                .pointsPreview(order.id, value, controller.signal)
                .then((data) => {
                    setServerPreview(data)
                    setPreviewFailed(false)
                })
                .catch(() => {
                    if (!controller.signal.aborted) {
                        setServerPreview(null)
                        setPreviewFailed(true)
                    }
                })
        }, 300)
        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [customerId, methodAllowed, order.id, value])

    const money = (points: number) => formatVnd(points * rules.redeemValuePerPoint)

    /* Đơn vãng lai: ẩn ô nhập, chỉ báo lý do. */
    if (!customerId) {
        return <p className="text-muted-foreground text-xs">{t('point.pos.guestDisabled')}</p>
    }

    const cap = preview?.maxRedeemable ?? balance ?? 0
    const inputDisabled = disabled || !methodAllowed || cap <= 0

    const handleChange = (raw: string) => {
        const digits = raw.replace(/\D/g, '')
        const next = digits ? Number(digits) : 0
        onChange(Math.min(next, cap))
    }

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="pos-points-redeem">{t('point.pos.title')}</Label>
                {balance !== null && (
                    <span className="text-muted-foreground text-xs">
                        {t('point.pos.balance', {
                            points: formatNumber(balance),
                            money: money(balance),
                        })}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Input
                    id="pos-points-redeem"
                    inputMode="numeric"
                    value={value ? String(value) : ''}
                    onChange={(event) => handleChange(event.target.value)}
                    placeholder={t('point.pos.input')}
                    disabled={inputDisabled}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={inputDisabled}
                    onClick={() => onChange(cap)}>
                    {t('point.pos.useMax')}
                </Button>
                {value > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => onChange(0)}>
                        {t('point.pos.clear')}
                    </Button>
                )}
            </div>

            {!methodAllowed ? (
                <p className="text-muted-foreground text-xs">{t('point.pos.methodDisabled')}</p>
            ) : cap <= 0 && balance !== null ? (
                <p className="text-muted-foreground text-xs">{t('point.pos.noBalance')}</p>
            ) : (
                <p className="text-muted-foreground text-xs">
                    {t('point.pos.max', { points: formatNumber(cap) })}
                </p>
            )}

            {serverPreview && value > 0 && (
                <div className="space-y-0.5 text-sm">
                    <p className="text-destructive">
                        {t('point.pos.discount', {
                            money: formatVnd(serverPreview.pointsDiscount),
                            points: formatNumber(serverPreview.pointsRedeemed),
                        })}
                    </p>
                    {serverPreview.pointsRedeemed !== value && (
                        <p className="text-warning text-xs">
                            {t('point.pos.clamped', { points: formatNumber(serverPreview.pointsRedeemed) })}
                        </p>
                    )}
                    <p className="font-semibold">
                        {t('point.pos.payable', { money: formatVnd(serverPreview.payableAmount) })}
                    </p>
                </div>
            )}
            {previewFailed && (
                <p className="text-warning text-xs">{t('point.pos.previewFailed')}</p>
            )}

            <PointRulesNote />
        </div>
    )
}
