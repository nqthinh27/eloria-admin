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
}

export const BranchContext = createContext<BranchContextValue | null>(null)
