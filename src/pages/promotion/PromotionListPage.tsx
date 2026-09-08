import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Download, Eye, MoreHorizontal, Pencil, Plus, Ticket, ToggleLeft } from 'lucide-react'

import { couponApi, promotionApi } from '@/api/promotion'
import { formatDate, formatVnd } from '@/lib/format'
import { toastError, toastSuccess, toastWarning } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { hasRole } from '@/config/roles'
import { ERole } from '@/types/common'
import { EOrderChannel } from '@/types/order'
import {
    EPromotionStatus,
    EPromotionType,
    type CouponGenerateReq,
    type CreatePromotionReq,
    type Promotion,
} from '@/types/promotion'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { CouponGenerateDialog } from './components/coupon-generate-dialog'
import { PromotionDetailModal } from './components/promotion-detail-modal'
import { PromotionFormDialog } from './components/promotion-form-dialog'
import { PromotionStatusDialog } from './components/promotion-status-dialog'

const ALL_STATUSES = 'ALL'
const ALL_CHANNELS = 'ALL'
const PAGE_SIZE = 10
/** Mới nhất lên đầu khi người dùng chưa chọn cột sort nào. */
const DEFAULT_SORT = ['createdDate,DESC']

/** Tông màu badge theo vòng đời — bám quy ước StatusBadge của Phase 5. */
const STATUS_TONE: Record<EPromotionStatus, StatusTone> = {
    DRAFT: 'muted',
    SCHEDULED: 'info',
    RUNNING: 'success',
    PAUSED: 'warning',
    ENDED: 'muted',
}

/**
 * Màn "Khuyến mại & Promotion" theo `16-khuyen-mai.png` — PLAN Phase 14. Chạy trên **API thật**
 * (backend Phase 9, khảo sát 2026-09-07).
 *
 * ⚠️ **Lệch có chủ đích so với mockup:**
 * - Mockup vẽ cột LOẠI với giá trị *"Mua X tặng Y"*, nhưng backend **chỉ có `PERCENT`/`FIXED`**
 *   (MVP best-one-wins). Không dựng UI cho loại không tồn tại.
 * - Mockup có **icon thùng rác (xoá)**, backend **không có `DELETE /promotion/{id}`** — kết thúc
 *   chương trình là chuyển trạng thái sang `ENDED`. Thay nút xoá bằng "Chuyển trạng thái".
 * - Mockup vẽ kênh "Tất cả", backend bắt buộc **đúng một** kênh (`ONLINE|POS|OTHER`).
 * - Thêm cột **Hình thức** (tự động / mã công khai / mã cá nhân) — mockup không có, nhưng một
 *   bảng `promotion` gánh cả 3 vai nên không phân biệt thì người dùng đọc bảng không hiểu.
 */
