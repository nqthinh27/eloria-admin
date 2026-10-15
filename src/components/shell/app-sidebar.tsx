import { ChevronDown, PanelLeftClose, PanelLeftOpen, Shirt } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'

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
 * Nhóm chứa trang đang mở (khớp theo `url`, `/` phải khớp tuyệt đối như `NavLink end`).
 * Dùng làm nhóm mở mặc định lúc mount — ngay sau đăng nhập, location đã là trang đích
 * (`/` cho ADMIN+, `/pos` cho STAFF — xem `RoleRoute redirectTo` ở route-guards.tsx),
 * nên nhóm chứa trang đó tự bung mà không cần biết trước role.
 */
function findActiveGroupKey(pathname: string): string | null {
    const group = mainMenu.find((g) =>
        g.items.some((item) =>
            item.url === '/' ? pathname === '/' : pathname.startsWith(item.url),
        ),
    )
    return group?.titleKey ?? null
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
    const location = useLocation()
    /** Accordion — chỉ 1 nhóm mở tại một thời điểm; mặc định là nhóm chứa trang đang mở. */
    const [openGroupKey, setOpenGroupKey] = useState<string | null>(() =>
        findActiveGroupKey(location.pathname),
    )
    /**
     * Sau đăng nhập, route gốc `/` có thể tự điều hướng tiếp sang trang khác tuỳ role
     * (`RoleRoute redirectTo` — STAFF: `/` → `/pos`, xem route-guards.tsx): redirect này chạy
     * ở effect của `<Navigate>` nên pathname đổi SAU lần render đầu, trong khi state nhóm mở ở
     * trên đã chốt theo pathname cũ. Effect này đồng bộ lại theo pathname mới nhất — nhưng chỉ
     * tới khi người dùng tự bấm đổi nhóm (`userToggledRef`), để không đè lựa chọn của họ.
     */
    const userToggledRef = useRef(false)
    useEffect(() => {
        if (userToggledRef.current) return
        setOpenGroupKey(findActiveGroupKey(location.pathname))
    }, [location.pathname])

    const isMobile = variant === 'mobile'
    const isCollapsed = collapsed && !isMobile

    const toggleGroup = (titleKey: string) => {
        userToggledRef.current = true
        setOpenGroupKey((prev) => (prev === titleKey ? null : titleKey))
    }

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
                        {/*
                         * Icon `Panel*` (khác hẳn `ChevronDown` của nút thu/mở từng nhóm menu bên
                         * dưới) — tránh người dùng lẫn 2 hành động: thu cả sidebar vs. thu 1 nhóm.
                         */}
                        {isCollapsed ? (
                            <PanelLeftOpen className="size-4" />
                        ) : (
                            <PanelLeftClose className="size-4" />
                        )}
                    </Button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-6">
                {visibleGroups.map((group) => {
                    const isGroupOpen = openGroupKey === group.titleKey
                    return (
                        <div key={group.titleKey} className="mb-1">
                            {!isCollapsed && (
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.titleKey)}
                                    aria-expanded={isGroupOpen}
                                    aria-label={t(
                                        isGroupOpen ? 'shell.collapseGroup' : 'shell.expandGroup',
                                        { group: t(group.titleKey) },
                                    )}
                                    className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mb-1 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wider transition-colors">
                                    <span>{t(group.titleKey)}</span>
                                    <ChevronDown
                                        className={cn(
                                            'size-3.5 shrink-0 transition-transform duration-200',
                                            !isGroupOpen && '-rotate-90',
                                        )}
                                    />
                                </button>
                            )}
                            {/*
                             * `grid-template-rows` 0fr↔1fr thay vì max-height: chiều cao tự nhiên của
                             * danh sách không cần đo tay, vẫn animate mượt. Icon-mode (`isCollapsed`)
                             * luôn mở bất kể trạng thái đóng của nhóm, vì khi đó tiêu đề nhóm đã ẩn.
                             */}
                            <div
                                className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                                style={{
                                    gridTemplateRows: isCollapsed || isGroupOpen ? '1fr' : '0fr',
                                }}>
                                <ul className="space-y-0.5 overflow-hidden">
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
                        </div>
                    )
                })}
            </nav>
        </div>
    )
}
