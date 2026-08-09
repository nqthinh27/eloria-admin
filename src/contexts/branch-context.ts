import { createContext } from 'react'

import type { Branch } from '@/types/branch'

/**
 * Danh sách chi nhánh dùng chung cho các form cần chọn chi nhánh (ví dụ dropdown "Chi nhánh"
 * khi tạo/sửa nhân viên) — KHÔNG phải bộ lọc chi nhánh toàn app. Dropdown chọn chi nhánh trên
 * top bar đã bỏ theo yêu cầu user (2026-08-09); màn nào cần filter theo chi nhánh sẽ tự implement
 * riêng khi tới lượt.
 */
export type BranchContextValue = {
    branches: Branch[]
    loading: boolean
    /**
     * Nạp lại danh sách — dùng sau khi màn "Chi nhánh" thêm/sửa/xoá.
     * Nhờ đó màn đó không phải tự gọi `branch/search` song song với provider (tránh gọi trùng API).
     */
    refresh: (signal?: AbortSignal) => Promise<void>
}

export const BranchContext = createContext<BranchContextValue | null>(null)
