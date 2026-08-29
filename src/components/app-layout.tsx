import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar } from '@/components/shell/app-sidebar'
import { AppTopbar } from '@/components/shell/app-topbar'
import { BranchProvider } from '@/contexts/BranchProvider'
import { cn } from '@/lib/utils'

/**
 * Khung ứng dụng: sidebar tối cố định bên trái + top bar + vùng nội dung.
 *
 * Responsive (CONVENTIONS mục 5): từ `lg` sidebar cố định và thu gọn được;
 * dưới `lg` sidebar chuyển thành sheet mở bằng nút hamburger trên top bar.
 */
export function AppLayout() {
    const { t } = useTranslation('menu')
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <BranchProvider>
            {/*
              * `h-dvh` (không phải `min-h-screen`) để chuỗi chiều cao có mốc rõ ràng: màn nào cần
              * khoá cao vừa viewport chỉ việc dùng `h-full` thay vì tự trừ tay chiều cao topbar
              * (màn POS cần khối tổng tiền luôn thấy, không phải cuộn). `dvh` để trên mobile
              * thanh địa chỉ trượt không làm hụt đáy. Nội dung dài giờ cuộn trong `<main>`.
              */}
            <div className="bg-background flex h-dvh overflow-hidden">
                {/* Sidebar desktop */}
                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-40 hidden shrink-0 transition-[width] duration-200 lg:block',
                        collapsed ? 'w-[72px]' : 'w-64',
                    )}>
                    <AppSidebar
                        collapsed={collapsed}
                        onToggleCollapsed={() => setCollapsed((v) => !v)}
                    />
                </aside>

                {/* Sidebar mobile */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="w-64 border-none p-0">
                        <SheetTitle className="sr-only">{t('shell.openMenu')}</SheetTitle>
                        <AppSidebar
                            variant="mobile"
                            collapsed={false}
                            onToggleCollapsed={() => {}}
                            onNavigate={() => setMobileOpen(false)}
                        />
                    </SheetContent>
                </Sheet>

                {/* Vùng nội dung — chừa chỗ cho sidebar cố định */}
                <div
                    className={cn(
                        'flex min-w-0 flex-1 flex-col transition-[padding] duration-200',
                        collapsed ? 'lg:pl-[72px]' : 'lg:pl-64',
                    )}>
                    <AppTopbar onOpenMobileMenu={() => setMobileOpen(true)} />
                    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </BranchProvider>
    )
}
