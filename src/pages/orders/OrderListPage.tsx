import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, MoreHorizontal, Printer, ShoppingCart } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

import { orderApi } from '@/api/order'
import { hasRole } from '@/config/roles'
import { formatDateTime, formatVnd } from '@/lib/format'
import { toastError, toastInfo } from '@/lib/toast'
import { ERole } from '@/types/common'
import {
    EOrderChannel,
    EOrderStatus,
    EPaymentStatus,
    type Order,
    type OrderSearchReq,
} from '@/types/order'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { PageHeader } from '@/components/page-header'
import { PillTabs } from '@/components/pill-tabs'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ExportButton } from '@/components/export-button'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrderDetailDialog } from './components/order-detail-dialog'
import { printInvoice } from './components/print-invoice'

const ALL = 'ALL'
const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Giữ nguyên để thứ tự không đổi bất ngờ. */
const DEFAULT_SORT = ['createdDate,DESC']

/**
 * Tông màu cho **8 trạng thái** của backend (PLAN quyết định ①: dùng thẳng quy ước backend,
 * không map ngầm về 5 trạng thái mockup).
 */
const STATUS_TONE: Record<EOrderStatus, StatusTone> = {
    [EOrderStatus.PENDING]: 'warning',
    [EOrderStatus.CONFIRMED]: 'info',
    [EOrderStatus.PACKED]: 'info',
    [EOrderStatus.SHIPPING]: 'info',
    [EOrderStatus.SHIPPED]: 'info',
    [EOrderStatus.COMPLETED]: 'success',
    [EOrderStatus.CANCELLED]: 'danger',
    [EOrderStatus.REJECTED]: 'danger',
}

const PAYMENT_TONE: Record<EPaymentStatus, StatusTone> = {
    [EPaymentStatus.UNPAID]: 'warning',
    [EPaymentStatus.PAID]: 'success',
    [EPaymentStatus.REFUNDED]: 'muted',
}

/** Tab kênh của mockup `04`: Tất cả / Online / Tại quầy. Backend còn `OTHER` nhưng chưa dùng. */
const CHANNEL_TABS = [ALL, EOrderChannel.ONLINE, EOrderChannel.POS] as const

/**
 * Màn "Quản lý đơn hàng" theo `04-don-hang.png` — PLAN Phase 11, chạy trên API thật.
 *
 * ⚠️ **Lệch có chủ đích so với mockup** (đo trên API thật 2026-08-18):
 * - **Bỏ cột "SỐ SP"**: `POST /order/search` trả `lines: null` (chỉ `GET /order/{id}` mới có)
 *   ⇒ muốn đếm số sản phẩm phải gọi thêm 1 request cho **mỗi** dòng (N+1). Số lượng hàng vẫn
 *   xem được đầy đủ trong dialog chi tiết.
 * - **Bỏ cột "NHÂN VIÊN"**: `OrderResDTO` chỉ có `staffId` (UUID), **không có tên** — và
 *   `createdBy` đã bị backend xoá (breaking 2026-08-14). Hiển thị UUID thì vô nghĩa với người
 *   dùng, còn tra tên từng nhân viên lại là N+1 request nữa.
 * - **Thêm cột "THANH TOÁN"** (không có trong mockup): mô hình thu tiền tách hẳn khỏi vòng đời
 *   đơn (`paymentStatus` khác `status`), thiếu cột này thì không biết đơn nào cần thu.
 */
