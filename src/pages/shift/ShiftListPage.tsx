import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Eye, MoreHorizontal, Wallet, X } from 'lucide-react'

import { shiftApi } from '@/api/shift'
import { hasRole } from '@/config/roles'
import { formatDateTime, formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { ERole } from '@/types/common'
import { EShiftStatus, type WorkShift } from '@/types/shift'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ShiftCloseByIdDialog } from './components/shift-close-by-id-dialog'
import { ShiftDetailModal } from './components/shift-detail-modal'
import { ShiftRejectDialog } from './components/shift-reject-dialog'

const ALL_STATUSES = 'ALL'
const ALL_BRANCHES = 'ALL'
const PAGE_SIZE = 10
/** Ca mới nhất lên đầu khi người dùng chưa chọn cột sort nào. */
const DEFAULT_SORT = ['openedAt,DESC']

/** Tông màu badge theo vòng đời ca — bám quy ước `StatusBadge` của Phase 5. */
const STATUS_TONE: Record<EShiftStatus, StatusTone> = {
    INCOMING: 'muted',
    WAITING_APPROVAL: 'warning',
    OPEN: 'success',
    CLOSED: 'muted',
    REJECTED: 'danger',
}

/**
 * Màn **"Ca làm việc"** — PLAN Phase 15 (**không có mockup**, FE thiết kế theo pattern bảng
 * dùng chung của Phase 5).
 *
 * Gánh **2 việc** trong một màn:
 *
 * 1. **Duyệt ca** — ADMIN+ duyệt/từ chối yêu cầu mở ca (`WAITING_APPROVAL`). Đây là việc **có
 *    tính chặn**: nhân viên không bán được cho tới khi có người duyệt.
 * 2. **Tra cứu lịch sử ca** — xem lại tiền đầu ca / kỳ vọng / đã đếm / lệch quỹ của ca đã chốt.
 *
 * ⚠️ **Data-scope do backend quyết, FE không lọc thêm** (đã đo thật): STAFF chỉ thấy ca **của
 * chính mình** · ADMIN thấy ca **chi nhánh mình** · SUPER_ADMIN toàn chuỗi. Vì vậy màn này mở
 * cho **cả STAFF** (họ tra được ca của chính họ), chỉ các nút duyệt/từ chối/chốt hộ mới gate
 * theo `[ADMIN]`.
 *
 * ⚠️ **Bộ lọc chi nhánh chỉ bày cho SUPER_ADMIN** — ADMIN gửi `branchId` lên vẫn bị ép về chi
 * nhánh mình, bày ra là đánh lừa người dùng (cùng lý do với màn POS/Báo cáo).
 */
