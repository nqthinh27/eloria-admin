import type { EGender, EntityStatus, ERole, SearchReq } from '@/types/common'

/** `StaffResDTO`. */
export type Staff = {
    id: string
    username: string
    fullName: string
    email: string
    phoneNumber: string
    role: ERole
    status: EntityStatus
    activated: boolean
    branchId: string | null
    // `employeeId` đã bị backend xoá khỏi response (breaking 2026-08-11) — đừng khai lại.
    dob: string | null
    gender: EGender | null
    imageUrl: string | null
    description: string | null
    createdDate: string
    lastModifiedDate: string | null
    branchName: string | null
}

/** `StaffSearchReqDTO`. `branchId` chỉ có tác dụng với SUPER_ADMIN (backend tự lọc theo role). */
export type StaffSearchReq = SearchReq & {
    role?: ERole
    branchId?: string
}

/**
 * `CreateStaffReqDTO`. `role` giới hạn thực tế `STAFF | ADMIN | SUPER_ADMIN` (ADMIN chỉ tạo được
 * STAFF — backend tự chặn). `branchId`: ADMIN luôn bị ép về chi nhánh của chính mình.
 */
export type CreateStaffReq = {
    username: string
    password: string
    fullName: string
    email: string
    phoneNumber: string
    role: ERole
    branchId?: string
    dob?: string
    gender?: EGender
    description?: string
}

/**
 * `UpdateStaffReqDTO` — KHÔNG có `username`/`password`/`role`. Đổi role qua `assign-role`,
 * đổi mật khẩu qua `reset-password`, cả hai là API riêng.
 */
export type UpdateStaffReq = {
    fullName: string
    email?: string
    phoneNumber?: string
    /** Chỉ SUPER_ADMIN được đổi sang chi nhánh khác. */
    branchId?: string
    dob?: string
    gender?: EGender
    imageUrl?: string
    description?: string
}

/** `AssignRoleReqDTO`. */
export type AssignRoleReq = {
    id: string
    role: ERole
}

/** `UpdateStatusReqDTO` — dùng chung cho staff và branch. */
export type UpdateStatusReq = {
    id: string
    status: EntityStatus
}

/**
 * `ResetStaffPasswordResDTO` — `temporaryPassword` chỉ trả về ĐÚNG MỘT LẦN tại thời điểm gọi API,
 * không có endpoint xem lại. UI phải hiện dialog + nút copy ngay khi nhận response.
 */
export type ResetStaffPasswordRes = {
    temporaryPassword: string
}
