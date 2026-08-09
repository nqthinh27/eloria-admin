import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { customerApi } from '@/api/customer'
import { toastInfo, toastSuccess } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { hasRole } from '@/config/roles'
import { EntityStatus, ERole } from '@/types/common'
import type { Customer } from '@/types/customer'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { ExportButton } from '@/components/export-button'
import { CustomerFormDialog } from './components/customer-form-dialog'
import { CustomerDetailModal } from './components/customer-detail-modal'
import { buildCustomerColumns } from './components/customer-columns'

const ALL_BRANCHES = 'ALL'
const ALL_STATUSES = 'ALL'
const PAGE_SIZE = 10

/**
 * Màn "Khách hàng" (CRM) theo `10-khach-hang.png` — PLAN Phase 8.
 *
 * Chạy trên **API thật** (`POST /customer/search`), không dùng mock: backend đã bổ sung domain
 * khách hàng từ 2026-08-08, xác nhận lại bằng api-docs + gọi thật 2026-08-09.
 *
 * Phạm vi dữ liệu do backend tự chặn: STAFF/ADMIN chỉ thấy khách chi nhánh mình ⇒ bộ lọc chi nhánh
 * chỉ hiện với SUPER_ADMIN (role khác chọn cũng không đổi được kết quả, hiện ra chỉ gây hiểu nhầm).
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

    const isSuperAdmin = hasRole(user?.role, ERole.SUPER_ADMIN)
    /** `PUT /customer/{id}` là `[ADMIN]` — STAFF chỉ xem, không sửa. */
    const canEdit = hasRole(user?.role, ERole.ADMIN)

    const [data, setData] = useState<Customer[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)
    const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)

    const [formCustomer, setFormCustomer] = useState<Customer | null | 'new'>(null)
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(false)
        try {
            const result = await customerApi.search(
                {
                    keyword: keyword || undefined,
                    status:
                        statusFilter === ALL_STATUSES
                            ? undefined
                            : (Number(statusFilter) as EntityStatus),
                    // Backend chỉ nhận `branchId` từ SUPER_ADMIN, role khác bị ép về chi nhánh mình.
                    branchId:
                        isSuperAdmin && branchFilter !== ALL_BRANCHES ? branchFilter : undefined,
                },
                { page, size: PAGE_SIZE },
                signal,
            )
            setData(result.data)
            setTotal(result.total)
        } catch {
            if (signal?.aborted) return
            setError(true)
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }, [page, keyword, statusFilter, branchFilter, isSuperAdmin])

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    const handleSearchChange = (value: string) => {
        setKeyword(value)
        setPage(1)
    }

    const handleCreate = async (payload: Parameters<typeof customerApi.create>[0]) => {
        await customerApi.create(payload)
        toastSuccess('customer.toast.created', { ns: 'customer' })
        await load()
    }

    const handleUpdate = async (id: string, payload: Parameters<typeof customerApi.update>[1]) => {
        const updated = await customerApi.update(id, payload)
        toastSuccess('customer.toast.updated', { ns: 'customer' })
        setDetailCustomer((current) => (current?.id === id ? updated : current))
        await load()
    }

    const columns = buildCustomerColumns(t, {
        onViewDetail: setDetailCustomer,
        onEdit: setFormCustomer,
        canEdit,
    })

    return (
        <>
            <PageHeader title={t('customer.pageTitle')} description={t('customer.pageDescription')} />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('customer.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => {
                                    setStatusFilter(v)
                                    setPage(1)
                                }}>
                                <SelectTrigger className="w-full sm:w-44">
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

                            {isSuperAdmin && (
                                <Select
                                    value={branchFilter}
                                    onValueChange={(v) => {
                                        setBranchFilter(v)
                                        setPage(1)
                                    }}>
                                    <SelectTrigger className="w-full sm:w-48">
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
                            )}
                        </>
                    }
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

                <DataTable
                    columns={columns}
                    data={data}
                    getRowId={(row) => row.id}
                    loading={loading}
                    error={error}
                    onRetry={load}
                    unitLabel={t('customer.list.resultLabel')}
                    emptyState={t('customer.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
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
