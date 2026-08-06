import { ChevronLeft, ChevronRight, Shirt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { mainMenu } from '@/config/menu'
import { hasRole } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type AppSidebarProps = {
    collapsed: boolean
    onToggleCollapsed: () => void
    /** Trong sheet mobile không hiện nút thu gọn, và bấm menu thì đóng sheet. */
    variant?: 'desktop' | 'mobile'
    onNavigate?: () => void
}

/**
 * Sidebar tối — theo mockup (`design/01`, `04`, `09`…):
 * logo ELORIA + nút thu gọn, menu chia 4 nhóm có tiêu đề viết hoa nhỏ,
 * item đang chọn nền accent bo góc.
 *
 * Mục nào người dùng không đủ bậc role thì **ẩn hẳn** (CONVENTIONS mục 6.4);
 * nhóm rỗng cũng không render tiêu đề.
 */
export function AppSidebar({
    collapsed,
    onToggleCollapsed,
    variant = 'desktop',
    onNavigate,
}: AppSidebarProps) {
    const { t } = useTranslation('menu')
    const { user } = useAuth()

    const isMobile = variant === 'mobile'
    const isCollapsed = collapsed && !isMobile

    const visibleGroups = mainMenu
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => hasRole(user?.role, item.minRole)),
        }))
        .filter((group) => group.items.length > 0)

    return (
        <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
            {/* Logo + nút thu gọn */}
            <div
                className={cn(
                    'flex h-16 shrink-0 items-center gap-2 px-4',
                    isCollapsed && 'justify-center px-2',
                )}>
                {/* Khi thu gọn, logo nhường chỗ cho nút mở rộng nên ẩn đi. */}
                {!isCollapsed && (
                    <>
                        <span className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-white">
                            <Shirt className="size-4.5" />
                        </span>
                        <span className="text-base font-semibold tracking-wide text-white">
                            ELORIA
                        </span>
                    </>
                )}

                {/*
                 * Nút thu gọn/mở rộng phải nằm NGOÀI nhánh `!isCollapsed`.
                 * Nếu bọc nó vào trong, thu gọn xong là nút biến mất và không còn cách nào
                 * mở lại sidebar — người dùng kẹt cho tới khi tải lại trang.
                 */}
                {!isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleCollapsed}
                        aria-label={isCollapsed ? t('shell.expandSidebar') : t('shell.toggleSidebar')}
                        title={isCollapsed ? t('shell.expandSidebar') : t('shell.toggleSidebar')}
                        className={cn(
                            'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground size-8 shrink-0',
                            !isCollapsed && 'ml-auto',
                        )}>
                        {isCollapsed ? (
                            <ChevronRight className="size-4" />
                        ) : (
                            <ChevronLeft className="size-4" />
                        )}
                    </Button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-6">
                {visibleGroups.map((group) => (
                    <div key={group.titleKey} className="mb-5">
                        {!isCollapsed && (
                            <p className="text-sidebar-foreground/40 mb-2 px-3 text-[11px] font-semibold tracking-wider">
                                {t(group.titleKey)}
                            </p>
                        )}
                        <ul className="space-y-0.5">
                            {group.items.map((item) => (
                                <li key={item.url}>
                                    <NavLink
                                        to={item.url}
                                        end={item.url === '/'}
                                        onClick={onNavigate}
                                        title={isCollapsed ? t(item.titleKey) : undefined}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                                                '[&>svg]:size-4.5 [&>svg]:shrink-0',
                                                isCollapsed && 'justify-center px-2',
                                                isActive
                                                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                                                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                            )
                                        }>
                                        <item.icon />
                                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>
        </div>
    )
}
