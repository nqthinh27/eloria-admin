import { useEffect, useRef } from 'react'

import { useRealtime, useRealtimeResync } from '@/hooks/use-realtime'
import { isOrderEventFresh, orderTopic } from '@/lib/order-realtime'
import type { OrderRealtimeData, OrderRealtimeType } from '@/types/order'

type OrderEventHandler = (type: OrderRealtimeType, data: OrderRealtimeData) => void

/**
 * Nghe sự kiện của MỘT đơn (`ORDER_PAYMENT_CONFIRMED`, `ORDER_STATUS_CHANGED`) trong lúc màn/dialog
 * đang mở; tự unsubscribe khi `orderId = null` hoặc unmount.
 *
 * - Bỏ tin có `version` nhỏ hơn bản đã thấy (tin tới sai thứ tự).
 * - `onResync` chạy sau mỗi lần WebSocket nối lại (tin lúc mất kết nối không được replay) — màn đang
 *   mở phải GET lại đơn bằng REST.
 */
export function useOrderRealtime(
    orderId: string | null,
    onEvent: OrderEventHandler,
    onResync?: () => void,
    /** `version` của bản đơn đang hiển thị (REST) — tin nhỏ hơn bị bỏ. */
    displayedVersion?: number | null,
): void {
    const lastVersion = useRef<number | null>(null)
    useEffect(() => {
        lastVersion.current = null
    }, [orderId])

    useRealtime(orderId ? orderTopic(orderId) : null, (message) => {
        if (message.type !== 'ORDER_PAYMENT_CONFIRMED' && message.type !== 'ORDER_STATUS_CHANGED') return
        const data = message.data as OrderRealtimeData
        if (!isOrderEventFresh(lastVersion.current, data.version, displayedVersion)) return
        if (typeof data.version === 'number') {
            lastVersion.current = Math.max(lastVersion.current ?? data.version, data.version)
        }
        onEvent(message.type, data)
    })

    const resyncRef = useRef(onResync)
    useEffect(() => {
        resyncRef.current = onResync
    })
    useRealtimeResync(() => {
        if (orderId) resyncRef.current?.()
    })
}
