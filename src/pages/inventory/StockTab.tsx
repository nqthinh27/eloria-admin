import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Boxes, XCircle } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { stockItemApi } from '@/api/inventory'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { hasRole } from '@/config/roles'
import { formatNumber } from '@/lib/format'
import { ERole } from '@/types/common'
import type { StockItem } from '@/types/inventory'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { StatusBadge } from '@/components/status-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL = 'ALL'
const PAGE_SIZE = 10

/**
 * Trạng thái tồn dùng cho badge — **suy ra ở FE**, backend không trả field này.
 * Quy tắc bám đúng mockup `13`: hết hàng khi `available <= 0`, cảnh báo khi dưới ngưỡng tối thiểu.
 *
 * ⚠️ **`minStock` không còn nullable** *(breaking 2026-08-11)* — luôn có số, mặc định `0`.
 * Nhưng backend **vẫn chưa có API đặt ngưỡng** nên thực tế mọi dòng đều `minStock = 0`, khiến
 * nhánh `low` chỉ nổ khi `available <= 0` — trùng luôn với `outOfStock` (đã return trước đó)
 * ⇒ **badge "Cảnh báo" hiện KHÔNG BAO GIỜ xuất hiện** cho tới khi có API đặt ngưỡng.
 * Giữ nhánh này để chạy đúng ngay khi backend bổ sung, không phải sửa lại logic.
 */
function stockTone(item: StockItem) {
    if (item.available <= 0) return 'outOfStock' as const
    if (item.minStock > 0 && item.available <= item.minStock) return 'low' as const
    return 'normal' as const
}

