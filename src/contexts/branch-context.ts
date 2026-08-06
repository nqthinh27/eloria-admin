import { createContext } from 'react'

import type { Branch } from '@/types/branch'

/** Giá trị đại diện "Tất cả chi nhánh" — chỉ SUPER_ADMIN chọn được. */
export const ALL_BRANCHES = 'ALL'

export type BranchContextValue = {
    branches: Branch[]
    loading: boolean
    /** `ALL_BRANCHES` hoặc id chi nhánh. */
    selectedBranchId: string
    setSelectedBranchId: (id: string) => void
    /** `null` khi đang chọn "Tất cả chi nhánh". */
    selectedBranch: Branch | null
    /** `false` với ADMIN/STAFF — bộ chọn hiển thị read-only. */
    canSwitchBranch: boolean
}

export const BranchContext = createContext<BranchContextValue | null>(null)
