import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react'

/** Kết quả một trang do `loadPage` trả về. */
export type PagedSearchResult<T> = {
    items: T[]
    /** Tổng bản ghi khớp **phía server** — dùng để biết còn trang để nạp hay không. */
    total: number
}

export type PagedSearchLoader<T> = (params: {
    keyword: string
    /** 1-based, đúng quy ước `page` của backend. */
    page: number
    size: number
    signal: AbortSignal
}) => Promise<PagedSearchResult<T>>

type Options<T> = {
    /** Từ khoá người dùng đang gõ (chưa debounce — hook tự debounce). */
    keyword: string
    loadPage: PagedSearchLoader<T>
    /** Tắt hẳn việc gọi API (ô đang đóng, dialog chưa mở…). */
    enabled?: boolean
    /** Số ký tự tối thiểu mới gọi API. `0` = nạp cả khi chưa gõ gì. */
    minChars?: number
    /** CONVENTIONS mục 5.7: mỗi lần nạp **10 phần tử**. */
    pageSize?: number
    debounceMs?: number
}

/**
 * Engine dùng chung cho **mọi ô tìm kiếm có gợi ý nạp từ server** (CONVENTIONS mục 5.7).
 *
 * Gánh 4 việc mà trước đây mỗi màn tự làm một kiểu:
 * 1. **Debounce** — chỉ gọi API sau khi người dùng ngừng gõ, mỗi lần gõ huỷ timer lần trước.
 * 2. **Abort** — request đang bay bị huỷ khi từ khoá đổi, tránh kết quả cũ về sau đè kết quả mới.
 * 3. **Phân trang cộng dồn** — `loadMore()` nối thêm trang sau vào cuối danh sách (infinite scroll).
 * 4. **`hasMore`** — so `items.length` với `total` của server, nhờ đó **không bao giờ cắt kết quả
 *    trong im lặng** như cách nạp một trang `size` lớn rồi lọc phía FE.
 *
 * ⚠️ `loadPage` được giữ trong `ref` nên **không cần `useCallback` ở nơi gọi** — truyền hàm inline
 * cũng không gây vòng lặp nạp lại. Đổi lại, hook **chỉ đọc `loadPage` mới nhất khi có lượt nạp
 * tiếp theo**; đổi tham số bên trong `loadPage` mà muốn nạp lại ngay thì phải đổi `keyword`
 * hoặc bật/tắt `enabled`.
 */
export function usePagedSearch<T>({
    keyword,
    loadPage,
    enabled = true,
    minChars = 0,
    pageSize = 10,
    debounceMs = 300,
}: Options<T>) {
    const [items, setItems] = useState<T[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    /** Đã chạy ít nhất một lượt nạp cho từ khoá hiện tại — để phân biệt "chưa tìm" với "không có". */
    const [searched, setSearched] = useState(false)

    const loaderRef = useRef(loadPage)
    loaderRef.current = loadPage

    /** Trang đã nạp xong gần nhất; `loadMore` xin trang kế tiếp. */
    const pageRef = useRef(1)
    /** Abort của lượt `loadMore` đang bay — tách khỏi abort của lượt tìm mới. */
    const moreControllerRef = useRef<AbortController | null>(null)

    const trimmed = keyword.trim()
    const active = enabled && trimmed.length >= minChars

    useEffect(() => {
        moreControllerRef.current?.abort()
        moreControllerRef.current = null
        pageRef.current = 1

        if (!active) {
            setItems([])
            setTotal(0)
            setLoading(false)
            setLoadingMore(false)
            setSearched(false)
            return
        }

        const controller = new AbortController()
        setLoading(true)
        const timer = setTimeout(() => {
            loaderRef
                .current({ keyword: trimmed, page: 1, size: pageSize, signal: controller.signal })
                .then((result) => {
                    if (controller.signal.aborted) return
                    setItems(result.items)
                    setTotal(result.total)
                })
                .catch(() => {
                    /* api-client đã toast lỗi; coi như không có kết quả để UI không kẹt ở "đang tìm". */
                    if (!controller.signal.aborted) {
                        setItems([])
                        setTotal(0)
                    }
                })
                .finally(() => {
                    if (controller.signal.aborted) return
                    setLoading(false)
                    setSearched(true)
                })
        }, debounceMs)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [trimmed, active, pageSize, debounceMs])

    const hasMore = items.length < total

    /** Nạp trang kế tiếp và **nối vào cuối** — gọi khi người dùng cuộn tới đáy danh sách. */
    const loadMore = useCallback(() => {
        if (!active || loading || loadingMore || items.length >= total) return

        const controller = new AbortController()
        moreControllerRef.current = controller
        const nextPage = pageRef.current + 1
        setLoadingMore(true)

        loaderRef
            .current({ keyword: trimmed, page: nextPage, size: pageSize, signal: controller.signal })
            .then((result) => {
                if (controller.signal.aborted) return
                pageRef.current = nextPage
                /*
                 * Lọc trùng theo tham chiếu là không đủ (mỗi trang là object mới), nhưng nối thẳng
                 * vẫn an toàn: backend phân trang theo `sort` ổn định. Nơi gọi tự đặt `key` theo id.
                 */
                setItems((prev) => [...prev, ...result.items])
                setTotal(result.total)
            })
            .catch(() => {
                /* Nạp thêm lỗi thì giữ nguyên danh sách đang có — người dùng cuộn lại là thử lại. */
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoadingMore(false)
            })
    }, [active, loading, loadingMore, items.length, total, trimmed, pageSize])

    /**
     * Gắn vào phần tử cuộn của danh sách kết quả: chạm đáy ⇒ nạp trang kế.
     * Ngưỡng 48px để nạp trước khi người dùng thực sự chạm đáy, cuộn không bị khựng.
     */
    const onScroll = useCallback(
        (event: UIEvent<HTMLElement>) => {
            const el = event.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) loadMore()
        },
        [loadMore],
    )

    return { items, total, loading, loadingMore, hasMore, searched, loadMore, onScroll }
}
