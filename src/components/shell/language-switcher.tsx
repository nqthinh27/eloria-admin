import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SUPPORTED_LANGUAGES, changeLanguage, getCurrentLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * Bộ chuyển ngôn ngữ VI/EN.
 *
 * BỔ SUNG NGOÀI MOCKUP — thiết kế không có control này (CONVENTIONS mục 5).
 * Đặt bên trái chuông thông báo, style bám theo các control còn lại của top bar.
 */
export function LanguageSwitcher() {
    const { t } = useTranslation('common')
    const current = getCurrentLanguage()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={t('language.' + current)}
                    title={t('language.' + current)}>
                    <Languages className="size-4.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                        key={lang}
                        onClick={() => void changeLanguage(lang)}
                        className={cn('cursor-pointer', lang === current && 'bg-accent')}>
                        {t(`language.${lang}`)}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
