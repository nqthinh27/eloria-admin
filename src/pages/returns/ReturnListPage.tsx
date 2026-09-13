import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Check, Eye, MoreHorizontal, PackageCheck, Plus, Wallet, X } from 'lucide-react'

import { returnApi } from '@/api/return'
import { hasRole } from '@/config/roles'
import { formatDateTime, formatVnd } from '@/lib/format'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { ERole } from '@/types/common'
import { EReturnStatus, EReturnType, type ReturnRequest } from '@/types/return'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ReturnCreateDialog } from './components/return-create-dialog'
import { ReturnDetailModal } from './components/return-detail-modal'
import { ReturnReceiveStockDialog } from './components/return-receive-stock-dialog'
import { ReturnRefundDialog } from './components/return-refund-dialog'
import { ReturnRejectDialog } from './components/return-reject-dialog'

const ALL = 'ALL'
const PAGE_SIZE = 10
/** Phiếu mới nhất lên đầu khi người dùng chưa chọn cột sort nào. */
const DEFAULT_SORT = ['createdDate,DESC']

const STATUS_TONE: Record<EReturnStatus, StatusTone> = {
    PENDING_APPROVAL: 'warning',
    APPROVED: 'info',
    REJECTED: 'danger',
    COMPLETED: 'success',
}

/**
 * Màn **"Đổi / Trả / Hoàn tiền"** — PLAN Phase 13, mockup `06-doi-tra.png`.
 *
 * Vòng đời phiếu: `PENDING_APPROVAL → APPROVED → COMPLETED` (hoặc `→ REJECTED`).
 * **`COMPLETED` là tự động** khi đã xong cả quyết toán tiền và nhận hàng vào kho — không có nút
 * "hoàn tất", đó là lý do cột THAO TÁC chỉ có 4 hành động chứ không phải 5.
 *
 * ⚠️ **Data-scope do backend quyết** (đo thật 2026-09-12): STAFF **thấy mọi phiếu của chi nhánh
 * mình** (khác màn Ca làm việc, nơi STAFF chỉ thấy ca của chính mình) · ADMIN chi nhánh mình ·
 * SUPER_ADMIN toàn chuỗi. Vì vậy màn mở cho cả STAFF, chỉ nút duyệt/từ chối/quyết toán/nhận kho
 * mới gate `[ADMIN]`.
 *
 * ⚠️ **Bộ lọc chi nhánh chỉ bày cho SUPER_ADMIN** — role thấp hơn gửi `branchId` lên vẫn bị backend
 * bỏ qua trong im lặng, bày ra là đánh lừa người dùng (cùng lý do với POS/Báo cáo/Ca làm việc).
 *
 * ### 2 điểm lệch mockup có chủ đích
 * 1. **Không có cột SẢN PHẨM** (mockup vẽ "Áo sơ mi linen S → M"): `POST /return/search` trả
 *    **`lines: null`** ở mọi dòng — dựng cột này phải `GET /return/{id}` cho từng dòng (N+1).
 *    Hàng hoá xem trong modal chi tiết. Cùng kiểu với cột "Tổng SL" đã bỏ ở màn Phiếu kho.
 * 2. **Nút "Duyệt" nằm trong `(...)`**, không đứng thẳng trên cột như mockup — CONVENTIONS mục 5.3
 *    chỉ cho phép nút "Chi tiết" ở ngoài.
 */