export default function PromotionListPage() {
    const { t } = useTranslation(['promotion', 'common'])
    const { user } = useAuth()
    const { branches, refresh: refreshBranches } = useBranch()
    /** API ghi của nhóm khuyến mại là `[ADMIN]` (khác nhóm sản phẩm là `[SUPER_ADMIN]`). */
    const canWrite = hasRole(user?.role, ERole.ADMIN)

    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /** Tải lại ngầm: mờ bảng + spinner, **không** nháy skeleton (CONVENTIONS mục 5.2). */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [exporting, setExporting] = useState(false)

    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)
    const [channelFilter, setChannelFilter] = useState<string>(ALL_CHANNELS)

    const table = useTableState()
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formPromotion, setFormPromotion] = useState<Promotion | null | 'new'>(null)
    const [detailPromotion, setDetailPromotion] = useState<Promotion | null>(null)
    const [statusPromotion, setStatusPromotion] = useState<Promotion | null>(null)
    const [couponOpen, setCouponOpen] = useState(false)

    /*
     * Khai **trước** `load`: `toSearchSort` cần `meta.sortField` của cột để dịch id cột → tên
     * field của backend (cùng thứ tự khai như `CustomerListPage`/`OrderListPage`).
     */
    const columns = useMemo<ColumnDef<Promotion, unknown>[]>(
        () => [
            {
                id: 'code',
                accessorKey: 'code',
                header: t('promotion.list.column.code'),
                size: 130,
                /* `code` là cột thật của entity ⇒ sort được phía server. */
                meta: { columnLabel: t('promotion.list.column.code'), sortField: 'code' },
                cell: ({ row }) =>
                    row.original.code ? (
                        <span className="font-mono text-xs">{row.original.code}</span>
                    ) : (
                        <span className="text-muted-foreground text-xs">
                            {t('promotion.list.noCode')}
                        </span>
                    ),
            },
            {
                id: 'name',
                accessorKey: 'name',
                header: t('promotion.list.column.name'),
                // Cột định danh — ẩn đi thì không biết đang xem chương trình nào.
                enableHiding: false,
                meta: { columnLabel: t('promotion.list.column.name'), sortField: 'name' },
                cell: ({ row }) => {
                    const promotion = row.original
                    /* Phân loại 3 vai của một bảng `promotion` — xem `types/promotion.ts`. */
                    const kind = !promotion.code
                        ? 'auto'
                        : promotion.customerId
                          ? 'personal'
                          : 'coupon'
                    return (
                        <div className="flex flex-col gap-1">
                            <span className="font-medium">{promotion.name}</span>
                            <span className="text-muted-foreground text-xs">
                                {t(`promotion.kind.${kind}`)}
                                {' · '}
                                {promotion.branchName ?? t('promotion.list.branchAll')}
                            </span>
                        </div>
                    )
                },
            },
            {
                id: 'type',
                accessorKey: 'type',
                header: t('promotion.list.column.type'),
                size: 110,
                meta: { columnLabel: t('promotion.list.column.type'), sortField: 'type' },
                cell: ({ row }) => t(`promotion.type.${row.original.type}`),
            },
            {
                id: 'value',
                accessorKey: 'value',
                header: t('promotion.list.column.value'),
                size: 120,
                meta: { columnLabel: t('promotion.list.column.value'), sortField: 'value' },
                cell: ({ row }) => (
                    <Badge variant="outline">
                        {row.original.type === EPromotionType.PERCENT
                            ? `${row.original.value}%`
                            : formatVnd(row.original.value)}
                    </Badge>
                ),
            },
            {
                id: 'channel',
                accessorKey: 'channel',
                header: t('promotion.list.column.channel'),
                size: 110,
                meta: { columnLabel: t('promotion.list.column.channel'), sortField: 'channel' },
                cell: ({ row }) => t(`promotion.channel.${row.original.channel}`),
            },
            {
                id: 'period',
                accessorKey: 'startDate',
                header: t('promotion.list.column.period'),
                size: 190,
                meta: { columnLabel: t('promotion.list.column.period'), sortField: 'startDate' },
                cell: ({ row }) => {
                    const { startDate, endDate } = row.original
                    if (!startDate && !endDate) {
                        return (
                            <span className="text-muted-foreground text-sm">
                                {t('promotion.list.noPeriod')}
                            </span>
                        )
                    }
                    return (
                        <span className="text-sm">
                            {startDate ? formatDate(startDate) : '—'}
                            {' → '}
                            {endDate ? formatDate(endDate) : '—'}
                        </span>
                    )
                },
            },
            {
                id: 'usage',
                accessorKey: 'usageCount',
                header: t('promotion.list.column.usage'),
                size: 100,
                meta: { columnLabel: t('promotion.list.column.usage'), sortField: 'usageCount' },
                cell: ({ row }) => {
                    const { usageCount, usageLimit } = row.original
                    return usageLimit == null
                        ? t('promotion.list.usageUnlimited', { used: usageCount })
                        : t('promotion.list.usageLimited', {
                              used: usageCount,
                              limit: usageLimit,
                          })
                },
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: t('promotion.list.column.status'),
                size: 130,
                meta: { columnLabel: t('promotion.list.column.status'), sortField: 'status' },
                cell: ({ row }) => (
                    <StatusBadge tone={STATUS_TONE[row.original.status]}>
                        {t(`promotion.status.${row.original.status}`)}
                    </StatusBadge>
                ),
            },
            {
                id: 'actions',
                header: t('promotion.list.column.actions'),
                size: 88,
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('promotion.list.column.actions') },
                cell: ({ row }) => {
                    const promotion = row.original
                    return (
                        <div className="flex items-center gap-1">
                            {/* Nút Chi tiết LUÔN hiện, không gate theo quyền (CONVENTIONS mục 5.3). */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                title={t('promotion.list.actionView')}
                                aria-label={t('promotion.list.actionView')}
                                onClick={() => setDetailPromotion(promotion)}>
                                <Eye className="size-4" />
                            </Button>

                            {/* Chỉ role ghi mới có hành động ⇒ menu tự ẩn với người chỉ xem. */}
                            {canWrite && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 shrink-0"
                                            aria-label={t('promotion.list.column.actions')}>
                                            <MoreHorizontal className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onSelect={() => setFormPromotion(promotion)}>
                                            <Pencil className="size-4" />
                                            {t('promotion.list.actionEdit')}
                                        </DropdownMenuItem>
                                        {/*
                                          Không có mục Xoá: backend **không có** `DELETE /promotion/{id}`.
                                          Kết thúc chương trình = chuyển trạng thái sang `ENDED`.
                                        */}
                                        <DropdownMenuItem
                                            onSelect={() => setStatusPromotion(promotion)}>
                                            <ToggleLeft className="size-4" />
                                            {t('promotion.list.actionChangeStatus')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )
                },
            },
        ],
        [t, canWrite],
    )

    /**
     * Phân trang **phía server** — khác màn Danh mục (nạp trọn rồi cắt ở client): số chương trình
     * khuyến mại không có trần tự nhiên, coupon sinh hàng loạt có thể lên tới hàng nghìn dòng
     * (mỗi mã là **một dòng `promotion` riêng**), nên nạp hết là không khả thi.
     */
    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await promotionApi.search(
                    {
                        keyword: keyword.trim() || undefined,
                        /* ⚠️ Lọc vòng đời dùng `promotionStatus`, KHÔNG phải `status` (0/1). */
                        promotionStatus:
                            statusFilter === ALL_STATUSES
                                ? undefined
                                : (statusFilter as EPromotionStatus),
                        channel:
                            channelFilter === ALL_CHANNELS
                                ? undefined
                                : (channelFilter as EOrderChannel),
                    },
                    { page, size: PAGE_SIZE, sort: toSearchSort(sorting, DEFAULT_SORT, columns) },
                    signal,
                )
                setPromotions(result.data)
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
        [keyword, statusFilter, channelFilter, page, sorting, columns],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    /*
     * Form cần danh sách chi nhánh (chỉ SUPER_ADMIN chọn được) — nạp 1 lần khi vào màn.
     * ⚠️ **Bắt buộc truyền `signal`**: thiếu nó thì `<StrictMode>` gọi effect 2 lần và cả hai
     * request đều chạy ⇒ `branch/search` bị gọi trùng trong cùng một màn (CONVENTIONS mục 5).
     */
    useEffect(() => {
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [refreshBranches])

    useEffect(() => {
        if (table.reloadNonce === 0) return
        const controller = new AbortController()
        void table.runRefresh((signal) => load(signal, true), controller.signal)
        return () => controller.abort()
        // `load` cố ý không nằm trong dep: chỉ chạy khi người dùng bấm Tải lại.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table.reloadNonce])

    /** Ghi dữ liệu xong ⇒ nạp lại ngầm, **giữ nguyên** page/filter (CONVENTIONS mục 5.1). */
    const reload = useCallback(() => load(undefined, true), [load])

    const handleCreate = async (payload: CreatePromotionReq) => {
        await promotionApi.create(payload)
        toastSuccess('promotion.toast.created', { ns: 'promotion' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: CreatePromotionReq) => {
        await promotionApi.update(id, payload)
        toastSuccess('promotion.toast.updated', { ns: 'promotion' })
        await reload()
    }

    /**
     * ⚠️ `update-status` trả `data: null` (xem PLAN **BE18**) ⇒ **bắt buộc nạp lại** danh sách,
     * không được lấy response gán vào state.
     */
    const handleChangeStatus = async (id: string, status: EPromotionStatus) => {
        await promotionApi.updateStatus(id, status)
        toastSuccess('promotion.toast.statusUpdated', { ns: 'promotion' })
        await reload()
    }

    const handleGenerateCoupon = async (payload: CouponGenerateReq) => {
        const result = await couponApi.generate(payload)
        toastSuccess('promotion.toast.couponGenerated', { ns: 'promotion' })
        /* Mã sinh ra ở `RUNNING` và là bản ghi promotion thật ⇒ bảng phải phản ánh ngay. */
        await reload()
        return result.data
    }

    /**
     * Xuất CSV danh sách coupon — `GET /coupon/export` trả **`text/csv` thuần**, không bọc
     * `BaseResponse`, nên đi qua `getBlob()`. Tự tạo link tải rồi thu hồi object URL.
     */
    const handleExportCoupons = async () => {
        setExporting(true)
        try {
            const blob = await couponApi.exportCsv({
                keyword: keyword.trim() || undefined,
                promotionStatus:
                    statusFilter === ALL_STATUSES ? undefined : (statusFilter as EPromotionStatus),
                channel:
                    channelFilter === ALL_CHANNELS ? undefined : (channelFilter as EOrderChannel),
            })

            /*
             * CSV chỉ có dòng tiêu đề ⇒ không có coupon nào khớp bộ lọc. Tải về file rỗng là
             * đánh đố người dùng, nên báo rõ thay vì im lặng.
             */
            const text = await blob.text()
            if (text.trim().split('\n').length <= 1) {
                toastWarning('promotion.toast.exportEmpty', { ns: 'promotion' })
                return
            }

            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `coupons-${new Date().toISOString().slice(0, 10)}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toastSuccess('promotion.toast.exported', { ns: 'promotion' })
        } catch (error) {
            toastError(error)
        } finally {
            setExporting(false)
        }
    }

    const handleSearchChange = (value: string) => {
        table.resetTo(() => setKeyword(value))
    }



    return (
        <>
            <PageHeader
                title={t('promotion.pageTitle')}
                description={t('promotion.pageDescription')}
                actions={
                    canWrite && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                disabled={exporting}
                                onClick={handleExportCoupons}>
                                <Download />
                                {t('promotion.list.exportCoupon')}
                            </Button>
                            <Button variant="outline" onClick={() => setCouponOpen(true)}>
                                <Ticket />
                                {t('promotion.list.generateCoupon')}
                            </Button>
                            <Button onClick={() => setFormPromotion('new')}>
                                <Plus />
                                {t('promotion.list.addButton')}
                            </Button>
                        </div>
                    )
                }
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('promotion.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                                <SelectTrigger aria-label={t('promotion.list.allStatuses')} className="w-full sm:w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>
                                        {t('promotion.list.allStatuses')}
                                    </SelectItem>
                                    {Object.values(EPromotionStatus).map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(`promotion.status.${status}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={channelFilter}
                                onValueChange={(v) => table.resetTo(() => setChannelFilter(v))}>
                                <SelectTrigger aria-label={t('promotion.list.allChannels')} className="w-full sm:w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_CHANNELS}>
                                        {t('promotion.list.allChannels')}
                                    </SelectItem>
                                    {Object.values(EOrderChannel).map((channel) => (
                                        <SelectItem key={channel} value={channel}>
                                            {t(`promotion.channel.${channel}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                  Sort **phía server** (khác màn Danh mục): bảng phân trang server nên sort client
                  chỉ sắp xếp 10 dòng của trang hiện tại ⇒ sai mà người dùng không biết
                  (CONVENTIONS mục 5.2). Các cột đều khai `meta.sortField` là **field thật của
                  entity `Promotion`** — cột dẫn xuất (Hình thức) không mở sort.
                */}
                <DataTable
                    columns={columns}
                    data={promotions}
                    getRowId={(row) => row.id}
                    loading={loading}
                    refreshing={refreshing}
                    error={error}
                    onRetry={load}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    unitLabel={t('promotion.list.resultLabel')}
                    emptyState={t('promotion.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <PromotionFormDialog
                    open={formPromotion !== null}
                    onOpenChange={(open) => !open && setFormPromotion(null)}
                    promotion={
                        formPromotion === 'new' || formPromotion === null ? null : formPromotion
                    }
                    branches={branches}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <PromotionDetailModal
                    promotion={detailPromotion}
                    onOpenChange={(open) => !open && setDetailPromotion(null)}
                />

                <PromotionStatusDialog
                    open={statusPromotion !== null}
                    onOpenChange={(open) => !open && setStatusPromotion(null)}
                    promotion={statusPromotion}
                    onConfirm={handleChangeStatus}
                />

                <CouponGenerateDialog
                    open={couponOpen}
                    onOpenChange={setCouponOpen}
                    onGenerate={handleGenerateCoupon}
                />
            </div>
        </>
    )
}
