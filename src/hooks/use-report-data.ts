import { useEffect, useRef, useState } from 'react'

/**
 * Nạp một báo cáo và quản lý vòng đời request — dùng chung cho cả 4 tab Báo cáo và Dashboard.
 *
 * - `fetcher` nhận `AbortSignal`; đổi `deps` ⇒ huỷ request cũ rồi gọi lại.
 * - `enabled = false` (khoảng ngày chưa hợp lệ, hoặc tab chưa đủ quyền) ⇒ **không gọi API**.
 * - Lần đầu hiện `loading` (skeleton); các lần sau hiện `refreshing` (mờ bảng, giữ dữ liệu cũ)
 *   theo đúng quy ước ở CONVENTIONS mục 5.2.
 * - Lỗi đã được `api-client` toast một lần; ở đây chỉ giữ cờ để hiện khối "Thử lại" tại chỗ.
 */
export function useReportData<T>(
    fetcher: (signal: AbortSignal) => Promise<T>,
    deps: unknown[],
    enabled = true,
) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [nonce, setNonce] = useState(0)

    /* Giữ `fetcher` mới nhất mà không đưa vào deps — tránh gọi lại mỗi lần render cha. */
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher
    /* Dùng ref thay vì đọc `data` trong effect để không phải khai `data` vào deps. */
    const hasDataRef = useRef(false)

    useEffect(() => {
        if (!enabled) return

        const controller = new AbortController()
        if (hasDataRef.current) setRefreshing(true)
        else setLoading(true)
        setError(false)

        fetcherRef
            .current(controller.signal)
            .then((res) => {
                if (controller.signal.aborted) return
                setData(res)
                hasDataRef.current = true
            })
            .catch(() => {
                if (controller.signal.aborted) return
                setError(true)
            })
            .finally(() => {
                if (controller.signal.aborted) return
                setLoading(false)
                setRefreshing(false)
            })

        return () => controller.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, enabled, nonce])

    return {
        data,
        loading: loading && !data,
        refreshing,
        error,
        reload: () => setNonce((n) => n + 1),
    }
}
