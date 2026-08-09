import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

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
    // Mặc định `false`: provider không tự nạp, nên chưa gọi `refresh()` thì không có gì đang tải.
    const [loading, setLoading] = useState(false)

    const fetchBranches = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        try {
            // Lấy đủ danh sách cho dropdown; số chi nhánh của một chuỗi bán lẻ đủ nhỏ.
            const result = await branchApi.search(
                {},
                { page: 1, size: 200, sort: ['name,ASC'] },
                signal,
            )
            setBranches(result.data)
        } catch {
            // Request bị huỷ không phải lỗi thật.
            if (signal?.aborted) return
            // api-client đã toast lỗi; dropdown để rỗng chứ không làm vỡ form.
            setBranches([])
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }, [])

    /*
     * ⚠️ Provider **KHÔNG tự nạp** khi đăng nhập.
     *
     * Trước đây provider nạp sẵn một lần rồi giữ mãi — dữ liệu thành cũ khi người dùng khác
     * thêm/sửa chi nhánh (đã tái hiện: admin khác thêm chi nhánh, quay lại màn vẫn thấy số cũ).
     * Nhưng nếu vừa để provider tự nạp vừa cho màn gọi `refresh()` thì `branch/search` bị gọi
     * **2 lần trong cùng một màn** — đúng thứ cần tránh.
     *
     * Chốt: provider chỉ giữ state + hàm nạp; **màn nào cần thì tự gọi `refresh()` khi vào màn**.
     * Nhờ đó mỗi màn gọi đúng 1 lần và luôn là dữ liệu mới nhất.
     */
    useEffect(() => {
        // Đăng xuất thì dọn state để phiên sau không thấy dữ liệu của phiên trước.
        if (status !== 'authenticated') {
            setBranches([])
            setLoading(false)
        }
    }, [status])

    const value = useMemo(
        () => ({ branches, loading, refresh: fetchBranches }),
        [branches, loading, fetchBranches],
    )

    return <BranchContext value={value}>{children}</BranchContext>
}
