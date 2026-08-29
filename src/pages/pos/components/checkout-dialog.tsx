import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, User } from 'lucide-react'

import { customerApi } from '@/api/customer'
import { orderApi } from '@/api/order'
import { hasRole } from '@/config/roles'
import { formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import { PHONE_PATTERN } from '@/lib/validation'
import { ERole } from '@/types/common'
import { EOrderChannel, EPaymentMethod, type CartPreview, type Order } from '@/types/order'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

/** Hình thức thanh toán bày ra cho người bán. Backend còn `VOUCHER`/`POINT`/`STORE_CREDIT`
 *  nhưng chưa có nghiệp vụ nào phát hành/tiêu chúng ⇒ chưa đưa vào POS. */
const METHODS: EPaymentMethod[] = [
    EPaymentMethod.CASH,
    EPaymentMethod.QR,
    EPaymentMethod.CARD,
    EPaymentMethod.COD,
]

/**
 * Dialog **"Thanh toán đơn hàng"** — **bổ sung ngoài mockup `03`** (mockup vẽ cho bán tại quầy nên
 * không có địa chỉ giao/phí ship). Dựng bằng pattern dialog chung theo CONVENTIONS mục 6.2.
 *
 * Luồng (user chốt 2026-08-29):
 * ```
 * [Giỏ] → bấm "Thanh toán" → dialog NÀY (thông tin khách + giao hàng + hình thức thanh toán)
 *   → bấm "Xác nhận & tạo đơn": tạo hồ sơ khách vãng lai (nếu có) → POST /order
 *   → chuyển sang `OrderReceiptDialog` (xem trước phiếu) → xác nhận thanh toán → in hoá đơn
 * ```
 *
 * Dialog này **chỉ tạo đơn**, không thu tiền: mọi bước thu tiền (kể cả quét QR) đã chuyển sang
 * modal phiếu. Nhờ vậy nhân viên luôn nhìn thấy nội dung phiếu trước khi xác nhận đã nhận tiền.
 *
 * ⚠️ **Tạo đơn và thu tiền KHÔNG nguyên tử.** Đơn tạo xong là **tồn đã bị trừ thật**; nếu bước thu
 * tiền lỗi hoặc bị bỏ dở thì **tuyệt đối không tạo lại đơn** — vào màn Đơn hàng thu lại.
 */
export function CheckoutDialog({
    open,
    onOpenChange,
    branchId,
    onCreated,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    branchId: string | null
    /** Đơn đã tạo (luôn `UNPAID` ở bước này) — màn cha mở modal phiếu để thu tiền. */
    onCreated: (order: Order) => void
}) {
    const { t } = useTranslation(['order', 'common'])
    const { user } = useAuth()
    const { branches, refresh: refreshBranches } = useBranch()
    const {
        lines,
        orderLines,
        customer,
        orderDiscountAmount,
        shippingFee,
        shippingAddress,
        description,
        guestName,
        guestPhone,
        paymentMethod,
        setShippingFee,
        setShippingAddress,
        setDescription,
        setGuestName,
        setGuestPhone,
        setPaymentMethod,
    } = useCart()

    /**
     * Chỉ SUPER_ADMIN phải tự chọn chi nhánh (STAFF/ADMIN bị backend ép về chi nhánh mình, và
     * `branchId` gửi lên **bị bỏ qua** — xem ghi chú ở `PosPage`). Việc chọn đã làm ở đầu màn POS;
     * ở đây chỉ cần biết còn thiếu hay không để khoá nút gửi.
     */
    const mustPickBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const branchLabel = branches.find((branch) => branch.id === branchId)?.name ?? null

    const [preview, setPreview] = useState<CartPreview | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [open, refreshBranches])

    /* Tính lại tiền theo phí ship hiện tại để con số trong dialog khớp thứ sẽ tạo. */
    useEffect(() => {
        if (!open || orderLines.length === 0) return
        const controller = new AbortController()
        orderApi
            .cartPreview(
                {
                    branchId: branchId ?? undefined,
                    /* Gửi TÁCH 2 tầng, giống hệt `CartPanel` — xem `cart-context`. */
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
            .then(setPreview)
            .catch(() => {
                if (!controller.signal.aborted) setPreview(null)
            })
        return () => controller.abort()
    }, [open, orderLines, orderDiscountAmount, shippingFee, branchId])

    const total = preview?.totalAmount ?? 0

    const branchMissing = mustPickBranch && !branchId

    const handleSubmit = useCallback(async () => {
        if (lines.length === 0 || branchMissing) return

        setSubmitting(true)

        /*
         * **Khách vãng lai có đủ tên + SĐT ⇒ tạo hồ sơ khách TRƯỚC khi tạo đơn** (user chốt
         * 2026-08-29), rồi gắn `customerId` vào đơn.
         *
         * ⚠️ Phải làm **trước**, không thể làm sau khi thu tiền: backend không có API gắn khách vào
         * đơn đã tạo (`PUT /order/{id}` chỉ sửa được đơn còn `PENDING`, mà đơn POS chuyển thẳng
         * `COMPLETED` ngay khi thu tiền — xem CLAUDE.md mục "Vòng đời đơn tách theo kênh").
         * Tạo sau thì hồ sơ khách sẽ **không bao giờ nối được** với đơn vừa bán.
         *
         * Tạo hồ sơ hỏng **không được chặn bán hàng**: bỏ qua và bán như khách vãng lai
         * (đơn vẫn giữ `customerName`/`customerPhone` nhập tay). Nguyên nhân hay gặp nhất là
         * **SĐT đã có hồ sơ** (`error.phone.existed`) — lúc đó khách vốn đã có sẵn trong hệ thống.
         */
        let customerId = customer?.id
        const trimmedName = guestName.trim()
        const trimmedPhone = guestPhone.trim()
        if (!customerId && trimmedName && PHONE_PATTERN.test(trimmedPhone)) {
            try {
                const profile = await customerApi.create({
                    fullName: trimmedName,
                    phoneNumber: trimmedPhone,
                    branchId: branchId ?? undefined,
                })
                customerId = profile.id
                toastSuccess('order.pos.checkout.guestProfileCreated', { ns: 'order' })
            } catch {
                // api-client đã toast; bán tiếp như khách vãng lai.
            }
        }

        let created: Order
        try {
            created = await orderApi.create({
                branchId: branchId ?? undefined,
                customerId,
                /*
                 * Vẫn gửi tên/SĐT nhập tay khi **không** gắn được hồ sơ khách (tạo hồ sơ lỗi, hoặc
                 * nhân viên chỉ nhập mỗi tên) — để hoá đơn còn biết bán cho ai.
                 */
                customerName: customerId ? undefined : trimmedName || undefined,
                customerPhone: customerId ? undefined : trimmedPhone || undefined,
                shippingAddress: shippingAddress.trim() || undefined,
                description: description.trim() || undefined,
                paymentMethod,
                /*
                 * Đây là màn bán TẠI QUẦY ⇒ luôn gửi `POS`.
                 * Bỏ trống thì backend mặc định `ONLINE` và đơn sẽ nằm nhầm tab ở `04-don-hang`.
                 */
                channel: EOrderChannel.POS,
                /* Giảm giá 2 tầng — phải khớp đúng thứ đã gửi ở `cartPreview` phía trên. */
                discountAmount: orderDiscountAmount || undefined,
                shippingFee: shippingFee || undefined,
                lines: orderLines.map((line) => ({
                    skuId: line.skuId,
                    quantity: line.quantity,
                    discountAmount: line.discountAmount || undefined,
                })),
            })
        } catch (error) {
            /*
             * Thất bại ở đây là an toàn: backend rollback cả đơn lẫn tồn.
             * Nguyên nhân hay gặp nhất là `error.stock.insufficient` (hàng vừa bị đơn khác lấy).
             */
            toastError(error)
            setSubmitting(false)
            return
        }

        /*
         * Từ đây trở đi đơn ĐÃ TỒN TẠI và tồn ĐÃ BỊ TRỪ. `POST /order` xong là **hết việc của
         * dialog này**: bước thu tiền chuyển hẳn sang modal xem trước phiếu (`OrderReceiptDialog`),
         * nơi nhân viên bấm "Xác nhận đã thanh toán" rồi mới in được hoá đơn (user chốt 2026-08-29).
         */
        setSubmitting(false)
        toastSuccess('order.toast.created', { ns: 'order' })
        onCreated(created)
    }, [
        lines,
        orderLines,
        branchMissing,
        branchId,
        customer,
        guestName,
        guestPhone,
        shippingAddress,
        description,
        paymentMethod,
        orderDiscountAmount,
        shippingFee,
        onCreated,
    ])

    const methodOptions = useMemo(
        () =>
            METHODS.map((method) => ({
                value: method,
                label: t(`order.paymentMethod.${method}`),
            })),
        [t],
    )

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('order.pos.checkout.title')}</DialogTitle>
                    <DialogDescription>{t('order.pos.checkout.description')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/*
                     * Chi nhánh **đã chốt từ đầu màn POS** (bộ chọn ở `PageHeader`) nên ở đây chỉ
                     * hiển thị lại để đối chiếu — không cho đổi. Đổi chi nhánh ở bước cuối sẽ làm
                     * tồn của cả giỏ sai so với kho thật sẽ bị trừ.
                     */}
                    {branchLabel && (
                        <div className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                                {t('order.pos.checkout.branch')}
                            </span>
                            <span className="font-medium">{branchLabel}</span>
                        </div>
                    )}

                    {/*
                     * **Khách đã có hồ sơ**: hiện lại thông tin để nhân viên đối chiếu trước khi
                     * chốt đơn (user chốt 2026-08-29) — trước đây khối này bị ẩn hẳn, nhân viên gán
                     * khách ở giỏ rồi tới bước thanh toán không còn thấy đang bán cho ai.
                     * Chỉ hiển thị, muốn đổi thì quay lại ô gán khách ở giỏ hàng.
                     */}
                    {customer ? (
                        <div className="bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2.5">
                            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                                <User className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{customer.fullName}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                    {customer.phoneNumber}
                                </p>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs">
                                {t('order.pos.checkout.customerLinked')}
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label>{t('order.pos.checkout.customerName')}</Label>
                                    <Input
                                        value={guestName}
                                        onChange={(event) => setGuestName(event.target.value)}
                                        placeholder={t('order.pos.checkout.customerNamePlaceholder')}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>{t('order.pos.checkout.customerPhone')}</Label>
                                    <Input
                                        value={guestPhone}
                                        onChange={(event) => setGuestPhone(event.target.value)}
                                        placeholder={t('order.pos.checkout.customerPhonePlaceholder')}
                                        inputMode="tel"
                                    />
                                </div>
                            </div>
                            {/*
                             * Báo trước là sẽ tự lập hồ sơ — nhân viên biết mà bỏ trống SĐT nếu
                             * khách không muốn lưu thông tin.
                             */}
                            <p className="text-muted-foreground text-xs">
                                {t('order.pos.checkout.guestProfileHint')}
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label>{t('order.pos.checkout.shippingAddress')}</Label>
                        <Textarea
                            value={shippingAddress}
                            onChange={(event) => setShippingAddress(event.target.value)}
                            placeholder={t('order.pos.checkout.shippingAddressPlaceholder')}
                            rows={2}
                        />
                        <p className="text-muted-foreground text-xs">
                            {t('order.pos.checkout.shippingAddressHint')}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>{t('order.pos.checkout.shippingFee')}</Label>
                            <Input
                                value={shippingFee || ''}
                                onChange={(event) => {
                                    const parsed = Number(event.target.value)
                                    setShippingFee(
                                        Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
                                    )
                                }}
                                inputMode="numeric"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('order.pos.checkout.paymentMethod')}</Label>
                            <Select
                                value={paymentMethod}
                                onValueChange={(value) =>
                                    setPaymentMethod(value as EPaymentMethod)
                                }>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {methodOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t('order.pos.checkout.noteSection')}</Label>
                        <Textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder={t('order.pos.checkout.notePlaceholder')}
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                        <span>{t('order.pos.checkout.summary')}</span>
                        <span className="tabular-nums">{formatVnd(total)}</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={submitting || lines.length === 0 || branchMissing}>
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {submitting
                            ? t('order.pos.checkout.submitting')
                            : t('order.pos.checkout.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
