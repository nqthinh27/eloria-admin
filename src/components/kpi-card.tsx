import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type KpiTrend = {
    /** % so với kỳ trước, dương = tăng (xanh), âm = giảm (đỏ) — theo `01-dashboard-bao-cao`. */
    percent: number
    label: string
}

/** Thẻ số liệu ở hàng KPI đầu Dashboard (PLAN Phase 5, theo `01-dashboard-bao-cao.png`). */
export function KpiCard({
    label,
    value,
    icon: Icon,
    iconClassName,
    description,
    trend,
    className,
}: {
    label: ReactNode
    value: ReactNode
    icon: LucideIcon
    /** Màu icon/nền ô vuông — mỗi KPI một tông theo mockup (xanh dương/xanh lá/tím/vàng). */
    iconClassName?: string
    description?: ReactNode
    trend?: KpiTrend
    className?: string
}) {
    return (
        <Card className={cn('gap-3 py-5', className)}>
            <div className="flex items-start justify-between px-6">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {label}
                </p>
                <span
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground',
                        iconClassName,
                    )}>
                    <Icon className="size-4.5" />
                </span>
            </div>

            <div className="px-6">
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                {description && (
                    <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                )}
                {trend && (
                    <p
                        className={cn(
                            'mt-2 flex items-center gap-1 text-sm font-medium',
                            trend.percent >= 0 ? 'text-success' : 'text-destructive',
                        )}>
                        {trend.percent >= 0 ? (
                            <TrendingUp className="size-4" />
                        ) : (
                            <TrendingDown className="size-4" />
                        )}
                        {trend.percent >= 0 ? '+' : ''}
                        {trend.percent}% {trend.label}
                    </p>
                )}
            </div>
        </Card>
    )
}
