import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { staffApi } from '@/api/staff'
import { toastSuccess } from '@/lib/toast'
import { useBranch } from '@/hooks/use-branch'
import { EntityStatus, ERole } from '@/types/common'
import type { Staff } from '@/types/staff'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StaffFormDialog } from './components/staff-form-dialog'
import { StaffDetailModal } from './components/staff-detail-modal'
import { AssignRoleDialog } from './components/assign-role-dialog'
import { ResetPasswordDialog } from './components/reset-password-dialog'
import { buildStaffColumns } from './components/staff-columns'

const ALL_ROLES = 'ALL'
const ALL_BRANCHES = 'ALL'
const PAGE_SIZE = 10

/** Màn "Nhân viên" — mục menu riêng trong nhóm HỆ THỐNG, theo `07-nhan-vien.png`. */
export default function StaffListPage() {
    const { t } = useTranslation(['staff', 'common'])
    const { branches } = useBranch()

    const [data, setData] = useState<Staff[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>(ALL_ROLES)
    const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES)

    const [formStaff, setFormStaff] = useState<Staff | null | 'new'>(null)
    const [detailStaff, setDetailStaff] = useState<Staff | null>(null)
    const [assignRoleStaff, setAssignRoleStaff] = useState<Staff | null>(null)
    const [resetPasswordStaff, setResetPasswordStaff] = useState<Staff | null>(null)
    const [toggleStatusStaff, setToggleStatusStaff] = useState<Staff | null>(null)
    const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const result = await staffApi.search(
                {
                    keyword: keyword || undefined,
                    role: roleFilter === ALL_ROLES ? undefined : (roleFilter as ERole),
                    branchId: branchFilter === ALL_BRANCHES ? undefined : branchFilter,
                },
                { page, size: PAGE_SIZE },
            )
            setData(result.data)
            setTotal(result.total)
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [page, keyword, roleFilter, branchFilter])

    useEffect(() => {
        void load()
    }, [load])

    const handleSearchChange = (value: string) => {
        setKeyword(value)
        setPage(1)
    }

    const handleCreate = async (payload: Parameters<typeof staffApi.create>[0]) => {
        await staffApi.create(payload)
        toastSuccess('staff.toast.created', { ns: 'staff' })
        await load()
    }

    const handleUpdate = async (id: string, payload: Parameters<typeof staffApi.update>[1]) => {
        const updated = await staffApi.update(id, payload)
        toastSuccess('staff.toast.updated', { ns: 'staff' })
        setDetailStaff((current) => (current?.id === id ? updated : current))
        await load()
    }

    const handleAssignRole = async (role: ERole) => {
        if (!assignRoleStaff) return
        await staffApi.assignRole({ id: assignRoleStaff.id, role })
        toastSuccess('staff.toast.roleAssigned', { ns: 'staff' })
        await load()
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
        await load()
    }

    const handleDelete = async () => {
        if (!deleteStaff) return
        await staffApi.remove(deleteStaff.id)
        toastSuccess('staff.toast.deleted', { ns: 'staff' })
        await load()
    }

    const columns = buildStaffColumns(t, {
        onViewDetail: setDetailStaff,
        onEditFull: setFormStaff,
        onAssignRole: setAssignRoleStaff,
        onResetPassword: setResetPasswordStaff,
        onToggleStatus: setToggleStatusStaff,
        onDelete: setDeleteStaff,
    })

    const isLocking = toggleStatusStaff?.status === EntityStatus.ACTIVE

    return (
        <>
            <PageHeader title={t('staff.pageTitle')} description={t('staff.pageDescription')} />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('staff.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={roleFilter}
                                onValueChange={(v) => {
                                    setRoleFilter(v)
                                    setPage(1)
                                }}>
                                <SelectTrigger className="w-full sm:w-44">
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
                                onValueChange={(v) => {
                                    setBranchFilter(v)
                                    setPage(1)
                                }}>
                                <SelectTrigger className="w-full sm:w-48">
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
                    actions={
                        <Button onClick={() => setFormStaff('new')}>
                            <Plus />
                            {t('staff.list.addButton')}
                        </Button>
                    }
                />

                <DataTable
                    columns={columns}
                    data={data}
                    getRowId={(row) => row.id}
                    loading={loading}
                    error={error}
                    onRetry={load}
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
