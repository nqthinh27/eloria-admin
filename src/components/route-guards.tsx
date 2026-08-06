import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'

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
