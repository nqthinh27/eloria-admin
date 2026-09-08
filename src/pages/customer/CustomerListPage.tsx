import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { customerApi } from '@/api/customer'
import { toastInfo, toastSuccess } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { hasRole } from '@/config/roles'
import { EntityStatus, ERole } from '@/types/common'
import type { Customer } from '@/types/customer'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ExportButton } from '@/components/export-button'
import { CustomerFormDialog } from './components/customer-form-dialog'
import { CustomerDetailModal } from './components/customer-detail-modal'
import { buildCustomerColumns } from './components/customer-columns'

const ALL_BRANCHES = 'ALL'
const ALL_STATUSES = 'ALL'
const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Giữ nguyên để thứ tự không đổi bất ngờ. */
const DEFAULT_SORT = ['createdDate,DESC']

/**
 * Màn "Khách hàng" (CRM) theo `10-khach-hang.png` — PLAN Phase 8.
 *
 * Chạy trên **API thật** (`POST /customer/search`), không dùng mock: backend đã bổ sung domain
 * khách hàng từ 2026-08-08, xác nhận lại bằng api-docs + gọi thật 2026-08-09.
 *
 * ⚠️ **Phase 3b (2026-08-28) — khách hàng là TOÀN CỤC, không còn branch data-scope.**
 * Mọi role (STAFF trở lên) thấy **toàn bộ khách của cả chuỗi**; `branchId` chỉ còn nghĩa
 * *"chi nhánh đăng ký"* và **có thể `null`**. Vì vậy bộ lọc chi nhánh ở đây **hiện với mọi role**
 * (trước kia chỉ SUPER_ADMIN mới thấy vì role khác chọn cũng không đổi được kết quả).
 * Xem CLAUDE.md mục "Phase 3b".
 */
export default function CustomerListPage() {
    const { t } = useTranslation(['customer', 'common'])
    const { user } = useAuth()
    /*
     * Nạp lại danh sách chi nhánh khi vào màn — người dùng khác có thể vừa thêm/sửa chi nhánh,
     * dùng lại dữ liệu provider nạp từ lúc đăng nhập sẽ thiếu lựa chọn trong bộ lọc
     * (không cache giữa các màn — chốt với user 2026-08-09).
     */
    const { branches, refresh: refreshBranches } = useBranch()

    useEffect(() => {
        const controller = new AbortController()
        void refreshBranches(controller.signal)
        return () => controller.abort()
    }, [refreshBranches])

    /** `PUT /customer/{id}` là `[ADMIN]` — STAFF chỉ xem, không sửa. */
    const canEdit = hasRole(user?.role, ERole.ADMIN)

    const [data, setData] = useState<Customer[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /**
     * Đang tải lại ngầm: **mờ bảng + spinner + icon nút xoay**, nhưng KHÔNG nháy skeleton —
     * dữ liệu cũ nằm nguyên để không mất vị trí đọc (CONVENTIONS mục 5.2).
     */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)
    const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)

    /* page · sort · cột ẩn/hiện · nonce tải lại — xem `use-table-state`. */
    const table = useTableState()
    /* Không lấy `setPage` ra ngoài: màn này không có xoá nên không cần kẹp trang, đổi trang do
     * `DataTable` gọi thẳng `table.setPage`. */
    const { page, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formCustomer, setFormCustomer] = useState<Customer | null | 'new'>(null)
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)

    /* Khai trước `load` vì `toSearchSort` cần `meta.sortField` của cột để dịch id cột → field BE. */
    const columns = useMemo(
        () =>
            buildCustomerColumns(t, {
                onViewDetail: setDetailCustomer,
                onEdit: setFormCustomer,
                canEdit,
            }),
        [t, canEdit],
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
                const result = await customerApi.search(
                    {
                        keyword: keyword || undefined,
                        status:
                            statusFilter === ALL_STATUSES
                                ? undefined
                                : (Number(statusFilter) as EntityStatus),
                        /*
                         * Lọc theo **chi nhánh đăng ký** của khách — Phase 3b cho **mọi role** dùng
                         * filter này (trước kia backend chỉ nhận từ SUPER_ADMIN).
                         */
                        branchId: branchFilter === ALL_BRANCHES ? undefined : branchFilter,
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
        [page, keyword, statusFilter, branchFilter, sorting, columns],
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

    const handleSearchChange = (value: string) => {
        table.resetTo(() => setKeyword(value))
    }

    const handleCreate = async (payload: Parameters<typeof customerApi.create>[0]) => {
        await customerApi.create(payload)
        toastSuccess('customer.toast.created', { ns: 'customer' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: Parameters<typeof customerApi.update>[1]) => {
        const updated = await customerApi.update(id, payload)
        toastSuccess('customer.toast.updated', { ns: 'customer' })
        setDetailCustomer((current) => (current?.id === id ? updated : current))
        await reload()
    }

    return (
        <>
            {/*
              Nút **tác động dữ liệu** đặt cùng hàng tiêu đề màn (CONVENTIONS mục 5, chốt 2026-08-28);
              hàng dưới chỉ còn search/filter + điều khiển bảng.
            */}
            <PageHeader
                title={t('customer.pageTitle')}
                description={t('customer.pageDescription')}
                actions={
                    <>
                        <ExportButton
                            // Chưa có API export phía backend (PLAN Phase 5) — chỉ báo trạng thái.
                            onExportExcel={() =>
                                toastInfo('customer.toast.exportComingSoon', { ns: 'customer' })
                            }
                        />
                        <Button onClick={() => setFormCustomer('new')}>
                            <Plus />
                            {t('customer.list.addButton')}
                        </Button>
                    </>
                }
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('customer.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                                <SelectTrigger aria-label={t('customer.list.allStatuses')} className="w-full sm:w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>
                                        {t('customer.list.allStatuses')}
                                    </SelectItem>
                                    <SelectItem value={String(EntityStatus.ACTIVE)}>
                                        {t('customer.list.statusActive')}
                                    </SelectItem>
                                    <SelectItem value={String(EntityStatus.INACTIVE)}>
                                        {t('customer.list.statusInactive')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/*
                              Phase 3b: lọc theo **chi nhánh đăng ký**, hiện với **mọi role**.
                              Không còn ràng buộc quyền xem theo chi nhánh nên ai cũng lọc được.
                            */}
                            <Select
                                value={branchFilter}
                                onValueChange={(v) => table.resetTo(() => setBranchFilter(v))}>
                                <SelectTrigger aria-label={t('customer.list.allBranches')} className="w-full sm:w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_BRANCHES}>
                                        {t('customer.list.allBranches')}
                                    </SelectItem>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name}
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
                    unitLabel={t('customer.list.resultLabel')}
                    emptyState={t('customer.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: table.setPage }}
                />

                <CustomerFormDialog
                    open={formCustomer !== null}
                    onOpenChange={(open) => !open && setFormCustomer(null)}
                    customer={
                        formCustomer === 'new' || formCustomer === null ? null : formCustomer
                    }
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <CustomerDetailModal
                    customer={detailCustomer}
                    onOpenChange={(open) => !open && setDetailCustomer(null)}
                    onSave={handleUpdate}
                />
            </div>
        </>
    )
}
