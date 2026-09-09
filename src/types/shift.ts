import type { SearchReq } from '@/types/common'

/**
 * Domain **Ca làm việc (POS)** — **API thật**, đồng bộ từ `/v3/api-docs/api` khảo sát
 * **2026-09-09 (lần 2)** + kiểm thử thật 23/23 PASS (PLAN Phase 15).
 *
 * File này **thay thế hoàn toàn** bản đoán ở Phase 6 — bản cũ sai gần như mọi thứ:
 * đường dẫn (`/shift/*` → thật là **`/work-shift/*`**), tên field (`note` → `description`,
 * `cashVariance` → `cashDifference`), **thiếu `expectedCash`**, và khai một endpoint `search`
 * **không tồn tại** (nay đã có thật, nhưng shape khác hẳn bản đoán).
 *
 * Ba mô hình nghiệp vụ **bắt buộc nắm trước khi sửa file này**:
 *
 * 1. **Ca phải được DUYỆT mới bán được** (backend bổ sung 2026-09-09 lần 2):
 *    `WAITING_APPROVAL → OPEN` do **ADMIN+** duyệt. Nhân viên mở ca xong **chưa bán được ngay**.
 * 2. **Chỉ STAFF mới cần ca.** ADMIN/SUPER_ADMIN bán POS không cần mở ca (họ là người duyệt) —
 *    đo thật: ADMIN gọi `/pos/order` khi không có ca vẫn `200`, `shiftId: null`.
 * 3. **Tiền kỳ vọng chỉ đếm TIỀN MẶT của đơn GẮN CA.** Backend tính
 *    `expectedCash = openingCash + Σ(CASH đã thu − đã hoàn) của đơn có shiftId = ca này`.
 *    ✅ **`POST /order` nay ĐÃ tự gắn ca** cho đơn `POS` của STAFF (sửa 2026-09-09 lần 2,
 *    trước đây luôn `null`) ⇒ luồng thu tiền 2 bước của màn POS **đã vào đúng `expectedCash`**.
 */

/**
 * `EShiftStatus` — backend nay có **5** giá trị (trước đây 3).
 *
 * ⚠️ **`WAITING_APPROVAL` và `REJECTED` là MỚI (2026-09-09 lần 2)** — quy trình duyệt ca.
 * `INCOMING` (ca đặt trước) vẫn **chưa dùng ở MVP**: không endpoint nào tạo ra.
 *
 * Vòng đời thực tế:
 * ```
 * (STAFF) open → WAITING_APPROVAL ─(ADMIN+ approve)→ OPEN ─(close)→ CLOSED
 *                       └──────────(ADMIN+ reject)─→ REJECTED
 * ```
 * Ca `REJECTED` là ngõ cụt — không duyệt lại được (`error.workShift.invalidStatus`),
 * nhân viên phải **mở ca mới**.
 */
export const EShiftStatus = {
    INCOMING: 'INCOMING',
    WAITING_APPROVAL: 'WAITING_APPROVAL',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    REJECTED: 'REJECTED',
} as const
export type EShiftStatus = (typeof EShiftStatus)[keyof typeof EShiftStatus]

/**
 * `WorkShiftResDTO` — ca làm việc.
 *
 * ⚠️ **3 field tiền chỉ có giá trị sau khi CHỐT ca**: `closingCash`, `expectedCash`,
 * `cashDifference` đều `null` khi ca còn `WAITING_APPROVAL`/`OPEN` (đo thật) — mọi chỗ hiển thị
 * phải phòng `null`, đừng `.toLocaleString()` thẳng.
 *
 * ⚠️ **`openedAt` được ĐẶT LẠI lúc duyệt**, không phải lúc gửi yêu cầu (đo thật: yêu cầu lúc
 * `15:41:55`, duyệt lúc `15:42:12` ⇒ `openedAt = 15:42:12`) ⇒ đây là **giờ bắt đầu ca thật**.
 */
export type WorkShift = {
    id: string
    /**
     * Mã ca dạng `CA-{branchCode}-{yyyyMMdd}-{seq}`, ví dụ `CA-CG-20260909-001`.
     * ⚠️ Chi nhánh **không có `code`** thì backend fallback về **viết tắt tên**
     * (`Chi nhánh Trung tâm` → `CA-CNTT-...`) — giống hệt quy tắc prefix mã đơn.
     */
    code: string
    status: EShiftStatus
    /** Tiền mặt trong két lúc mở ca. Luôn có (bắt buộc khi mở ca). */
    openingCash: number
    /** Tiền mặt **đếm được** lúc chốt. `null` khi ca chưa chốt. */
    closingCash: number | null
    /** Tiền mặt **đáng lẽ phải có** — backend tính, FE **không tự tính lại**. `null` khi chưa chốt. */
    expectedCash: number | null
    /**
     * `closingCash − expectedCash`. **Âm = thiếu quỹ**, dương = thừa, `0` = khớp.
     * `null` khi ca chưa chốt.
     */
    cashDifference: number | null
    /** Giờ **bắt đầu ca thật** — đặt lại tại thời điểm ADMIN duyệt. */
    openedAt: string
    closedAt: string | null
    /** Ghi chú. Ca bị từ chối ⇒ backend ghi **lý do từ chối** vào chính field này. */
    description: string | null
    staffId: string
    staffName: string | null
    branchId: string
    branchName: string | null
    createdDate: string
    lastModifiedDate: string
}

/**
 * `OpenShiftReqDTO` — **gửi YÊU CẦU mở ca** (ra `WAITING_APPROVAL`, chưa bán được ngay).
 *
 * ⚠️ **`branchId` chỉ SUPER_ADMIN dùng được**, và với role đó là **bắt buộc** (thiếu ⇒
 * `error.branch.required`, vì SUPER_ADMIN không thuộc chi nhánh nào). STAFF/ADMIN gửi lên
 * **bị bỏ qua trong im lặng** ⇒ **không bày bộ chọn chi nhánh cho role thấp hơn**.
 */
export type OpenShiftPayload = {
    openingCash: number
    branchId?: string
    description?: string
}

/**
 * `CloseShiftReqDTO` — dùng cho **cả 2** endpoint chốt ca:
 * `POST /work-shift/close` (tự chốt, không cần id) và `POST /work-shift/{id}/close` (ADMIN chốt hộ).
 *
 * `closingCash` là số tiền **đếm được trong két**, không phải số kỳ vọng — chênh lệch để
 * backend tự tính ra `cashDifference`.
 */
export type CloseShiftPayload = {
    closingCash: number
    description?: string
}

/** `RejectShiftReqDTO` — lý do từ chối, backend lưu vào `description` của ca. */
export type RejectShiftPayload = {
    reason?: string
}

/**
 * `WorkShiftSearchReqDTO` — body của `POST /work-shift/search`
 * (`page`/`size`/`sort` đi ở **query param** theo quy ước chung).
 *
 * ⚠️ **`status` ở đây là `EShiftStatus` (chuỗi)**, KHÔNG phải `0/1` như `SearchReq` chung —
 * giống pattern `promotionStatus`/`ledgerStatus`. Vì vậy phải `Omit` `status` khỏi `SearchReq`,
 * nếu không kiểu sẽ xung đột.
 *
 * `fromDate`/`toDate` lọc theo **`openedAt`**.
 */
export type WorkShiftSearchReq = Omit<SearchReq, 'status'> & {
    status?: EShiftStatus
    branchId?: string
    staffId?: string
    fromDate?: string
    toDate?: string
}
