import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VisibilityState } from '@tanstack/react-table'
import { Loader2, RefreshCw, Settings2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Nút **Tải lại** của bảng (CONVENTIONS mục 5.2 mục 1).
 *
 * ⚠️ Bấm vào chỉ gọi lại API, **giữ nguyên** `page`/`size`/`sort`/filter/scroll — vì vậy hàm
 * `onRefresh` truyền vào phải là `tableState.refresh` (tăng nonce), **không** phải hàm reset filter.
 *
 * Trong lúc tải chỉ quay icon; **không** để bảng nháy skeleton (làm mất vị trí đọc) — đó là lý do
 * màn hình phân biệt `loading` (nạp lần đầu) với `refreshing` (tải lại ngầm).
 */
export function DataTableRefreshButton({
    onRefresh,
    refreshing = false,
}: {
    onRefresh: () => void
    refreshing?: boolean
}) {
    const { t } = useTranslation('common')
    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={t('dataTable.refresh')}
            title={t('dataTable.refresh')}>
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
        </Button>
    )
}

/**
 * Lớp phủ **"đang tải lại"** dùng chung: làm mờ + khoá tương tác + hiện spinner, **giữ nguyên nội
 * dung cũ bên dưới** (user chốt 2026-08-28 — icon xoay ở nút thôi thì quá kín đáo).
 *
 * `DataTable` tự dùng cái này cho bảng; các màn **lưới card** (Sản phẩm, Chi nhánh) không đi qua
 * `DataTable` nên tự bọc nội dung trong `<div className="relative">` rồi đặt component này vào.
 *
 * ⚠️ **Không** dùng cho lần nạp đầu — lúc đó phải là skeleton, vì chưa có nội dung nào để phủ lên.
 */
export function RefreshingOverlay({ children }: { children?: ReactNode }) {
    const { t } = useTranslation('common')
    return (
        <div
            aria-hidden
            className="bg-card/60 pointer-events-auto absolute inset-0 z-20 flex items-start justify-center pt-16 backdrop-blur-[1px]">
            <span className="bg-card text-muted-foreground flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm">
                <Loader2 className="size-4 animate-spin" />
                {children ?? t('dataTable.refreshing')}
            </span>
        </div>
    )
}

/**
 * Chỉ cần đúng 4 field của `ColumnDef` — khai kiểu tối giản để **mọi `ColumnDef<T>` truyền vào
 * được**. Dùng `ColumnDef<never, unknown>` sẽ vướng biến thiên generic của TanStack
 * (`ColumnDef<Staff>` không gán được cho `ColumnDef<never>`).
 */
export type ToggleableColumn = {
    id?: string
    accessorKey?: string | number
    enableHiding?: boolean
    meta?: { columnLabel?: string }
}

/** Cột ẩn được = không khai `enableHiding: false`. Khớp đúng luật của TanStack. */
function isHideable(column: ToggleableColumn): boolean {
    return column.enableHiding !== false
}

/** `ColumnDef` không bắt buộc có `id`; cột dùng `accessorKey` thì `id` mặc định là chính key đó. */
function columnKey(column: ToggleableColumn): string {
    return column.id ?? String(column.accessorKey ?? '')
}

/**
 * Dropdown **bật/tắt cột** (CONVENTIONS mục 5.2 mục 2), đặt **cùng hàng search/filter** ở
 * `DataTableToolbar` (chốt với user 2026-08-28).
 *
 * ⚠️ Dựng thẳng từ **`ColumnDef[]` + `VisibilityState`** của màn hình, **không** cần instance
 * `table` của TanStack: toolbar là component **anh em** của `DataTable` và render trước nó, nên
 * không lấy được instance đó. Hai nguồn này màn hình vốn đã có sẵn (`columns` useMemo +
 * `useTableState`), và `DataTable` cũng nhận đúng `columnVisibility` ấy nên hai bên luôn khớp.
 *
 * Nhãn lấy từ `meta.columnLabel` (đã i18n sẵn ở nơi khai cột) — không tự dịch ở đây vì `header`
 * của cột có thể là JSX chứ không phải chuỗi.
 */
export function DataTableViewOptions({
    columns,
    columnVisibility,
    onColumnVisibilityChange,
}: {
    columns: readonly ToggleableColumn[]
    columnVisibility: VisibilityState
    onColumnVisibilityChange: (value: VisibilityState) => void
}) {
    const { t } = useTranslation('common')
    const hideable = columns.filter(isHideable)

    if (hideable.length === 0) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t('dataTable.columns')}
                    title={t('dataTable.columns')}>
                    <Settings2 className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{t('dataTable.columns')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideable.map((column) => {
                    const key = columnKey(column)
                    /* TanStack coi cột là HIỆN khi thiếu key trong map ⇒ mặc định `true`. */
                    const visible = columnVisibility[key] !== false
                    return (
                        <DropdownMenuCheckboxItem
                            key={key}
                            checked={visible}
                            /* `onSelect` chặn đóng menu để bật/tắt nhiều cột liên tiếp. */
                            onSelect={(event) => event.preventDefault()}
                            onCheckedChange={(value) =>
                                onColumnVisibilityChange({
                                    ...columnVisibility,
                                    [key]: Boolean(value),
                                })
                            }>
                            {column.meta?.columnLabel ?? key}
                        </DropdownMenuCheckboxItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/**
 * Cụm điều khiển bảng dùng chung — truyền vào slot `tableControls` của `DataTableToolbar`
 * để nó nằm **cùng hàng với search/filter** (CONVENTIONS mục 5, chốt 2026-08-28).
 *
 * Gom 2 nút vào một component để mọi màn khai giống hệt nhau, thay vì mỗi nơi tự ghép một kiểu.
 */
export function DataTableControls({
    columns,
    columnVisibility,
    onColumnVisibilityChange,
    onRefresh,
    refreshing,
}: {
    columns: readonly ToggleableColumn[]
    columnVisibility: VisibilityState
    onColumnVisibilityChange: (value: VisibilityState) => void
    onRefresh: () => void
    refreshing?: boolean
}) {
    return (
        <>
            <DataTableRefreshButton onRefresh={onRefresh} refreshing={refreshing} />
            <DataTableViewOptions
                columns={columns}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={onColumnVisibilityChange}
            />
        </>
    )
}
