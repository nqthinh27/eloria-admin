import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ClipboardCheck, Loader2, PackageSearch } from 'lucide-react'

import { stockItemApi, stockOperationApi } from '@/api/inventory'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { hasRole } from '@/config/roles'
import { toastSuccess } from '@/lib/toast'
import { ERole } from '@/types/common'
import type { StockItem } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { SectionCard } from '@/components/section-card'

/**
 * Trần số dòng tồn nạp cho phiên kiểm kê.
 *
 * ⚠️ Kiểm kê phải nhập số đếm cho **toàn bộ** SKU đang có tồn, nên không phân trang được —
 * phân trang sẽ làm mất số đã gõ ở trang trước (state chỉ giữ trong màn).
 *
 * Giá trị **200 là trần cứng của backend**, không phải lựa chọn của FE: gửi `size` lớn hơn vẫn chỉ
 * trả 200 dòng, **im lặng, không báo lỗi** (đo thật 2026-08-11 — 201/300/500/1000 đều trả 200).
 * Bản trước để 500 nên tưởng nạp được 500 mà thực tế luôn dừng ở 200. Chi nhánh có hơn 200 dòng tồn
 * ⇒ **cảnh báo rõ** (xem `truncatedTitle`) thay vì âm thầm cắt bớt.
 */
const MAX_COUNT_ROWS = 200

/**
 * Tab "Kiểm kê" — `15-kho-hang-kiem-ke.png` chỉ vẽ **empty state**, phần nhập liệu dựng theo
 * mô tả nghiệp vụ trong PLAN + shape thật của `StockCountReqDTO`.
 *
 * Luồng: nạp tồn hiện tại → nhập số đếm → `POST /stock-count` → backend tự so và trả **1–2 phiếu
 * điều chỉnh DRAFT**. Phiếu vẫn phải gửi duyệt + được duyệt ở tab "Phiếu kho" mới ghi tồn thật.
 */
