import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
    type Column,
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
// Kích hoạt `declare module` mở rộng `ColumnMeta` (sortField / columnLabel / align).
import './types'

export type DataTablePagination = {
    /** Trang hiện tại, bắt đầu từ 1 — khớp `SearchReq.page` phía backend. */
    page: number
    size: number
    total: number
    onPageChange: (page: number) => void
}

/**
 * Id cột **STT** do `DataTable` tự chèn (CONVENTIONS mục 5.6). Đặt tiền tố `__` để không bao giờ
 * đụng tên field của backend.
 */
export const INDEX_COLUMN_ID = '__index'

/** Bề ngang cột STT — đủ cho 4 chữ số (`size` 200 × trang 50 vẫn chỉ tới 4 số). */
const INDEX_COLUMN_SIZE = 56

/** Số cột ghim mặc định: **STT + cột mã + cột tên** (CONVENTIONS mục 5.6). */
const DEFAULT_PINNED_COLUMN_COUNT = 3

/**
 * Bảng **đã bị cuộn ngang hay chưa** — dùng để chỉ kẻ vạch phân cách dải cột ghim **khi cần**.
 * Bảng vừa khung mà vẫn kẻ vạch thì người dùng thấy một đường dọc lạc lõng giữa bảng.
 *
 * ⚠️ Khung cuộn thật là `<div data-slot="table-container">` **bên trong** `Table` của shadcn, không
 * phải div bọc ngoài của `DataTable` ⇒ phải tìm xuống qua `querySelector`. `ResizeObserver` để
 * bật/tắt lại khi người dùng ẩn/hiện cột hoặc đổi kích thước cửa sổ làm bảng hết (hoặc bắt đầu) tràn.
 */
function useScrolledX(wrapperRef: React.RefObject<HTMLDivElement | null>): boolean {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const scroller = wrapperRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
        if (!scroller) return

        const update = () => setScrolled(scroller.scrollLeft > 0)
        update()
        scroller.addEventListener('scroll', update, { passive: true })
        const observer = new ResizeObserver(update)
        observer.observe(scroller)
        return () => {
            scroller.removeEventListener('scroll', update)
            observer.disconnect()
        }
    }, [wrapperRef])

    return scrolled
}

const ALIGN_CLASS = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
} as const

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
    /**
     * Số cột **ghim trái** khi cuộn ngang, tính cả cột STT tự chèn. Mặc định **3**
     * (STT + mã + tên — CONVENTIONS mục 5.6).
     *
     * ⚠️ Cột được ghim **bắt buộc khai `size`**: vị trí `left` của cột sau tính bằng tổng `size`
     * các cột ghim trước nó, không đo DOM. Cột ghim mà quên `size` sẽ lệch chỗ khi cuộn.
     * Truyền `0` cho bảng không muốn ghim (bảng ít cột, chắc chắn không tràn ngang).
     */
    pinnedColumnCount?: number
    className?: string
}

