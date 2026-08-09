import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, MapPin, MoreHorizontal, Pencil, Plus, Trash2, Unlock } from 'lucide-react'

import { branchApi } from '@/api/branch'
import { useBranch } from '@/hooks/use-branch'
import { toastSuccess } from '@/lib/toast'
import { EntityStatus, ERole } from '@/types/common'
import type { Branch } from '@/types/branch'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Can } from '@/components/can'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BranchFormDialog } from './components/branch-form-dialog'

/** Màn "Chi nhánh" — mục menu riêng trong nhóm HỆ THỐNG, card grid theo `08-chi-nhanh.png`. */
export default function BranchListPage() {
    const { t } = useTranslation(['staff', 'common'])

    /*
     * Lấy danh sách từ `BranchProvider` (nguồn duy nhất, tránh gọi `branch/search` 2 lần trong
     * cùng màn) NHƯNG **luôn nạp lại khi vào màn** — người dùng khác có thể vừa thêm/sửa chi nhánh,
     * dùng lại dữ liệu provider đã nạp từ lúc đăng nhập sẽ hiển thị **dữ liệu cũ**
     * (đã tái hiện được: admin khác thêm chi nhánh, quay lại màn vẫn thấy số cũ — user cảnh báo
     * 2026-08-09). Nạp lại 1 lần/1 lần vào màn, không phải mỗi lần render.
     */
    const { branches, loading, refresh: load } = useBranch()

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    const [keyword, setKeyword] = useState('')
    const [formBranch, setFormBranch] = useState<Branch | null | 'new'>(null)
    const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null)
    const [toggleStatusBranch, setToggleStatusBranch] = useState<Branch | null>(null)

    const filtered = branches.filter((b) =>
        b.name.toLowerCase().includes(keyword.trim().toLowerCase()),
    )

    const handleCreate = async (payload: Parameters<typeof branchApi.create>[0]) => {
        await branchApi.create(payload)
        toastSuccess('staff.branch.toast.created', { ns: 'staff' })
        await load()
    }

    const handleUpdate = async (id: string, payload: Parameters<typeof branchApi.update>[1]) => {
        await branchApi.update(id, payload)
        toastSuccess('staff.branch.toast.updated', { ns: 'staff' })
        await load()
    }

    const handleDelete = async () => {
        if (!deleteBranch) return
        await branchApi.remove(deleteBranch.id)
        toastSuccess('staff.branch.toast.deleted', { ns: 'staff' })
        await load()
    }

    const handleToggleStatus = async () => {
        if (!toggleStatusBranch) return
        const nextStatus =
            toggleStatusBranch.status === EntityStatus.ACTIVE
                ? EntityStatus.INACTIVE
                : EntityStatus.ACTIVE
        await branchApi.updateStatus(toggleStatusBranch.id, nextStatus)
        toastSuccess('staff.branch.toast.statusUpdated', { ns: 'staff' })
        await load()
    }

    return (
        <>
            <PageHeader
                title={t('staff.branch.pageTitle')}
                description={t('staff.branch.pageDescription')}
            />

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder={t('staff.branch.searchPlaceholder')}
                        className="sm:max-w-xs"
                    />
                    <Can minRole={ERole.SUPER_ADMIN}>
                        <Button onClick={() => setFormBranch('new')}>
                            <Plus />
                            {t('staff.branch.addButton')}
                        </Button>
                    </Can>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-44 rounded-xl" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <Card className="text-muted-foreground py-16 text-center text-sm">
                        {t('staff.branch.empty')}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((branch) => (
                            <Card key={branch.id} className="gap-3 p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold">{branch.name}</h3>
                                    {branch.status === EntityStatus.ACTIVE ? (
                                        <StatusBadge tone="success">
                                            {t('staff.branch.statusOpen')}
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge tone="muted">
                                            {t('staff.branch.statusClosed')}
                                        </StatusBadge>
                                    )}
                                </div>
                                {branch.address && (
                                    <p className="text-muted-foreground flex items-start gap-1.5 text-sm">
                                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                                        <span>
                                            {branch.address}
                                            {branch.wardName ? `, ${branch.wardName}` : ''}
                                            {branch.provinceName ? `, ${branch.provinceName}` : ''}
                                        </span>
                                    </p>
                                )}

                                <div className="mt-1 grid grid-cols-1 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground text-xs">
                                            {t('staff.branch.staffCountLabel')}
                                        </p>
                                        <p className="font-medium">{branch.staffCount}</p>
                                    </div>
                                </div>

                                <div className="mt-2 flex items-center gap-2">
                                    <Can minRole={ERole.ADMIN}>
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => setFormBranch(branch)}>
                                            <Pencil />
                                            {t('staff.branch.edit')}
                                        </Button>
                                    </Can>
                                    <Can minRole={ERole.SUPER_ADMIN}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={t('staff.branch.deleteConfirm.title')}>
                                                    <MoreHorizontal className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onSelect={() => setToggleStatusBranch(branch)}>
                                                    {branch.status === EntityStatus.ACTIVE ? (
                                                        <Lock className="size-4" />
                                                    ) : (
                                                        <Unlock className="size-4" />
                                                    )}
                                                    {branch.status === EntityStatus.ACTIVE
                                                        ? t('staff.branch.statusClosed')
                                                        : t('staff.branch.statusOpen')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onSelect={() => setDeleteBranch(branch)}>
                                                    <Trash2 className="size-4" />
                                                    {t('staff.branch.deleteConfirm.title')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </Can>
                                </div>
                            </Card>
                        ))}

                        <Can minRole={ERole.SUPER_ADMIN}>
                            <button
                                type="button"
                                onClick={() => setFormBranch('new')}
                                className="border-input text-muted-foreground hover:border-primary hover:text-primary flex min-h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium transition-colors">
                                <Plus className="size-5" />
                                {t('staff.branch.addCard')}
                            </button>
                        </Can>
                    </div>
                )}

                <BranchFormDialog
                    open={formBranch !== null}
                    onOpenChange={(open) => !open && setFormBranch(null)}
                    branch={formBranch === 'new' || formBranch === null ? null : formBranch}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <ConfirmDialog
                    open={deleteBranch !== null}
                    onOpenChange={(open) => !open && setDeleteBranch(null)}
                    title={t('staff.branch.deleteConfirm.title')}
                    description={t('staff.branch.deleteConfirm.description', {
                        name: deleteBranch?.name,
                    })}
                    variant="destructive"
                    confirmLabel={t('staff.branch.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />

                <ConfirmDialog
                    open={toggleStatusBranch !== null}
                    onOpenChange={(open) => !open && setToggleStatusBranch(null)}
                    title={
                        toggleStatusBranch?.status === EntityStatus.ACTIVE
                            ? t('staff.branch.statusToggle.closeTitle')
                            : t('staff.branch.statusToggle.openTitle')
                    }
                    description={t('staff.branch.statusToggle.description', {
                        name: toggleStatusBranch?.name,
                    })}
                    variant={
                        toggleStatusBranch?.status === EntityStatus.ACTIVE ? 'destructive' : 'default'
                    }
                    auditLogged
                    onConfirm={handleToggleStatus}
                />
            </div>
        </>
    )
}