export function StockCountTab() {
    const { t } = useTranslation(['inventory', 'common'])
    const { user } = useAuth()
    const canChooseBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const { branches, refresh: refreshBranches } = useBranch()

    const [started, setStarted] = useState(false)
    const [branchId, setBranchId] = useState('')
    const [items, setItems] = useState<StockItem[]>([])
    /**
     * Tổng số dòng tồn **phía backend** (`result.total`), không phải số dòng đã nạp.
     * Lớn hơn `MAX_COUNT_ROWS` ⇒ phiên kiểm kê này **không phủ hết kho** và phải nói rõ ra
     * (xem cảnh báo bên dưới) thay vì âm thầm cắt bớt.
     */
    const [totalItems, setTotalItems] = useState(0)
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [note, setNote] = useState('')
    /** `skuId → số đếm dạng chuỗi` (chuỗi rỗng = chưa đếm, khác hẳn với đếm được 0). */
    const [counted, setCounted] = useState<Record<string, string>>({})
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!canChooseBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canChooseBranch, refreshBranches])

    const loadItems = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true)
            try {
                const result = await stockItemApi.search(
                    { branchId: canChooseBranch && branchId ? branchId : undefined },
                    { page: 1, size: MAX_COUNT_ROWS, sort: ['createdDate,DESC'] },
                    signal,
                )
                setItems(result.data)
                setTotalItems(result.total)
            } catch {
                if (signal?.aborted) return
                setItems([])
                setTotalItems(0)
            } finally {
                if (!signal?.aborted) setLoading(false)
            }
        },
        [branchId, canChooseBranch],
    )

    function handleStart() {
        setStarted(true)
        setCounted({})
        setNote('')
        void loadItems()
    }

    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        if (!kw) return items
        return items.filter(
            (item) =>
                item.skuCode.toLowerCase().includes(kw) ||
                item.productName.toLowerCase().includes(kw),
        )
    }, [items, keyword])

    /** Chỉ dòng **đã nhập số** và **lệch** với tồn hệ thống mới được gửi lên. */
    const diffLines = useMemo(
        () =>
            items
                .filter((item) => {
                    const raw = counted[item.skuId]
                    if (raw === undefined || raw === '') return false
                    const value = Number(raw)
                    return Number.isFinite(value) && value >= 0 && value !== item.total
                })
                .map((item) => ({
                    skuId: item.skuId,
                    countedQuantity: Number(counted[item.skuId]),
                })),
        [items, counted],
    )

    const countedCount = useMemo(
        () => items.filter((item) => (counted[item.skuId] ?? '') !== '').length,
        [items, counted],
    )

    async function handleSubmit() {
        setSubmitting(true)
        try {
            const result = await stockOperationApi.stockCount({
                branchId: canChooseBranch && branchId ? branchId : undefined,
                description: note.trim() || undefined,
                lines: diffLines,
            })
            toastSuccess('inventory.toast.stockCountCreated', {
                ns: 'inventory',
                count: result.length,
            })
            setStarted(false)
            setCounted({})
            setNote('')
        } catch {
            /*
             * api-client đã toast lỗi. **Không** reset phiên kiểm kê ở đây: người dùng có thể vừa gõ
             * số đếm cho hàng trăm dòng, xoá sạch vì một lỗi API là mất trắng công. Giữ nguyên state
             * để họ sửa rồi gửi lại. Lỗi hay gặp nhất là `error.stock.countNoDiff` — lỗi nghiệp vụ
             * bình thường, không phải sự cố.
             */
        } finally {
            setSubmitting(false)
        }
    }

    /* ----------------- Empty state theo mockup `15` ----------------- */
    if (!started) {
        return (
            <SectionCard>
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="bg-muted flex size-16 items-center justify-center rounded-full">
                        <PackageSearch className="text-muted-foreground size-7" />
                    </div>
                    <p className="font-medium">{t('inventory.count.title')}</p>
                    <p className="text-muted-foreground max-w-md text-sm">
                        {t('inventory.count.description')}
                    </p>

                    {canChooseBranch && (
                        <div className="w-full max-w-xs space-y-2 text-left">
                            <Label>{t('inventory.count.branch')}</Label>
                            <Select value={branchId} onValueChange={setBranchId}>
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={t('inventory.form.branchPlaceholder')}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Button
                        className="mt-2"
                        // SUPER_ADMIN bắt buộc truyền branchId (backend trả `error.branch.required`).
                        disabled={canChooseBranch && !branchId}
                        onClick={handleStart}>
                        {t('inventory.count.start')}
                    </Button>
                </div>
            </SectionCard>
        )
    }

    /* ----------------- Bảng nhập số đếm ----------------- */
    return (
        <div className="space-y-4">
            <DataTableToolbar
                searchValue={keyword}
                onSearchChange={setKeyword}
                searchPlaceholder={t('inventory.count.searchPlaceholder')}
                actions={
                    <Button
                        variant="outline"
                        onClick={() => {
                            setStarted(false)
                            setCounted({})
                        }}>
                        {t('common:action.cancel')}
                    </Button>
                }
            />

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <SectionCard>
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-12">
                        <ClipboardCheck className="size-8" />
                        <p className="text-sm">{t('inventory.count.empty')}</p>
                        <p className="text-xs">{t('inventory.count.emptyHint')}</p>
                    </div>
                </SectionCard>
            ) : (
                <>
                    {/*
                     * Vượt trần ⇒ **nói rõ ra**, không âm thầm cắt: người dùng phải biết phiên này
                     * chỉ phủ `MAX_COUNT_ROWS`/`totalItems` dòng, nếu không sẽ tưởng đã kiểm kê
                     * toàn kho trong khi phần còn lại không hề được đếm.
                     */}
                    {totalItems > items.length && (
                        <div className="bg-warning-muted flex items-start gap-3 rounded-xl p-4">
                            <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
                            <div>
                                <p className="text-warning text-sm font-medium">
                                    {t('inventory.count.truncatedTitle', {
                                        loaded: items.length,
                                        total: totalItems,
                                    })}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {t('inventory.count.truncatedHint')}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="bg-card overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-muted-foreground border-b text-xs">
                                    <th className="px-4 py-3 text-left font-medium">
                                        {t('inventory.count.column.sku')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        {t('inventory.count.column.product')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        {t('inventory.count.column.variant')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        {t('inventory.count.column.systemQuantity')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        {t('inventory.count.column.countedQuantity')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        {t('inventory.count.column.variance')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item) => {
                                    const raw = counted[item.skuId] ?? ''
                                    const value = raw === '' ? null : Number(raw)
                                    const variance =
                                        value === null || !Number.isFinite(value)
                                            ? null
                                            : value - item.total

                                    return (
                                        <tr key={item.id} className="border-b last:border-0">
                                            <td className="text-muted-foreground px-4 py-2 font-mono text-xs">
                                                {item.skuCode}
                                            </td>
                                            <td className="px-4 py-2">{item.productName}</td>
                                            <td className="text-muted-foreground px-4 py-2">
                                                {[item.colorName, item.sizeLabel]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold">
                                                {item.total}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="ml-auto w-24 text-right"
                                                    placeholder={t(
                                                        'inventory.count.countedPlaceholder',
                                                    )}
                                                    aria-label={`${t('inventory.count.column.countedQuantity')} ${item.skuCode}`}
                                                    value={raw}
                                                    onChange={(e) =>
                                                        setCounted((prev) => ({
                                                            ...prev,
                                                            [item.skuId]: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {variance === null ? (
                                                    <span className="text-muted-foreground text-xs">
                                                        {t('inventory.count.notCounted')}
                                                    </span>
                                                ) : variance === 0 ? (
                                                    <span className="text-muted-foreground">0</span>
                                                ) : (
                                                    <span
                                                        className={
                                                            variance > 0
                                                                ? 'text-success font-semibold'
                                                                : 'text-destructive font-semibold'
                                                        }>
                                                        {variance > 0 ? `+${variance}` : variance}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="count-note">{t('inventory.count.noteLabel')}</Label>
                        <Textarea
                            id="count-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('inventory.count.notePlaceholder')}
                            maxLength={255}
                            rows={2}
                        />
                    </div>

                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-muted-foreground text-sm">
                                {t('inventory.count.summary', {
                                    counted: countedCount,
                                    total: items.length,
                                    diff: diffLines.length,
                                })}
                            </p>
                            {/*
                             * Con số tổng kết cố ý tính trên **toàn bộ** `items`, không phải
                             * `filtered` — bấm gửi là gửi hết mọi dòng đã nhập, kể cả dòng đang bị
                             * ô tìm kiếm ẩn đi. Khi đang lọc thì phải nói rõ điều đó, nếu không
                             * người dùng thấy "N dòng lệch" mà bảng trước mắt ít hơn sẽ tưởng sai.
                             */}
                            {keyword.trim() !== '' && (
                                <p className="text-muted-foreground text-xs">
                                    {t('inventory.count.filterScopeHint', {
                                        shown: filtered.length,
                                        total: items.length,
                                    })}
                                </p>
                            )}
                            <p className="text-muted-foreground text-xs">
                                {t('inventory.count.submitHint')}
                            </p>
                        </div>
                        <Button
                            disabled={diffLines.length === 0 || submitting}
                            onClick={() => setConfirmOpen(true)}>
                            {submitting && <Loader2 className="size-4 animate-spin" />}
                            {submitting
                                ? t('inventory.count.submitting')
                                : t('inventory.count.submit')}
                        </Button>
                    </div>

                    {diffLines.length === 0 && countedCount > 0 && (
                        <p className="text-muted-foreground text-sm">
                            {t('inventory.count.noDiff')}
                        </p>
                    )}
                </>
            )}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t('inventory.count.confirmTitle')}
                description={t('inventory.count.confirmDescription', { count: diffLines.length })}
                auditLogged
                onConfirm={handleSubmit}
            />
        </div>
    )
}
