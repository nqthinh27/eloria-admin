import type { EntityStatus, SearchReq } from '@/types/common'

/** `BranchResDTO`. */
export type Branch = {
    id: string
    name: string
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
    phoneNumber?: string
    address?: string
    provinceCode?: string
    wardCode?: string
    openingTime?: string
    closingTime?: string
}
