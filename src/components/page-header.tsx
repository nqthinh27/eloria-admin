import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Tiêu đề màn theo mockup: tên màn + mô tả phụ một dòng bên trái,
 * slot hành động (bộ lọc thời gian, nút xuất dữ liệu…) bên phải.
 */
export function PageHeader({
    title,
    description,
    actions,
    className,
}: {
    title: ReactNode
    description?: ReactNode
    actions?: ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
                className,
            )}>
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                )}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