export default function ReturnListPage() {
    const { t } = useTranslation(['return', 'common'])
    const { user } = useAuth()
    const { branches, refresh: refreshBranches } = useBranch()

    /** Duyệt · từ chối · quyết toán · nhận kho đều là `[ADMIN]` — STAFF gọi sẽ nhận 403. */
    const canApprove = hasRole(user?.role, ERole.ADMIN)
    const canPickBranch = hasRole(user?.role, ERole.SUPER_ADMIN)

    const [data, setData] = useState<ReturnRequest[]>([])
    const [total, setTotal] = useState(0)
    const [pendingTotal, setPendingTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)

    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL)
    const [typeFilter, setTypeFilter] = useState<string>(ALL)
    const [branchFilter, setBranchFilter] = useState<string>(ALL)

    /*
     * Cột ẩn sẵn (CONVENTIONS mục 5.6): LOẠI đã đọc được từ nội dung phiếu và THU THÊM chỉ khác 0
     * ở phiếu đổi sang hàng đắt hơn — hiếm. CHI NHÁNH chỉ có nghĩa với SUPER_ADMIN.
     */
    const table = useTableState([], { type: false, collect: false, branch: false })
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    /** Phiếu đang mở ở modal chi tiết — **luôn là bản `GET /return/{id}`** vì cần `lines`. */
    const [detail, setDetail] = useState<ReturnRequest | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)

    const [createOpen, setCreateOpen] = useState(false)
    const [approveTarget, setApproveTarget] = useState<ReturnRequest | null>(null)
    const [rejectTarget, setRejectTarget] = useState<ReturnRequest | null>(null)
    const [refundTarget, setRefundTarget] = useState<ReturnRequest | null>(null)
    const [receiveTarget, setReceiveTarget] = useState<ReturnRequest | null>(null)

    /**
     * Nạp bản đầy đủ của phiếu rồi mở dialog cần `lines`.
     *
     * ⚠️ Dòng trong bảng đến từ `search` nên **`lines` luôn `null`** — dialog "Nhận hàng vào kho"
     * dựa hoàn toàn vào `lines`, mở thẳng từ dòng bảng sẽ ra danh sách rỗng.
     */
    const openWithLines = useCallback(
        async (row: ReturnRequest, open: (full: ReturnRequest) => void) => {
            try {
                open(await returnApi.getById(row.id))
            } catch (err) {
                toastError(err)
            }
        },
        [],
    )

    const openDetail = useCallback(async (row: ReturnRequest) => {
        setDetail(null)
        setDetailOpen(true)
        setDetailLoading(true)
        try {
            setDetail(await returnApi.getById(row.id))
        } catch (err) {
            toastError(err)
            setDetailOpen(false)
        } finally {
            setDetailLoading(false)
        }
    }, [])

    const columns = useMemo<ColumnDef<ReturnRequest, unknown>[]>(
        () => [
            {
                id: 'code',
                accessorKey: 'code',
                header: t('return.list.column.code'),
                // Cột định danh, nằm trong dải cột ghim ⇒ `size` bắt buộc, không cho ẩn (mục 5.6).
                size: 200,
                enableHiding: false,
                meta: { columnLabel: t('return.list.column.code'), sortField: 'code' },
                cell: ({ row }) => (
                    <span className="text-primary font-mono text-xs">{row.original.code}</span>
                ),
            },
            {
                id: 'customerName',
                accessorKey: 'customerName',
                header: t('return.list.column.customer'),
                // Cột "tên" của phiếu, nằm trong dải ghim ⇒ `size` bắt buộc (mục 5.6).
                size: 200,
                enableHiding: false,
                // `customerName` là cột thật của `return_request` ⇒ sort được (đo thật: 200).
                meta: { columnLabel: t('return.list.column.customer'), sortField: 'customerName' },
                cell: ({ row }) => {
                    const { customerName, customerPhone } = row.original
                    if (!customerName) {
                        return (
                            <span className="text-muted-foreground text-sm">
                                {t('return.list.noCustomer')}
                            </span>
                        )
                    }
                    return (
                        <div className="min-w-0">
                            <p className="truncate font-medium">{customerName}</p>
                            {customerPhone && (
                                <p className="text-muted-foreground truncate text-xs">
                                    {customerPhone}
                                </p>
                            )}
                        </div>
                    )
                },
            },
            {
                id: 'orderCode',
                accessorKey: 'orderCode',
                header: t('return.list.column.order'),
                size: 210,
                meta: { columnLabel: t('return.list.column.order'), sortField: 'orderCode' },
                cell: ({ row }) =>
                    row.original.orderCode ? (
                        <span className="font-mono text-xs">{row.original.orderCode}</span>
                    ) : (
                        <span className="text-muted-foreground text-xs">
                            {t('return.list.noOrder')}
                        </span>
                    ),
            },
            {
                id: 'type',
                accessorKey: 'type',
                header: t('return.list.column.type'),
                size: 110,
                meta: {
                    columnLabel: t('return.list.column.type'),
                    sortField: 'type',
                    align: 'center',
                },
                cell: ({ row }) => (
                    <StatusBadge tone="muted">{t(`return.type.${row.original.type}`)}</StatusBadge>
                ),
            },
            {
                id: 'reason',
                accessorKey: 'reason',
                header: t('return.list.column.reason'),
                size: 200,
                meta: { columnLabel: t('return.list.column.reason'), sortField: 'reason' },
                cell: ({ row }) => (
                    <span className="text-muted-foreground block truncate text-sm">
                        {row.original.reason ?? '—'}
                    </span>
                ),
            },
            {
                id: 'refundAmount',
                accessorKey: 'refundAmount',
                header: t('return.list.column.amount'),
                size: 130,
                // Cột tiền ⇒ nội dung căn phải (CONVENTIONS mục 5.6).
                meta: {
                    columnLabel: t('return.list.column.amount'),
                    sortField: 'refundAmount',
                    align: 'right',
                },
                cell: ({ row }) => (
                    <span className="font-medium tabular-nums">
                        {formatVnd(row.original.refundAmount)}
                    </span>
                ),
            },
            {
                id: 'collect',
                accessorKey: 'collectAmount',
                header: t('return.list.column.collect'),
                size: 130,
                meta: {
                    columnLabel: t('return.list.column.collect'),
                    sortField: 'collectAmount',
                    align: 'right',
                },
                cell: ({ row }) => (
                    <span className="tabular-nums">{formatVnd(row.original.collectAmount)}</span>
                ),
            },
            {
                id: 'staffName',
                accessorKey: 'staffName',
                header: t('return.list.column.staff'),
                size: 160,
                /*
                 * ⚠️ `staffName` là field **DTO-only** ⇒ sort backend trả **HTTP 500**
                 * (`PropertyReferenceException`, đo thật 2026-09-12) — CONVENTIONS mục 5.2.
                 */
                enableSorting: false,
                meta: { columnLabel: t('return.list.column.staff') },
                cell: ({ row }) => row.original.staffName ?? '—',
            },
            {
                id: 'branch',
                accessorKey: 'branchName',
                header: t('return.list.column.branch'),
                size: 160,
                // `branchName` sort được (Hibernate tự join) — đo thật 200, nhưng giữ bảo thủ như
                // các màn khác của repo để nhất quán.
                enableSorting: false,
                meta: { columnLabel: t('return.list.column.branch') },
                cell: ({ row }) => row.original.branchName ?? '—',
            },
            {
                id: 'createdDate',
                accessorKey: 'createdDate',
                header: t('return.list.column.createdDate'),
                size: 170,
                meta: {
                    columnLabel: t('return.list.column.createdDate'),
                    sortField: 'createdDate',
                },
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDateTime(row.original.createdDate)}
                    </span>
                ),
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: t('return.list.column.status'),
                size: 140,
                meta: {
                    columnLabel: t('return.list.column.status'),
                    sortField: 'status',
                    align: 'center',
                },
                cell: ({ row }) => (
                    <StatusBadge tone={STATUS_TONE[row.original.status]}>
                        {t(`return.status.${row.original.status}`)}
                    </StatusBadge>
                ),
            },
            {
                id: 'actions',
                header: t('return.list.column.actions'),
                size: 88,
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('return.list.column.actions'), align: 'center' },
                cell: ({ row }) => {
                    const request = row.original
                    const pending = request.status === EReturnStatus.PENDING_APPROVAL
                    const approved = request.status === EReturnStatus.APPROVED
                    /*
                     * Quyết toán chỉ có nghĩa khi phiếu **thực sự phát sinh tiền** và chưa quyết
                     * toán: phiếu đổi ngang giá gọi vào sẽ nhận `error.return.nothingToSettle`,
                     * phiếu đã quyết toán nhận `error.return.alreadyRefunded` — chặn trước ở UI.
                     */
                    const hasMoney = request.refundAmount > 0 || request.collectAmount > 0
                    const canSettle = approved && hasMoney && !request.refundedAt
                    const canReceive = approved && !request.stockReceivedAt
                    /* `(...)` tự ẩn khi rỗng (CONVENTIONS mục 5.3). */
                    const hasMenu = canApprove && (pending || canSettle || canReceive)

                    return (
                        <div className="flex items-center justify-center gap-1">
                            {/* Nút Chi tiết LUÔN hiện, không gate theo quyền (CONVENTIONS mục 5.3). */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                title={t('common:action.detail')}
                                aria-label={t('common:action.detail')}
                                onClick={() => void openDetail(request)}
                            >
                                <Eye className="size-4" />
                            </Button>

                            {hasMenu && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 shrink-0"
                                            aria-label={t('return.list.column.actions')}
                                        >
                                            <MoreHorizontal className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {pending && (
                                            <>
                                                <DropdownMenuItem
                                                    onSelect={() => setApproveTarget(request)}
                                                >
                                                    <Check className="size-4" />
                                                    {t('return.action.approve')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onSelect={() => setRejectTarget(request)}
                                                >
                                                    <X className="size-4" />
                                                    {t('return.action.reject')}
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {canSettle && (
                                            <DropdownMenuItem
                                                onSelect={() => setRefundTarget(request)}
                                            >
                                                <Wallet className="size-4" />
                                                {request.collectAmount > 0
                                                    ? t('return.action.collect')
                                                    : t('return.action.refund')}
                                            </DropdownMenuItem>
                                        )}
                                        {canReceive && (
                                            <DropdownMenuItem
                                                /* Dialog cần `lines` ⇒ nạp bản đầy đủ trước khi mở. */
                                                onSelect={() =>
                                                    void openWithLines(request, setReceiveTarget)
                                                }
                                            >
                                                <PackageCheck className="size-4" />
                                                {t('return.action.receiveStock')}
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )
                },
            },
        ],
        [t, canApprove, openDetail, openWithLines],
    )

    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await returnApi.search(
                    {
                        keyword: keyword.trim() || undefined,
                        returnStatus:
                            statusFilter === ALL ? undefined : (statusFilter as EReturnStatus),
                        type: typeFilter === ALL ? undefined : (typeFilter as EReturnType),
                        /* Chỉ SUPER_ADMIN lọc được chi nhánh — role khác backend bỏ qua. */
                        branchId:
                            !canPickBranch || branchFilter === ALL ? undefined : branchFilter,
                    },
                    { page, size: PAGE_SIZE, sort: toSearchSort(sorting, DEFAULT_SORT, columns) },
                    signal,
                )
                setData(result.data)
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
        [keyword, statusFilter, typeFilter, branchFilter, canPickBranch, page, sorting, columns],
    )

    /**
     * Đếm phiếu **chờ duyệt** cho băng cảnh báo đầu màn (mockup `06-doi-tra.png`).
     *
     * Gọi riêng một request `size: 1` thay vì đếm trong `data`: bảng đang lọc/phân trang nên số
     * trên màn không phải tổng thật, mà cái người quản lý cần biết là **toàn bộ** việc còn tồn.
     *
     * ⚠️ **Chỉ chạy với người duyệt được.** Băng này là lời kêu gọi hành động ("cần ADMIN phê
     * duyệt") mà STAFF không làm được gì — mọi nút duyệt/từ chối đều `[ADMIN]`. Bày cho STAFF là
     * giao việc cho người không có quyền, cùng lý do màn này đã giấu bộ lọc chi nhánh khỏi role
     * thấp hơn SUPER_ADMIN.
     */
    const loadPending = useCallback(
        async (signal?: AbortSignal) => {
            if (!canApprove) return
            try {
                const result = await returnApi.search(
                    { returnStatus: EReturnStatus.PENDING_APPROVAL },
                    { page: 1, size: 1 },
                    signal,
                )
                setPendingTotal(result.total)
            } catch {
                /* Băng cảnh báo là phụ trợ — lỗi thì ẩn đi, không chặn cả màn. */
                setPendingTotal(0)
            }
        },
        [canApprove],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    useEffect(() => {
        const controller = new AbortController()
        void loadPending(controller.signal)
        return () => controller.abort()
    }, [loadPending, data])

    useEffect(() => {
        if (!canPickBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canPickBranch, refreshBranches])

    /** Nạp lại **ngầm**, giữ nguyên trang/sort/bộ lọc (CONVENTIONS mục 5.1 + 5.2). */
    const reload = useCallback(() => load(undefined, true), [load])

    const handleApprove = async () => {
        if (!approveTarget) return
        try {
            await returnApi.approve(approveTarget.id)
            toastSuccess('return.toast.approved', { ns: 'return' })
            setApproveTarget(null)
            await reload()
        } catch (err) {
            /* Hay gặp `error.stock.insufficient` với phiếu đổi — giữ dialog để người dùng đọc. */
            toastError(err)
        }
    }

    /** Đóng dialog + nạp lại danh sách (CONVENTIONS mục 5.1: giữ nguyên ngữ cảnh bảng). */
    const afterMutation = async (close: () => void) => {
        close()
        await reload()
    }

    return (
        <>
            <PageHeader
                title={t('return.title')}
                description={t('return.subtitle')}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="size-4" />
                        {t('return.create')}
                    </Button>
                }
            />

            <div className="space-y-4">
                {pendingTotal > 0 && (
                    <div className="border-warning/40 bg-warning/10 text-warning-foreground flex items-start gap-2 rounded-lg border p-3 text-sm">
                        <AlertCircle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
                        <p>
                            <span className="font-semibold">
                                {t('return.pendingBanner', { count: pendingTotal })}
                            </span>{' '}
                            <span className="text-muted-foreground">
                                {t('return.pendingBannerHint')}
                            </span>
                        </p>
                    </div>
                )}

                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(v) => table.resetTo(() => setKeyword(v))}
                    searchPlaceholder={t('return.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}
                            >
                                <SelectTrigger
                                    aria-label={t('return.allStatuses')}
                                    className="w-full sm:w-44"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('return.allStatuses')}</SelectItem>
                                    {Object.values(EReturnStatus).map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(`return.status.${status}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={typeFilter}
                                onValueChange={(v) => table.resetTo(() => setTypeFilter(v))}
                            >
                                <SelectTrigger
                                    aria-label={t('return.allTypes')}
                                    className="w-full sm:w-40"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('return.allTypes')}</SelectItem>
                                    {Object.values(EReturnType).map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {t(`return.type.${type}`)}
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
                                        aria-label={t('return.allBranches')}
                                        className="w-full sm:w-48"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>
                                            {t('return.allBranches')}
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

                <DataTable
                    columns={columns}
                    data={data}
                    getRowId={(row) => row.id}
                    loading={loading}
                    refreshing={refreshing}
                    error={error}
                    onRetry={load}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    unitLabel={t('return.resultLabel')}
                    emptyState={t('return.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />
            </div>

            <ReturnCreateDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={() => void afterMutation(() => setCreateOpen(false))}
            />

            <ReturnDetailModal
                open={detailOpen}
                onOpenChange={setDetailOpen}
                request={detail}
                loading={detailLoading}
            />

            <ConfirmDialog
                open={approveTarget !== null}
                onOpenChange={(open) => !open && setApproveTarget(null)}
                title={t('return.approveDialog.title', { code: approveTarget?.code ?? '' })}
                description={
                    approveTarget?.type === EReturnType.EXCHANGE
                        ? `${t('return.approveDialog.body')} ${t('return.approveDialog.exchangeWarning')}`
                        : t('return.approveDialog.body')
                }
                confirmLabel={t('return.approveDialog.submit')}
                onConfirm={handleApprove}
            />

            <ReturnRejectDialog
                open={rejectTarget !== null}
                onOpenChange={(open) => !open && setRejectTarget(null)}
                request={rejectTarget}
                onRejected={() => void afterMutation(() => setRejectTarget(null))}
            />

            <ReturnRefundDialog
                open={refundTarget !== null}
                onOpenChange={(open) => !open && setRefundTarget(null)}
                request={refundTarget}
                onSettled={() => void afterMutation(() => setRefundTarget(null))}
            />

            <ReturnReceiveStockDialog
                open={receiveTarget !== null}
                onOpenChange={(open) => !open && setReceiveTarget(null)}
                request={receiveTarget}
                onReceived={() => void afterMutation(() => setReceiveTarget(null))}
            />
        </>
    )
}
