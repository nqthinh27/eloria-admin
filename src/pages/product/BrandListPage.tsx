import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { brandApi } from '@/api/product'
import { toastSuccess } from '@/lib/toast'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { EntityStatus } from '@/types/common'
import type { Brand, BrandPayload } from '@/types/product'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BrandFormDialog } from './components/brand-form-dialog'
import { BrandDetailModal } from './components/brand-detail-modal'
import { buildBrandColumns } from './components/brand-columns'

const ALL_STATUSES = 'ALL'
const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Giữ nguyên để thứ tự không đổi bất ngờ. */
const DEFAULT_SORT = ['createdDate,DESC']

/**
 * Màn "Thương hiệu" — **chỉ SUPER_ADMIN** (Phase 19; ghi `[SUPER_ADMIN]`). Không có mockup ⇒ pattern
 * list chuẩn. Role khác không có menu/route; họ vẫn đọc thương hiệu ở dropdown form Sản phẩm.
 */
export default function BrandListPage() {
    const { t } = useTranslation(['brand', 'common'])

    const [data, setData] = useState<Brand[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)

    /*
     * Cột ẩn sẵn (CONVENTIONS mục 5.6): MÔ TẢ — văn bản dài tới 500 ký tự, đã có trong modal chi tiết.
     */
    const table = useTableState([], { description: false })
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formBrand, setFormBrand] = useState<Brand | null | 'new'>(null)
    const [detailBrand, setDetailBrand] = useState<Brand | null>(null)
    const [toggleBrand, setToggleBrand] = useState<Brand | null>(null)
    const [deleteBrand, setDeleteBrand] = useState<Brand | null>(null)

    const columns = useMemo(
        () =>
            buildBrandColumns(t, {
                onViewDetail: setDetailBrand,
                onEdit: setFormBrand,
                onToggleStatus: setToggleBrand,
                onDelete: setDeleteBrand,
            }),
        [t],
    )

    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await brandApi.search(
                    {
                        keyword: keyword || undefined,
                        status: statusFilter === ALL_STATUSES ? undefined : (Number(statusFilter) as EntityStatus),
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

    const handleCreate = async (payload: BrandPayload) => {
        await brandApi.create(payload)
        toastSuccess('brand.toast.created', { ns: 'brand' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: BrandPayload) => {
        const updated = await brandApi.update(id, payload)
        toastSuccess('brand.toast.updated', { ns: 'brand' })
        setDetailBrand((current) => (current?.id === id ? updated : current))
        await reload()
    }

    const handleToggleStatus = async () => {
        if (!toggleBrand) return
        const next = toggleBrand.status === EntityStatus.ACTIVE ? EntityStatus.INACTIVE : EntityStatus.ACTIVE
        await brandApi.updateStatus(toggleBrand.id, next)
        toastSuccess('brand.toast.statusUpdated', { ns: 'brand' })
        await reload()
    }

    const handleDelete = async () => {
        if (!deleteBrand) return
        await brandApi.remove(deleteBrand.id)
        toastSuccess('brand.toast.deleted', { ns: 'brand' })
        // Xoá dòng cuối của trang cuối ⇒ lùi một trang (đổi `page` đã tự kéo theo `load`).
        if (data.length === 1 && page > 1) setPage(page - 1)
        else await reload()
    }

    const isDeactivating = toggleBrand?.status === EntityStatus.ACTIVE

    return (
        <>
            <PageHeader
                title={t('brand.pageTitle')}
                description={t('brand.pageDescription')}
                actions={
                    <Button onClick={() => setFormBrand('new')}>
                        <Plus />
                        {t('brand.list.addButton')}
                    </Button>
                }
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(value) => table.resetTo(() => setKeyword(value))}
                    searchPlaceholder={t('brand.list.searchPlaceholder')}
                    filters={
                        <Select value={statusFilter} onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                            <SelectTrigger aria-label={t('brand.list.allStatuses')} className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_STATUSES}>{t('brand.list.allStatuses')}</SelectItem>
                                <SelectItem value={String(EntityStatus.ACTIVE)}>
                                    {t('brand.list.statusActive')}
                                </SelectItem>
                                <SelectItem value={String(EntityStatus.INACTIVE)}>
                                    {t('brand.list.statusInactive')}
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
                    unitLabel={t('brand.list.resultLabel')}
                    emptyState={t('brand.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <BrandFormDialog
                    open={formBrand !== null}
                    onOpenChange={(open) => !open && setFormBrand(null)}
                    brand={formBrand === 'new' || formBrand === null ? null : formBrand}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <BrandDetailModal brand={detailBrand} onOpenChange={(open) => !open && setDetailBrand(null)} />

                <ConfirmDialog
                    open={toggleBrand !== null}
                    onOpenChange={(open) => !open && setToggleBrand(null)}
                    title={isDeactivating ? t('brand.statusConfirm.deactivateTitle') : t('brand.statusConfirm.activateTitle')}
                    description={
                        isDeactivating
                            ? t('brand.statusConfirm.deactivateDescription', { name: toggleBrand?.name })
                            : t('brand.statusConfirm.activateDescription', { name: toggleBrand?.name })
                    }
                    variant={isDeactivating ? 'destructive' : 'default'}
                    confirmLabel={
                        isDeactivating ? t('brand.statusConfirm.deactivateSubmit') : t('brand.statusConfirm.activateSubmit')
                    }
                    auditLogged
                    onConfirm={handleToggleStatus}
                />

                <ConfirmDialog
                    open={deleteBrand !== null}
                    onOpenChange={(open) => !open && setDeleteBrand(null)}
                    title={t('brand.deleteConfirm.title')}
                    description={t('brand.deleteConfirm.description', { name: deleteBrand?.name })}
                    variant="destructive"
                    confirmLabel={t('brand.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />
            </div>
        </>
    )
}
