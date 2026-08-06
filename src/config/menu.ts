import {
    ArrowLeftRight,
    Boxes,
    Building2,
    LayoutGrid,
    LayoutDashboard,
    Package,
    Percent,
    ShoppingCart,
    Store,
    Users,
    type LucideIcon,
} from 'lucide-react'

import { ERole } from '@/types/common'

export type MenuItemType = {
    /** Khoá i18n trong namespace `menu`. */
    titleKey: string
    url: string
    icon: LucideIcon
    /** Bậc role tối thiểu để thấy mục này (CONVENTIONS mục 6.4). */
    minRole: ERole
}

export type MenuGroupType = {
    /** Khoá i18n của tiêu đề nhóm. */
    titleKey: string
    items: MenuItemType[]
}

/**
 * Menu chính — 4 nhóm đúng theo mockup (`design/01`, `04`, `11`…).
 * Thứ tự nhóm và thứ tự mục trong nhóm phải giữ nguyên như thiết kế.
 *
 * `minRole` đặt theo tiền tố `[ROLE]` của API mà màn đó gọi (bảng tra ở CLAUDE.md).
 * Màn chưa có API thì tạm đặt theo mô tả vai trò trong bản thiết kế.
 */
export const mainMenu: MenuGroupType[] = [
    {
        titleKey: 'menu.group.overview',
        items: [
            {
                titleKey: 'menu.dashboard',
                url: '/',
                icon: LayoutDashboard,
                minRole: ERole.STAFF,
            },
        ],
    },
    {
        titleKey: 'menu.group.sales',
        items: [
            { titleKey: 'menu.pos', url: '/pos', icon: Store, minRole: ERole.STAFF },
            { titleKey: 'menu.orders', url: '/orders', icon: ShoppingCart, minRole: ERole.STAFF },
            {
                titleKey: 'menu.returns',
                url: '/returns',
                icon: ArrowLeftRight,
                minRole: ERole.STAFF,
            },
        ],
    },
    {
        titleKey: 'menu.group.system',
        items: [
            // `/staff/*` là `[ADMIN]`, nên STAFF không thấy mục này.
            { titleKey: 'menu.staff', url: '/staff', icon: Building2, minRole: ERole.ADMIN },
            { titleKey: 'menu.customers', url: '/customers', icon: Users, minRole: ERole.STAFF },
        ],
    },
    {
        titleKey: 'menu.group.catalog',
        items: [
            {
                titleKey: 'menu.products',
                url: '/products',
                icon: Package,
                minRole: ERole.SUPER_ADMIN,
            },
            {
                titleKey: 'menu.categories',
                url: '/categories',
                icon: LayoutGrid,
                minRole: ERole.SUPER_ADMIN,
            },
            { titleKey: 'menu.inventory', url: '/inventory', icon: Boxes, minRole: ERole.STAFF },
            {
                titleKey: 'menu.promotions',
                url: '/promotions',
                icon: Percent,
                minRole: ERole.SUPER_ADMIN,
            },
        ],
    },
]

/** Danh sách phẳng — dùng cho breadcrumb và router guard. */
export const allMenuItems: MenuItemType[] = mainMenu.flatMap((group) => group.items)
