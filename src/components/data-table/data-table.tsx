import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type VisibilityState,
} from '@tanstack/react-table'
import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshingOverlay } from './data-table-view-options'
// Kích hoạt `declare module` mở rộng `ColumnMeta` (sortField / columnLabel).
import './types'

export type DataTablePagination = {
    /** Trang hiện tại, bắt đầu từ 1 — khớp `SearchReq.page` phía backend. */
    page: number
    size: number
    total: number
    onPageChange: (page: number) => void
}

type DataTableProps<TData> = {
    columns: ColumnDef<TData, unknown>[]
    data: TData[]
    /** Khoá dòng ổn định cho `key` React — bắt buộc vì id thường là UUID chuỗi. */
    getRowId: (row: TData) => string
    loading?: boolean
    error?: boolean
    onRetry?: () => void
    /** Nhãn số nhiều cho dòng "Hiển thị x–y trong tổng số n …" (ví dụ: "đơn hàng", "nhân viên"). */
    unitLabel: string
    pagination?: DataTablePagination
    /**
     * Sort hiện tại. Có kèm `onSortingChange` ⇒ **sort phía server** (`manualSorting`);
     * không kèm ⇒ sort phía client trong phạm vi trang hiện tại.
     *
     * ⚠️ CONVENTIONS mục 5.2: bảng phân trang phía server **phải** dùng sort server, và cột nào
     * backend không sort được phải khai `enableSorting: false` — sort client trên 1 trang cho ra
     * kết quả sai mà người dùng không biết.
     */
    sorting?: SortingState
    onSortingChange?: (sorting: SortingState) => void
    /** Cột đang ẩn/hiện — lấy từ `useTableState`. Không truyền ⇒ `DataTable` tự giữ state. */
    columnVisibility?: VisibilityState
    onColumnVisibilityChange?: (value: VisibilityState) => void
    /**
     * Đang **tải lại** (khác `loading` = nạp lần đầu): bảng **mờ đi + khoá tương tác + hiện spinner
     * giữa bảng**, nhưng **giữ nguyên dữ liệu cũ** thay vì nháy skeleton làm mất vị trí đọc
     * (user chốt 2026-08-28: phải thấy rõ là đang tải, icon xoay ở nút thôi thì quá kín đáo).
     *
     * ⚠️ **Không có prop `onRefresh`.** Nút Tải lại và dropdown Hiển thị cột nằm ở
     * `DataTableToolbar` (slot `tableControls`), **cùng hàng với search/filter**
     * (CONVENTIONS mục 5) — `DataTable` không vẽ chúng nữa, chỉ hiển thị trạng thái đang tải.
     */
    refreshing?: boolean
    emptyState?: ReactNode
    className?: string
}

/**
 * Bảng dữ liệu dùng chung (PLAN Phase 5) — sort cột, phân trang, bật/tắt cột, nút tải lại,
 * empty/loading/error state, scroll ngang trong khung ở màn hẹp
 * (CONVENTIONS mục 5 + 5.2).
 *
 * Search/filter là control rời do từng màn tự dựng (`DataTableToolbar`, đặt phía trên bảng) vì cần
 * gọi lại `POST .../search` với tham số riêng; `DataTable` chỉ render kết quả trang hiện tại +
 * các điều khiển của chính bảng.
 */
