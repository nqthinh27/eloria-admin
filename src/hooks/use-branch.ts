import { use } from 'react'

import { BranchContext, type BranchContextValue } from '@/contexts/branch-context'

export function useBranch(): BranchContextValue {
    const context = use(BranchContext)
    if (context === null) {
        throw new Error('useBranch phải được dùng bên trong <BranchProvider>')
    }
    return context
}
