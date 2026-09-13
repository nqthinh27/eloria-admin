import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Receipt, Trash2 } from 'lucide-react'

import { orderApi } from '@/api/order'
import { returnApi } from '@/api/return'
import { formatDateTime, formatVnd } from '@/lib/format'
import { parseMoneyInput } from '@/lib/money-input-format'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useSkuOptions } from '@/hooks/use-sku-options'
import type { PagedSearchLoader } from '@/hooks/use-paged-search'
import { EOrderStatus, type Order, type OrderLine } from '@/types/order'
import {
    type CreateExchangeReq,
    type CreateReturnReq,
    type ReturnDeliverLineReq,
    type ReturnLineReq,
} from '@/types/return'
import { AsyncSuggest } from '@/components/async-suggest'
import { MoneyInput } from '@/components/money-input'
import { SearchSelect } from '@/components/search-select'
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
import { Textarea } from '@/components/ui/textarea'

type Mode = 'RETURN' | 'EXCHANGE'
type Source = 'ORDER' | 'MANUAL'

/** Một dòng hàng khách trả, ở dạng người dùng đang nhập dở. */
type DraftReturnLine = {
    key: string
    orderDetailId?: string
    skuId?: string
    label: string
    /** Số còn trả được — chỉ có ở nguồn "theo hoá đơn". */
    max?: number
    quantity: number
    /** Chuỗi chữ số thuần của `MoneyInput` — chỉ dùng ở nguồn "không hoá đơn". */
    unitAmount: string
    reason: string
}

type DraftDeliverLine = { key: string; skuId: string; quantity: number }

/**
 * Dialog **tạo yêu cầu đổi / trả** — `[STAFF]`, mockup `06-doi-tra.png` (nút "Tạo yêu cầu").
 *
 * Gộp **4 nghiệp vụ** vào một form vì chúng chỉ khác nhau ở 2 lựa chọn đầu:
 * `trả | đổi` × `theo hoá đơn | không hoá đơn`.
 *
 * ⚠️ **Phiếu đổi LUÔN gửi qua `POST /return/exchange-diff`**, không bao giờ dùng `/return/exchange`.
 * Lý do: giá quyết toán của hàng trả do **backend** tính (phân bổ chiết khấu + khuyến mại của đơn
 * gốc), FE **không đoán được** nên không thể biết trước là ngang giá hay lệch giá — đoán sai thì
 * `/exchange` trả `error.return.exchangePriceDiff` và người dùng lãnh một lỗi vô nghĩa. Đã đo thật
 * 2026-09-12: `/exchange-diff` xử lý **cả hai** trường hợp, ngang giá thì trả `refund = collect = 0`.
 *
 * Số **"còn trả được"** lấy thẳng từ `lines[].returnedQuantity` của `GET /order/{id}` (backend bổ
 * sung 2026-09-13 — **BE26**). Bản trước phải quét toàn bộ phiếu của đơn bằng **N+1 request**; nay
 * chọn đơn chỉ tốn **đúng 1 request**.
 */
