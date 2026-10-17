import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

/** Id chứng từ của backend (uuid). Mặc định cho `?open=` — giá trị khác bị bỏ qua. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Options = {
    /**
     * Giá trị hợp lệ của param (mặc định UUID). Query là dữ liệu không tin cậy (link người khác gửi,
     * `refId` từ WS…): giá trị sai định dạng bị **bỏ qua** (và param vẫn được xoá) thay vì đi vào
     * đường dẫn API — vd `..%2Faccount%2Fme` sẽ bị trình duyệt chuẩn hoá thành một endpoint khác.
     */
    pattern?: RegExp
    /** Param đi kèm cần xoá cùng `param` (chỉ có tác dụng khi `consume`). */
    extraParams?: string[]
    /**
     * Xoá param sau khi xử lý (mặc định `true`) để F5 / nút Back không mở lại.
     *
     * ⚠️ Tối đa **một** hook `consume` cho mỗi lần điều hướng: `setSearchParams(fn)` của
     * react-router tính từ `searchParams` của lần render, KHÔNG xếp hàng — hai hook cùng xoá param
     * trong một commit sẽ ghi đè nhau (hook sau khôi phục param mà hook trước vừa xoá). Hook nào chỉ
     * cần *đọc* (vd chuyển tab, còn param cho component con xử lý) thì đặt `consume: false`.
     */
    consume?: boolean
}

/**
 * Deep-link từ quả chuông: trang list đọc `?<param>=<id>` và mở chi tiết tương ứng.
 *
 * - Chạy cả khi đã đứng sẵn ở trang (chỉ đổi query) lẫn khi vừa điều hướng tới: mỗi lần điều hướng
 *   (`location.key` mới) là một lần kích hoạt, kể cả khi `<id>` trùng lần trước.
 * - `onOpen` nhận thêm `params` (bản chụp TRƯỚC khi xoá) để đọc các param đi kèm.
 */
export function useOpenFromQuery(
    param: string,
    onOpen: (value: string, params: URLSearchParams) => void,
    { extraParams = [], consume = true, pattern = UUID_PATTERN }: Options = {},
): void {
    const [params, setParams] = useSearchParams()
    const { key } = useLocation()
    const value = params.get(param)

    const onOpenRef = useRef(onOpen)
    const extraRef = useRef(extraParams)
    useEffect(() => {
        onOpenRef.current = onOpen
        extraRef.current = extraParams
    })

    /** Chống StrictMode (dev) chạy effect hai lần trước khi URL kịp đổi. */
    const handled = useRef<string | null>(null)

    useEffect(() => {
        if (!value) {
            handled.current = null
            return
        }
        const token = `${key}|${value}`
        if (handled.current === token) return
        handled.current = token

        if (pattern.test(value)) onOpenRef.current(value, new URLSearchParams(params))
        if (!consume) return
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete(param)
                extraRef.current.forEach((name) => next.delete(name))
                return next
            },
            { replace: true },
        )
    }, [value, key, param, params, consume, pattern, setParams])
}
