import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

export type PillTabItem = {
    value: string
    label: ReactNode
}

/**
 * Danh sách tab dạng pill ngay dưới tiêu đề màn (`07-nhan-vien`, `08-chi-nhanh`, `09-phan-quyen`) —
 * CONVENTIONS mục 6.3: "không dùng tab gạch chân". Đặt bên trong `<Tabs>` của shadcn,
 * chỉ thay style của `TabsList`/`TabsTrigger` cho khớp mockup (nền trắng bo tròn, tab chọn nền primary).
 */
export function PillTabs({ items, className }: { items: PillTabItem[]; className?: string }) {
    return (
        <TabsList
            className={cn(
                'bg-card h-auto gap-1 rounded-xl border p-1.5 shadow-sm',
                className,
            )}>
            {items.map((item) => (
                <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={cn(
                        'rounded-lg px-4 py-2 text-sm font-medium',
                        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none',
                    )}>
                    {item.label}
                </TabsTrigger>
            ))}
        </TabsList>
    )
}