export function ReturnCreateDialog({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: () => void
}) {
    const { t } = useTranslation(['return', 'order', 'common'])

    const [mode, setMode] = useState<Mode>('RETURN')
    const [source, setSource] = useState<Source>('ORDER')
    const [submitting, setSubmitting] = useState(false)

    // --- nguồn "theo hoá đơn"
    const [orderKeyword, setOrderKeyword] = useState('')
    const [order, setOrder] = useState<Order | null>(null)

    // --- dòng hàng
    const [returnLines, setReturnLines] = useState<DraftReturnLine[]>([])
    const [deliverLines, setDeliverLines] = useState<DraftDeliverLine[]>([])

    // --- thông tin chung
    const [reason, setReason] = useState('')
    const [description, setDescription] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')

    /*
     * Danh mục SKU cho ô chọn hàng — nguồn dùng chung với màn Phiếu kho: **tra phía server, 10 SKU
     * mỗi lượt + infinite scroll** (CONVENTIONS mục 5.7), nên ở đây **không còn trần 200 im lặng**
     * như bản đầu. Mỗi ô chỉ gọi API khi được mở ra, 10 dòng hàng đóng lại không tốn request nào.
     */
    const { selectProps: skuSelectProps } = useSkuOptions()

    const resetAll = useCallback(() => {
        setMode('RETURN')
        setSource('ORDER')
        setOrderKeyword('')
        setOrder(null)
        setReturnLines([])
        setDeliverLines([])
        setReason('')
        setDescription('')
        setCustomerName('')
        setCustomerPhone('')
    }, [])

    useEffect(() => {
        if (open) resetAll()
    }, [open, resetAll])

    /**
     * Nguồn gợi ý cho ô tra đơn gốc — **tra phía server, 10 đơn mỗi lượt + infinite scroll**
     * (CONVENTIONS mục 5.7).
     *
     * Chỉ đơn `COMPLETED` mới trả được (`error.return.orderNotReturnable`) nên lọc sẵn, đỡ để người
     * dùng chọn phải đơn rồi mới ăn lỗi. `keyword` của backend khớp **mã đơn lẫn tên/SĐT khách**
     * (đo thật 2026-09-13) ⇒ một ô nhập là đủ.
     */
    const loadOrderPage = useCallback<PagedSearchLoader<Order>>(
        async ({ keyword, page, size, signal }) => {
            const result = await orderApi.search(
                { keyword, orderStatus: EOrderStatus.COMPLETED },
                { page, size, sort: ['createdDate,DESC'] },
                signal,
            )
            return { items: result.data, total: result.total }
        },
        [],
    )

    const pickOrder = async (picked: Order) => {
        try {
            /* Danh sách đơn trả `lines: null` ⇒ bắt buộc `GET /order/{id}` mới có dòng hàng. */
            const full = await orderApi.getById(picked.id)
            setOrder(full)
            setOrderKeyword('')
            setCustomerName(full.customerName ?? '')
            setCustomerPhone(full.customerPhone ?? '')
            setReturnLines([])
        } catch (error) {
            toastError(error)
        }
    }

    /**
     * Số **còn trả được** của một dòng đơn.
     *
     * `returnedQuantity` do backend trả sẵn trong `GET /order/{id}` (**BE26**, 2026-09-13) và đã
     * loại phiếu `REJECTED` đúng như cách nó chặn `error.return.quantityExceeded` — FE **không tự
     * cộng lại**. Trước đó chỗ này phải quét toàn bộ phiếu của đơn bằng N+1 request.
     */
    const remainingOf = useCallback(
        (line: OrderLine) => line.quantity - (line.returnedQuantity ?? 0),
        [],
    )

    const toggleOrderLine = (line: OrderLine) => {
        const remaining = remainingOf(line)
        if (remaining <= 0) return
        setReturnLines((prev) => {
            const existing = prev.find((l) => l.orderDetailId === line.id)
            if (existing) return prev.filter((l) => l.orderDetailId !== line.id)
            return [
                ...prev,
                {
                    key: line.id,
                    orderDetailId: line.id,
                    label: `${line.productName} · ${line.skuCode}`,
                    max: remaining,
                    quantity: 1,
                    unitAmount: '',
                    reason: '',
                },
            ]
        })
    }

    const patchReturnLine = (key: string, patch: Partial<DraftReturnLine>) =>
        setReturnLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

    const orderLines = order?.lines ?? []
    const nothingReturnable =
        source === 'ORDER' && order !== null && orderLines.every((l) => remainingOf(l) <= 0)

    /** Điều kiện gửi được — khoá nút thay vì để backend trả 400 (CONVENTIONS mục 5). */
    const validation = useMemo(() => {
        if (source === 'ORDER' && !order) return 'return.form.findOrder'
        if (returnLines.length === 0) return 'return.form.noLine'
        if (returnLines.some((l) => l.quantity <= 0 || (l.max !== undefined && l.quantity > l.max)))
            return 'return.form.quantityInvalid'
        if (source === 'MANUAL' && returnLines.some((l) => l.unitAmount.trim() === ''))
            return 'return.form.unitAmountRequired'
        if (mode === 'EXCHANGE' && deliverLines.length === 0) return 'return.form.noDeliverLine'
        if (mode === 'EXCHANGE' && deliverLines.some((l) => !l.skuId || l.quantity <= 0))
            return 'return.form.quantityInvalid'
        return null
    }, [source, order, returnLines, mode, deliverLines])

    const handleSubmit = async () => {
        if (validation || submitting) return
        setSubmitting(true)
        try {
            const lines: ReturnLineReq[] = returnLines.map((l) => ({
                orderDetailId: source === 'ORDER' ? l.orderDetailId : undefined,
                skuId: source === 'MANUAL' ? l.skuId : undefined,
                quantity: l.quantity,
                /* ⚠️ `0` là giá hợp lệ ⇒ so `trim() === ''`, tuyệt đối không dùng falsy check. */
                unitAmount:
                    source === 'MANUAL' && l.unitAmount.trim() !== ''
                        ? Number(parseMoneyInput(l.unitAmount))
                        : undefined,
                reason: l.reason.trim() || undefined,
            }))
            const party = {
                orderId: source === 'ORDER' ? order?.id : undefined,
                customerName: customerName.trim() || undefined,
                customerPhone: customerPhone.trim() || undefined,
                reason: reason.trim() || undefined,
                description: description.trim() || undefined,
            }

            if (mode === 'EXCHANGE') {
                const deliver: ReturnDeliverLineReq[] = deliverLines.map((l) => ({
                    skuId: l.skuId,
                    quantity: l.quantity,
                }))
                /* Luôn `/exchange-diff` — xem ghi chú ở đầu file. */
                await returnApi.exchangeDiff({
                    ...party,
                    returnLines: lines,
                    deliverLines: deliver,
                } satisfies CreateExchangeReq)
            } else {
                await returnApi.create({ ...party, lines } satisfies CreateReturnReq)
            }
            toastSuccess('return.toast.created', { ns: 'return' })
            onCreated()
        } catch (error) {
            /* Giữ form nguyên trạng để sửa rồi gửi lại (hay gặp: `quantityExceeded`). */
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('return.form.title')}</DialogTitle>
                    <DialogDescription>{t('return.subtitle')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ChoiceRow
                            label={t('return.form.mode')}
                            value={mode}
                            disabled={submitting}
                            options={[
                                { value: 'RETURN', label: t('return.form.modeReturn') },
                                { value: 'EXCHANGE', label: t('return.form.modeExchange') },
                            ]}
                            onChange={(v) => setMode(v as Mode)}
                        />
                        <ChoiceRow
                            label={t('return.form.source')}
                            value={source}
                            disabled={submitting}
                            options={[
                                { value: 'ORDER', label: t('return.form.sourceOrder') },
                                { value: 'MANUAL', label: t('return.form.sourceManual') },
                            ]}
                            onChange={(v) => {
                                /* Đổi nguồn ⇒ dòng hàng cũ vô nghĩa (khác hẳn cách khai). */
                                setSource(v as Source)
                                setReturnLines([])
                                setOrder(null)
                                setOrderKeyword('')
                            }}
                        />
                    </div>

                    {source === 'ORDER' ? (
                        <section className="space-y-2">
                            <Label htmlFor="return-order-keyword">{t('return.form.findOrder')}</Label>
                            {order ? (
                                <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                                    <div className="min-w-0">
                                        <p className="font-mono text-sm">{order.orderCode}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {order.customerName || t('return.list.noCustomer')} ·{' '}
                                            {formatDateTime(order.createdDate)} ·{' '}
                                            {formatVnd(order.totalAmount)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={submitting}
                                        onClick={() => {
                                            setOrder(null)
                                            setReturnLines([])
                                        }}
                                    >
                                        {t('return.form.changeOrder')}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/*
                                      Gợi ý NỔI trên nội dung, cuộn trong panel, nạp thêm khi chạm
                                      đáy (CONVENTIONS mục 5.7). Bản đầu render thẳng danh sách vào
                                      luồng trang nên mỗi lần tìm là dialog dài thêm một đoạn.
                                    */}
                                    <AsyncSuggest
                                        id="return-order-keyword"
                                        value={orderKeyword}
                                        onValueChange={setOrderKeyword}
                                        loadPage={loadOrderPage}
                                        minChars={0}
                                        disabled={submitting}
                                        icon={<Receipt className="size-4" />}
                                        placeholder={t('return.form.findOrderPlaceholder')}
                                        ariaLabel={t('return.form.findOrder')}
                                        emptyLabel={t('return.form.noOrderFound')}
                                        getKey={(o) => o.id}
                                        onPick={(o) => void pickOrder(o)}
                                        renderItem={(o) => (
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="min-w-0">
                                                    <span className="block font-mono text-sm">
                                                        {o.orderCode}
                                                    </span>
                                                    <span className="text-muted-foreground block text-xs">
                                                        {o.customerName ||
                                                            t('return.list.noCustomer')}{' '}
                                                        · {formatDateTime(o.createdDate)}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-sm tabular-nums">
                                                    {formatVnd(o.totalAmount)}
                                                </span>
                                            </span>
                                        )}
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        {t('return.form.onlyCompleted')}
                                    </p>
                                </>
                            )}
                        </section>
                    ) : (
                        <p className="text-muted-foreground text-xs">
                            {t('return.form.sourceManualHint')}
                        </p>
                    )}

                    {/* ---- hàng khách trả về ---- */}
                    <section className="space-y-2">
                        <Label>{t('return.form.returnLines')}</Label>

                        {source === 'ORDER' && order && (
                            <div className="divide-y rounded-lg border">
                                {nothingReturnable && (
                                    <p className="text-muted-foreground p-3 text-sm">
                                        {t('return.form.nothingReturnable')}
                                    </p>
                                )}
                                {orderLines.map((line) => {
                                    const remaining = remainingOf(line)
                                    const picked = returnLines.find(
                                        (l) => l.orderDetailId === line.id,
                                    )
                                    const before = line.returnedQuantity ?? 0
                                    return (
                                        <div key={line.id} className="space-y-2 p-3">
                                            <button
                                                type="button"
                                                disabled={remaining <= 0 || submitting}
                                                onClick={() => toggleOrderLine(line)}
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-3 text-left',
                                                    remaining <= 0 && 'opacity-50',
                                                )}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-medium">
                                                        {line.productName}
                                                    </span>
                                                    <span className="text-muted-foreground block font-mono text-xs">
                                                        {line.skuCode} ·{' '}
                                                        {t('return.form.bought', {
                                                            count: line.quantity,
                                                        })}
                                                        {before > 0 &&
                                                            ` · ${t('return.form.returnedBefore', { count: before })}`}
                                                        {' · '}
                                                        {t('return.form.remaining', {
                                                            count: remaining,
                                                        })}
                                                    </span>
                                                </span>
                                                <span
                                                    className={cn(
                                                        'shrink-0 rounded border px-2 py-1 text-xs',
                                                        picked
                                                            ? 'border-primary text-primary'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {picked
                                                        ? t('common:action.selected')
                                                        : t('common:action.select')}
                                                </span>
                                            </button>

                                            {picked && (
                                                <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                                                    <div className="flex flex-col gap-1">
                                                        <Label
                                                            htmlFor={`qty-${line.id}`}
                                                            className="text-xs"
                                                        >
                                                            {t('return.form.quantity')}
                                                        </Label>
                                                        {/* Ô số lượng giữ `type="number"` — CONVENTIONS mục 5.5. */}
                                                        <Input
                                                            id={`qty-${line.id}`}
                                                            type="number"
                                                            min={1}
                                                            max={remaining}
                                                            value={picked.quantity}
                                                            disabled={submitting}
                                                            onChange={(e) =>
                                                                patchReturnLine(picked.key, {
                                                                    quantity: Number(
                                                                        e.target.value,
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <Label
                                                            htmlFor={`rsn-${line.id}`}
                                                            className="text-xs"
                                                        >
                                                            {t('return.form.lineReason')}
                                                        </Label>
                                                        <Input
                                                            id={`rsn-${line.id}`}
                                                            value={picked.reason}
                                                            maxLength={255}
                                                            disabled={submitting}
                                                            onChange={(e) =>
                                                                patchReturnLine(picked.key, {
                                                                    reason: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {source === 'MANUAL' && (
                            <ManualLines
                                lines={returnLines}
                                skuSelectProps={skuSelectProps}
                                disabled={submitting}
                                onPatch={patchReturnLine}
                                onRemove={(key) =>
                                    setReturnLines((prev) => prev.filter((l) => l.key !== key))
                                }
                                onAdd={() =>
                                    setReturnLines((prev) => [
                                        ...prev,
                                        {
                                            key: crypto.randomUUID(),
                                            skuId: '',
                                            label: '',
                                            quantity: 1,
                                            unitAmount: '',
                                            reason: '',
                                        },
                                    ])
                                }
                            />
                        )}
                    </section>

                    {/* ---- hàng giao mới (chỉ phiếu đổi) ---- */}
                    {mode === 'EXCHANGE' && (
                        <section className="space-y-2">
                            <Label>{t('return.form.deliverLines')}</Label>
                            <div className="space-y-2">
                                {deliverLines.map((line) => (
                                    <div key={line.key} className="flex items-end gap-2">
                                        <div className="min-w-0 flex-1">
                                            <SearchSelect
                                                {...skuSelectProps}
                                                value={line.skuId}
                                                disabled={submitting}
                                                placeholder={t('return.form.pickSku')}
                                                onChange={(v) =>
                                                    setDeliverLines((prev) =>
                                                        prev.map((l) =>
                                                            l.key === line.key
                                                                ? { ...l, skuId: v }
                                                                : l,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                        <Input
                                            type="number"
                                            min={1}
                                            className="w-20"
                                            aria-label={t('return.form.quantity')}
                                            value={line.quantity}
                                            disabled={submitting}
                                            onChange={(e) =>
                                                setDeliverLines((prev) =>
                                                    prev.map((l) =>
                                                        l.key === line.key
                                                            ? { ...l, quantity: Number(e.target.value) }
                                                            : l,
                                                    ),
                                                )
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('common:action.delete')}
                                            disabled={submitting}
                                            onClick={() =>
                                                setDeliverLines((prev) =>
                                                    prev.filter((l) => l.key !== line.key),
                                                )
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={submitting}
                                    onClick={() =>
                                        setDeliverLines((prev) => [
                                            ...prev,
                                            { key: crypto.randomUUID(), skuId: '', quantity: 1 },
                                        ])
                                    }
                                >
                                    <Plus className="size-4" />
                                    {t('return.form.addDeliverLine')}
                                </Button>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {t('return.form.estimateHint')}
                            </p>
                        </section>
                    )}

                    {/* ---- thông tin chung ---- */}
                    <section className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="return-customer-name">
                                {t('return.form.customerName')}
                            </Label>
                            <Input
                                id="return-customer-name"
                                value={customerName}
                                maxLength={100}
                                disabled={submitting}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="return-customer-phone">
                                {t('return.form.customerPhone')}
                            </Label>
                            <Input
                                id="return-customer-phone"
                                value={customerPhone}
                                maxLength={20}
                                inputMode="tel"
                                disabled={submitting}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <Label htmlFor="return-reason">{t('return.form.reason')}</Label>
                            <Textarea
                                id="return-reason"
                                value={reason}
                                rows={2}
                                maxLength={500}
                                disabled={submitting}
                                placeholder={t('return.form.reasonPlaceholder')}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <Label htmlFor="return-description">
                                {t('return.form.description')}
                            </Label>
                            <Textarea
                                id="return-description"
                                value={description}
                                rows={2}
                                maxLength={500}
                                disabled={submitting}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </section>
                </div>

                <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {validation && (
                        <p className="text-muted-foreground mr-auto text-xs">{t(validation)}</p>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        onClick={() => void handleSubmit()}
                        disabled={submitting || validation !== null}
                    >
                        {submitting ? t('common:action.submitting') : t('return.form.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

/** Nhóm nút chọn 1-trong-N, dùng cho "loại yêu cầu" và "nguồn hàng". */
function ChoiceRow({
    label,
    value,
    options,
    onChange,
    disabled,
}: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    disabled?: boolean
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label>{label}</Label>
            <div className="flex gap-2">
                {options.map((option) => (
                    <Button
                        key={option.value}
                        type="button"
                        variant={value === option.value ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    )
}

/**
 * Dòng hàng của phiếu **không hoá đơn** — mỗi dòng phải tự khai `skuId` **và** `unitAmount`
 * (thiếu một trong hai ⇒ `error.return.lineInvalid`).
 */
function ManualLines({
    lines,
    skuSelectProps,
    disabled,
    onPatch,
    onRemove,
    onAdd,
}: {
    lines: DraftReturnLine[]
    /** Bộ props của `useSkuOptions()` — tra phía server + infinite scroll. */
    skuSelectProps: ReturnType<typeof useSkuOptions>['selectProps']
    disabled: boolean
    onPatch: (key: string, patch: Partial<DraftReturnLine>) => void
    onRemove: (key: string) => void
    onAdd: () => void
}) {
    const { t } = useTranslation(['return', 'common'])
    return (
        <div className="space-y-2">
            {lines.map((line) => (
                <div key={line.key} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <SearchSelect
                                {...skuSelectProps}
                                value={line.skuId}
                                disabled={disabled}
                                placeholder={t('return.form.pickSku')}
                                onChange={(v) => onPatch(line.key, { skuId: v })}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common:action.delete')}
                            disabled={disabled}
                            onClick={() => onRemove(line.key)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[6rem_1fr]">
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">{t('return.form.quantity')}</Label>
                            <Input
                                type="number"
                                min={1}
                                value={line.quantity}
                                disabled={disabled}
                                onChange={(e) =>
                                    onPatch(line.key, { quantity: Number(e.target.value) })
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">{t('return.form.unitAmount')}</Label>
                            {/* Ô tiền ⇒ `MoneyInput` có hậu tố `đ` (CONVENTIONS mục 5.5). */}
                            <MoneyInput
                                value={line.unitAmount}
                                disabled={disabled}
                                onChange={(v) => onPatch(line.key, { unitAmount: v })}
                            />
                        </div>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {t('return.form.unitAmountHint')}
                    </p>
                </div>
            ))}
            <Button variant="outline" size="sm" disabled={disabled} onClick={onAdd}>
                <Plus className="size-4" />
                {t('return.form.addReturnLine')}
            </Button>
        </div>
    )
}
