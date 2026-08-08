import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Tông màu chuẩn hoá cho badge trạng thái trong toàn app (PLAN Phase 5):
 * xanh = tốt/hoàn tất, vàng = chờ duyệt, đỏ = lỗi/huỷ, xám = ngừng, xanh dương = thông tin trung tính
 * (ví dụ kênh "Online" ở `04-don-hang`).
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'muted' | 'info'

const TONE_CLASSES: Record<StatusTone, string> = {
    success: 'bg-success-muted text-success',
    warning: 'bg-warning-muted text-warning',
    danger: 'bg-destructive-muted text-destructive',
    muted: 'bg-muted text-muted-foreground',
    info: 'bg-accent text-accent-foreground',
}

export function StatusBadge({
    tone,
    children,
    className,
}: {
    tone: StatusTone
    children: ReactNode
    className?: string
}) {
    return (
        <span
            className={cn(
                'inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                TONE_CLASSES[tone],
                className,
            )}>
            {children}
        </span>
    )
}
