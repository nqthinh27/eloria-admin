import { useEffect, useRef } from 'react'

import { realtime, type RealtimeHandler } from '@/lib/realtime-client'

/**
 * Nhận tin của một destination STOMP (vd `/user/queue/notifications`,
 * `/topic/admin/order/{id}`), tự huỷ đăng ký khi unmount hoặc khi `destination` đổi.
 * `destination = null` ⇒ tạm không nghe. Handler luôn là bản mới nhất, không cần `useCallback`.
 */
export function useRealtime(destination: string | null, handler: RealtimeHandler): void {
    const handlerRef = useRef(handler)
    useEffect(() => {
        handlerRef.current = handler
    })

    useEffect(() => {
        if (!destination) return
        return realtime.subscribe(destination, (message) => handlerRef.current(message))
    }, [destination])
}

/**
 * Chạy `callback` mỗi khi cần đồng bộ lại bằng REST: sau mỗi lần nối lại WebSocket và khi tab
 * được mở lại sau thời gian dài (tin xảy ra lúc mất kết nối không được replay).
 */
export function useRealtimeResync(callback: () => void): void {
    const callbackRef = useRef(callback)
    useEffect(() => {
        callbackRef.current = callback
    })

    useEffect(() => realtime.onResync(() => callbackRef.current()), [])
}
