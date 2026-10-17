import {
    AlarmClock,
    Banknote,
    Bell,
    Boxes,
    Clock,
    PackageMinus,
    ShoppingCart,
    TriangleAlert,
    Undo2,
    type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { ENotificationType } from '@/types/notification'

type IconSpec = { icon: LucideIcon; tone: string }

const NEUTRAL = 'bg-muted text-muted-foreground'
const INFO = 'bg-primary/10 text-primary'
const SUCCESS = 'bg-success-muted text-success'
const WARNING = 'bg-warning-muted text-warning'

const SPECS: Record<string, IconSpec> = {
    [ENotificationType.ORDER_CREATED]: { icon: ShoppingCart, tone: INFO },
    [ENotificationType.ORDER_STATUS_CHANGED]: { icon: ShoppingCart, tone: NEUTRAL },
    [ENotificationType.ORDER_PAID]: { icon: Banknote, tone: SUCCESS },
    [ENotificationType.UNASSIGNED_ORDER_OVERDUE]: { icon: AlarmClock, tone: WARNING },
    [ENotificationType.PAYMENT_UNMATCHED]: { icon: TriangleAlert, tone: WARNING },
    [ENotificationType.LOW_STOCK]: { icon: PackageMinus, tone: WARNING },
    [ENotificationType.SHIFT_OPEN_TOO_LONG]: { icon: AlarmClock, tone: WARNING },
}

/** Theo tiền tố khi `type` chưa khai riêng (`WAREHOUSE_*`, `STOCK_*`, `SHIFT_*`, `RETURN_*`). */
function specFor(type: string): IconSpec {
    if (SPECS[type]) return SPECS[type]
    if (type.startsWith('WAREHOUSE_') || type.startsWith('STOCK_')) return { icon: Boxes, tone: NEUTRAL }
    if (type.startsWith('SHIFT_')) return { icon: Clock, tone: NEUTRAL }
    if (type.startsWith('RETURN_')) return { icon: Undo2, tone: NEUTRAL }
    return { icon: Bell, tone: NEUTRAL }
}

/** Icon tròn theo `type` thông báo; `type` lạ ⇒ chuông mặc định. */
export function NotificationIcon({ type, className }: { type: string; className?: string }) {
    const { icon: Icon, tone } = specFor(type)
    return (
        <span
            aria-hidden="true"
            className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone, className)}>
            <Icon className="size-4" />
        </span>
    )
}
