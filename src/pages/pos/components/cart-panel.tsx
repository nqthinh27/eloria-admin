import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Minus, Plus, ShoppingCart, Trash2, User, X } from 'lucide-react'

import { customerApi } from '@/api/customer'
import { orderApi } from '@/api/order'
import { formatVnd } from '@/lib/format'
import { toastWarning } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types/customer'
import type { CartPreview } from '@/types/order'
import { lineDiscountAmount, type DiscountType } from '@/contexts/cart-context'
import { useCart } from '@/hooks/use-cart'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/** Chờ gõ xong mới gọi `cart/preview`. */
const DEBOUNCE_MS = 400

/**
 * Tra khách hàng: **chờ ngừng gõ 1s mới gọi API** (user chốt 2026-08-19).
 * Dài hơn debounce của preview vì mỗi lần gõ ở đây là một truy vấn tìm kiếm thật sự,
 * còn preview chỉ tính tiền trên giỏ đã có.
 */
const CUSTOMER_DEBOUNCE_MS = 1000

/** Ngắn hơn thế thì kết quả tìm kiếm quá rộng, không đáng gọi API. */
const CUSTOMER_MIN_CHARS = 2

/**
 * Nút gạt chọn kiểu nhập chiết khấu: **%** hay **₫**.
 *
 * Tự dựng từ 2 `Button` thay vì `ToggleGroup` của shadcn — repo chưa cài component đó và
 * ở đây chỉ cần 2 lựa chọn loại trừ nhau; thêm dependency mới cho từng đó là thừa.
 */
function DiscountTypeToggle({
    value,
    onChange,
    size = 'default',
    ariaLabel,
}: {
    value: DiscountType
    onChange: (value: DiscountType) => void
    size?: 'default' | 'sm'
    ariaLabel: string
}) {
    const options: { type: DiscountType; label: string }[] = [
        { type: 'percent', label: '%' },
        { type: 'amount', label: '₫' },
    ]
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            className="bg-muted flex shrink-0 items-center rounded-md p-0.5">
            {options.map((option) => (
                <button
                    key={option.type}
                    type="button"
                    aria-pressed={value === option.type}
                    onClick={() => onChange(option.type)}
                    className={cn(
                        'rounded-sm font-medium transition-colors',
                        size === 'sm' ? 'h-6 w-7 text-xs' : 'h-8 w-9 text-sm',
                        value === option.type
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}>
                    {option.label}
                </button>
            ))}
        </div>
    )
}

