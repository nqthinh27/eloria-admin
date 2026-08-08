import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { hasRole } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import type { ERole } from '@/types/common'

/** Splash trong lúc `/refresh` khôi phục phiên — tránh nháy sang màn đăng nhập rồi quay lại. */
function AuthSplash() {
    const { t } = useTranslation('auth')
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-muted-foreground flex flex-col items-center gap-3">
                <Loader2 className="text-primary size-7 animate-spin" />
                <p className="text-sm">{t('auth.loading')}</p>
            </div>
        </div>
    )
}

/** Chặn route cần đăng nhập. Chưa đăng nhập ⇒ về `/login`, nhớ trang định vào. */
export function ProtectedRoute() {
    const { status } = useAuth()
    const location = useLocation()

    if (status === 'bootstrapping') return <AuthSplash />

    if (status !== 'authenticated') {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }

    return <Outlet />
}

/** Nhóm màn auth — đã đăng nhập rồi thì không cho quay lại `/login`. */
export function PublicOnlyRoute() {
    const { status } = useAuth()

    if (status === 'bootstrapping') return <AuthSplash />
    if (status === 'authenticated') return <Navigate to="/" replace />

    return <Outlet />
}

/**
 * Chặn route theo bậc role tối thiểu (CONVENTIONS mục 6.4) — gõ thẳng URL không đủ
 * quyền cũng bị chặn giống như bị ẩn khỏi menu, không chỉ ẩn nút.
 *
 * `redirectTo` dùng cho route gốc `/` (Dashboard, `minRole=ADMIN`): STAFF sau khi
 * đăng nhập cần có trang đích hợp lệ ngay, nên điều hướng sang `/pos` thay vì 403.
 * Route khác không truyền `redirectTo` sẽ hiện trang 403 như bình thường.
 */
export function RoleRoute({ minRole, redirectTo }: { minRole: ERole; redirectTo?: string }) {
    const { user } = useAuth()

    if (!hasRole(user?.role, minRole)) {
        return <Navigate to={redirectTo ?? '/403'} replace />
    }

    return <Outlet />
}
