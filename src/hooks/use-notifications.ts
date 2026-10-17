import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { notificationApi } from '@/api/notification'
import { useRealtime, useRealtimeResync } from '@/hooks/use-realtime'
import { ApiError } from '@/lib/api-error'
import {
    initialNotificationState,
    isNotificationRes,
    notificationReducer,
    notificationTarget,
} from '@/lib/notification-state'
import { armNotificationSound, playNotificationSound } from '@/lib/notification-sound'
import { toastInfo } from '@/lib/toast'
import type { NotificationRes } from '@/types/notification'

/** Hàng đợi riêng của người dùng — `/user/queue/notifications` (contract mục 2). */
const NOTIFICATION_DESTINATION = '/user/queue/notifications'

/** Backend trả khi id của người khác HOẶC không tồn tại (đã bị xoá sau 3 tháng). */
const NOT_EXISTED_SUBKEY = 'error.notification.notExisted'

/**
 * Trạng thái quả chuông, theo contract 7 bước (`fe-handoff-phase18ab-admin.md` mục 4):
 * badge · tin WS · mở chuông (mark-all-seen + trang đầu) · cuộn vô hạn keyset · bấm dòng · resync.
 * Logic biến đổi state nằm ở `lib/notification-state.ts` (thuần).
 */
export function useNotifications() {
    const [state, dispatch] = useReducer(notificationReducer, initialNotificationState)
    /** Bản mới nhất của state cho callback WS (đọc danh sách hiện tại mà không đăng ký lại). */
    const stateRef = useRef(state)
    useEffect(() => {
        stateRef.current = state
    })
    const [open, setOpenState] = useState(false)
    const [loadingFirst, setLoadingFirst] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(false)

    /** Đọc được từ callback WS/resync mà không phải đăng ký lại. */
    const openRef = useRef(false)
    const firstAbort = useRef<AbortController | null>(null)
    const moreInFlight = useRef(false)

    const refreshCount = useCallback(async () => {
        try {
            const { count } = await notificationApi.unseenCount()
            dispatch({ type: 'countLoaded', count })
        } catch {
            // Gọi nền — lỗi mạng không đáng làm phiền; lần resync/WS sau sẽ bù.
        }
    }, [])

    const loadFirstPage = useCallback(async () => {
        firstAbort.current?.abort()
        const controller = new AbortController()
        firstAbort.current = controller
        setLoadingFirst(true)
        setError(false)
        try {
            const page = await notificationApi.list(null, controller.signal)
            dispatch({ type: 'firstPageLoaded', page })
        } catch {
            if (!controller.signal.aborted) setError(true)
        } finally {
            if (!controller.signal.aborted) setLoadingFirst(false)
        }
    }, [])

    const loadMore = useCallback(async () => {
        if (moreInFlight.current || !state.hasMore || !state.nextCursor) return
        moreInFlight.current = true
        setLoadingMore(true)
        try {
            const page = await notificationApi.list(state.nextCursor)
            dispatch({ type: 'nextPageLoaded', page })
        } catch (err) {
            // Con trỏ hỏng (hiếm) ⇒ tải lại từ đầu thay vì kẹt ở cuối danh sách.
            if (err instanceof ApiError && err.subKey === 'error.notification.cursorInvalid') {
                void loadFirstPage()
            } else {
                setError(true)
            }
        } finally {
            moreInFlight.current = false
            setLoadingMore(false)
        }
    }, [state.hasMore, state.nextCursor, loadFirstPage])

    /* Bước 1 — badge lúc vào app (WS tự nối ở RealtimeProvider). */
    useEffect(() => {
        void refreshCount()
        const ref = firstAbort
        return () => ref.current?.abort()
    }, [refreshCount])

    /* Bước 2 + 4 — tin mới: badge +1, và chèn lên đầu nếu danh sách đã tải. */
    useRealtime(NOTIFICATION_DESTINATION, (message) => {
        if (message.type !== 'NOTIFICATION_CREATED') return
        // Dữ liệu WS không được tin: sai hình dạng ⇒ bỏ (kẻo làm sập phần hiển thị).
        if (!isNotificationRes(message.data)) return
        const item = message.data
        // Chỉ kêu khi tin thực sự được thêm — tin trùng (đã có trong danh sách) thì im.
        const isNew = !stateRef.current.items.some((existing) => existing.id === item.id)
        dispatch({ type: 'received', item })
        if (isNew) playNotificationSound()
    })

    /* Chờ cử chỉ đầu tiên của người dùng rồi mới được phát âm (autoplay policy). */
    useEffect(() => {
        armNotificationSound()
    }, [])

    /* Bước 7 — nối lại / tab hiện lại: tin lúc mất kết nối không được replay. */
    useRealtimeResync(() => {
        void refreshCount()
        if (openRef.current) void loadFirstPage()
    })

    /* Bước 3 — mở chuông: optimistic badge 0, mark-all-seen, tải trang đầu. */
    const setOpen = useCallback(
        (next: boolean) => {
            openRef.current = next
            setOpenState(next)
            if (!next) return
            dispatch({ type: 'seenAll' })
            notificationApi.markAllSeen().catch(() => void refreshCount())
            void loadFirstPage()
        },
        [loadFirstPage, refreshCount],
    )

    /**
     * Bước 6 — bấm một dòng: optimistic bỏ highlight, `POST /{id}/read`, trả route đích.
     * Trả `null` khi không điều hướng được: thông báo đã không còn (đã gỡ khỏi danh sách + báo
     * nhẹ) hoặc `refType` chưa có màn đích.
     */
    const select = useCallback(async (item: NotificationRes): Promise<string | null> => {
        if (!item.read) {
            dispatch({ type: 'readMarked', id: item.id })
            try {
                await notificationApi.markRead(item.id)
            } catch (err) {
                if (err instanceof ApiError && err.subKey === NOT_EXISTED_SUBKEY) {
                    dispatch({ type: 'removed', id: item.id })
                    toastInfo('shell.notificationsGone', { ns: 'menu' })
                    return null
                }
                // Lỗi khác (mạng…): vẫn cho mở chứng từ — highlight sẽ đúng lại ở lần tải sau.
            }
        }
        return notificationTarget(item)
    }, [])

    return {
        badge: state.badge,
        items: state.items,
        hasMore: state.hasMore,
        loaded: state.loaded,
        open,
        loadingFirst,
        loadingMore,
        error,
        setOpen,
        loadFirstPage,
        loadMore,
        select,
    }
}
