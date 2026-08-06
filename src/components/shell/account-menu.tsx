import { ChevronDown, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'

/** Viết tắt tên để làm avatar fallback: "Nguyễn Văn A" → "NA". */
function initialsOf(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar + tên + role, dropdown có đăng xuất — theo góc phải top bar của mockup. */
export function AccountMenu() {
    const { t } = useTranslation('menu')
    const { t: tAuth } = useTranslation('auth')
    const { user, logout } = useAuth()

    if (!user) return null

    const roleLabel = t(`role.${user.role}`)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-11 gap-2 px-2">
                    <Avatar className="size-8">
                        {user.imageUrl && <AvatarImage src={user.imageUrl} alt={user.fullName} />}
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                            {initialsOf(user.fullName)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-left leading-tight md:block">
                        <span className="block text-sm font-medium">{user.fullName}</span>
                        <span className="text-muted-foreground block text-xs">{roleLabel}</span>
                    </span>
                    <ChevronDown className="text-muted-foreground size-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => void logout()}>
                    <LogOut className="size-4" />
                    {tAuth('auth.logout')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
