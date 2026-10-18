import { useState } from 'react'
import { ChevronDown, KeyRound, LogOut, MessageCircle, UserRound } from 'lucide-react'
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
import { ChangePasswordDialog } from './account/change-password-dialog'
import { ProfileDialog } from './account/profile-dialog'
import { ZaloRelinkDialog } from './account/zalo-relink-dialog'

/** Viết tắt tên để làm avatar fallback: "Nguyễn Văn A" → "NA". */
function initialsOf(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type AccountDialog = 'profile' | 'changePassword' | 'relinkZalo'

/**
 * Avatar + tên + role, dropdown: Tài khoản của tôi · Đổi mật khẩu · Đổi Zalo nhận OTP · Đăng xuất.
 *
 * 3 modal render **ngoài** `DropdownMenuContent` (anh em với `DropdownMenu`) — nằm trong content thì
 * bị gỡ khỏi DOM ngay khi dropdown đóng và modal biến mất cùng lúc. State mở modal ở đây.
 */
export function AccountMenu() {
    const { t } = useTranslation('menu')
    const { t: tAuth } = useTranslation('auth')
    const { user, logout } = useAuth()
    const [dialog, setDialog] = useState<AccountDialog | null>(null)

    if (!user) return null

    const roleLabel = t(`role.${user.role}`)
    const close = (next: boolean) => !next && setDialog(null)

    return (
        <>
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
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setDialog('profile')}>
                        <UserRound className="size-4" />
                        {t('shell.accountProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setDialog('changePassword')}>
                        <KeyRound className="size-4" />
                        {t('shell.accountChangePassword')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setDialog('relinkZalo')}>
                        <MessageCircle className="size-4" />
                        {t('shell.accountRelinkZalo')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => void logout()}>
                        <LogOut className="size-4" />
                        {tAuth('auth.logout')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ProfileDialog open={dialog === 'profile'} onOpenChange={close} />
            <ChangePasswordDialog open={dialog === 'changePassword'} onOpenChange={close} />
            <ZaloRelinkDialog open={dialog === 'relinkZalo'} onOpenChange={close} />
        </>
    )
}
