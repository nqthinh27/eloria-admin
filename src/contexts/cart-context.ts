import { createContext } from 'react'

import type { EPaymentMethod } from '@/types/order'

/**
 * Kiểu nhập chiết khấu trên UI. **Chỉ tồn tại ở FE** — mọi giá trị đều được quy đổi ra
 * **số tiền (VND)** trước khi gửi lên backend.
 *
 * Backend nhận `%` **chỉ ở cấp đơn** (`discountPercent`), còn cấp dòng chỉ nhận số tiền
 * (`lines[].discountAmount`) ⇒ quy đổi hết ra tiền ở FE là cách duy nhất để hai kiểu nhập
 * hành xử giống nhau ở cả hai tầng.
 */
export type DiscountType = 'percent' | 'amount'

/**
 * Một dòng trong giỏ hàng POS.
 *
 * ⚠️ **`unitPrice` chỉ để hiển thị tạm** khi chưa gọi `cart/preview`: giá thật do **server**
 * chốt (`product.price` theo SKU) và trả về ở `CartPreviewLine.unitPrice`. Không bao giờ gửi
 * giá này lên khi tạo đơn — `OrderLineReq` cố tình không có field giá.
 *
 * ⚠️ `skuId` là **MÃ SKU** (`SP001-BK-AO-L`), không phải UUID.
 */
export type CartLine = {
    skuId: string
    skuCode: string
    productName: string
    colorName: string | null
    sizeLabel: string | null
    /** Giá tham chiếu lấy từ `Product.price` — xem cảnh báo ở trên. */
    unitPrice: number
    quantity: number
    /** Tồn tại thời điểm thêm vào giỏ, chỉ để cảnh báo sớm. */
    available: number
    /** Kiểu nhập chiết khấu **riêng của dòng này**. */
    discountType: DiscountType
    /**
     * Giá trị chiết khấu theo `discountType`: `percent` ⇒ 0–100, `amount` ⇒ số tiền VND.
     * Số tiền quy đổi thực tế tính bằng `lineDiscountAmount()`.
     */
    discountValue: number
}

/** Khách được gán cho đơn. `null` ⇒ khách vãng lai (điền tên/SĐT tay ở dialog thanh toán). */
export type CartCustomer = {
    id: string
    fullName: string
    phoneNumber: string
}

export type CartState = {
    lines: CartLine[]
    customer: CartCustomer | null
    /**
     * Chiết khấu **chung cho cả đơn**, nhập theo % hoặc theo tiền (người dùng tự chọn bằng
     * nút gạt). Luôn được quy đổi ra tiền trước khi gửi lên backend.
     *
     * ⚠️ **Không ràng buộc ngưỡng** — B8 hoãn sang Phase 16 (user chốt 2026-08-15).
     */
    orderDiscountType: DiscountType
    /** Giá trị theo `orderDiscountType`: `percent` ⇒ 0–100, `amount` ⇒ VND. */
    orderDiscountValue: number
    shippingFee: number
    paymentMethod: EPaymentMethod
    shippingAddress: string
    /** Ghi chú nội bộ nhập ở dialog thanh toán. */
    description: string
    /** Tên/SĐT khách vãng lai khi không gán `customer`. */
    guestName: string
    guestPhone: string
}

/** Một dòng giỏ kèm số tiền chiết khấu đã quy đổi — dạng sẵn sàng gửi lên backend. */
export type CartLineWithDiscount = CartLine & {
    /** `lineDiscountAmount(line)` — số tiền, đã clamp ≤ thành tiền dòng. */
    discountAmount: number
}

export type CartContextValue = CartState & {
    /** Thêm SKU vào giỏ; đã có thì cộng dồn số lượng. */
    addLine: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
    setQuantity: (skuId: string, quantity: number) => void
    removeLine: (skuId: string) => void
    clear: () => void

    /** Đặt chiết khấu riêng cho một dòng hàng. */
    setLineDiscount: (skuId: string, type: DiscountType, value: number) => void

    setCustomer: (customer: CartCustomer | null) => void
    setOrderDiscountType: (value: DiscountType) => void
    setOrderDiscountValue: (value: number) => void
    setShippingFee: (value: number) => void
    setPaymentMethod: (value: EPaymentMethod) => void
    setShippingAddress: (value: string) => void
    setDescription: (value: string) => void
    setGuestName: (value: string) => void
    setGuestPhone: (value: string) => void

    /** Tổng số lượng sản phẩm (không phải số dòng). */
    itemCount: number
    /**
     * Tạm tính **phía client** (chưa trừ chiết khấu) — chỉ để hiển thị tức thời khi gõ.
     * Con số chính thức luôn lấy từ `cart/preview` của backend.
     */
    subtotal: number
    /** Tổng chiết khấu **riêng từng dòng**, đã quy đổi ra tiền. */
    lineDiscountTotal: number
    /** Chiết khấu **chung cả đơn**, đã quy đổi ra tiền (tính trên tạm tính sau chiết khấu lẻ). */
    orderDiscountAmount: number
    /**
     * `lineDiscountTotal + orderDiscountAmount` — tổng chiết khấu **để hiển thị**.
     *
     * ⚠️ **Không còn là con số gửi lên backend.** Từ khi backend có mô hình giảm giá 2 tầng
     * (2026-08-21), FE gửi **tách**: chiết khấu lẻ theo `orderLines[].discountAmount`, chiết
     * khấu chung theo `orderDiscountAmount`. Backend tự cộng lại — gửi cả con số gộp này nữa
     * là **trừ hai lần**.
     */
    discountAmount: number
    /**
     * Dòng hàng ở dạng **gửi thẳng lên backend**: `skuId` + `quantity` + `discountAmount`
     * (chiết khấu lẻ đã quy đổi ra tiền).
     *
     * Gom ở đây để `CartPanel` và `CheckoutDialog` **không mỗi nơi map một kiểu** — hai màn từng
     * lệch nhau và đó là nguồn của lỗi trừ chiết khấu hai lần.
     */
    orderLines: CartLineWithDiscount[]
}

/** Quy đổi chiết khấu của một dòng ra **tiền**, clamp trong khoảng `[0, thành tiền]`. */
export function lineDiscountAmount(line: CartLine): number {
    const gross = line.unitPrice * line.quantity
    const raw =
        line.discountType === 'percent'
            ? (gross * line.discountValue) / 100
            : line.discountValue
    return Math.min(Math.max(0, Math.round(raw)), gross)
}

export const CartContext = createContext<CartContextValue | null>(null)
