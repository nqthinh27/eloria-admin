import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { allMenuItems } from '@/config/menu'

/**
 * Breadcrumb "Trang chủ › Tên màn" theo mockup.
 * Tên màn tra từ `allMenuItems` nên không phải khai báo lại ở từng trang.
 */
export function AppBreadcrumb() {
    const { t } = useTranslation('menu')
    const { pathname } = useLocation()

    // Khớp URL dài nhất để route con (`/staff/123`) vẫn ra đúng tên màn cha.
    const current = allMenuItems
        .filter((item) => item.url !== '/' && pathname.startsWith(item.url))
        .sort((a, b) => b.url.length - a.url.length)[0]

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    {current ? (
                        <BreadcrumbLink asChild>
                            <Link to="/">{t('shell.home')}</Link>
                        </BreadcrumbLink>
                    ) : (
                        <BreadcrumbPage>{t('shell.home')}</BreadcrumbPage>
                    )}
                </BreadcrumbItem>
                {current && (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t(current.titleKey)}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </>
                )}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
