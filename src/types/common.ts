/**
 * Type dùng chung, đồng bộ từ `/v3/api-docs/api` (khảo sát 2026-08-06).
 * Đổi ở đây phải khớp backend — xem CONVENTIONS mục 1.
 */

/** Mã trả về của backend (`ResponseCode`). Thành công là 1, KHÔNG phải 0. */
export const RESPONSE_CODE_SUCCESS = 1

/** Bọc ngoài của **mọi** response thành công. */
export type BaseResponse<T> = {
    code: number
    message: string
    data: T
}

/** Body lỗi của backend. `logInfo` chỉ dùng để debug, không hiển thị cho người dùng. */
export type ErrorResponse = {
    code: number
    message: string
    logInfo: string | null
    /** Khoá i18n dạng `a.b.c`, ví dụ `error.login.fail`. */
    subKey: string | null
}

/** Bao ngoài của API danh sách. Lưu ý dữ liệu nằm ở `data.data`. */
export type BaseListRes<T> = {
    total: number
    data: T[]
}

/** Bản có thêm thống kê trạng thái — `staff/search`, `branch/search`. */
export type BaseListResStatus<T> = BaseListRes<T> & {
    activeTotal: number
    inactiveTotal: number
}

/** Body chung của mọi endpoint `POST .../search`. */
export type SearchReq = {
    page?: number
    size?: number
    sortBy?: string
    sortDir?: 'asc' | 'desc'
    keyword?: string
    status?: EntityStatus
}

/** Trạng thái bản ghi: 1 = đang hoạt động, 0 = ngừng. */
export const EntityStatus = {
    INACTIVE: 0,
    ACTIVE: 1,
} as const
export type EntityStatus = (typeof EntityStatus)[keyof typeof EntityStatus]

export const ERole = {
    ANONYMOUS: 'ANONYMOUS',
    CUSTOMER: 'CUSTOMER',
    STAFF: 'STAFF',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
} as const
export type ERole = (typeof ERole)[keyof typeof ERole]

export const EGender = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER',
} as const
export type EGender = (typeof EGender)[keyof typeof EGender]

/** `SysUserDTO` — thông tin người đang đăng nhập. */
export type SysUser = {
    id: string
    username: string
    fullName: string
    status: EntityStatus
    email: string
    langKey: string | null
    imageUrl: string | null
    coverUrl: string | null
    description: string | null
    role: ERole
    /** `null` với SUPER_ADMIN (không thuộc chi nhánh nào). */
    branchId: string | null
    dob: string | null
    gender: EGender | null
    membershipPoint: number | null
}
