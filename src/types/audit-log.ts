import type { SearchReq } from '@/types/common'

/**
 * `AuditLogResDTO`. `oldValue`/`newValue` là **chuỗi JSON đã serialize** (khai báo `type: string`
 * trong api-docs, không phải object lồng) — màn hình phải tự `JSON.parse()`, có fallback hiển thị
 * raw string khi parse lỗi.
 */
export type AuditLog = {
    id: number
    action: string
    entityName: string
    entityId: string
    oldValue: string | null
    newValue: string | null
    ipAddress: string | null
    userAgent: string | null
    userId: string | null
    username: string | null
    fullName: string | null
    phoneNumber: string | null
    branchId: string | null
    branchName: string | null
    createdDate: string
    createdBy: string | null
}

/** `AuditLogSearchReqDTO`. */
export type AuditLogSearchReq = SearchReq & {
    action?: string
    entityName?: string
    entityId?: string
    userId?: string
    branchId?: string
    /** ISO-8601 UTC. */
    fromDate?: string
    toDate?: string
}
