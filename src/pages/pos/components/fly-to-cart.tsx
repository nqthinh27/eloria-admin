import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShoppingCart } from 'lucide-react'

/** Vừa đủ thời gian sống của phần tử bay trước khi tự gỡ khỏi DOM — khớp `pos-fly-to-cart` ở index.css. */
const FLY_DURATION_MS = 550

type FlyingItem = {
    id: number
    startX: number
    startY: number
    dx: number
    dy: number
}

/**
 * Hiệu ứng "bay vào giỏ hàng" khi thêm sản phẩm ở màn POS (`ProductPicker`).
 *
 * Dựng bằng `createPortal` gắn thẳng vào `document.body`: điểm xuất phát là toạ độ dòng vừa bấm,
 * điểm đến là tâm của `cartAnchorRef` (khối tổng tiền/nút Thanh toán ở `CartPanel`) — cả hai đều
 * là toạ độ `viewport` (`getBoundingClientRect`) nên portal ra ngoài mọi container `overflow-auto`
 * của bảng sản phẩm là bắt buộc, không thì icon bay sẽ bị bảng cắt mất.
 *
 * Trả về `{ overlay, fly }`: gọi `fly(sourceEl)` tại `onClick` của dòng sản phẩm.
 */
export function useFlyToCart(cartAnchorRef: React.RefObject<HTMLElement | null>) {
    const [items, setItems] = useState<FlyingItem[]>([])
    const nextId = useRef(0)

    const fly = useCallback(
        (sourceEl: HTMLElement) => {
            const anchor = cartAnchorRef.current
            if (!anchor) return

            const from = sourceEl.getBoundingClientRect()
            const to = anchor.getBoundingClientRect()

            const startX = from.left + from.width / 2
            const startY = from.top + from.height / 2
            const dx = to.left + to.width / 2 - startX
            const dy = to.top + to.height / 2 - startY

            const id = nextId.current++
            setItems((prev) => [...prev, { id, startX, startY, dx, dy }])
            window.setTimeout(() => {
                setItems((prev) => prev.filter((item) => item.id !== id))
            }, FLY_DURATION_MS)
        },
        [cartAnchorRef],
    )

    const overlay = createPortal(
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
            {items.map((item) => (
                <span
                    key={item.id}
                    className="animate-pos-fly-to-cart bg-primary text-primary-foreground absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg"
                    style={{
                        left: item.startX,
                        top: item.startY,
                        // Đọc bởi keyframe `pos-fly-to-cart` trong index.css.
                        ['--fly-x' as string]: `${item.dx}px`,
                        ['--fly-y' as string]: `${item.dy}px`,
                    }}>
                    <ShoppingCart className="size-4" />
                </span>
            ))}
        </div>,
        document.body,
    )

    return { overlay, fly }
}
