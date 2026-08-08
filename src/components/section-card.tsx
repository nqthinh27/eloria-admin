import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

/**
 * Card khối nội dung dùng chung (biểu đồ, bảng, danh sách…) — tiêu đề + mô tả phụ bên trái,
 * slot action bên phải (ví dụ dropdown chọn kỳ), theo pattern các khối trong `01-dashboard-bao-cao`.
 */
export function SectionCard({
    title,
    description,
    actions,
    children,
    className,
    contentClassName,
}: {
    title?: ReactNode
    description?: ReactNode
    actions?: ReactNode
    children: ReactNode
    className?: string
    contentClassName?: string
}) {
    return (
        <Card className={cn('gap-4 py-5', className)}>
            {(title || actions) && (
                <div className="flex items-start justify-between gap-3 px-6">
                    <div className="min-w-0">
                        {title && <h2 className="font-semibold">{title}</h2>}
                        {description && (
                            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex shrink-0 items-center gap-2">{actions}</div>
                    )}
                </div>
            )}
            <div className={cn('px-6', contentClassName)}>{children}</div>
        </Card>
    )
}
