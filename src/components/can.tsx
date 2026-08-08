import type { ReactNode } from 'react'

import { hasRole } from '@/config/roles'
import { useAuth } from '@/hooks/use-auth'
import type { ERole } from '@/types/common'

type CanProps = {
    /** Bậc role tối thiểu để render `children` (CONVENTIONS mục 6.4). */
    minRole: ERole
    children: ReactNode
    /** Render thay thế khi không đủ quyền — mặc định ẩn hẳn. */
    fallback?: ReactNode
}

/** Ẩn/khoá một phần UI theo role, dùng lại đúng hàm `hasRole` dùng chung. */
export function Can({ minRole, children, fallback = null }: CanProps) {
    const { user } = useAuth()
    return hasRole(user?.role, minRole) ? children : fallback
}
