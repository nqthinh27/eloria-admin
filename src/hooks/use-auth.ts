import { use } from 'react'

import { AuthContext, type AuthContextValue } from '@/contexts/auth-context'

export function useAuth(): AuthContextValue {
    const context = use(AuthContext)
    if (context === null) {
        throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
    }
    return context
}
