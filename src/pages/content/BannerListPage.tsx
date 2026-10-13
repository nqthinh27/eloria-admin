import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Plus } from 'lucide-react'

import { bannerApi } from '@/api/cms'
import { toastSuccess } from '@/lib/toast'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { EntityStatus } from '@/types/common'
import type { Banner, BannerPayload } from '@/types/cms'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BannerFormDialog } from './components/banner-form-dialog'
import { buildBannerColumns, isBannerVisible } from './components/banner-columns'

const ALL_STATUSES = 'ALL'
const PAGE_SIZE = 10
/** Hero chạy theo `sortOrder` tăng dần ⇒ mặc định xem đúng thứ tự khách thấy. */
const DEFAULT_SORT = ['sortOrder,ASC']

/**
 * Màn "Banner trang chủ" — **chỉ SUPER_ADMIN** (Phase 20; mọi `/banner/*` đều `[SUPER_ADMIN]`).
 * v1 chỉ có vị trí `HOME_HERO` ⇒ không có bộ lọc/cột vị trí.
 *
 * Banner **hiện trên web** khi: ACTIVE + có ảnh + trong khoảng hiệu lực. Khi không còn banner nào
 * thoả, trang chủ web rơi về giao diện mặc định ⇒ hiện cảnh báo ở đầu bảng.
 */
export default function BannerListPage() {
    const { t } = useTranslation(['banner', 'common'])

    const [data, setData] = useState<Banner[]>([])
    const [total, setTotal] = useState(0)
    const [activeTotal, setActiveTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)

    const table = useTableState([])
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formBanner, setFormBanner] = useState<Banner | null | 'new'>(null)
    const [toggleBanner, setToggleBanner] = useState<Banner | null>(null)
    const [deleteBanner, setDeleteBanner] = useState<Banner | null>(null)

    const columns = useMemo(
        () =>
            buildBannerColumns(t, {
                onEdit: setFormBanner,
                onToggleStatus: setToggleBanner,
                onDelete: setDeleteBanner,
            }),
        [t],
    )

    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await bannerApi.search(
                    {
                        keyword: keyword || undefined,
                        status: statusFilter === ALL_STATUSES ? undefined : (Number(statusFilter) as EntityStatus),
                    },
                    { page, size: PAGE_SIZE, sort: toSearchSort(sorting, DEFAULT_SORT, columns) },
                    signal,
                )
                setData(result.data)
                setTotal(result.total)
                setActiveTotal(result.activeTotal)
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
        [page, keyword, statusFilter, sorting, columns],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

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

    const handleCreate = async (payload: BannerPayload) => {
        const created = await bannerApi.create(payload)
        toastSuccess('banner.toast.created', { ns: 'banner' })
        await reload()
        return created
    }

    const handleUpdate = async (id: string, payload: BannerPayload) => {
        await bannerApi.update(id, payload)
        toastSuccess('banner.toast.updated', { ns: 'banner' })
        await reload()
    }

    const handleToggleStatus = async () => {
        if (!toggleBanner) return
        const next = toggleBanner.status === EntityStatus.ACTIVE ? EntityStatus.INACTIVE : EntityStatus.ACTIVE
        await bannerApi.updateStatus(toggleBanner.id, next)
        toastSuccess('banner.toast.statusUpdated', { ns: 'banner' })
        await reload()
    }

    const handleDelete = async () => {
        if (!deleteBanner) return
        await bannerApi.remove(deleteBanner.id)
        toastSuccess('banner.toast.deleted', { ns: 'banner' })
        if (data.length === 1 && page > 1) setPage(page - 1)
        else await reload()
    }

    /*
     * Cảnh báo "không còn banner hiển thị". Chỉ đáng tin khi **không lọc** và biết hết banner:
     * ít hơn một trang ⇒ tính trực tiếp (ảnh + hiệu lực); nhiều hơn ⇒ chỉ biết `activeTotal`.
     */
    const unfiltered = !keyword && statusFilter === ALL_STATUSES
    const noneVisible =
        unfiltered && !loading && !error && (total <= data.length ? !data.some((b) => isBannerVisible(b)) : activeTotal === 0)

    const isDeactivating = toggleBanner?.status === EntityStatus.ACTIVE

    return (
        <>
            <PageHeader
                title={t('banner.pageTitle')}
                description={t('banner.pageDescription')}
                actions={
                    <Button onClick={() => setFormBanner('new')}>
                        <Plus />
                        {t('banner.list.addButton')}
                    </Button>
                }
            />

            <div className="space-y-4">
                {noneVisible && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        {t('banner.list.noActiveWarning')}
                    </div>
                )}

                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(value) => table.resetTo(() => setKeyword(value))}
                    searchPlaceholder={t('banner.list.searchPlaceholder')}
                    filters={
                        <Select value={statusFilter} onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                            <SelectTrigger aria-label={t('banner.list.allStatuses')} className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_STATUSES}>{t('banner.list.allStatuses')}</SelectItem>
                                <SelectItem value={String(EntityStatus.ACTIVE)}>
                                    {t('banner.list.statusActive')}
                                </SelectItem>
                                <SelectItem value={String(EntityStatus.INACTIVE)}>
                                    {t('banner.list.statusInactive')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
                    unitLabel={t('banner.list.resultLabel')}
                    emptyState={t('banner.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <BannerFormDialog
                    open={formBanner !== null}
                    onOpenChange={(open) => !open && setFormBanner(null)}
                    banner={formBanner === 'new' || formBanner === null ? null : formBanner}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    onMediaChanged={() => void reload()}
                />

                <ConfirmDialog
                    open={toggleBanner !== null}
                    onOpenChange={(open) => !open && setToggleBanner(null)}
                    title={
                        isDeactivating ? t('banner.statusConfirm.deactivateTitle') : t('banner.statusConfirm.activateTitle')
                    }
                    description={
                        isDeactivating
                            ? t('banner.statusConfirm.deactivateDescription', { name: toggleBanner?.title })
                            : t('banner.statusConfirm.activateDescription', { name: toggleBanner?.title })
                    }
                    variant={isDeactivating ? 'destructive' : 'default'}
                    confirmLabel={
                        isDeactivating
                            ? t('banner.statusConfirm.deactivateSubmit')
                            : t('banner.statusConfirm.activateSubmit')
                    }
                    auditLogged
                    onConfirm={handleToggleStatus}
                />

                <ConfirmDialog
                    open={deleteBanner !== null}
                    onOpenChange={(open) => !open && setDeleteBanner(null)}
                    title={t('banner.deleteConfirm.title')}
                    description={t('banner.deleteConfirm.description', { name: deleteBanner?.title })}
                    variant="destructive"
                    confirmLabel={t('banner.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />
            </div>
        </>
    )
}
