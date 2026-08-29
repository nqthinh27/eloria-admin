import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Building2, Store } from 'lucide-react'

import { orderApi } from '@/api/order'
import { hasRole } from '@/config/roles'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { useCart } from '@/hooks/use-cart'
import { ERole } from '@/types/common'
import type { Invoice, Order } from '@/types/order'
import { EPaymentMethod, EPaymentStatus } from '@/types/order'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CartProvider } from '@/contexts/CartProvider'
import { printInvoice } from '@/pages/orders/components/print-invoice'
import { QrPaymentDialog } from '@/pages/orders/components/qr-payment-dialog'
import { CartPanel } from './components/cart-panel'
import { CheckoutDialog } from './components/checkout-dialog'
import { useFlyToCart } from './components/fly-to-cart'
import { OrderReceiptDialog } from './components/order-receipt-dialog'
import { ProductPicker } from './components/product-picker'

/**
 * Màn "Bán hàng (POS)" theo `03-pos-ban-hang.png` — PLAN Phase 11.
 *
 * **Bỏ hoàn toàn gate mở ca**: vào thẳng màn bán, không chặn "chưa mở ca"
 * (`02-pos-mo-ca.png` đã chuyển sang Phase 15 — giai đoạn bán online tại nhà chưa cần ca).
 *
 * Bố cục 2 cột như mockup: trái là bộ chọn hàng, phải là giỏ hàng.
 * Giỏ hàng nằm trong `CartProvider` riêng để sống sót qua các dialog lồng nhau.
 */
