import { apiClient } from '@/lib/api-client'
import { isNotificationRes } from '@/lib/notification-state'
import type { NotificationCount, NotificationPage } from '@/types/notification'

/** Số dòng mỗi trang của dropdown chuông (contract: mặc định 10, tối đa 50). */
export const NOTIFICATION_PAGE_SIZE = 10

/**
 * Service thông báo (quả chuông) — **API thật** (backend Phase 18b, đo 2026-10-17).
 *
 * `[STAFF]` trở lên, chỉ thông báo của **chính người gọi**. Mọi response bọc `BaseResponse`.
 * Danh sách dùng **keyset cursor** — khác mọi bảng khác của repo (`page`/`size`).
 */
export const notificationApi = {
    /**
     * `GET /notification?cursor=&size=10` — mới nhất trước. Trang đầu bỏ `cursor`; trang kế
     * truyền **nguyên văn** `nextCursor` của trang trước. `cursor` sai ⇒ `400 error.notification.cursorInvalid`.
     */
    async list(cursor: string | null, signal?: AbortSignal) {
        const page = await apiClient.get<NotificationPage>('/notification', {
            params: { cursor: cursor ?? undefined, size: NOTIFICATION_PAGE_SIZE },
            signal,
        })
        // Phần tử sai hình dạng bị bỏ (không làm sập chuông); `nextCursor`/`hasMore` giữ nguyên.
        return { ...page, data: (page.data ?? []).filter(isNotificationRes) }
    },

    /**
     * `GET /notification/unseen-count` — `0..100` (100 = "từ 100 trở lên" ⇒ FE hiện `99+`).
     * Gọi nền (sau login / reconnect / focus) nên tắt toast: lỗi ở đây không đáng làm phiền người dùng.
     */
    unseenCount(signal?: AbortSignal) {
        return apiClient.get<NotificationCount>('/notification/unseen-count', {
            signal,
            skipErrorToast: true,
        })
    },

    /** `POST /notification/mark-all-seen` — click quả chuông ⇒ mọi thông báo của mình thành `seen`. */
    markAllSeen() {
        return apiClient.post<NotificationCount>('/notification/mark-all-seen', undefined, {
            skipErrorToast: true,
        })
    },

    /**
     * `POST /notification/{id}/read` — idempotent. Id của người khác **và** id không tồn tại
     * cùng trả `400 error.notification.notExisted` ⇒ caller coi là "thông báo đã không còn".
     * Tắt toast mặc định để caller tự xử lý êm.
     */
    markRead(id: string) {
        return apiClient.post<null>(`/notification/${id}/read`, undefined, {
            skipErrorToast: true,
        })
    },
}
