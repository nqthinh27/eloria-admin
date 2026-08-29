import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Eye, FileStack, Plus, Send, X } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { warehouseLedgerApi } from '@/api/inventory'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { hasRole } from '@/config/roles'
import { formatDateTime } from '@/lib/format'
import { toastSuccess } from '@/lib/toast'
import { ERole } from '@/types/common'
import {
    EWarehouseLedgerStatus,
    EWarehouseLedgerType,
    type WarehouseLedger,
} from '@/types/inventory'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LedgerFormDialog } from './components/ledger-form-dialog'
import { LedgerDetailDialog } from './components/ledger-detail-dialog'
import { LedgerRejectDialog } from './components/ledger-reject-dialog'

const ALL = 'ALL'
const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Giữ nguyên để thứ tự không đổi bất ngờ. */
const DEFAULT_SORT = ['createdDate,DESC']

const STATUS_TONE: Record<string, StatusTone> = {
    [EWarehouseLedgerStatus.DRAFT]: 'muted',
    [EWarehouseLedgerStatus.WAITING_APPROVAL]: 'warning',
    [EWarehouseLedgerStatus.ACCEPTED]: 'success',
    [EWarehouseLedgerStatus.REJECTED]: 'danger',
}

const TYPE_TONE: Record<string, StatusTone> = {
    [EWarehouseLedgerType.IN]: 'success',
    [EWarehouseLedgerType.OUT]: 'danger',
    [EWarehouseLedgerType.TRANSFER]: 'info',
}

/**
 * Tab "Phiếu kho" — `14-kho-hang-phieu-nhap.png` chỉ vẽ **empty state**, nên phần danh sách/
 * dialog dựng theo pattern bảng chuẩn của Phase 5 (CONVENTIONS mục 6.2).
 *
 * Vòng đời: `DRAFT → WAITING_APPROVAL → ACCEPTED | REJECTED`. **Chỉ `ACCEPTED` mới ghi tồn thật.**
 */
