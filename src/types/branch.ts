import type { EntityStatus, SearchReq } from '@/types/common'

/** `BranchResDTO`. */
export type Branch = {
    id: string
    name: string
    /**
     * Mã chi nhánh (vd `HK`) — **field mới 2026-08-11**, nullable (chi nhánh cũ chưa có).
     * Backend dùng làm **prefix mã đơn hàng**: `HK-20260811-233611-0001`. Chi nhánh không có `code`
     * thì fallback về **viết tắt tên** (`Chi nhánh Trung tâm` → `CNTT-…`) — đã đo thật cả 2 case.
     */
    code: string | null
    phoneNumber: string | null
    address: string | null
    provinceCode: string | null
    provinceName: string | null
    wardCode: string | null
    wardName: string | null
    /** Dạng `HH:mm`. */
    openingTime: string | null
    closingTime: string | null
    status: EntityStatus
    createdDate: string
    lastModifiedDate: string | null
    staffCount: number
}

/** `BranchSearchReqDTO`. */
export type BranchSearchReq = SearchReq & {
    provinceCode?: string
    wardCode?: string
}

/** `CreateBranchReqDTO` / `UpdateBranchReqDTO` — cùng shape. */
export type BranchPayload = {
    name: string
    /** Tuỳ chọn — dùng làm prefix mã đơn hàng của chi nhánh. Xem `Branch.code`. */
    code?: string
    phoneNumber?: string
    address?: string
    provinceCode?: string
    wardCode?: string
    openingTime?: string
    closingTime?: string
}
