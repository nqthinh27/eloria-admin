import type { EntityStatus, SearchReq } from '@/types/common'

/**
 * Domain **Tài khoản ngân hàng & VietQR** — API thật, khảo sát `/v3/api-docs/api` **2026-08-21**
 * (backend Phase 6b). 8 endpoint `/bank-account/*`.
 *
 * Mục đích với FE hiện tại: **sinh ảnh VietQR cho đơn hàng** ở luồng thu tiền chuyển khoản.
 * Phần CRUD tài khoản là `[SUPER_ADMIN]` và **chưa có màn hình** — khai type ở đây để phase sau
 * dựng màn Cấu hình không phải đoán lại shape.
 *
 * ⚠️ Tài khoản ngân hàng **dùng chung toàn chuỗi, KHÔNG theo chi nhánh** (javadoc
 * `BankAccountResource`: "Dùng chung toàn chuỗi (không branch data-scope)").
 */

/** `BankAccountResDTO`. */
export type BankAccount = {
    id: string
    /** Mã BIN ngân hàng theo chuẩn NAPAS (vd `970436` = Vietcombank) — đầu vào của VietQR. */
    bankBin: string
    bankName: string
    accountNumber: string
    accountName: string
    /**
     * Tài khoản đang được dùng để sinh QR. **Chỉ đúng một tài khoản** mang cờ này — đặt qua
     * `POST /bank-account/{id}/set-default` (backend tự bỏ cờ của tài khoản khác).
     */
    isDefault: boolean
    status: EntityStatus
    createdDate: string
    lastModifiedDate: string | null
}

/** `BankAccountSearchReqDTO` — chỉ `keyword` + `status`, không có filter riêng. */
export type BankAccountSearchReq = SearchReq

/** `CreateBankAccountReqDTO` — cả 4 field ngân hàng đều bắt buộc. */
export type CreateBankAccountReq = {
    bankBin: string
    bankName: string
    accountNumber: string
    accountName: string
    /** Đặt luôn làm mặc định khi tạo. */
    isDefault?: boolean
}

/** `UpdateBankAccountReqDTO` — **không đổi được `isDefault`** (phải qua `set-default`). */
export type UpdateBankAccountReq = Omit<CreateBankAccountReq, 'isDefault'>
