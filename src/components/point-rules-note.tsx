import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

import { usePointRules } from '@/hooks/use-point-rules'
import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Chú thích **luật điểm thưởng** cho nhân viên (đặt cạnh ô nhập điểm ở POS và ở tab Lịch sử điểm).
 * Con số lấy từ `GET /points/rules` — không hardcode.
 */
export function PointRulesNote({ className }: { className?: string }) {
    const { t } = useTranslation('point')
    const rules = usePointRules()

    return (
        <div className={cn('bg-muted/50 text-muted-foreground rounded-lg px-3 py-2 text-xs', className)}>
            <p className="text-foreground mb-1 flex items-center gap-1.5 font-medium">
                <Info className="size-3.5" />
                {t('point.rules.title')}
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
                <li>{t('point.rules.earn', { amount: formatVnd(rules.earnAmountPerPoint) })}</li>
                <li>{t('point.rules.redeem', { value: formatVnd(rules.redeemValuePerPoint) })}</li>
                <li>{t('point.rules.maxPercent', { percent: rules.maxRedeemPercent })}</li>
                <li>{t('point.rules.noRefund')}</li>
            </ul>
        </div>
    )
}
