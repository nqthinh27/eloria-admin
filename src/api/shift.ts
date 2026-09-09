import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    CloseShiftPayload,
    OpenShiftPayload,
    RejectShiftPayload,
    WorkShift,
    WorkShiftSearchReq,
} from '@/types/shift'

/**
 * Service domain **Ca làm việc (POS)** — **API thật** (9 endpoint `/work-shift/*`,
 * khảo sát api-docs + kiểm thử trên dữ liệu thật **2026-09-09 lần 2**, PLAN Phase 15).
 *
 * Không còn nhánh mock: lớp mock đoán từ Phase 6 (`src/mocks/shift.ts`) đã được xoá cùng với
 * đường dẫn `/shift/*` bịa sai.
 *
 * **Quy trình duyệt ca** (backend bổ sung 2026-09-09 lần 2 — khác hẳn bản đầu):
 *
 * ```
 * (STAFF) open → WAITING_APPROVAL ─(ADMIN+ approve)→ OPEN ─(close)→ CLOSED
 *                       └──────────(ADMIN+ reject)─→ REJECTED
 * ```
 *
 * Phân quyền: đọc + mở + tự chốt là **`[STAFF]`**; **duyệt / từ chối / chốt hộ là `[ADMIN]`**
 * (STAFF tự duyệt ⇒ **403**, đo thật). Data-scope: STAFF chỉ thấy ca **của chính mình**,
 * ADMIN thấy ca **chi nhánh mình** (thao tác ca chi nhánh khác ⇒
 * `error.workShift.branchForbidden`), SUPER_ADMIN toàn chuỗi.
 */
export const shiftApi = {
    /**
     * `[STAFF] GET /work-shift/current` — ca **đang hoạt động** của chính người gọi.
     *
     * ⚠️ Trả về ca ở **cả `WAITING_APPROVAL` lẫn `OPEN`** (không chỉ ca đã duyệt) ⇒ FE phải đọc
     * `status` để biết đang chờ duyệt hay bán được rồi.
     *
     * ⚠️ Trả **`data: null`** (không phải 404, không phải lỗi) khi không có ca nào đang hoạt động
     * — kể cả ngay sau khi ca bị **từ chối** (đo thật) ⇒ nhân viên mở lại ca mới được luôn.
     */
    getCurrent(signal?: AbortSignal) {
        return apiClient.get<WorkShift | null>('/work-shift/current', { signal })
    },

    /**
     * `[STAFF] POST /work-shift/open` — **gửi yêu cầu** mở ca.
     *
     * ⚠️ Ca sinh ra ở **`WAITING_APPROVAL`**, **chưa bán được ngay** — phải chờ ADMIN duyệt.
     * Bán khi chưa duyệt ⇒ `error.workShift.notOpen`.
     *
     * Đang có ca chờ duyệt **hoặc** đang mở ⇒ `error.workShift.alreadyOpen`.
     * SUPER_ADMIN không truyền `branchId` ⇒ `error.branch.required` (`code: 14`).
     */
    open(payload: OpenShiftPayload) {
        return apiClient.post<WorkShift>('/work-shift/open', payload)
    },

    /**
     * `[ADMIN] POST /work-shift/{id}/approve` — duyệt ca: `WAITING_APPROVAL → OPEN`.
     *
     * ⚠️ **Đặt lại `openedAt` = thời điểm duyệt** (đo thật) — đó mới là giờ bắt đầu ca thật.
     * Ca không ở `WAITING_APPROVAL` ⇒ `error.workShift.invalidStatus`.
     */
    approve(id: string) {
        return apiClient.post<WorkShift>(`/work-shift/${id}/approve`)
    },

    /**
     * `[ADMIN] POST /work-shift/{id}/reject` — từ chối: `WAITING_APPROVAL → REJECTED`.
     *
     * `reason` được backend lưu vào **`description`** của ca. Ca `REJECTED` là **ngõ cụt**:
     * duyệt lại ⇒ `error.workShift.invalidStatus`, nhân viên phải mở ca mới.
     */
    reject(id: string, payload?: RejectShiftPayload) {
        return apiClient.post<WorkShift>(`/work-shift/${id}/reject`, payload ?? {})
    },

    /**
     * `[STAFF] POST /work-shift/close` — **tự chốt** ca đang mở của chính người gọi (kiểm quỹ).
     *
     * Không có ca đang mở ⇒ `error.workShift.notOpen`.
     */
    close(payload: CloseShiftPayload) {
        return apiClient.post<WorkShift>('/work-shift/close', payload)
    },

    /**
     * `[ADMIN] POST /work-shift/{id}/close` — **chốt hộ** ca của nhân viên.
     *
     * Ca không ở `OPEN` ⇒ `error.workShift.invalidStatus`.
     */
    closeById(id: string, payload: CloseShiftPayload) {
        return apiClient.post<WorkShift>(`/work-shift/${id}/close`, payload)
    },

    /**
     * `[STAFF] POST /work-shift/search` — tra cứu lịch sử ca.
     *
     * ⚠️ **Sort: `staffName`/`branchName` gây HTTP 500** (field chỉ có ở DTO —
     * `PropertyReferenceException`; đã đo thật `sort=staffName,ASC` ⇒ **500**) ⇒ hai cột này
     * **bắt buộc `enableSorting: false`** (CONVENTIONS mục 5.2).
     * Sort được: `code` · `status` · `openingCash` · `closingCash` · `expectedCash` ·
     * `cashDifference` · `openedAt` · `closedAt` · `createdDate` (đã đo `cashDifference` ⇒ 200).
     */
    search(body: WorkShiftSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<WorkShift>>('/work-shift/search', body, pagination, { signal })
    },

    /**
     * `[STAFF] GET /work-shift/{id}` — chi tiết 1 ca.
     * Ngoài phạm vi data-scope ⇒ `error.workShift.branchForbidden` (403, đo thật với STAFF xem ca
     * của nhân viên khác).
     */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<WorkShift>(`/work-shift/${id}`, { signal })
    },
}