/** Parse ô nhập số: rỗng/không hợp lệ/âm ⇒ 0. Trần trên do FE tự clamp khi quy đổi. */
function parseAmount(raw: string): number {
    const parsed = Number(raw.replace(/[^\d.]/g, ''))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/**
 * Cột phải màn POS theo `03-pos-ban-hang.png`: ô gán khách theo SĐT, danh sách dòng hàng,
 * ô chiết khấu, khối tổng tiền, nút Thanh toán + Xoá giỏ hàng.
 *
 * ⚠️ **Số tiền hiển thị lấy từ `POST /order/cart/preview` của backend**, không tự cộng ở client:
 * giá do server chốt theo `product.price`, và backend còn tự clamp giảm giá ≤ tạm tính.
 * Tổng tính tay ở client chỉ dùng làm giá trị tạm trong lúc chờ preview.
 *
 * ⚠️ **Chiết khấu KHÔNG ràng buộc ngưỡng** — bỏ qua dòng *"tối đa 10% cho STAFF"* của mockup
 * (B8 hoãn sang Phase 16, user chốt 2026-08-15).
 */
export function CartPanel({
    branchId,
    onCheckout,
    checkoutAnchorRef,
}: {
    branchId: string | null
    onCheckout: () => void
    /** Điểm đến của hiệu ứng "bay vào giỏ" — xem `fly-to-cart.tsx`. */
    checkoutAnchorRef?: React.RefObject<HTMLDivElement | null>
}) {
    const { t } = useTranslation(['order', 'common'])
    const {
        lines,
        customer,
        orderDiscountType,
        orderDiscountValue,
        shippingFee,
        itemCount,
        subtotal,
        lineDiscountTotal,
        orderDiscountAmount,
        discountAmount,
        orderLines,
        setQuantity,
        removeLine,
        clear,
        setCustomer,
        setLineDiscount,
        setOrderDiscountType,
        setOrderDiscountValue,
    } = useCart()

    const [preview, setPreview] = useState<CartPreview | null>(null)
    const [previewing, setPreviewing] = useState(false)
    const [customerQuery, setCustomerQuery] = useState('')
    const [lookingUp, setLookingUp] = useState(false)
    const [candidates, setCandidates] = useState<Customer[] | null>(null)
    const [clearOpen, setClearOpen] = useState(false)
    /** Dòng vừa gõ số lượng vượt tồn — chỉ để bật animation rung, tự tắt sau khi chạy xong. */
    const [shakeSkuId, setShakeSkuId] = useState<string | null>(null)

    /** Bỏ qua kết quả preview về muộn hơn lần gọi mới nhất (race giữa các lần gõ). */
    const previewSeq = useRef(0)

    /* ---------------- Tính tiền qua backend ---------------- */
    useEffect(() => {
        if (orderLines.length === 0) {
            setPreview(null)
            return
        }

        const controller = new AbortController()
        const seq = ++previewSeq.current
        const timer = setTimeout(() => {
            setPreviewing(true)
            orderApi
                .cartPreview(
                    {
                        branchId: branchId ?? undefined,
                        /*
                         * **Gửi TÁCH 2 tầng** (backend 2026-08-21): chiết khấu lẻ đi theo từng
                         * dòng, chiết khấu chung đi ở header. Backend tự cộng lại thành
                         * `discountAmount` của response — gửi thêm con số gộp ở đây nữa là
                         * trừ hai lần.
                         */
                        discountAmount: orderDiscountAmount || undefined,
                        shippingFee: shippingFee || undefined,
                        lines: orderLines.map((line) => ({
                            skuId: line.skuId,
                            quantity: line.quantity,
                            discountAmount: line.discountAmount || undefined,
                        })),
                    },
                    controller.signal,
                )
                .then((result) => {
                    if (seq === previewSeq.current) setPreview(result)
                })
                .catch(() => {
                    // api-client đã toast. Giữ số tính tay để giỏ không nhảy về rỗng.
                    if (!controller.signal.aborted && seq === previewSeq.current) setPreview(null)
                })
                .finally(() => {
                    /*
                     * Chỉ so `seq`, KHÔNG chặn theo `controller.signal.aborted`: lần gọi bị huỷ
                     * luôn có `seq` cũ nên đã tự bị loại. Nếu chặn thêm bằng `aborted` thì lần
                     * gọi **mới nhất** bị huỷ (người dùng sửa giỏ rồi rời màn) sẽ không bao giờ
                     * tắt cờ `previewing` ⇒ **nút Thanh toán kẹt disabled vĩnh viễn**.
                     */
                    if (seq === previewSeq.current) setPreviewing(false)
                })
        }, DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [orderLines, orderDiscountAmount, shippingFee, branchId])

    /* ---------------- Tra khách theo SĐT hoặc tên ---------------- */
    useEffect(() => {
        const value = customerQuery.trim()
        if (value.length < CUSTOMER_MIN_CHARS || customer) {
            setCandidates(null)
            setLookingUp(false)
            return
        }

        const controller = new AbortController()
        /*
         * Chỉ gọi API sau khi người dùng NGỪNG GÕ 1s: mỗi lần gõ đều clear timer của lần trước
         * và abort request đang bay, nên gõ liên tục không sinh request nào.
         */
        const timer = setTimeout(() => {
            setLookingUp(true)
            /*
             * Dùng `customer/search` chứ KHÔNG dùng `customer/duplicates`: endpoint tra trùng là
             * `[ADMIN]` (STAFF gọi bị 403), mà màn POS phải chạy được với STAFF.
             * `keyword` của backend khớp **cả SĐT lẫn họ tên** ⇒ một ô nhập là đủ.
             * `status: 1` để không gán được khách đã bị khoá.
             */
            customerApi
                .search({ keyword: value, status: 1 }, { page: 1, size: 8 }, controller.signal)
                .then((result) => {
                    if (!controller.signal.aborted) setCandidates(result.data)
                })
                .catch(() => {
                    // api-client đã toast; coi như không có kết quả để UI không kẹt ở "đang tìm".
                    if (!controller.signal.aborted) setCandidates([])
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLookingUp(false)
                })
        }, CUSTOMER_DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [customerQuery, customer])

    const handlePickCustomer = useCallback(
        (picked: Customer) => {
            setCustomer({
                id: picked.id,
                fullName: picked.fullName,
                phoneNumber: picked.phoneNumber,
            })
            setCustomerQuery('')
            setCandidates(null)
        },
        [setCustomer],
    )

    const handleClearCustomer = useCallback(() => {
        setCustomer(null)
        setCustomerQuery('')
        setCandidates(null)
    }, [setCustomer])

    /**
     * Đổi số lượng bằng ô nhập tay — **chặn nhập vượt tồn** ngay tại đây thay vì chỉ cảnh báo.
     *
     * ⚠️ Đây vẫn chỉ là chặn phía client dựa trên `line.available` (tồn tại thời điểm thêm vào
     * giỏ) — điểm chặn chắc chắn duy nhất vẫn là `error.stock.insufficient` ở `POST /order`
     * (xem CLAUDE.md, mục "Mô hình tồn kho"). Ở đây chỉ để nhân viên **thấy ngay** lúc gõ.
     */
    const handleQuantityInput = useCallback(
        (skuId: string, raw: string, available: number) => {
            const parsed = Math.trunc(Number(raw.replace(/[^\d]/g, '')))
            if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
                setQuantity(skuId, 0)
                return
            }
            if (parsed > available) {
                setQuantity(skuId, available)
                setShakeSkuId(skuId)
                window.setTimeout(
                    () => setShakeSkuId((current) => (current === skuId ? null : current)),
                    400,
                )
                toastWarning('order.pos.cart.insufficient', { ns: 'order', count: available })
                return
            }
            setQuantity(skuId, parsed)
        },
        [setQuantity],
    )

    const handleClearCart = useCallback(() => {
        clear()
        setCustomerQuery('')
        setCandidates(null)
        setPreview(null)
        setClearOpen(false)
    }, [clear])

    /* Ưu tiên số của backend; chưa có preview thì tạm hiển thị số tính tay. */
    const shownSubtotal = preview?.subtotal ?? subtotal
    const shownDiscount = preview?.discountAmount ?? 0
    const shownShipping = preview?.shippingFee ?? shippingFee
    const shownTotal =
        preview?.totalAmount ?? Math.max(0, subtotal - discountAmount) + shippingFee

    /** Tồn cảnh báo theo từng dòng — lấy từ preview vì đó là số tồn mới nhất. */
    const insufficientBySku = new Map(
        (preview?.lines ?? []).map((line) => [line.skuId, line] as const),
    )

    return (
        <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
            {/* ---------- Gán khách hàng ---------- */}
            <div className="border-b p-4">
                {customer ? (
                    <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                            <User className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{customer.fullName}</p>
                            <p className="text-muted-foreground truncate text-xs">
                                {customer.phoneNumber}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleClearCustomer}
                            aria-label={t('order.pos.cart.customerClear')}>
                            <X className="size-4" />
                        </Button>
                    </div>
                ) : (
                    // `relative` để danh sách gợi ý neo theo ô nhập; danh sách dùng `absolute` nên
                    // NỔI lên trên, không đẩy dòng hàng bên dưới xuống (user chốt 2026-08-28).
                    <div className="relative">
                        <div className="relative">
                            <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={customerQuery}
                                onChange={(event) => setCustomerQuery(event.target.value)}
                                placeholder={t('order.pos.cart.customerPlaceholder')}
                                className="pl-9"
                            />
                            {lookingUp && (
                                <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
                            )}
                        </div>

                        {/*
                          Danh sách gợi ý NỔI ngay dưới ô nhập (không dùng Popover) để không cướp
                          focus khỏi ô nhập — nhân viên vẫn gõ tiếp được khi kết quả về.
                          `min-w-72` để hàng tên + SĐT không bị bó theo bề rộng cột giỏ hàng khi màn
                          hẹp. Dùng `bg-popover`, KHÔNG dùng `bg-background` (CONVENTIONS mục 5).
                        */}
                        {candidates !== null && !lookingUp && (
                            <div className="bg-popover absolute top-full right-0 left-0 z-50 mt-2 min-w-72 rounded-md border shadow-lg">
                                {candidates.length === 0 ? (
                                    <p className="text-muted-foreground px-3 py-2 text-xs">
                                        {t('order.pos.cart.customerNotFound')}
                                    </p>
                                ) : (
                                    <ul className="max-h-64 divide-y overflow-auto">
                                        {candidates.map((row) => (
                                            <li key={row.id}>
                                                <button
                                                    type="button"
                                                    className="hover:bg-accent focus-visible:bg-accent w-full px-3 py-2 text-left outline-none"
                                                    onClick={() => handlePickCustomer(row)}>
                                                    <p className="truncate text-sm font-medium">
                                                        {row.fullName}
                                                    </p>
                                                    {/*
                                                      Từ Phase 3b (2026-08-28) kết quả tra khách là
                                                      TOÀN CHUỖI, không còn giới hạn chi nhánh ⇒ hiện
                                                      thêm chi nhánh đăng ký để phân biệt hai khách
                                                      trùng tên ở hai chi nhánh khác nhau.
                                                    */}
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        {row.branchName
                                                            ? `${row.phoneNumber} · ${row.branchName}`
                                                            : row.phoneNumber}
                                                    </p>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ---------- Dòng hàng ---------- */}
            <div className="min-h-0 flex-1 overflow-auto">
                {lines.length === 0 ? (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                        <ShoppingCart className="size-12 opacity-30" />
                        <p className="text-sm font-medium">{t('order.pos.cart.empty')}</p>
                        <p className="text-xs">{t('order.pos.cart.emptyHint')}</p>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {lines.map((line) => {
                            const previewLine = insufficientBySku.get(line.skuId)
                            /*
                             * Thành tiền tính tay để hiển thị **tức thời khi đang gõ**, chưa
                             * chờ preview về. Từ 2026-08-21 backend đã trả `previewLine.lineTotal`
                             * đúng theo từng dòng (đã trừ chiết khấu lẻ) — con số chính thức là
                             * của backend, số tính tay chỉ là giá trị tạm.
                             */
                            const gross = line.unitPrice * line.quantity
                            const lineDiscount = lineDiscountAmount(line)
                            return (
                                <li key={line.skuId} className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {line.productName}
                                            </p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                {[line.sizeLabel, line.colorName]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-7 shrink-0"
                                            onClick={() => removeLine(line.skuId)}
                                            aria-label={t('order.pos.cart.remove')}>
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                onClick={() =>
                                                    setQuantity(line.skuId, line.quantity - 1)
                                                }
                                                aria-label={t('order.pos.cart.quantity')}>
                                                <Minus className="size-3.5" />
                                            </Button>
                                            {/*
                                             * Nhập tay thay vì chỉ +/-1 — chặn ngay tại
                                             * `handleQuantityInput` khi gõ số lớn hơn tồn.
                                             */}
                                            <Input
                                                value={line.quantity}
                                                onChange={(event) =>
                                                    handleQuantityInput(
                                                        line.skuId,
                                                        event.target.value,
                                                        line.available,
                                                    )
                                                }
                                                inputMode="numeric"
                                                aria-label={t('order.pos.cart.quantity')}
                                                className={cn(
                                                    'h-7 w-14 px-1 text-center tabular-nums',
                                                    shakeSkuId === line.skuId &&
                                                        'animate-pos-shake-error',
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                disabled={line.quantity >= line.available}
                                                onClick={() =>
                                                    handleQuantityInput(
                                                        line.skuId,
                                                        String(line.quantity + 1),
                                                        line.available,
                                                    )
                                                }
                                                aria-label={t('order.pos.cart.quantity')}>
                                                <Plus className="size-3.5" />
                                            </Button>
                                        </div>
                                        <span
                                            className={cn(
                                                'text-sm font-medium tabular-nums',
                                                lineDiscount > 0 &&
                                                    'text-muted-foreground line-through',
                                            )}>
                                            {formatVnd(gross)}
                                        </span>
                                    </div>

                                    {/* ---- Chiết khấu riêng của dòng ---- */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <DiscountTypeToggle
                                            size="sm"
                                            value={line.discountType}
                                            ariaLabel={t('order.pos.cart.lineDiscountType')}
                                            onChange={(type) =>
                                                /*
                                                 * Đổi kiểu ⇒ reset về 0, cùng lý do với chiết
                                                 * khấu chung: `10` theo % khác hẳn `10` theo ₫.
                                                 */
                                                setLineDiscount(line.skuId, type, 0)
                                            }
                                        />
                                        <Input
                                            value={line.discountValue || ''}
                                            onChange={(event) =>
                                                setLineDiscount(
                                                    line.skuId,
                                                    line.discountType,
                                                    parseAmount(event.target.value),
                                                )
                                            }
                                            placeholder={t('order.pos.cart.lineDiscountPlaceholder')}
                                            inputMode="decimal"
                                            className="h-7 flex-1 text-xs"
                                        />
                                        {lineDiscount > 0 && (
                                            <span className="text-sm font-medium tabular-nums">
                                                {formatVnd(gross - lineDiscount)}
                                            </span>
                                        )}
                                    </div>

                                    {previewLine?.insufficient && (
                                        <p className="text-destructive mt-1 text-xs">
                                            {t('order.pos.cart.insufficient', {
                                                count: previewLine.available,
                                            })}
                                        </p>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            {/* ---------- Chiết khấu + tổng ---------- */}
            <div className="space-y-3 border-t p-4">
                {/* ---- Chiết khấu chung cả đơn ---- */}
                <div className="flex items-center gap-2">
                    <DiscountTypeToggle
                        value={orderDiscountType}
                        ariaLabel={t('order.pos.cart.orderDiscountType')}
                        onChange={setOrderDiscountType}
                    />
                    <Input
                        value={orderDiscountValue || ''}
                        onChange={(event) => setOrderDiscountValue(parseAmount(event.target.value))}
                        placeholder={t('order.pos.cart.discountPlaceholder')}
                        inputMode="decimal"
                        className="flex-1"
                        disabled={lines.length === 0}
                    />
                </div>

                <dl className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{t('order.pos.cart.subtotal')}</dt>
                        <dd className="tabular-nums">{formatVnd(shownSubtotal)}</dd>
                    </div>
                    {lineDiscountTotal > 0 && (
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">
                                {t('order.pos.cart.lineDiscountTotal')}
                            </dt>
                            <dd className="text-destructive tabular-nums">
                                −{formatVnd(lineDiscountTotal)}
                            </dd>
                        </div>
                    )}
                    {orderDiscountAmount > 0 && (
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">
                                {t('order.pos.cart.orderDiscount')}
                            </dt>
                            <dd className="text-destructive tabular-nums">
                                −{formatVnd(orderDiscountAmount)}
                            </dd>
                        </div>
                    )}
                    {/*
                      * Backend clamp chiết khấu ≤ tạm tính, nên con số nó trả về có thể NHỎ HƠN
                      * tổng FE tính. Chỉ hiện dòng này khi lệch, để nhân viên thấy số thật sẽ
                      * được áp thay vì tin vào hai dòng phân tách bên trên.
                      */}
                    {preview !== null && shownDiscount !== discountAmount && (
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">{t('order.pos.cart.discount')}</dt>
                            <dd className="text-destructive tabular-nums">
                                −{formatVnd(shownDiscount)}
                            </dd>
                        </div>
                    )}
                    {shownShipping > 0 && (
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">
                                {t('order.pos.cart.shippingFee')}
                            </dt>
                            <dd className="tabular-nums">{formatVnd(shownShipping)}</dd>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                        <dt>{t('order.pos.cart.total')}</dt>
                        <dd
                            className={cn(
                                'tabular-nums',
                                previewing && 'text-muted-foreground animate-pulse',
                            )}>
                            {formatVnd(shownTotal)}
                        </dd>
                    </div>
                </dl>

                {/*
                 * `div` bọc ngoài làm điểm neo cho hiệu ứng bay — `Button` của shadcn không
                 * forward ref nên gắn thẳng lên nó sẽ không lấy được toạ độ qua `getBoundingClientRect`.
                 */}
                <div ref={checkoutAnchorRef}>
                    <Button
                        type="button"
                        className="w-full"
                        size="lg"
                        disabled={lines.length === 0 || previewing}
                        onClick={onCheckout}>
                        {t('order.pos.cart.checkout')}
                        {itemCount > 0 && ` (${itemCount})`}
                    </Button>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={lines.length === 0}
                    onClick={() => setClearOpen(true)}>
                    <X className="size-4" />
                    {t('order.pos.cart.clear')}
                </Button>
            </div>

            <ConfirmDialog
                open={clearOpen}
                onOpenChange={setClearOpen}
                title={t('order.pos.cart.clearConfirmTitle')}
                description={t('order.pos.cart.clearConfirmDescription')}
                onConfirm={handleClearCart}
            />
        </Card>
    )
}