/** Tab "Tồn kho" theo `13-kho-hang-ton-kho.png` — `POST /stock-item/search`. */
export function StockTab() {
    const { t } = useTranslation(['inventory', 'common'])
    const { user } = useAuth()
    /** Chỉ SUPER_ADMIN mới lọc được theo chi nhánh; role thấp hơn bị backend ép về chi nhánh mình. */
    const canFilterBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const { branches, refresh: refreshBranches } = useBranch()

    const [data, setData] = useState<StockItem[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [branchFilter, setBranchFilter] = useState<string>(ALL)
    const [lowStockOnly, setLowStockOnly] = useState(false)

    const load = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true)
            setError(false)
            try {
                const result = await stockItemApi.search(
                    {
                        keyword: keyword || undefined,
                        branchId:
                            canFilterBranch && branchFilter !== ALL ? branchFilter : undefined,
                        lowStockOnly: lowStockOnly || undefined,
                    },
                    { page, size: PAGE_SIZE, sort: ['createdDate,DESC'] },
                    signal,
                )
                setData(result.data)
                setTotal(result.total)
            } catch {
                if (signal?.aborted) return
                setError(true)
            } finally {
                if (!signal?.aborted) setLoading(false)
            }
        },
        [page, keyword, branchFilter, lowStockOnly, canFilterBranch],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    useEffect(() => {
        if (!canFilterBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canFilterBranch, refreshBranches])

    /*
     * Thẻ cảnh báo phía trên bảng (mockup `13`).
     *
     * ⚠️ Đếm trên **trang hiện tại**, không phải toàn hệ thống: backend chưa có API trả tổng số
     * SKU hết hàng / dưới ngưỡng (`stock-item/search` chỉ trả `total`, không có `outOfStockTotal`
     * như `activeTotal` của các module khác). Nhãn đã ghi rõ phạm vi để không hiểu nhầm là số
     * toàn chuỗi — xem báo cáo Phase 10.
     */
    const alertCounts = useMemo(() => {
        let outOfStock = 0
        let low = 0
        for (const item of data) {
            const tone = stockTone(item)
            if (tone === 'outOfStock') outOfStock += 1
            else if (tone === 'low') low += 1
        }
        return { outOfStock, low }
    }, [data])

    const columns = useMemo<ColumnDef<StockItem, unknown>[]>(
        () => [
            {
                accessorKey: 'skuCode',
                header: t('inventory.stock.column.sku'),
                cell: ({ row }) => (
                    <span className="text-muted-foreground font-mono text-xs">
                        {row.original.skuCode}
                    </span>
                ),
            },
            {
                accessorKey: 'productName',
                header: t('inventory.stock.column.product'),
                cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
            },
            {
                accessorKey: 'sizeLabel',
                header: t('inventory.stock.column.size'),
                cell: ({ row }) => (
                    <span className="bg-muted inline-flex size-7 items-center justify-center rounded-full text-xs">
                        {row.original.sizeLabel}
                    </span>
                ),
            },
            {
                accessorKey: 'colorName',
                header: t('inventory.stock.column.color'),
            },
            {
                accessorKey: 'total',
                header: t('inventory.stock.column.total'),
                cell: ({ row }) => (
                    <span className="font-semibold">{formatNumber(row.original.total)}</span>
                ),
            },
            /*
             * ⚠️ **Đã gỡ cột "Đang giữ" (2026-08-14)** — backend bỏ hẳn cơ chế giữ chỗ và xoá cột
             * `reserved` khỏi cả API lẫn DB (user chốt: không đặt chỗ khi thêm giỏ, hết hàng thì
             * báo lúc đặt đơn — kiểu Shopee). Không có nguồn dữ liệu cho cột này nữa.
             *
             * Cột "Khả dụng" bên dưới vẫn giữ dù `available === total`, vì mockup `13` có cột này
             * và nó mang màu cảnh báo hết hàng/tồn thấp.
             */
            {
                accessorKey: 'available',
                header: t('inventory.stock.column.available'),
                cell: ({ row }) => {
                    const tone = stockTone(row.original)
                    return (
                        <span
                            className={
                                tone === 'outOfStock'
                                    ? 'text-destructive font-semibold'
                                    : tone === 'low'
                                      ? 'text-warning font-semibold'
                                      : 'text-success font-semibold'
                            }>
                            {formatNumber(row.original.available)}
                        </span>
                    )
                },
            },
            {
                accessorKey: 'minStock',
                header: t('inventory.stock.column.minStock'),
                cell: ({ row }) =>
                    /*
                     * `minStock` luôn có số từ 2026-08-11 (mặc định 0). Vẫn chưa có API đặt ngưỡng
                     * ⇒ `0` nghĩa là "chưa đặt" chứ không phải ngưỡng thật; hiển thị "Chưa đặt"
                     * cho đúng nghĩa nghiệp vụ thay vì một số 0 gây hiểu nhầm.
                     */
                    row.original.minStock === 0 ? (
                        <span className="text-muted-foreground text-xs">
                            {t('inventory.stock.minStockUnset')}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            {formatNumber(row.original.minStock)}
                        </span>
                    ),
            },
            {
                accessorKey: 'branchName',
                header: t('inventory.stock.column.branch'),
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-sm">{row.original.branchName}</span>
                ),
            },
            {
                id: 'status',
                header: t('inventory.stock.column.status'),
                cell: ({ row }) => {
                    const tone = stockTone(row.original)
                    if (tone === 'outOfStock') {
                        return (
                            <StatusBadge tone="danger">
                                {t('inventory.stock.status.outOfStock')}
                            </StatusBadge>
                        )
                    }
                    if (tone === 'low') {
                        return (
                            <StatusBadge tone="warning">
                                {t('inventory.stock.status.low')}
                            </StatusBadge>
                        )
                    }
                    return (
                        <StatusBadge tone="success">
                            {t('inventory.stock.status.normal')}
                        </StatusBadge>
                    )
                },
            },
        ],
        [t],
    )

    return (
        <div className="space-y-4">
            {/* Thẻ cảnh báo — chỉ hiện khi có dòng tương ứng trong trang hiện tại. */}
            {(alertCounts.outOfStock > 0 || alertCounts.low > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {alertCounts.outOfStock > 0 && (
                        <div className="bg-destructive-muted flex items-start gap-3 rounded-xl p-4">
                            <XCircle className="text-destructive mt-0.5 size-5 shrink-0" />
                            <div>
                                <p className="text-destructive text-sm font-medium">
                                    {t('inventory.stock.alert.outOfStock', {
                                        count: alertCounts.outOfStock,
                                    })}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {t('inventory.stock.alert.outOfStockHint')}
                                </p>
                            </div>
                        </div>
                    )}
                    {alertCounts.low > 0 && (
                        <div className="bg-warning-muted flex items-start gap-3 rounded-xl p-4">
                            <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
                            <div>
                                <p className="text-warning text-sm font-medium">
                                    {t('inventory.stock.alert.lowStock', { count: alertCounts.low })}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {t('inventory.stock.alert.lowStockHint')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <DataTableToolbar
                searchValue={keyword}
                onSearchChange={(value) => {
                    setKeyword(value)
                    setPage(1)
                }}
                searchPlaceholder={t('inventory.stock.searchPlaceholder')}
                filters={
                    <>
                        {canFilterBranch && (
                            <Select
                                value={branchFilter}
                                onValueChange={(v) => {
                                    setBranchFilter(v)
                                    setPage(1)
                                }}>
                                <SelectTrigger className="w-full sm:w-52">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>
                                        {t('inventory.stock.allBranches')}
                                    </SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="lowStockOnly"
                                checked={lowStockOnly}
                                onCheckedChange={(checked) => {
                                    setLowStockOnly(checked === true)
                                    setPage(1)
                                }}
                            />
                            <Label htmlFor="lowStockOnly" className="text-sm font-normal">
                                {t('inventory.stock.lowStockOnly')}
                            </Label>
                        </div>
                    </>
                }
            />

            <DataTable
                columns={columns}
                data={data}
                getRowId={(row) => row.id}
                loading={loading}
                error={error}
                onRetry={() => void load()}
                unitLabel={t('inventory.stock.resultLabel')}
                pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                emptyState={
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-12">
                        <Boxes className="size-8" />
                        <p className="text-sm">{t('inventory.stock.empty')}</p>
                        <p className="text-xs">{t('inventory.stock.emptyHint')}</p>
                    </div>
                }
            />
        </div>
    )
}