export default function ShiftListPage() {
    const { t } = useTranslation(['order', 'common'])
    const { user } = useAuth()
    const { branches, refresh: refreshBranches } = useBranch()

    /** Duyệt / từ chối / chốt hộ đều là `[ADMIN]` — STAFF gọi sẽ nhận 403. */
    const canApprove = hasRole(user?.role, ERole.ADMIN)
    const canPickBranch = hasRole(user?.role, ERole.SUPER_ADMIN)

    const [shifts, setShifts] = useState<WorkShift[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /** Tải lại ngầm: mờ bảng + spinner, **không** nháy skeleton (CONVENTIONS mục 5.2). */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)

    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)
    const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)

    const table = useTableState()
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [detailShift, setDetailShift] = useState<WorkShift | null>(null)
    const [rejectShift, setRejectShift] = useState<WorkShift | null>(null)
    const [closeShift, setCloseShift] = useState<WorkShift | null>(null)
    /** Chống bấm "Duyệt ca" hai lần khi request đang bay (menu tự đóng ngay sau khi bấm). */
    const approvingRef = useRef(false)
    /**
     * `reload` **mới nhất** cho `handleApprove` dùng — đi qua ref để `handleApprove` giữ được
     * identity ổn định và nằm được trong deps của `columns`.
     *
     * Vì sao phải vòng qua ref: để `handleApprove` phụ thuộc thẳng `reload` sẽ tạo vòng
     * `load → columns → handleApprove → reload → load` ⇒ effect nạp bảng chạy vô hạn; còn bỏ nó
     * khỏi deps của `columns` (bản trước) thì cell memo giữ closure cũ — lần duyệt đầu tiên sau
     * khi đổi filter/trang sẽ nạp lại bảng bằng **filter/trang cũ** trong im lặng.
     */
    const reloadRef = useRef<(() => Promise<void>) | null>(null)

    const handleApprove = useCallback(async (shift: WorkShift) => {
        if (approvingRef.current) return
        approvingRef.current = true
        try {
            await shiftApi.approve(shift.id)
            toastSuccess('order.shift.toast.approved', { ns: 'order' })
            await reloadRef.current?.()
        } catch (error) {
            toastError(error)
        } finally {
            approvingRef.current = false
        }
    }, [])

    const columns = useMemo<ColumnDef<WorkShift, unknown>[]>(
        () => [
            {
                id: 'code',
                accessorKey: 'code',
                header: t('order.shift.list.column.code'),
                size: 190,
                /* `code` là cột thật của entity ⇒ sort được phía server. */
                meta: { columnLabel: t('order.shift.list.column.code'), sortField: 'code' },
                cell: ({ row }) => (
                    <span className="font-mono text-xs">{row.original.code}</span>
                ),
            },
            {
                id: 'staffName',
                accessorKey: 'staffName',
                header: t('order.shift.list.column.staff'),
                /*
                 * ⚠️ **KHÔNG mở sort**: `staffName` chỉ có ở DTO, backend giải sort theo field
                 * entity ⇒ `PropertyReferenceException` ⇒ **HTTP 500** (đã đo thật
                 * `sort=staffName,ASC` ⇒ 500). CONVENTIONS mục 5.2.
                 */
                enableSorting: false,
                meta: { columnLabel: t('order.shift.list.column.staff') },
                cell: ({ row }) => row.original.staffName ?? '—',
            },
            {
                id: 'branchName',
                accessorKey: 'branchName',
                header: t('order.shift.list.column.branch'),
                /* ⚠️ Cũng là field DTO-only ⇒ sort gây 500. */
                enableSorting: false,
                meta: { columnLabel: t('order.shift.list.column.branch') },
                cell: ({ row }) => row.original.branchName ?? '—',
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: t('order.shift.list.column.status'),
                size: 130,
                meta: { columnLabel: t('order.shift.list.column.status'), sortField: 'status' },
                cell: ({ row }) => (
                    <StatusBadge tone={STATUS_TONE[row.original.status]}>
                        {t(`order.shift.status.${row.original.status}`)}
                    </StatusBadge>
                ),
            },
            {
                id: 'openedAt',
                accessorKey: 'openedAt',
                header: t('order.shift.list.column.openedAt'),
                size: 150,
                meta: { columnLabel: t('order.shift.list.column.openedAt'), sortField: 'openedAt' },
                cell: ({ row }) => formatDateTime(row.original.openedAt),
            },
            {
                id: 'openingCash',
                accessorKey: 'openingCash',
                header: t('order.shift.list.column.openingCash'),
                size: 130,
                meta: {
                    columnLabel: t('order.shift.list.column.openingCash'),
                    sortField: 'openingCash',
                },
                cell: ({ row }) => (
                    <span className="tabular-nums">{formatVnd(row.original.openingCash)}</span>
                ),
            },
            {
                id: 'expectedCash',
                accessorKey: 'expectedCash',
                header: t('order.shift.list.column.expectedCash'),
                size: 130,
                meta: {
                    columnLabel: t('order.shift.list.column.expectedCash'),
                    sortField: 'expectedCash',
                },
                /* `null` khi ca chưa chốt — hiện `—`, đừng format số `null`. */
                cell: ({ row }) =>
                    row.original.expectedCash === null ? (
                        <span className="text-muted-foreground">—</span>
                    ) : (
                        <span className="tabular-nums">{formatVnd(row.original.expectedCash)}</span>
                    ),
            },
            {
                id: 'cashDifference',
                accessorKey: 'cashDifference',
                header: t('order.shift.list.column.cashDifference'),
                size: 130,
                meta: {
                    columnLabel: t('order.shift.list.column.cashDifference'),
                    sortField: 'cashDifference',
                },
                /*
                 * Lệch quỹ là con số quan trọng nhất của màn này: **âm = thiếu tiền** (đỏ),
                 * dương = thừa (vàng), 0 = khớp (không tô, đỡ nhiễu vì đa số ca sẽ khớp).
                 */
                cell: ({ row }) => {
                    const diff = row.original.cashDifference
                    if (diff === null) return <span className="text-muted-foreground">—</span>
                    return (
                        <span
                            className={cn(
                                'tabular-nums font-medium',
                                diff < 0 && 'text-destructive',
                                diff > 0 && 'text-warning',
                            )}
                        >
                            {formatVnd(diff)}
                        </span>
                    )
                },
            },
            {
                id: 'actions',
                header: '',
                size: 60,
                enableSorting: false,
                enableHiding: false,
                meta: { columnLabel: t('common:action.detail') },
                cell: ({ row }) => {
                    const shift = row.original
                    const pending = shift.status === EShiftStatus.WAITING_APPROVAL
                    const open = shift.status === EShiftStatus.OPEN
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('common:action.detail')}
                                >
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetailShift(shift)}>
                                    <Eye className="size-4" />
                                    {t('common:action.detail')}
                                </DropdownMenuItem>

                                {/* Duyệt/từ chối chỉ có nghĩa với ca đang chờ duyệt. */}
                                {canApprove && pending && (
                                    <>
                                        <DropdownMenuItem
                                            onClick={() => void handleApprove(shift)}
                                        >
                                            <Check className="size-4" />
                                            {t('order.shift.list.approve')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setRejectShift(shift)}>
                                            <X className="size-4" />
                                            {t('order.shift.list.reject')}
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* Chốt hộ chỉ với ca đã duyệt và còn mở. */}
                                {canApprove && open && (
                                    <DropdownMenuItem onClick={() => setCloseShift(shift)}>
                                        <Wallet className="size-4" />
                                        {t('order.shift.list.closeForStaff')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                },
            },
        ],
        [t, canApprove, handleApprove],
    )

    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await shiftApi.search(
                    {
                        keyword: keyword.trim() || undefined,
                        status:
                            statusFilter === ALL_STATUSES
                                ? undefined
                                : (statusFilter as EShiftStatus),
                        /* Chỉ SUPER_ADMIN mới lọc được chi nhánh — role khác backend bỏ qua. */
                        branchId:
                            !canPickBranch || branchFilter === ALL_BRANCHES
                                ? undefined
                                : branchFilter,
                    },
                    { page, size: PAGE_SIZE, sort: toSearchSort(sorting, DEFAULT_SORT, columns) },
                    signal,
                )
                setShifts(result.data)
                setTotal(result.total)
            } catch {
                if (signal?.aborted) return
                setError(true)
            } finally {
                if (!signal?.aborted) {
                    setLoading(false)
                    setRefreshing(false)
                }
            }
        },
        [keyword, statusFilter, branchFilter, canPickBranch, page, sorting, columns],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    /* Bộ lọc chi nhánh chỉ SUPER_ADMIN dùng ⇒ chỉ role đó mới cần nạp danh sách chi nhánh. */
    useEffect(() => {
        if (!canPickBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canPickBranch, refreshBranches])

    /** Tải lại **ngầm**, giữ nguyên trang/sort/bộ lọc (CONVENTIONS mục 5.2). */
    const reload = useCallback(() => load(undefined, true), [load])

    /* Cho `handleApprove` luôn gọi được bản `reload` mới nhất — xem ghi chú tại `reloadRef`. */
    useEffect(() => {
        reloadRef.current = reload
    }, [reload])

    const handleSearchChange = (value: string) => {
        table.resetTo(() => setKeyword(value))
    }

    return (
        <>
            <PageHeader
                title={t('order.shift.list.pageTitle')}
                description={t('order.shift.list.pageDescription')}
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('order.shift.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}
                            >
                                <SelectTrigger
                                    aria-label={t('order.shift.list.allStatuses')}
                                    className="w-full sm:w-48"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>
                                        {t('order.shift.list.allStatuses')}
                                    </SelectItem>
                                    {/*
                                      `INCOMING` **không bày**: backend chưa có endpoint nào tạo ra
                                      ca ở trạng thái này ⇒ lọc theo nó luôn ra rỗng.
                                    */}
                                    {[
                                        EShiftStatus.WAITING_APPROVAL,
                                        EShiftStatus.OPEN,
                                        EShiftStatus.CLOSED,
                                        EShiftStatus.REJECTED,
                                    ].map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(`order.shift.status.${status}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {canPickBranch && (
                                <Select
                                    value={branchFilter}
                                    onValueChange={(v) => table.resetTo(() => setBranchFilter(v))}
                                >
                                    <SelectTrigger
                                        aria-label={t('order.shift.list.allBranches')}
                                        className="w-full sm:w-48"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL_BRANCHES}>
                                            {t('order.shift.list.allBranches')}
                                        </SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </>
                    }
                    tableControls={
                        <DataTableControls
                            columns={columns}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={setColumnVisibility}
                            onRefresh={table.refresh}
                            refreshing={refreshing}
                        />
                    }
                />

                {/*
                  Sort **phía server** (bảng phân trang server — sort client chỉ sắp 10 dòng của
                  trang hiện tại ⇒ sai mà người dùng không biết, CONVENTIONS mục 5.2).
                  ⚠️ Cột NHÂN VIÊN và CHI NHÁNH **khoá sort** vì backend trả 500 (xem ghi chú ở
                  định nghĩa cột).
                */}
                <DataTable
                    columns={columns}
                    data={shifts}
                    getRowId={(row) => row.id}
                    loading={loading}
                    refreshing={refreshing}
                    error={error}
                    onRetry={load}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    unitLabel={t('order.shift.list.resultLabel')}
                    emptyState={t('order.shift.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <ShiftDetailModal
                    open={detailShift !== null}
                    onOpenChange={(next) => !next && setDetailShift(null)}
                    shift={detailShift}
                />

                <ShiftRejectDialog
                    open={rejectShift !== null}
                    onOpenChange={(next) => !next && setRejectShift(null)}
                    shift={rejectShift}
                    onRejected={() => {
                        setRejectShift(null)
                        void reload()
                    }}
                />

                <ShiftCloseByIdDialog
                    open={closeShift !== null}
                    onOpenChange={(next) => !next && setCloseShift(null)}
                    shift={closeShift}
                    onClosed={() => {
                        setCloseShift(null)
                        void reload()
                    }}
                />
            </div>
        </>
    )
}
