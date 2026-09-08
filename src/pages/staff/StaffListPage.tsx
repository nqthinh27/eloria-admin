import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { staffApi } from '@/api/staff'
import { toastSuccess } from '@/lib/toast'
import { useBranch } from '@/hooks/use-branch'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { EntityStatus, ERole } from '@/types/common'
import type { Staff } from '@/types/staff'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StaffFormDialog } from './components/staff-form-dialog'
import { StaffDetailModal } from './components/staff-detail-modal'
import { AssignRoleDialog } from './components/assign-role-dialog'
import { ResetPasswordDialog } from './components/reset-password-dialog'
import { buildStaffColumns } from './components/staff-columns'

const ALL_ROLES = 'ALL'
const ALL_BRANCHES = 'ALL'
const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Giữ nguyên để thứ tự không đổi bất ngờ. */
const DEFAULT_SORT = ['createdDate,DESC']

/** Màn "Nhân viên" — mục menu riêng trong nhóm HỆ THỐNG, theo `07-nhan-vien.png`. */
export default function StaffListPage() {
    const { t } = useTranslation(['staff', 'common'])
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

    const [data, setData] = useState<Staff[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /**
     * Đang tải lại ngầm: **mờ bảng + spinner + icon nút xoay**, nhưng KHÔNG nháy skeleton —
     * dữ liệu cũ nằm nguyên để không mất vị trí đọc (CONVENTIONS mục 5.2).
     */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>(ALL_ROLES)
    const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)

    /* page · sort · cột ẩn/hiện · nonce tải lại — xem `use-table-state`. */
    const table = useTableState()
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formStaff, setFormStaff] = useState<Staff | null | 'new'>(null)
    const [detailStaff, setDetailStaff] = useState<Staff | null>(null)
    const [assignRoleStaff, setAssignRoleStaff] = useState<Staff | null>(null)
    const [resetPasswordStaff, setResetPasswordStaff] = useState<Staff | null>(null)
    const [toggleStatusStaff, setToggleStatusStaff] = useState<Staff | null>(null)
    const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null)

    /* Khai trước `load` vì `toSearchSort` cần `meta.sortField` của cột để dịch id cột → field BE. */
    const columns = useMemo(
        () =>
            buildStaffColumns(t, {
                onViewDetail: setDetailStaff,
                onEditFull: setFormStaff,
                onAssignRole: setAssignRoleStaff,
                onResetPassword: setResetPasswordStaff,
                onToggleStatus: setToggleStatusStaff,
                onDelete: setDeleteStaff,
            }),
        [t],
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
                const result = await staffApi.search(
                    {
                        keyword: keyword || undefined,
                        role: roleFilter === ALL_ROLES ? undefined : (roleFilter as ERole),
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
        [page, keyword, roleFilter, branchFilter, sorting, columns],
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

    const handleCreate = async (payload: Parameters<typeof staffApi.create>[0]) => {
        await staffApi.create(payload)
        toastSuccess('staff.toast.created', { ns: 'staff' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: Parameters<typeof staffApi.update>[1]) => {
        const updated = await staffApi.update(id, payload)
        toastSuccess('staff.toast.updated', { ns: 'staff' })
        setDetailStaff((current) => (current?.id === id ? updated : current))
        await reload()
    }

    const handleAssignRole = async (role: ERole) => {
        if (!assignRoleStaff) return
        await staffApi.assignRole({ id: assignRoleStaff.id, role })
        toastSuccess('staff.toast.roleAssigned', { ns: 'staff' })
        await reload()
    }

    const handleResetPassword = async (): Promise<string> => {
        if (!resetPasswordStaff) return ''
        const result = await staffApi.resetPassword(resetPasswordStaff.id)
        toastSuccess('staff.toast.passwordReset', { ns: 'staff' })
        return result.temporaryPassword
    }

    const handleToggleStatus = async () => {
        if (!toggleStatusStaff) return
        const nextStatus =
            toggleStatusStaff.status === EntityStatus.ACTIVE
                ? EntityStatus.INACTIVE
                : EntityStatus.ACTIVE
        await staffApi.updateStatus(toggleStatusStaff.id, nextStatus)
        toastSuccess('staff.toast.statusUpdated', { ns: 'staff' })
        await reload()
    }

    const handleDelete = async () => {
        if (!deleteStaff) return
        await staffApi.remove(deleteStaff.id)
        toastSuccess('staff.toast.deleted', { ns: 'staff' })
        /*
         * Xoá dòng cuối của trang cuối ⇒ trang hiện tại rỗng. Lùi một trang thay vì để bảng trống
         * (CONVENTIONS mục 5.1); đổi `page` đã tự kéo theo `load` nên không gọi `reload()` nữa.
         */
        if (data.length === 1 && page > 1) setPage(page - 1)
        else await reload()
    }

    const isLocking = toggleStatusStaff?.status === EntityStatus.ACTIVE

    return (
        <>
            {/*
              Nút **tác động dữ liệu** đặt cùng hàng tiêu đề màn (CONVENTIONS mục 5, chốt 2026-08-28);
              hàng dưới chỉ còn search/filter + điều khiển bảng.
            */}
            <PageHeader
                title={t('staff.pageTitle')}
                description={t('staff.pageDescription')}
                actions={
                    <Button onClick={() => setFormStaff('new')}>
                        <Plus />
                        {t('staff.list.addButton')}
                    </Button>
                }
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('staff.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={roleFilter}
                                onValueChange={(v) => table.resetTo(() => setRoleFilter(v))}>
                                <SelectTrigger aria-label={t('staff.list.allRoles')} className="w-full sm:w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_ROLES}>{t('staff.list.allRoles')}</SelectItem>
                                    <SelectItem value={ERole.STAFF}>STAFF</SelectItem>
                                    <SelectItem value={ERole.ADMIN}>ADMIN</SelectItem>
                                    <SelectItem value={ERole.SUPER_ADMIN}>SUPER_ADMIN</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={branchFilter}
                                onValueChange={(v) => table.resetTo(() => setBranchFilter(v))}>
                                <SelectTrigger aria-label={t('staff.list.allBranches')} className="w-full sm:w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_BRANCHES}>{t('staff.list.allBranches')}</SelectItem>
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
                    unitLabel={t('staff.list.resultLabel')}
                    emptyState={t('staff.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <StaffFormDialog
                    open={formStaff !== null}
                    onOpenChange={(open) => !open && setFormStaff(null)}
                    staff={formStaff === 'new' || formStaff === null ? null : formStaff}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <StaffDetailModal
                    staff={detailStaff}
                    onOpenChange={(open) => !open && setDetailStaff(null)}
                    onSave={handleUpdate}
                />

                <AssignRoleDialog
                    staff={assignRoleStaff}
                    onOpenChange={(open) => !open && setAssignRoleStaff(null)}
                    onSubmit={handleAssignRole}
                />

                <ResetPasswordDialog
                    staff={resetPasswordStaff}
                    onOpenChange={(open) => !open && setResetPasswordStaff(null)}
                    onConfirm={handleResetPassword}
                />

                <ConfirmDialog
                    open={toggleStatusStaff !== null}
                    onOpenChange={(open) => !open && setToggleStatusStaff(null)}
                    title={isLocking ? t('staff.lockConfirm.title') : t('staff.unlockConfirm.title')}
                    description={
                        isLocking
                            ? t('staff.lockConfirm.description', { name: toggleStatusStaff?.fullName })
                            : t('staff.unlockConfirm.description', { name: toggleStatusStaff?.fullName })
                    }
                    variant={isLocking ? 'destructive' : 'default'}
                    confirmLabel={
                        isLocking ? t('staff.lockConfirm.submit') : t('staff.unlockConfirm.submit')
                    }
                    auditLogged
                    onConfirm={handleToggleStatus}
                />

                <ConfirmDialog
                    open={deleteStaff !== null}
                    onOpenChange={(open) => !open && setDeleteStaff(null)}
                    title={t('staff.deleteConfirm.title')}
                    description={t('staff.deleteConfirm.description', { name: deleteStaff?.fullName })}
                    variant="destructive"
                    confirmLabel={t('staff.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />
            </div>
        </>
    )
}
