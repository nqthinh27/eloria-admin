import { Bell, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { AccountMenu } from './account-menu'
import { AppBreadcrumb } from './app-breadcrumb'
import { BranchSelector } from './branch-selector'
import { LanguageSwitcher } from './language-switcher'

/**
 * Top bar theo mockup: breadcrumb bên trái; bên phải là bộ chọn chi nhánh,
 * bộ chuyển ngôn ngữ, chuông thông báo, avatar + tên/role.
 *
 * KHÔNG có cụm tab `STAFF | ADMIN | SA` — đó chỉ là demo của bản thiết kế
 * để người xem đổi vai trò khi review (CONVENTIONS mục 6.4).
 */
export function AppTopbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
    const { t } = useTranslation('menu')

    return (
        <header className="bg-card sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 lg:px-6">
            <Button
                variant="ghost"
                size="icon"
                className="size-9 lg:hidden"
                onClick={onOpenMobileMenu}>
                <Menu className="size-5" />
                <span className="sr-only">{t('shell.openMenu')}</span>
            </Button>

            <div className="min-w-0 flex-1">
                <AppBreadcrumb />
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <BranchSelector />
                <LanguageSwitcher />

                {/* Thông báo — chưa có API, Phase sau nối dữ liệu thật. */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9"
                    title={t('shell.notifications')}>
                    <Bell className="size-4.5" />
                    <span className="sr-only">{t('shell.notifications')}</span>
                </Button>

                <AccountMenu />
            </div>
        </header>
    )
}
