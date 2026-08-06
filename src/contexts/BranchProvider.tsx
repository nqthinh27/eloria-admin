import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { branchApi } from '@/api/branch'
import { useAuth } from '@/hooks/use-auth'
import { ERole } from '@/types/common'
import type { Branch } from '@/types/branch'
import { ALL_BRANCHES, BranchContext } from './branch-context'

/**
 * Nạp danh sách chi nhánh cho bộ chọn trên top bar.
 *
 * Backend tự giới hạn phạm vi theo role nên FE chỉ việc hiển thị những gì nhận được:
 * SUPER_ADMIN thấy toàn chuỗi và chọn được "Tất cả chi nhánh";
 * ADMIN/STAFF chỉ nhận đúng chi nhánh được gán ⇒ bộ chọn khoá lại (read-only).
 */
export function BranchProvider({ children }: { children: ReactNode }) {
    const { user, status } = useAuth()
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedBranchId, setSelectedBranchId] = useState<string>(ALL_BRANCHES)

    const canSwitchBranch = user?.role === ERole.SUPER_ADMIN

    useEffect(() => {
        if (status !== 'authenticated') return

        let alive = true
        setLoading(true)

        void (async () => {
            try {
                // Lấy đủ danh sách cho dropdown; số chi nhánh của một chuỗi bán lẻ đủ nhỏ.
                const result = await branchApi.search({ page: 0, size: 200, sortBy: 'name' })
                if (!alive) return

                setBranches(result.data)

                // ADMIN/STAFF ghim theo `branchId` của tài khoản; SUPER_ADMIN mặc định xem toàn chuỗi.
                setSelectedBranchId((current) => {
                    if (user?.role !== ERole.SUPER_ADMIN) {
                        return user?.branchId ?? result.data[0]?.id ?? ALL_BRANCHES
                    }
                    return current
                })
            } catch {
                // api-client đã toast lỗi; bộ chọn để rỗng chứ không làm vỡ shell.
                if (alive) setBranches([])
            } finally {
                if (alive) setLoading(false)
            }
        })()

        return () => {
            alive = false
        }
    }, [status, user?.role, user?.branchId])

    const value = useMemo(() => {
        const selectedBranch =
            selectedBranchId === ALL_BRANCHES
                ? null
                : (branches.find((b) => b.id === selectedBranchId) ?? null)

        return {
            branches,
            loading,
            selectedBranchId,
            setSelectedBranchId,
            selectedBranch,
            canSwitchBranch,
        }
    }, [branches, loading, selectedBranchId, canSwitchBranch])

    return <BranchContext value={value}>{children}</BranchContext>
}
