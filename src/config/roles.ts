import { ERole } from '@/types/common'

/**
 * Thang bậc quyền — backend fix cứng, FE bám theo (CONVENTIONS mục 6.4):
 *
 *     SUPER_ADMIN > ADMIN > STAFF > CUSTOMER > ANONYMOUS
 *
 * Role bên trái kế thừa TOÀN BỘ quyền của role bên phải. Mỗi endpoint trong api-docs
 * mang tiền tố `[ROLE]` ở `summary` = role tối thiểu gọi được.
 *
 * Mọi kiểm tra quyền phải đi qua `hasRole()`. KHÔNG viết
 * `role === 'ADMIN' || role === 'SUPER_ADMIN'` rải rác — sai ngay khi thêm bậc mới.
 */
export const ROLE_RANK: Record<ERole, number> = {
    [ERole.ANONYMOUS]: 0,
    [ERole.CUSTOMER]: 1,
    [ERole.STAFF]: 2,
    [ERole.ADMIN]: 3,
    [ERole.SUPER_ADMIN]: 4,
}

/** `true` khi `role` đạt từ bậc `minRole` trở lên. */
export function hasRole(role: ERole | null | undefined, minRole: ERole): boolean {
    if (!role) return false
    return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

/**
 * Bậc tối thiểu để được vào web quản trị.
 *
 * `CUSTOMER` là tài khoản khách mua hàng bên storefront — đăng nhập được qua
 * `/authenticate` nhưng KHÔNG thuộc về web này, nên bị chặn ngay sau khi login.
 */
export const MIN_ROLE_FOR_ADMIN_APP: ERole = ERole.STAFF

export function canAccessAdminApp(role: ERole | null | undefined): boolean {
    return hasRole(role, MIN_ROLE_FOR_ADMIN_APP)
}
