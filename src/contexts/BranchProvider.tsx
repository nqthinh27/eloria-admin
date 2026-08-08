import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { branchApi } from '@/api/branch'
import { useAuth } from '@/hooks/use-auth'
import type { Branch } from '@/types/branch'
import { BranchContext } from './branch-context'

/**
 * Nạp danh sách chi nhánh — dùng cho dropdown "Chi nhánh" trong các form (ví dụ tạo/sửa nhân
 * viên), KHÔNG phải bộ lọc chi nhánh toàn app (dropdown chọn chi nhánh trên top bar đã bỏ theo
 * yêu cầu user 2026-08-09).
 *
 * Backend tự giới hạn phạm vi theo role nên FE chỉ việc hiển thị những gì nhận được:
 * SUPER_ADMIN nhận toàn chuỗi; ADMIN/STAFF chỉ nhận đúng chi nhánh được gán.
 */
export function BranchProvider({ children }: { children: ReactNode }) {
    const { status } = useAuth()
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status !== 'authenticated') return

        let alive = true
        setLoading(true)

        void (async () => {
            try {
                // Lấy đủ danh sách cho dropdown; số chi nhánh của một chuỗi bán lẻ đủ nhỏ.
                const result = await branchApi.search({}, { page: 1, size: 200, sort: ['name,ASC'] })
                if (alive) setBranches(result.data)
            } catch {
                // api-client đã toast lỗi; dropdown để rỗng chứ không làm vỡ form.
                if (alive) setBranches([])
            } finally {
                if (alive) setLoading(false)
            }
        })()

        return () => {
            alive = false
        }
    }, [status])

    const value = useMemo(() => ({ branches, loading }), [branches, loading])

    return <BranchContext value={value}>{children}</BranchContext>
}