export function DataTable<TData>({
    columns,
    data,
    getRowId,
    loading = false,
    error = false,
    onRetry,
    unitLabel,
    pagination,
    sorting: controlledSorting,
    onSortingChange,
    columnVisibility: controlledVisibility,
    onColumnVisibilityChange,
    refreshing = false,
    emptyState,
    className,
}: DataTableProps<TData>) {
    const { t } = useTranslation('common')
    const [internalSorting, setInternalSorting] = useState<SortingState>([])
    const sorting = controlledSorting ?? internalSorting
    const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({})
    const columnVisibility = controlledVisibility ?? internalVisibility

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility },
        onSortingChange: (updater) => {
            const next = typeof updater === 'function' ? updater(sorting) : updater
            if (onSortingChange) {
                onSortingChange(next)
            } else {
                setInternalSorting(next)
            }
        },
        onColumnVisibilityChange: (updater) => {
            const next = typeof updater === 'function' ? updater(columnVisibility) : updater
            if (onColumnVisibilityChange) {
                onColumnVisibilityChange(next)
            } else {
                setInternalVisibility(next)
            }
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: onSortingChange ? undefined : getSortedRowModel(),
        manualSorting: Boolean(onSortingChange),
        getRowId,
    })

    const rows = table.getRowModel().rows
    /** Số cột đang hiện — dùng cho `colSpan` của các dòng trạng thái. */
    const visibleColumnCount = table.getVisibleLeafColumns().length

    return (
        <div className={cn('space-y-4', className)}>
            {/* `relative` để lớp phủ "đang tải lại" bám đúng khung bảng. */}
            <div className="bg-card relative overflow-x-auto rounded-lg border">
                {/*
                 * Lớp phủ khi **tải lại**: làm mờ + khoá tương tác + hiện spinner, nhưng dữ liệu cũ
                 * vẫn nằm nguyên bên dưới nên người dùng không mất chỗ đang đọc
                 * (user chốt 2026-08-28). Khác hẳn `loading` (nạp lần đầu) — lúc đó mới dựng skeleton.
                 *
                 * `pointer-events-auto` là cố ý: chặn bấm vào nút trong bảng khi dữ liệu sắp đổi,
                 * tránh thao tác nhầm lên dòng ngay trước lúc nó bị thay thế.
                 */}
                {refreshing && !loading && <RefreshingOverlay />}
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort()
                                    const sortDir = header.column.getIsSorted()
                                    // `size` khai trong ColumnDef ⇒ cột có chiều rộng cố định (ví dụ
                                    // cột THAO TÁC chỉ cần đúng bằng bề ngang nút, không nên bị `flex`
                                    // kéo giãn theo nội dung cột dài nhất trong bảng).
                                    const hasFixedWidth = header.column.columnDef.size !== undefined
                                    const widthStyle = hasFixedWidth
                                        ? { width: header.getSize(), minWidth: header.getSize() }
                                        : undefined
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={widthStyle}
                                            className="text-muted-foreground py-2.5 text-xs font-semibold tracking-wide uppercase">
                                            {header.isPlaceholder ? null : canSort ? (
                                                <button
                                                    type="button"
                                                    className="hover:text-foreground flex items-center gap-1"
                                                    onClick={header.column.getToggleSortingHandler()}>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {sortDir === 'asc' ? (
                                                        <ArrowUp className="size-3.5" />
                                                    ) : sortDir === 'desc' ? (
                                                        <ArrowDown className="size-3.5" />
                                                    ) : (
                                                        <ArrowUpDown className="size-3.5 opacity-40" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext(),
                                                )
                                            )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: pagination?.size ?? 5 }).map((_, i) => (
                                <TableRow key={i} className="hover:bg-transparent">
                                    {Array.from({ length: visibleColumnCount }).map((_, colIndex) => (
                                        <TableCell key={colIndex}>
                                            <Skeleton className="h-5 w-full max-w-40" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={visibleColumnCount} className="h-40 text-center">
                                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                                        <AlertCircle className="size-6" />
                                        <p className="text-sm">{t('dataTable.error')}</p>
                                        {onRetry && (
                                            <Button variant="outline" size="sm" onClick={onRetry}>
                                                {t('action.retry')}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={visibleColumnCount} className="h-40 text-center">
                                    <div className="text-muted-foreground text-sm">
                                        {emptyState ?? t('dataTable.empty')}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => {
                                        const hasFixedWidth = cell.column.columnDef.size !== undefined
                                        const widthStyle = hasFixedWidth
                                            ? { width: cell.column.getSize(), minWidth: cell.column.getSize() }
                                            : undefined
                                        return (
                                            <TableCell key={cell.id} style={widthStyle}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && !loading && !error && data.length > 0 && (
                <DataTablePager unitLabel={unitLabel} pagination={pagination} />
            )}
        </div>
    )
}

function DataTablePager({
    unitLabel,
    pagination: { page, size, total, onPageChange },
}: {
    unitLabel: string
    pagination: DataTablePagination
}) {
    const { t } = useTranslation('common')
    const pageCount = Math.max(1, Math.ceil(total / size))
    const from = (page - 1) * size + 1
    const to = Math.min(page * size, total)

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
                {t('dataTable.showingRange', { from, to, total, unit: unitLabel })}
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    aria-label={t('dataTable.prevPage')}
                    onClick={() => onPageChange(page - 1)}>
                    <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium">{t('dataTable.pageOf', { page, pageCount })}</span>
                <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= pageCount}
                    aria-label={t('dataTable.nextPage')}
                    onClick={() => onPageChange(page + 1)}>
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    )
}
