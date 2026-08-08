import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

/**
 * Hàng search + filter + action phía trên bảng (theo `04-don-hang`, `07-nhan-vien`): ô tìm kiếm
 * và các control filter (Select trạng thái/vai trò…) bên trái, các nút hành động (`actions`, ví dụ
 * "Thêm nhân viên") cùng hàng ngang bên phải. Không hiển thị tổng số bản ghi ở đây — con số đó đã
 * có trong phần phân trang của `DataTable` (rule chốt cùng user 2026-08-09).
 */
export function DataTableToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    filters,
    actions,
    className,
}: {
    searchValue: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    filters?: ReactNode
    actions?: ReactNode
    className?: string
}) {
    const { t } = useTranslation('common')

    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder ?? t('dataTable.searchPlaceholder')}
                        className="pl-9"
                    />
                </div>
                {filters}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    )
}
