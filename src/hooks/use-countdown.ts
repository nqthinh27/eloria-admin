import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Đếm ngược theo giây, tự dọn interval khi unmount.
 *
 * Dựa trên mốc thời gian kết thúc (không cộng dồn mỗi tick) nên tab chạy nền bị trình duyệt
 * giãn timer vẫn hiển thị đúng. Dùng cho: nút "Gửi lại OTP", hạn mã liên kết Zalo.
 */
export function useCountdown() {
    const [remaining, setRemaining] = useState(0)
    const endAtRef = useRef(0)
    const timerRef = useRef<number | null>(null)

    const clear = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const tick = useCallback(() => {
        const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
        setRemaining(left)
        if (left <= 0) clear()
    }, [clear])

    /** Bắt đầu (hoặc đặt lại) đếm ngược `seconds` giây. */
    const start = useCallback(
        (seconds: number) => {
            clear()
            const safe = Math.max(0, Math.floor(seconds))
            endAtRef.current = Date.now() + safe * 1000
            setRemaining(safe)
            if (safe > 0) timerRef.current = window.setInterval(tick, 250)
        },
        [clear, tick],
    )

    /** Dừng và về 0. */
    const stop = useCallback(() => {
        clear()
        setRemaining(0)
    }, [clear])

    useEffect(() => clear, [clear])

    return { remaining, start, stop }
}

/** `75` → `1:15` — dùng hiển thị hạn mã liên kết. */
export function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}
