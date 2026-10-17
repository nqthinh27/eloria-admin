import { useEffect, type ReactNode } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { realtime } from '@/lib/realtime-client'

/**
 * Giữ vòng đời kết nối WebSocket theo phiên: **mở khi đã đăng nhập**, **đóng khi logout / hết phiên**
 * (`status` rời `authenticated`). Không có state để chia sẻ — màn hình dùng `useRealtime`.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
    const { status } = useAuth()

    useEffect(() => {
        if (status !== 'authenticated') return
        realtime.start()
        return () => realtime.stop()
    }, [status])

    return children
}