/**
 * Bảng dữ liệu dùng chung (PLAN Phase 5) — cột STT, sort cột, phân trang, bật/tắt cột, ghim cột,
 * nút tải lại, empty/loading/error state, scroll ngang trong khung ở màn hẹp
 * (CONVENTIONS mục 5 + 5.2 + 5.6).
 *
 * Search/filter là control rời do từng màn tự dựng (`DataTableToolbar`, đặt phía trên bảng) vì cần
 * gọi lại `POST .../search` với tham số riêng; `DataTable` chỉ render kết quả trang hiện tại +
 * các điều khiển của chính bảng.
 *
 * Ba thứ `DataTable` **ép cứng** để mọi bảng trong hệ thống giống nhau, màn hình không tự đặt được
 * (CONVENTIONS mục 5.6):
 * 1. **Cột STT** tự chèn ở đầu, đánh số theo **trang hiện tại** (`(page-1)*size + i + 1`).
 * 2. **Tiêu đề cột luôn căn giữa** — kể cả cột tiền tệ (nội dung mới căn phải).
 * 3. **Ghim `pinnedColumnCount` cột đầu** khi cuộn ngang.
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
    pinnedColumnCount = DEFAULT_PINNED_COLUMN_COUNT,
    className,
}: DataTableProps<TData>) {
    const { t } = useTranslation('common')
    const wrapperRef = useRef<HTMLDivElement>(null)
    const scrolledX = useScrolledX(wrapperRef)
    const [internalSorting, setInternalSorting] = useState<SortingState>([])
    const sorting = controlledSorting ?? internalSorting
    const [internalVisibility, setInternalVisibility] = useState<VisibilityState>({})
    const columnVisibility = controlledVisibility ?? internalVisibility

    /**
     * Cột **STT** — chèn ở `DataTable` chứ không bắt từng màn tự khai, để 9 bảng không trôi mỗi nơi
     * một kiểu và không màn nào quên (CONVENTIONS mục 5.6).
     *
     * ⚠️ Không khai `cell` ở đây: số thứ tự phải đếm theo **vị trí hiển thị** của dòng, mà
     * `row.index` của TanStack là vị trí trong mảng dữ liệu **trước khi sort** — bảng sort phía
     * client (Danh mục) sẽ ra số nhảy cóc. Giá trị được render thẳng trong thân bảng bên dưới.
     */
    const allColumns = useMemo<ColumnDef<TData, unknown>[]>(
        () => [
            {
                id: INDEX_COLUMN_ID,
                header: t('dataTable.index'),
                size: INDEX_COLUMN_SIZE,
                // Cột khung của bảng — không cho ẩn, và không có gì để sort (STT không phải dữ liệu).
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('dataTable.index'), align: 'center' },
            },
            ...columns,
        ],
        [columns, t],
    )

    /**
     * Ghim `pinnedColumnCount` cột đầu (STT + mã + tên). Ghim theo **thứ tự khai cột**, không theo
     * cột đang hiện: cột ghim đều là cột `enableHiding: false` nên không thể bị ẩn mất.
     */
    const pinnedColumnIds = useMemo(
        () =>
            allColumns
                .slice(0, Math.max(0, pinnedColumnCount))
                .map((column) => column.id ?? String((column as { accessorKey?: unknown }).accessorKey ?? ''))
                .filter(Boolean),
        [allColumns, pinnedColumnCount],
    )

    const table = useReactTable({
        data,
        columns: allColumns,
        state: { sorting, columnVisibility, columnPinning: { left: pinnedColumnIds, right: [] } },
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
    /** STT đánh theo **trang hiện tại**: dòng đầu trang 2 (size 20) là 21, không phải 1. */
    const indexOffset = pagination ? (pagination.page - 1) * pagination.size : 0

    return (
        <div className={cn('space-y-4', className)}>
            {/* `relative` để lớp phủ "đang tải lại" bám đúng khung bảng. */}
            <div ref={wrapperRef} className="bg-card relative overflow-x-auto rounded-lg border">
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
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={cellStyle(header.column)}
                                            className={cn(
                                                'text-muted-foreground py-2.5 text-xs font-semibold tracking-wide uppercase',
                                                // Tiêu đề **luôn căn giữa** (CONVENTIONS mục 5.6),
                                                // không phụ thuộc `meta.align` của nội dung ô.
                                                'text-center',
                                                pinnedClass(header.column, 'header', scrolledX),
                                            )}>
                                            {header.isPlaceholder ? null : canSort ? (
                                                <button
                                                    type="button"
                                                    /*
                                                     * `justify-center` để cụm "chữ + mũi tên sort" vẫn
                                                     * nằm giữa ô như tiêu đề cột không sort được.
                                                     *
                                                     * ⚠️ `uppercase` phải khai **lại** ở đây: preflight
                                                     * của Tailwind đặt `text-transform: none` cho
                                                     * `button` nên tiêu đề cột sort được **không** kế
                                                     * thừa `uppercase` của `<th>` — tiêu đề nào khai
                                                     * i18n dạng thường sẽ lệch hẳn với các cột khác.
                                                     */
                                                    className="hover:text-foreground mx-auto flex items-center justify-center gap-1 uppercase"
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
                            rows.map((row, rowIndex) => (
                                // `group/row` để ô **ghim** (nền đục, che nội dung cuộn bên dưới)
                                // vẫn sáng lên cùng cả dòng khi rê chuột.
                                <TableRow key={row.id} className="group/row">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            style={cellStyle(cell.column)}
                                            className={cn(
                                                ALIGN_CLASS[cell.column.columnDef.meta?.align ?? 'left'],
                                                pinnedClass(cell.column, 'cell', scrolledX),
                                            )}>
                                            {cell.column.id === INDEX_COLUMN_ID
                                                ? indexOffset + rowIndex + 1
                                                : flexRender(
                                                      cell.column.columnDef.cell,
                                                      cell.getContext(),
                                                  )}
                                        </TableCell>
                                    ))}
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

/**
 * Chiều rộng + vị trí ghim của một ô.
 *
 * `size` khai trong `ColumnDef` ⇒ cột có chiều rộng cố định (ví dụ cột THAO TÁC chỉ cần đúng bề
 * ngang nút, không nên bị kéo giãn theo cột dài nhất bảng). Cột **ghim** thì thêm `maxWidth` để
 * chiều rộng thật khớp đúng `size` — `left` của cột ghim kế tiếp tính bằng tổng `size` các cột
 * trước nó, ô nào phình ra vì nội dung dài là lệch cả dải ghim.
 */
function cellStyle<TData>(column: Column<TData, unknown>): React.CSSProperties | undefined {
    const pinned = column.getIsPinned() === 'left'
    if (column.columnDef.size === undefined) return pinned ? { left: column.getStart('left') } : undefined
    const width = column.getSize()
    return pinned
        ? { width, minWidth: width, maxWidth: width, left: column.getStart('left') }
        : { width, minWidth: width }
}

/**
 * Class của ô **ghim trái** (CONVENTIONS mục 5.6).
 *
 * ⚠️ Nền phải **đục**, nếu không nội dung cuộn ngang sẽ chạy xuyên qua ô ghim. Vì vậy màu nền khi
 * rê chuột không dùng thẳng `bg-muted/50` như dòng thường (trong suốt 50%) mà trộn sẵn bằng
 * `color-mix` để ra **đúng cùng một màu** với phần dòng không ghim.
 */
function pinnedClass<TData>(
    column: Column<TData, unknown>,
    kind: 'header' | 'cell',
    scrolledX: boolean,
): string | undefined {
    if (column.getIsPinned() !== 'left') return undefined
    return cn(
        'bg-card sticky z-10 overflow-hidden',
        // Vạch phân cách dải cột đứng yên — **chỉ khi đã cuộn**, bảng vừa khung thì không kẻ gì.
        scrolledX && column.getIsLastColumn('left') && 'border-r',
        kind === 'cell' &&
            'group-hover/row:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]',
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
