import { createContext } from 'react'

import type { SysUser } from '@/types/common'

export type AuthStatus =
    /** Đang gọi `/refresh` để khôi phục phiên sau khi tải trang. */
    | 'bootstrapping'
    | 'authenticated'
    | 'unauthenticated'

export type AuthContextValue = {
    status: AuthStatus
    user: SysUser | null
    /** Đăng nhập. Ném `ApiError` để form hiển thị lỗi inline. */
    login: (username: string, password: string) => Promise<void>
    /** Đăng xuất — luôn dọn state phía client kể cả khi API lỗi. */
    logout: () => Promise<void>
}

/** Tách khỏi provider để file provider chỉ export component (react-refresh). */
export const AuthContext = createContext<AuthContextValue | null>(null)
