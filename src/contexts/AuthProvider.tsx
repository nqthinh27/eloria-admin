import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { authApi } from '@/api/auth'
import { canAccessAdminApp } from '@/config/roles'
import i18n, { SUPPORTED_LANGUAGES, changeLanguage, type SupportedLanguage } from '@/i18n'
import { ApiError, ApiErrorKind } from '@/lib/api-error'
import {
    clearAccessToken,
    setAccessToken,
    setSessionExpiredHandler,
} from '@/lib/token-store'
import type { SysUser } from '@/types/common'
import { AuthContext, type AuthStatus } from './auth-context'

/** Áp `langKey` của người dùng nếu đó là ngôn ngữ được hỗ trợ. */
function applyUserLanguage(user: SysUser) {
    const lang = user.langKey
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) && lang !== i18n.language) {
        void changeLanguage(lang as SupportedLanguage)
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>('bootstrapping')
    const [user, setUser] = useState<SysUser | null>(null)

    /** Dọn sạch phiên phía client. */
    const clearSession = useCallback(() => {
        clearAccessToken()
        setUser(null)
        setStatus('unauthenticated')
    }, [])

    /*
     * api-client gọi handler này khi 401 mà refresh cũng hỏng.
     * Đăng ký trước khi bootstrap chạy để không bỏ lỡ tình huống nào.
     */
    useEffect(() => {
        setSessionExpiredHandler(clearSession)
        return () => setSessionExpiredHandler(null)
    }, [clearSession])

    /*
     * Khôi phục phiên sau khi tải trang.
     *
     * Access token chỉ nằm trong bộ nhớ nên F5 là mất; đổi cookie `refresh_token`
     * lấy access token mới rồi hỏi `/account/me`. Chưa đăng nhập bao giờ thì
     * `/refresh` trả 401/403 — đó là đường đi bình thường, không phải lỗi.
     */
    const bootstrapPromise = useRef<Promise<void> | null>(null)
    useEffect(() => {
        /*
         * StrictMode (dev) mount → unmount → mount lại, khiến effect chạy 2 lần.
         *
         * CẢNH BÁO: đừng chặn bằng cờ `if (done) return` rồi thoát sớm — lần chạy thứ hai
         * sẽ không set `status`, app kẹt vĩnh viễn ở màn "Đang tải phiên làm việc…".
         * Thay vào đó nhớ chính promise: lần 2 dùng lại kết quả của lần 1 nên
         * `/refresh` vẫn chỉ gọi một lần, mà state vẫn luôn được cập nhật.
         */
        bootstrapPromise.current ??= (async () => {
            try {
                const me = await authApi.meSilent()
                if (!canAccessAdminApp(me.role)) {
                    clearSession()
                    return
                }
                applyUserLanguage(me)
                setUser(me)
                setStatus('authenticated')
            } catch {
                // Không có phiên hợp lệ — về màn đăng nhập. Đây là đường đi bình thường.
                clearSession()
            }
        })()

        void bootstrapPromise.current
    }, [clearSession])

    const login = useCallback(async (username: string, password: string) => {
        const result = await authApi.login({ username, password })

        // Chặn CUSTOMER: đăng nhập được nhưng không thuộc web quản trị.
        if (!canAccessAdminApp(result.user.role)) {
            clearAccessToken()
            throw new ApiError({
                kind: ApiErrorKind.FORBIDDEN,
                status: 403,
                subKey: 'error.forbidden',
                message: i18n.t('auth.error.notAdminAccount', { ns: 'auth' }),
            })
        }

        setAccessToken(result.accessToken)
        applyUserLanguage(result.user)
        setUser(result.user)
        setStatus('authenticated')
    }, [])

    const logout = useCallback(async () => {
        try {
            await authApi.logout()
        } catch {
            // `/logout` cần Authorization mà access token có thể đã hết hạn ⇒ 401.
            // Cố tình nuốt lỗi: phiên phía client vẫn phải bị dọn sạch.
        } finally {
            clearSession()
        }
    }, [clearSession])

    const value = useMemo(
        () => ({ status, user, login, logout }),
        [status, user, login, logout],
    )

    return <AuthContext value={value}>{children}</AuthContext>
}