export default function OrderListPage() {
    const { t } = useTranslation(['order', 'common'])
    const { user } = useAuth()
    const canFilterBranch = hasRole(user?.role, ERole.SUPER_ADMIN)
    const { branches, refresh: refreshBranches } = useBranch()

    const [data, setData] = useState<Order[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /**
     * Đang tải lại ngầm: **mờ bảng + spinner + icon nút xoay**, nhưng KHÔNG nháy skeleton —
     * dữ liệu cũ nằm nguyên để không mất vị trí đọc (CONVENTIONS mục 5.2).
     */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [channelTab, setChannelTab] = useState<string>(ALL)
    const [statusFilter, setStatusFilter] = useState<string>(ALL)
    const [paymentFilter, setPaymentFilter] = useState<string>(ALL)
    const [branchFilter, setBranchFilter] = useState<string>(ALL)
    const [detailId, setDetailId] = useState<string | null>(null)

    /* page · sort · cột ẩn/hiện · nonce tải lại — xem `use-table-state`. */
    const table = useTableState()
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const handlePrint = useCallback(async (order: Order) => {
        try {
            const invoice = await orderApi.invoice(order.id)
            printInvoice(invoice)
        } catch (printError) {
            toastError(printError)
        }
    }, [])

    /*
     * Khai trước `load` vì `toSearchSort` cần `meta.sortField` của cột để dịch id cột → field BE.
     *
     * ⚠️ **Sort phía server** (CONVENTIONS mục 5.2): chỉ mở sort cho cột là **field thật của entity
     * `OrderSale`**. Cột nào chỉ có ở DTO (`branchName`, `paidAmount`) phải khai
     * `enableSorting: false` — sort vào đó backend trả **500** (`PropertyReferenceException`).
     */
    const columns = useMemo<ColumnDef<Order, unknown>[]>(
        () => [
            {
                accessorKey: 'orderCode',
                header: t('order.list.column.code'),
                // Cột định danh — ẩn đi thì không biết đang xem đơn nào.
                enableHiding: false,
                meta: {
                    sortField: 'orderCode',
                    columnLabel: t('order.list.column.code'),
                },
                cell: ({ row }) => (
                    <span className="text-primary font-mono text-xs">
                        {row.original.orderCode}
                    </span>
                ),
            },
            {
                accessorKey: 'customerName',
                header: t('order.list.column.customer'),
                /*
                 * Ô ghép tên + SĐT; sort theo field chính là `customerName` (cả hai đều là cột
                 * thật của `OrderSale` — đơn khách vãng lai lưu tên/SĐT ngay trên đơn).
                 */
                meta: {
                    sortField: 'customerName',
                    columnLabel: t('order.list.column.customer'),
                },
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {row.original.customerName || t('order.pos.cart.guest')}
                        </p>
                        {row.original.customerPhone && (
                            <p className="text-muted-foreground truncate text-xs">
                                {row.original.customerPhone}
                            </p>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'channel',
                header: t('order.list.column.channel'),
                meta: { sortField: 'channel', columnLabel: t('order.list.column.channel') },
                cell: ({ row }) => (
                    <StatusBadge tone={row.original.channel === EOrderChannel.ONLINE ? 'info' : 'muted'}>
                        {t(`order.channel.${row.original.channel}`)}
                    </StatusBadge>
                ),
            },
            {
                accessorKey: 'branchName',
                header: t('order.list.column.branch'),
                // ⚠️ `branchName` KHÔNG phải cột của `OrderSale` (chỉ có ở DTO) ⇒ sort vào đây backend 500.
                enableSorting: false,
                meta: { columnLabel: t('order.list.column.branch') },
                cell: ({ row }) => row.original.branchName ?? '—',
            },
            {
                accessorKey: 'totalAmount',
                header: () => <div className="text-right">{t('order.list.column.total')}</div>,
                meta: { sortField: 'totalAmount', columnLabel: t('order.list.column.total') },
                cell: ({ row }) => (
                    <div className="text-right font-medium tabular-nums">
                        {formatVnd(row.original.totalAmount)}
                    </div>
                ),
            },
            {
                accessorKey: 'paymentStatus',
                header: t('order.list.column.payment'),
                meta: {
                    sortField: 'paymentStatus',
                    columnLabel: t('order.list.column.payment'),
                },
                cell: ({ row }) => (
                    <StatusBadge tone={PAYMENT_TONE[row.original.paymentStatus]}>
                        {t(`order.paymentStatus.${row.original.paymentStatus}`)}
                    </StatusBadge>
                ),
            },
            {
                accessorKey: 'status',
                header: t('order.list.column.status'),
                meta: { sortField: 'status', columnLabel: t('order.list.column.status') },
                cell: ({ row }) => (
                    <StatusBadge tone={STATUS_TONE[row.original.status]}>
                        {t(`order.status.${row.original.status}`)}
                    </StatusBadge>
                ),
            },
            {
                accessorKey: 'createdDate',
                header: t('order.list.column.createdDate'),
                meta: {
                    sortField: 'createdDate',
                    columnLabel: t('order.list.column.createdDate'),
                },
                cell: ({ row }) => (
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDateTime(row.original.createdDate)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-right">{t('order.list.column.actions')}</div>,
                // Đường vào xem chi tiết / in hoá đơn — không cho ẩn, và không có gì để sort.
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('order.list.column.actions') },
                cell: ({ row }) => {
                    const order = row.original
                    /* Hoa don chi in duoc khi da thu tien (user chot 2026-08-21) — chan o ca 2 noi. */
                    const canPrint = order.paymentStatus === EPaymentStatus.PAID
                    return (
                        <div className="flex justify-end gap-1">
                            {/* Nut Chi tiet LUON hien (CONVENTIONS muc 5.3). */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                title={t('order.action.view')}
                                aria-label={t('order.action.view')}
                                onClick={() => setDetailId(order.id)}>
                                <Eye className="size-4" />
                            </Button>

                            {/* In hoa don chuyen vao `(...)` theo CONVENTIONS muc 5.3. */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0"
                                        aria-label={t('order.list.column.actions')}>
                                        <MoreHorizontal className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        disabled={!canPrint}
                                        onSelect={() => void handlePrint(order)}>
                                        <Printer className="size-4" />
                                        {t('order.action.print')}
                                    </DropdownMenuItem>
                                    {!canPrint && (
                                        <p className="text-muted-foreground max-w-56 px-2 py-1 text-xs">
                                            {t('order.detail.printBlocked')}
                                        </p>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
            },
        ],
        [t, handlePrint],
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
                const body: OrderSearchReq = {
                    keyword: keyword || undefined,
                    channel: channelTab === ALL ? undefined : (channelTab as EOrderChannel),
                    orderStatus: statusFilter === ALL ? undefined : (statusFilter as EOrderStatus),
                    paymentStatus:
                        paymentFilter === ALL ? undefined : (paymentFilter as EPaymentStatus),
                    branchId: canFilterBranch && branchFilter !== ALL ? branchFilter : undefined,
                }
                const result = await orderApi.search(
                    body,
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
            channelTab,
            statusFilter,
            paymentFilter,
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

    useEffect(() => {
        if (!canFilterBranch) return
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [canFilterBranch, refreshBranches])

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

    return (
        <div className="space-y-4">
            {/*
              Nút **tác động dữ liệu** đặt cùng hàng tiêu đề màn (CONVENTIONS mục 5, chốt 2026-08-28);
              hàng dưới chỉ còn tab kênh + search/filter + điều khiển bảng.
            */}
            <PageHeader
                title={t('order.list.pageTitle')}
                description={t('order.list.pageDescription')}
                actions={
                    <ExportButton
                        // Chưa có API export phía backend — giữ nguyên pattern các màn trước.
                        onExportExcel={() =>
                            toastInfo('order.export.exportComingSoon', { ns: 'order' })
                        }
                    />
                }
            />

            <Tabs
                value={channelTab}
                onValueChange={(value) => table.resetTo(() => setChannelTab(value))}>
                <PillTabs
                    items={CHANNEL_TABS.map((value) => ({
                        value,
                        label:
                            value === ALL
                                ? t('order.list.tab.all')
                                : t(`order.list.tab.${value === EOrderChannel.ONLINE ? 'online' : 'pos'}`),
                    }))}
                />

                <TabsContent value={channelTab} className="mt-4 space-y-4">
                    <DataTableToolbar
                        searchValue={keyword}
                        onSearchChange={(value) => table.resetTo(() => setKeyword(value))}
                        searchPlaceholder={t('order.list.searchPlaceholder')}
                        filters={
                            <>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(value) =>
                                        table.resetTo(() => setStatusFilter(value))
                                    }>
                                    <SelectTrigger className="w-full sm:w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>
                                            {t('order.list.allStatuses')}
                                        </SelectItem>
                                        {Object.values(EOrderStatus).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {t(`order.status.${status}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={paymentFilter}
                                    onValueChange={(value) =>
                                        table.resetTo(() => setPaymentFilter(value))
                                    }>
                                    <SelectTrigger className="w-full sm:w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>
                                            {t('order.list.allPaymentStatuses')}
                                        </SelectItem>
                                        {Object.values(EPaymentStatus).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {t(`order.paymentStatus.${status}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {canFilterBranch && (
                                    <Select
                                        value={branchFilter}
                                        onValueChange={(value) =>
                                            table.resetTo(() => setBranchFilter(value))
                                        }>
                                        <SelectTrigger className="w-full sm:w-52">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL}>
                                                {t('order.list.allBranches')}
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
                        unitLabel={t('order.list.resultLabel')}
                        pagination={{
                            page,
                            size: PAGE_SIZE,
                            total,
                            onPageChange: setPage,
                        }}
                        emptyState={
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
                                <ShoppingCart className="size-10 opacity-40" />
                                <p className="font-medium">{t('order.list.empty')}</p>
                                <p className="text-xs">{t('order.list.emptyHint')}</p>
                            </div>
                        }
                    />
                </TabsContent>
            </Tabs>

            <OrderDetailDialog
                orderId={detailId}
                onOpenChange={(open) => !open && setDetailId(null)}
                /*
                 * Dialog ghi dữ liệu (thu tiền, chuyển trạng thái, huỷ đơn…) ⇒ nạp lại **ngầm**,
                 * giữ nguyên page/sort/filter (CONVENTIONS mục 5.1). Khác `onRetry={load}` phía
                 * trên: đó là nạp lại sau lỗi nên hiện skeleton là đúng.
                 */
                onChanged={reload}
            />
        </div>
    )
}