export function LedgerTab() {
    const { t } = useTranslation(['inventory', 'common'])
    const { user } = useAuth()
    const canApprove = hasRole(user?.role, ERole.ADMIN)
    const canFilterBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const { branches, refresh: refreshBranches } = useBranch()

    const [data, setData] = useState<WarehouseLedger[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /**
     * Đang tải lại ngầm: **mờ bảng + spinner + icon nút xoay**, nhưng KHÔNG nháy skeleton —
     * dữ liệu cũ nằm nguyên để không mất vị trí đọc (CONVENTIONS mục 5.2).
     */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>(ALL)
    const [statusFilter, setStatusFilter] = useState<string>(ALL)
    const [branchFilter, setBranchFilter] = useState<string>(ALL)

    /* page · sort · cột ẩn/hiện · nonce tải lại — xem `use-table-state`. */
    const table = useTableState()
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formOpen, setFormOpen] = useState(false)
    const [detailId, setDetailId] = useState<string | null>(null)
    const [submitLedger, setSubmitLedger] = useState<WarehouseLedger | null>(null)
    const [approveLedger, setApproveLedger] = useState<WarehouseLedger | null>(null)
    const [rejectLedger, setRejectLedger] = useState<WarehouseLedger | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [refreshBranches])

    /**
     * Backend chặn **tự duyệt phiếu do chính mình tạo** (`error.warehouseLedger.cannotApproveOwn`).
     * `createdBy` là **username**, so với `user.username` — không phải id.
     * Khoá nút ngay ở UI kèm tooltip lý do, thay vì để bấm rồi mới nhận 403.
     */
    const isOwnLedger = useCallback(
        (ledger: WarehouseLedger) => ledger.createdBy === user?.username,
        [user?.username],
    )

    /*
     * Khai trước `load` vì `toSearchSort` cần `meta.sortField` của cột để dịch id cột → field BE.
     *
     * ⚠️ **Sort phía server** (CONVENTIONS mục 5.2): entity `WarehouseLedger` sort được `code`,
     * `name`, `type`, `status`, `branchId`, `receiveFrom`, `sendTo`, `description`, `createdDate`,
     * `createdBy`. Ngược lại `branchName` / `toBranchName` / `toBranchId` / `lines` chỉ có ở DTO
     * ⇒ sort vào đó backend trả **HTTP 500**, không phải 400 — xem CLAUDE.md mục "Sort phía server".
     */
    const columns = useMemo<ColumnDef<WarehouseLedger, unknown>[]>(
        () => [
            {
                accessorKey: 'code',
                header: t('inventory.ledger.column.code'),
                // Cột định danh (mã phiếu) — không cho ẩn, người dùng sẽ không biết đang xem phiếu nào.
                enableHiding: false,
                // `code` là cột thật của `WarehouseLedger` ⇒ backend sort được.
                meta: { sortField: 'code', columnLabel: t('inventory.ledger.column.code') },
                cell: ({ row }) => (
                    <span className="text-primary font-mono text-xs">{row.original.code}</span>
                ),
            },
            {
                accessorKey: 'name',
                header: t('inventory.ledger.column.name'),
                // `name` là cột thật của `WarehouseLedger` ⇒ backend sort được.
                meta: { sortField: 'name', columnLabel: t('inventory.ledger.column.name') },
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.name ?? '—'}</span>
                ),
            },
            {
                accessorKey: 'type',
                header: t('inventory.ledger.column.type'),
                // `type` (IN/OUT/TRANSFER) là cột thật của `WarehouseLedger` ⇒ backend sort được.
                meta: { sortField: 'type', columnLabel: t('inventory.ledger.column.type') },
                cell: ({ row }) => (
                    <StatusBadge tone={TYPE_TONE[row.original.type]}>
                        {t(`inventory.ledger.type.${row.original.type}`)}
                    </StatusBadge>
                ),
            },
            {
                accessorKey: 'branchName',
                header: t('inventory.ledger.column.branch'),
                /*
                 * ⚠️ Ô này ghép **hai** field DTO (`branchName → toBranchName`), mà cả hai đều
                 * KHÔNG phải cột của entity `WarehouseLedger` (entity chỉ giữ `branchId`) ⇒ sort
                 * vào đây backend 500. Không map sang `branchId` vì sắp theo UUID cho ra thứ tự
                 * ngẫu nhiên với người dùng, tệ hơn là không cho sort.
                 */
                enableSorting: false,
                meta: { columnLabel: t('inventory.ledger.column.branch') },
                cell: ({ row }) => (
                    <span className="text-sm">
                        {row.original.branchName}
                        {row.original.toBranchName && (
                            <span className="text-muted-foreground"> → {row.original.toBranchName}</span>
                        )}
                    </span>
                ),
            },
            /*
             * ⚠️ **Cố ý KHÔNG có cột "Tổng SL"** dù mockup bảng thường có: `lines` luôn **null**
             * ở `POST /warehouse-ledger/search` (chỉ `GET /{id}` mới populate — kiểm chứng bằng
             * API thật 2026-08-10), nên cột này sẽ rỗng ở **mọi** dòng. Muốn có phải hoặc gọi
             * `GET /{id}` cho từng dòng (N+1 request), hoặc backend bổ sung `totalQuantity` vào
             * DTO danh sách. Tổng số lượng hiện xem trong dialog chi tiết.
             */
            {
                accessorKey: 'status',
                header: t('inventory.ledger.column.status'),
                /*
                 * ⚠️ Trạng thái **vòng đời phiếu** (`DRAFT → WAITING_APPROVAL → ACCEPTED|REJECTED`).
                 * Bộ lọc phía FE gọi field này là `ledgerStatus` (tên trong `WarehouseLedgerSearchReqDTO`,
                 * để tách khỏi `status` 0/1 của bản ghi), nhưng **cột thật trong entity vẫn tên
                 * `status`** ⇒ `sortField` phải là `status`, gửi `ledgerStatus` sẽ 500.
                 */
                meta: { sortField: 'status', columnLabel: t('inventory.ledger.column.status') },
                cell: ({ row }) => (
                    <StatusBadge tone={STATUS_TONE[row.original.status]}>
                        {t(`inventory.ledger.status.${row.original.status}`)}
                    </StatusBadge>
                ),
            },
            {
                accessorKey: 'createdBy',
                header: t('inventory.ledger.column.createdBy'),
                // `createdBy` (username người tạo) là cột audit thật của entity ⇒ backend sort được.
                meta: { sortField: 'createdBy', columnLabel: t('inventory.ledger.column.createdBy') },
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-sm">{row.original.createdBy}</span>
                ),
            },
            {
                accessorKey: 'createdDate',
                header: t('inventory.ledger.column.createdDate'),
                // `createdDate` là cột audit thật của entity ⇒ backend sort được (cũng là sort mặc định).
                meta: {
                    sortField: 'createdDate',
                    columnLabel: t('inventory.ledger.column.createdDate'),
                },
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-sm">
                        {formatDateTime(row.original.createdDate)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: t('inventory.ledger.column.actions'),
                // Đường vào mọi thao tác (xem/gửi duyệt/duyệt/từ chối) — không cho ẩn, và không có gì để sort.
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('inventory.ledger.column.actions') },
                cell: ({ row }) => {
                    const ledger = row.original
                    const own = isOwnLedger(ledger)
                    const waiting = ledger.status === EWarehouseLedgerStatus.WAITING_APPROVAL

                    return (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('inventory.ledger.action.view')}
                                onClick={() => setDetailId(ledger.id)}>
                                <Eye className="size-4" />
                            </Button>

                            {ledger.status === EWarehouseLedgerStatus.DRAFT && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t('inventory.ledger.action.submit')}
                                    onClick={() => setSubmitLedger(ledger)}>
                                    <Send className="size-4" />
                                </Button>
                            )}

                            {canApprove && waiting && (
                                <>
                                    {own ? (
                                        /*
                                         * Nút bị khoá vẫn phải nhận được hover để hiện tooltip lý do —
                                         * button `disabled` không phát sự kiện chuột, nên bọc trong <span>.
                                         */
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled
                                                        aria-label={t('inventory.ledger.action.approve')}>
                                                        <Check className="size-4" />
                                                    </Button>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {t('inventory.ledger.cannotApproveOwnHint')}
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-success"
                                            aria-label={t('inventory.ledger.action.approve')}
                                            onClick={() => setApproveLedger(ledger)}>
                                            <Check className="size-4" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        aria-label={t('inventory.ledger.action.reject')}
                                        onClick={() => setRejectLedger(ledger)}>
                                        <X className="size-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    )
                },
            },
        ],
        [t, canApprove, isOwnLedger],
    )

    /**
     * `quiet` = nạp lại ngầm (nút Tải lại / sau khi ghi dữ liệu): giữ nguyên dữ liệu đang hiển thị
     * thay vì nháy skeleton, để không mất vị trí đọc (CONVENTIONS mục 5.1 + 5.2).
     */
    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await warehouseLedgerApi.search(
                    {
                        keyword: keyword || undefined,
                        type:
                            typeFilter === ALL
                                ? undefined
                                : (typeFilter as EWarehouseLedgerType),
                        ledgerStatus:
                            statusFilter === ALL
                                ? undefined
                                : (statusFilter as EWarehouseLedgerStatus),
                        branchId:
                            canFilterBranch && branchFilter !== ALL ? branchFilter : undefined,
                    },
                    {
                        page,
                        size: PAGE_SIZE,
                        sort: toSearchSort(sorting, DEFAULT_SORT, columns),
                    },
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
        [
            page,
            keyword,
            typeFilter,
            statusFilter,
            branchFilter,
            canFilterBranch,
            sorting,
            columns,
        ],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    /*
     * Nút Tải lại: giữ nguyên page/sort/filter/scroll, chỉ gọi lại API.
     * `runRefresh` bọc thêm **toast báo đã cập nhật** khi xong (user chốt 2026-08-28) — trong lúc
     * chạy thì cờ `refreshing` làm mờ bảng + hiện spinner.
     */
    useEffect(() => {
        if (table.reloadNonce === 0) return
        const controller = new AbortController()
        void table.runRefresh((signal) => load(signal, true), controller.signal)
        return () => controller.abort()
        // `load` cố ý không nằm trong dep: chỉ chạy khi người dùng bấm Tải lại.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table.reloadNonce])

    /** Ghi dữ liệu xong ⇒ nạp lại ngầm, **giữ nguyên** page/sort/filter (CONVENTIONS mục 5.1). */
    const reload = useCallback(() => load(undefined, true), [load])

    const handleSubmit = async () => {
        if (!submitLedger) return
        await warehouseLedgerApi.submit(submitLedger.id)
        toastSuccess('inventory.toast.ledgerSubmitted', { ns: 'inventory' })
        await reload()
    }

    const handleApprove = async () => {
        if (!approveLedger) return
        await warehouseLedgerApi.approve(approveLedger.id)
        toastSuccess('inventory.toast.ledgerApproved', { ns: 'inventory' })
        await reload()
    }

    return (
        <div className="space-y-4">
            {/*
              Nút **tác động dữ liệu** tách khỏi hàng lọc (CONVENTIONS mục 5, chốt 2026-08-28).
              Tab này **không có `PageHeader` riêng** — tiêu đề màn do `InventoryPage` (component cha)
              sở hữu, nên không đưa nút lên đó được; thay vào đó cho nút đứng **một hàng riêng** phía
              trên toolbar. Hàng dưới vì vậy chỉ còn search/filter + điều khiển bảng.
            */}
            <div className="flex justify-end">
                <Button onClick={() => setFormOpen(true)}>
                    <Plus />
                    {t('inventory.action.createLedger')}
                </Button>
            </div>

            <DataTableToolbar
                searchValue={keyword}
                onSearchChange={(value) => table.resetTo(() => setKeyword(value))}
                searchPlaceholder={t('inventory.ledger.searchPlaceholder')}
                filters={
                    <>
                        <Select
                            value={typeFilter}
                            onValueChange={(v) => table.resetTo(() => setTypeFilter(v))}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t('inventory.ledger.allTypes')}</SelectItem>
                                {Object.values(EWarehouseLedgerType).map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {t(`inventory.ledger.type.${type}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={statusFilter}
                            onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    {t('inventory.ledger.allStatuses')}
                                </SelectItem>
                                {Object.values(EWarehouseLedgerStatus).map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {t(`inventory.ledger.status.${status}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {canFilterBranch && (
                            <Select
                                value={branchFilter}
                                onValueChange={(v) => table.resetTo(() => setBranchFilter(v))}>
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
                onRetry={() => void load()}
                sorting={sorting}
                onSortingChange={setSorting}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                unitLabel={t('inventory.ledger.resultLabel')}
                pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                emptyState={
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-12">
                        <FileStack className="size-8" />
                        <p className="text-sm">{t('inventory.ledger.empty')}</p>
                        <p className="text-xs">{t('inventory.ledger.emptyHint')}</p>
                    </div>
                }
            />

            <LedgerFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                branches={branches}
                canChooseBranch={canFilterBranch}
                onCreated={reload}
            />

            <LedgerDetailDialog
                ledgerId={detailId}
                onOpenChange={(open) => !open && setDetailId(null)}
            />

            <LedgerRejectDialog
                ledger={rejectLedger}
                onOpenChange={(open) => !open && setRejectLedger(null)}
                onRejected={reload}
            />

            <ConfirmDialog
                open={submitLedger !== null}
                onOpenChange={(open) => !open && setSubmitLedger(null)}
                title={t('inventory.confirm.submitTitle')}
                description={t('inventory.confirm.submitDescription', {
                    code: submitLedger?.code ?? '',
                })}
                auditLogged
                onConfirm={handleSubmit}
            />

            <ConfirmDialog
                open={approveLedger !== null}
                onOpenChange={(open) => !open && setApproveLedger(null)}
                title={t('inventory.confirm.approveTitle')}
                description={t('inventory.confirm.approveDescription', {
                    code: approveLedger?.code ?? '',
                })}
                auditLogged
                confirmLabel={t('inventory.ledger.action.approve')}
                onConfirm={handleApprove}
            />
        </div>
    )
}