function PosScreen() {
    const { t } = useTranslation(['order', 'common'])
    const { user } = useAuth()
    const navigate = useNavigate()
    const { clear, lines } = useCart()
    const { branches, refresh: refreshBranches } = useBranch()

    /*
     * **Chỉ SUPER_ADMIN mới chọn được chi nhánh.**
     *
     * Backend (`OrderServiceImpl#resolveScopedBranch`) chỉ đọc `branchId` của request khi người
     * gọi là SUPER_ADMIN; **STAFF và ADMIN đều bị ép về `me.getBranchId()`** và `branchId` gửi lên
     * bị **bỏ qua trong im lặng** — đã đo thật: ADMIN gửi chi nhánh khác, đơn vẫn tạo ở chi nhánh
     * của chính họ. Vì vậy **không bày dropdown cho ADMIN**: cho chọn rồi vẫn tạo sang chi nhánh
     * khác là đánh lừa người dùng (và tồn hiển thị sẽ lệch hẳn với tồn thực sự bị trừ).
     * Xem `docs/api/order-branch-scope-audit.md` phía backend.
     */
    const canPickBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const [branchId, setBranchId] = useState<string | null>(user?.branchId ?? null)
    const [pendingBranchId, setPendingBranchId] = useState<string | null>(null)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    /** Đơn vừa tạo — mở modal xem trước phiếu. `null` ⇒ đóng modal. */
    const [created, setCreated] = useState<Order | null>(null)
    const [paymentFailed, setPaymentFailed] = useState(false)
    /** Nội dung phiếu để xem trước **và** để in — cùng một nguồn `GET /order/{id}/invoice`. */
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loadingInvoice, setLoadingInvoice] = useState(false)
    /** Đang gọi `POST /order/{id}/payment`. */
    const [confirming, setConfirming] = useState(false)
    /** Dialog quét mã VietQR (chỉ với hình thức `QR`) chồng lên modal phiếu. */
    const [qrOpen, setQrOpen] = useState(false)

    /*
     * Hiệu ứng "bay vào giỏ" khi thêm hàng — điểm đến neo vào nút Thanh toán của `CartPanel`.
     * Đặt ở đây (cha chung) vì `ProductPicker` (nơi bắn hiệu ứng) và `CartPanel` (nơi neo) là
     * hai component anh em, không có DOM chung nào gần hơn để `document.getElementById`.
     */
    const cartAnchorRef = useRef<HTMLDivElement>(null)
    const { overlay: flyOverlay, fly: flyToCart } = useFlyToCart(cartAnchorRef)

    /** Tăng sau mỗi lần bán xong ⇒ `ProductPicker` nạp lại tồn (CONVENTIONS mục 5.1). */
    const [stockReloadSignal, setStockReloadSignal] = useState(0)

    useEffect(() => {
        if (!canPickBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canPickBranch, refreshBranches])

    const branchName =
        branches.find((branch) => branch.id === branchId)?.name ?? user?.branchId ?? ''

    /**
     * Đổi chi nhánh **phải xoá giỏ**: tồn kho và dòng hàng đang có được chọn theo tồn của chi
     * nhánh cũ; giữ lại giỏ rồi đặt đơn ở chi nhánh mới là đúng kịch bản "bấm thanh toán mới báo
     * hết hàng" mà bộ chọn này sinh ra để tránh. Giỏ đang rỗng thì đổi thẳng, không hỏi.
     */
    const handleBranchChange = useCallback(
        (next: string) => {
            if (next === branchId) return
            if (lines.length === 0) {
                setBranchId(next)
                return
            }
            setPendingBranchId(next)
        },
        [branchId, lines.length],
    )

    /**
     * Đơn vừa tạo xong ⇒ mở **modal xem trước phiếu** và nạp `invoice` để hiển thị nội dung thật.
     *
     * `invoice` chính là dữ liệu sẽ in ra (`GET /order/{id}/invoice`) — xem trước bằng đúng nguồn
     * đó thì cái nhân viên nhìn thấy luôn khớp cái máy in nhả ra.
     */
    const handleCreated = useCallback(
        (order: Order) => {
            setCreated(order)
            setPaymentFailed(false)
            setCheckoutOpen(false)
            // Đơn đã vào hệ thống ⇒ dọn giỏ để không đặt trùng.
            clear()
            /*
             * **Nạp lại tồn ở cột chọn hàng** (CONVENTIONS mục 5.1): `POST /order` **trừ tồn thật
             * ngay lập tức** (xem CLAUDE.md mục "Mô hình tồn kho"), nên số `available` đang hiển
             * thị đã cũ. Không nạp lại thì nhân viên bán tiếp cùng SKU sẽ thấy tồn trước khi bán,
             * và cả cảnh báo "vượt tồn" phía client cũng so với con số cũ đó.
             *
             * Tăng nonce thay vì gọi thẳng: `ProductPicker` giữ nguyên tab danh mục + từ khoá
             * đang chọn, chỉ nạp lại dữ liệu.
             */
            setStockReloadSignal((value) => value + 1)
        },
        [clear],
    )

    /* Nạp phiếu để xem trước. Lỗi thì modal vẫn mở — chỉ thiếu phần xem trước, đơn đã tạo rồi. */
    useEffect(() => {
        if (!created) {
            setInvoice(null)
            return
        }
        const controller = new AbortController()
        setLoadingInvoice(true)
        orderApi
            .invoice(created.id, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setInvoice(result)
            })
            .catch(() => {
                if (!controller.signal.aborted) setInvoice(null)
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoadingInvoice(false)
            })
        return () => controller.abort()
    }, [created])

    /**
     * Gọi `POST /order/{id}/payment` rồi cập nhật đơn tại chỗ để modal phiếu mở khoá nút In.
     *
     * Thu lỗi ⇒ **không đóng modal**: đơn vẫn tồn tại và tồn đã trừ, tuyệt đối không tạo lại đơn —
     * chỉ bật cờ cảnh báo để nhân viên biết vào màn Đơn hàng thu lại.
     */
    const payCreatedOrder = useCallback(async () => {
        if (!created) return
        setConfirming(true)
        try {
            /*
             * `OrderResDTO.paymentMethod` khai nullable; đơn POS luôn được tạo kèm hình thức nên
             * thực tế không rỗng — fallback `CASH` chỉ để khỏi gửi `null` lên backend.
             */
            const paid = await orderApi.pay(created.id, {
                method: created.paymentMethod ?? EPaymentMethod.CASH,
            })
            toastSuccess('order.toast.paid', { ns: 'order' })
            setCreated(paid)
            setPaymentFailed(false)
            setQrOpen(false)
        } catch (error) {
            toastError(error)
            setPaymentFailed(true)
            setQrOpen(false)
        } finally {
            setConfirming(false)
        }
    }, [created])

    /**
     * Ghi nhận **đã thu tiền** từ modal phiếu.
     *
     * ⚠️ Hình thức `QR` phải qua **dialog quét mã** trước (user chốt 2026-08-21): khách cần nhìn
     * thấy mã để chuyển khoản, nhân viên tự đối chiếu app ngân hàng rồi mới xác nhận
     * (backend chưa có webhook banking). Các hình thức còn lại thu thẳng.
     */
    const handleConfirmPayment = useCallback(() => {
        if (!created) return
        if (created.paymentMethod === EPaymentMethod.QR) {
            setQrOpen(true)
            return
        }
        void payCreatedOrder()
    }, [created, payCreatedOrder])

    const handlePrint = useCallback(() => {
        /* `invoice` đã nạp sẵn cho phần xem trước ⇒ in luôn, không gọi API lần nữa. */
        if (invoice) printInvoice(invoice)
    }, [invoice])

    return (
        /*
         * Khoá chiều cao màn POS vừa đúng viewport để **khối tổng tiền + nút Thanh toán luôn
         * nhìn thấy, không phải cuộn trang** — hai cột tự cuộn bên trong.
         *
         * `h-full` bám thẳng vào `<main>` (đã `h-dvh` + `flex-1` ở `AppLayout`) nên không phải
         * trừ tay chiều cao topbar; đổi topbar sau này cũng không vỡ.
         *
         * Chỉ áp từ `lg`: màn hẹp 2 cột xếp chồng, ép cao cố định sẽ bóp giỏ hàng quá ngắn ⇒
         * để cuộn tự nhiên.
         */
        <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
            <PageHeader
                title={t('order.pos.pageTitle')}
                description={t('order.pos.pageDescription')}
                className="mb-0"
                actions={
                    canPickBranch ? (
                        <div className="flex items-center gap-2">
                            <Building2 className="text-muted-foreground size-4 shrink-0" />
                            <Select value={branchId ?? undefined} onValueChange={handleBranchChange}>
                                <SelectTrigger className="bg-card w-full sm:w-64">
                                    <SelectValue placeholder={t('order.pos.branchPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        /* STAFF/ADMIN: chi nhánh do backend ép, chỉ hiển thị cho biết. */
                        branchName && (
                            <span className="text-muted-foreground flex items-center gap-2 text-sm">
                                <Building2 className="size-4 shrink-0" />
                                {t('order.pos.branchLocked', { name: branchName })}
                            </span>
                        )
                    )
                }
            />

            {/*
              * **Chặn chọn hàng khi chưa biết chi nhánh** (chỉ xảy ra với SUPER_ADMIN, vì tài
              * khoản này không thuộc chi nhánh nào).
              *
              * Trước đây `branchId` để `null` ⇒ `ProductPicker` nạp tồn của **tất cả** chi nhánh,
              * người dùng thêm hàng rồi tới bước thanh toán mới chọn chi nhánh và lúc đó mới biết
              * chi nhánh đó **hết hàng**. Chốt chi nhánh ngay từ đầu thì tồn hiển thị luôn là tồn
              * thật của đúng kho sẽ bị trừ.
              */}
            {canPickBranch && !branchId ? (
                <Card className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                    <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
                        <Store className="size-7" />
                    </span>
                    <p className="text-lg font-semibold">{t('order.pos.branchGateTitle')}</p>
                    <p className="text-muted-foreground max-w-sm text-sm">
                        {t('order.pos.branchGateHint')}
                    </p>
                    <Select value={branchId ?? undefined} onValueChange={handleBranchChange}>
                        <SelectTrigger className="bg-card w-64">
                            <SelectValue placeholder={t('order.pos.branchPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Card>
            ) : (
                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
                    <ProductPicker
                        branchId={branchId}
                        onAdd={flyToCart}
                        reloadSignal={stockReloadSignal}
                    />
                    <CartPanel
                        branchId={branchId}
                        onCheckout={() => setCheckoutOpen(true)}
                        checkoutAnchorRef={cartAnchorRef}
                    />
                </div>
            )}

            {flyOverlay}

            {/* Đổi chi nhánh khi giỏ đang có hàng ⇒ xác nhận vì sẽ mất giỏ. */}
            <ConfirmDialog
                open={pendingBranchId !== null}
                onOpenChange={(open) => !open && setPendingBranchId(null)}
                title={t('order.pos.branchGateTitle')}
                description={t('order.pos.branchChangeWarning')}
                onConfirm={async () => {
                    setBranchId(pendingBranchId)
                    clear()
                    setPendingBranchId(null)
                }}
            />

            <CheckoutDialog
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                branchId={branchId}
                onCreated={handleCreated}
            />

            {/*
              Modal **xem trước phiếu** sau khi tạo đơn: xác nhận thanh toán → mở khoá nút In,
              kèm lối đi sang màn Đơn hàng hoặc bán tiếp (user chốt 2026-08-29).
            */}
            <OrderReceiptDialog
                open={created !== null}
                onOpenChange={(next) => !next && setCreated(null)}
                order={created}
                invoice={invoice}
                loadingInvoice={loadingInvoice}
                paymentFailed={paymentFailed}
                confirming={confirming}
                /*
                 * Ẩn nút thu tiền khi đã `PAID` (backend chặn thu lần 2 — `error.order.alreadyPaid`)
                 * và với đơn **COD** (thu khi giao, không thu tại quầy).
                 */
                onConfirmPayment={
                    created?.paymentStatus === EPaymentStatus.PAID ||
                    created?.paymentMethod === EPaymentMethod.COD
                        ? null
                        : handleConfirmPayment
                }
                onViewOrders={() => void navigate('/orders')}
                onNewOrder={() => setCreated(null)}
                onPrint={handlePrint}
            />

            {/*
              Quét mã VietQR — chồng lên modal phiếu, chỉ với hình thức `QR`.
              Đóng mà chưa xác nhận thì đơn vẫn ở `UNPAID`, modal phiếu vẫn mở để thu lại.
            */}
            <QrPaymentDialog
                open={qrOpen}
                onOpenChange={setQrOpen}
                orderId={created?.id ?? null}
                orderCode={created?.orderCode ?? ''}
                amount={created?.totalAmount ?? 0}
                confirming={confirming}
                onConfirm={() => void payCreatedOrder()}
            />
        </div>
    )
}

export default function PosPage() {
    return (
        <CartProvider>
            <PosScreen />
        </CartProvider>
    )
}
