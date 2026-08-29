import { useCallback, useMemo, useReducer, type ReactNode } from 'react'

import { EPaymentMethod } from '@/types/order'
import {
    CartContext,
    lineDiscountAmount,
    type CartCustomer,
    type CartLine,
    type CartLineWithDiscount,
    type CartState,
    type DiscountType,
} from './cart-context'

/**
 * Store giỏ hàng POS — **tách riêng khỏi state màn hình** theo PLAN Phase 11:
 * giỏ phải sống sót khi mở/đóng dialog thanh toán và có nhiều hành động lồng nhau.
 *
 * Cố ý **không** lưu xuống `localStorage`: giỏ trừ tồn thật ngay khi đặt đơn, một giỏ cũ khôi
 * phục sau F5 dễ dẫn tới đặt nhầm đơn với giá/tồn đã đổi.
 */

const INITIAL_STATE: CartState = {
    lines: [],
    customer: null,
    orderDiscountType: 'percent',
    orderDiscountValue: 0,
    shippingFee: 0,
    paymentMethod: EPaymentMethod.CASH,
    shippingAddress: '',
    description: '',
    guestName: '',
    guestPhone: '',
}

type CartAction =
    | { type: 'addLine'; line: Omit<CartLine, 'quantity'>; quantity: number }
    | { type: 'setQuantity'; skuId: string; quantity: number }
    | { type: 'removeLine'; skuId: string }
    | { type: 'clear' }
    | { type: 'setLineDiscount'; skuId: string; discountType: DiscountType; value: number }
    | { type: 'setCustomer'; customer: CartCustomer | null }
    | { type: 'setOrderDiscountType'; value: DiscountType }
    | { type: 'setOrderDiscountValue'; value: number }
    | { type: 'setShippingFee'; value: number }
    | { type: 'setPaymentMethod'; value: EPaymentMethod }
    | { type: 'setShippingAddress'; value: string }
    | { type: 'setDescription'; value: string }
    | { type: 'setGuestName'; value: string }
    | { type: 'setGuestPhone'; value: string }

function reducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case 'addLine': {
            const existing = state.lines.find((line) => line.skuId === action.line.skuId)
            if (existing) {
                return {
                    ...state,
                    lines: state.lines.map((line) =>
                        line.skuId === action.line.skuId
                            ? {
                                  ...line,
                                  quantity: line.quantity + action.quantity,
                                  // Tồn mới nhất từ lần chọn gần nhất.
                                  available: action.line.available,
                              }
                            : line,
                    ),
                }
            }
            return {
                ...state,
                lines: [...state.lines, { ...action.line, quantity: action.quantity }],
            }
        }

        case 'setQuantity': {
            // Kéo về 0 ⇒ gỡ dòng, thay vì để dòng số lượng 0 gửi lên backend.
            if (action.quantity <= 0) {
                return { ...state, lines: state.lines.filter((line) => line.skuId !== action.skuId) }
            }
            return {
                ...state,
                lines: state.lines.map((line) =>
                    line.skuId === action.skuId ? { ...line, quantity: action.quantity } : line,
                ),
            }
        }

        case 'setLineDiscount':
            return {
                ...state,
                lines: state.lines.map((line) =>
                    line.skuId === action.skuId
                        ? { ...line, discountType: action.discountType, discountValue: action.value }
                        : line,
                ),
            }

        case 'removeLine':
            return { ...state, lines: state.lines.filter((line) => line.skuId !== action.skuId) }

        case 'clear':
            return INITIAL_STATE

        case 'setCustomer':
            return { ...state, customer: action.customer }

        /*
         * Đổi kiểu nhập (% ↔ tiền) thì **reset giá trị về 0**: cùng con số `10` mang nghĩa
         * hoàn toàn khác nhau giữa hai kiểu (10% vs 10 ₫), giữ lại sẽ tạo ra số tiền sai
         * ngay lúc gạt nút mà người dùng không kịp nhận ra.
         */
        case 'setOrderDiscountType':
            return state.orderDiscountType === action.value
                ? state
                : { ...state, orderDiscountType: action.value, orderDiscountValue: 0 }

        case 'setOrderDiscountValue':
            return { ...state, orderDiscountValue: action.value }

        case 'setShippingFee':
            return { ...state, shippingFee: action.value }

        case 'setPaymentMethod':
            return { ...state, paymentMethod: action.value }

        case 'setShippingAddress':
            return { ...state, shippingAddress: action.value }

        case 'setDescription':
            return { ...state, description: action.value }

        case 'setGuestName':
            return { ...state, guestName: action.value }

        case 'setGuestPhone':
            return { ...state, guestPhone: action.value }

        default:
            return state
    }
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

    const addLine = useCallback(
        (line: Omit<CartLine, 'quantity'>, quantity = 1) =>
            dispatch({ type: 'addLine', line, quantity }),
        [],
    )
    const setQuantity = useCallback(
        (skuId: string, quantity: number) => dispatch({ type: 'setQuantity', skuId, quantity }),
        [],
    )
    const removeLine = useCallback((skuId: string) => dispatch({ type: 'removeLine', skuId }), [])
    const clear = useCallback(() => dispatch({ type: 'clear' }), [])
    const setCustomer = useCallback(
        (customer: CartCustomer | null) => dispatch({ type: 'setCustomer', customer }),
        [],
    )
    const setLineDiscount = useCallback(
        (skuId: string, discountType: DiscountType, value: number) =>
            dispatch({ type: 'setLineDiscount', skuId, discountType, value }),
        [],
    )
    const setOrderDiscountType = useCallback(
        (value: DiscountType) => dispatch({ type: 'setOrderDiscountType', value }),
        [],
    )
    const setOrderDiscountValue = useCallback(
        (value: number) => dispatch({ type: 'setOrderDiscountValue', value }),
        [],
    )
    const setShippingFee = useCallback(
        (value: number) => dispatch({ type: 'setShippingFee', value }),
        [],
    )
    const setPaymentMethod = useCallback(
        (value: EPaymentMethod) => dispatch({ type: 'setPaymentMethod', value }),
        [],
    )
    const setShippingAddress = useCallback(
        (value: string) => dispatch({ type: 'setShippingAddress', value }),
        [],
    )
    const setDescription = useCallback(
        (value: string) => dispatch({ type: 'setDescription', value }),
        [],
    )
    const setGuestName = useCallback((value: string) => dispatch({ type: 'setGuestName', value }), [])
    const setGuestPhone = useCallback(
        (value: string) => dispatch({ type: 'setGuestPhone', value }),
        [],
    )

    const itemCount = useMemo(
        () => state.lines.reduce((sum, line) => sum + line.quantity, 0),
        [state.lines],
    )
    const subtotal = useMemo(
        () => state.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
        [state.lines],
    )

    const lineDiscountTotal = useMemo(
        () => state.lines.reduce((sum, line) => sum + lineDiscountAmount(line), 0),
        [state.lines],
    )

    /*
     * Chiết khấu chung tính **trên phần còn lại sau chiết khấu lẻ**, không tính trên tạm tính
     * gộp: nếu không trừ trước, một dòng giảm 100% cộng thêm 20% cả đơn sẽ ra tổng chiết khấu
     * vượt quá tiền hàng.
     */
    const orderDiscountAmount = useMemo(() => {
        const base = Math.max(0, subtotal - lineDiscountTotal)
        const raw =
            state.orderDiscountType === 'percent'
                ? (base * state.orderDiscountValue) / 100
                : state.orderDiscountValue
        return Math.min(Math.max(0, Math.round(raw)), base)
    }, [subtotal, lineDiscountTotal, state.orderDiscountType, state.orderDiscountValue])

    /** Tổng chiết khấu **để hiển thị**. Backend tự cộng lại từ 2 tầng — xem `cart-context`. */
    const discountAmount = useMemo(
        () => Math.min(lineDiscountTotal + orderDiscountAmount, subtotal),
        [lineDiscountTotal, orderDiscountAmount, subtotal],
    )

    /*
     * Dòng hàng ở dạng gửi lên backend. Tính một lần ở đây thay vì để mỗi màn tự map —
     * `CartPanel` (preview) và `CheckoutDialog` (tạo đơn) **bắt buộc gửi giống hệt nhau**,
     * lệch một chút là số tiền xem trước khác số tiền thu thật.
     */
    const orderLines = useMemo<CartLineWithDiscount[]>(
        () => state.lines.map((line) => ({ ...line, discountAmount: lineDiscountAmount(line) })),
        [state.lines],
    )

    const value = useMemo(
        () => ({
            ...state,
            addLine,
            setQuantity,
            removeLine,
            clear,
            setLineDiscount,
            setCustomer,
            setOrderDiscountType,
            setOrderDiscountValue,
            setShippingFee,
            setPaymentMethod,
            setShippingAddress,
            setDescription,
            setGuestName,
            setGuestPhone,
            itemCount,
            subtotal,
            lineDiscountTotal,
            orderDiscountAmount,
            discountAmount,
            orderLines,
        }),
        [
            state,
            addLine,
            setQuantity,
            removeLine,
            clear,
            setLineDiscount,
            setCustomer,
            setOrderDiscountType,
            setOrderDiscountValue,
            setShippingFee,
            setPaymentMethod,
            setShippingAddress,
            setDescription,
            setGuestName,
            setGuestPhone,
            itemCount,
            subtotal,
            lineDiscountTotal,
            orderDiscountAmount,
            discountAmount,
            orderLines,
        ],
    )

    return <CartContext value={value}>{children}</CartContext>
}
