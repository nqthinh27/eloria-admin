import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Plus } from 'lucide-react'

import { bankAccountApi } from '@/api/bank-account'
import { toastSuccess } from '@/lib/toast'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import { EntityStatus } from '@/types/common'
import type { BankAccount, CreateBankAccountReq, UpdateBankAccountReq } from '@/types/bank-account'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { BankAccountFormDialog } from './components/bank-account-form-dialog'
import { BankAccountDetailModal } from './components/bank-account-detail-modal'
import { buildBankAccountColumns } from './components/bank-account-columns'

const ALL_STATUSES = 'ALL'
const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Giữ nguyên để thứ tự không đổi bất ngờ. */
const DEFAULT_SORT = ['createdDate,DESC']
/** Số TK tối đa nạp để kiểm tra "còn TK mặc định không" — chuỗi chỉ có vài TK; dưới trần `size` 200. */
const DEFAULT_CHECK_SIZE = 100

/**
 * Màn "Tài khoản ngân hàng" — **chỉ SUPER_ADMIN** (Phase 18). Không có mockup ⇒ pattern list chuẩn
 * (`04-don-hang`) + `DetailModal` như màn Nhân viên. Role khác không có menu/route; họ vẫn dùng TK
 * mặc định gián tiếp ở luồng thu QR.
 */
export default function BankAccountPage() {
    const { t } = useTranslation(['bankAccount', 'common'])

    const [data, setData] = useState<BankAccount[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES)
    /** `null` = chưa biết (đang nạp) ⇒ chưa hiện banner, tránh nháy cảnh báo sai. */
    const [hasDefault, setHasDefault] = useState<boolean | null>(null)

    /* Cột ẩn sẵn: không có — mọi cột đều là căn cứ nghiệp vụ, bảng chỉ có vài dòng. */
    const table = useTableState([], {})
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formAccount, setFormAccount] = useState<BankAccount | null | 'new'>(null)
    const [detailAccount, setDetailAccount] = useState<BankAccount | null>(null)
    const [setDefaultAccount, setSetDefaultAccount] = useState<BankAccount | null>(null)
    const [toggleAccount, setToggleAccount] = useState<BankAccount | null>(null)
    const [deleteAccount, setDeleteAccount] = useState<BankAccount | null>(null)

    const columns = useMemo(
        () =>
            buildBankAccountColumns(t, {
                onViewDetail: setDetailAccount,
                onEdit: setFormAccount,
                onSetDefault: setSetDefaultAccount,
                onToggleStatus: setToggleAccount,
                onDelete: setDeleteAccount,
            }),
        [t],
    )

    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await bankAccountApi.search(
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

    /**
     * Còn TK mặc định (đang bật) nào không — tính trên **toàn bộ** TK bật chứ không phải trang
     * hiện tại. Không dùng `GET /default` vì nó ném `noDefault` ⇒ toast lỗi mỗi lần vào màn.
     */
    const loadDefaultState = useCallback(async (signal?: AbortSignal) => {
        try {
            const result = await bankAccountApi.search(
                { status: EntityStatus.ACTIVE },
                { page: 1, size: DEFAULT_CHECK_SIZE },
                signal,
            )
            setHasDefault(result.data.some((account) => account.isDefault))
        } catch {
            // Không xác định được ⇒ không hiện banner (tránh cảnh báo sai); lỗi đã có toast/khung lỗi của bảng.
        }
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        void loadDefaultState(controller.signal)
        return () => controller.abort()
    }, [loadDefaultState])

    useEffect(() => {
        if (table.reloadNonce === 0) return
        const controller = new AbortController()
        void table.runRefresh(
            (signal) => Promise.all([load(signal, true), loadDefaultState(signal)]),
            controller.signal,
        )
        return () => controller.abort()
        // `load` cố ý không nằm trong dep: chỉ chạy khi người dùng bấm Tải lại.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table.reloadNonce])

    /** Ghi dữ liệu xong ⇒ nạp lại ngầm, **giữ nguyên** page/sort/filter (CONVENTIONS mục 5.1). */
    const reload = useCallback(
        () => Promise.all([load(undefined, true), loadDefaultState()]),
        [load, loadDefaultState],
    )

    const handleCreate = async (payload: CreateBankAccountReq) => {
        await bankAccountApi.create(payload)
        toastSuccess('bankAccount.toast.created', { ns: 'bankAccount' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: UpdateBankAccountReq) => {
        const updated = await bankAccountApi.update(id, payload)
        toastSuccess('bankAccount.toast.updated', { ns: 'bankAccount' })
        setDetailAccount((current) => (current?.id === id ? updated : current))
        await reload()
    }

    const handleSetDefault = async () => {
        if (!setDefaultAccount) return
        await bankAccountApi.setDefault(setDefaultAccount.id)
        toastSuccess('bankAccount.toast.defaultSet', { ns: 'bankAccount' })
        await reload()
    }

    const handleToggleStatus = async () => {
        if (!toggleAccount) return
        const next =
            toggleAccount.status === EntityStatus.ACTIVE ? EntityStatus.INACTIVE : EntityStatus.ACTIVE
        await bankAccountApi.updateStatus(toggleAccount.id, next)
        toastSuccess('bankAccount.toast.statusUpdated', { ns: 'bankAccount' })
        await reload()
    }

    const handleDelete = async () => {
        if (!deleteAccount) return
        await bankAccountApi.remove(deleteAccount.id)
        toastSuccess('bankAccount.toast.deleted', { ns: 'bankAccount' })
        // Xoá dòng cuối của trang cuối ⇒ lùi một trang (đổi `page` đã tự kéo theo `load`).
        if (data.length === 1 && page > 1) {
            setPage(page - 1)
            await loadDefaultState()
        } else await reload()
    }

    const isDisabling = toggleAccount?.status === EntityStatus.ACTIVE
    const nameParams = (account: BankAccount | null) => ({
        bank: account?.bankName,
        number: account?.accountNumber,
    })
    /** Backend không chặn tắt/xoá TK mặc định ⇒ FE báo trước hậu quả (PLAN Phase 18). */
    const loseDefaultNote = (account: BankAccount | null, willLose: boolean) =>
        account?.isDefault && willLose ? (
            <span className="text-destructive mt-2 block font-medium">
                {t('bankAccount.loseDefaultWarning')}
            </span>
        ) : null

    return (
        <>
            <PageHeader
                title={t('bankAccount.pageTitle')}
                description={t('bankAccount.pageDescription')}
                actions={
                    <Button onClick={() => setFormAccount('new')}>
                        <Plus />
                        {t('bankAccount.list.addButton')}
                    </Button>
                }
            />

            <div className="space-y-4">
                {hasDefault === false && (
                    <Alert variant="destructive">
                        <AlertTriangle />
                        <AlertTitle>{t('bankAccount.noDefaultBanner.title')}</AlertTitle>
                        <AlertDescription>{t('bankAccount.noDefaultBanner.description')}</AlertDescription>
                    </Alert>
                )}

                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(value) => table.resetTo(() => setKeyword(value))}
                    searchPlaceholder={t('bankAccount.list.searchPlaceholder')}
                    filters={
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                            <SelectTrigger
                                aria-label={t('bankAccount.list.allStatuses')}
                                className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_STATUSES}>{t('bankAccount.list.allStatuses')}</SelectItem>
                                <SelectItem value={String(EntityStatus.ACTIVE)}>
                                    {t('bankAccount.list.statusActive')}
                                </SelectItem>
                                <SelectItem value={String(EntityStatus.INACTIVE)}>
                                    {t('bankAccount.list.statusInactive')}
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
                    unitLabel={t('bankAccount.list.resultLabel')}
                    emptyState={t('bankAccount.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <BankAccountFormDialog
                    open={formAccount !== null}
                    onOpenChange={(open) => !open && setFormAccount(null)}
                    account={formAccount === 'new' || formAccount === null ? null : formAccount}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <BankAccountDetailModal
                    account={detailAccount}
                    onOpenChange={(open) => !open && setDetailAccount(null)}
                    onSave={handleUpdate}
                />

                <ConfirmDialog
                    open={setDefaultAccount !== null}
                    onOpenChange={(open) => !open && setSetDefaultAccount(null)}
                    title={t('bankAccount.setDefaultConfirm.title')}
                    description={t('bankAccount.setDefaultConfirm.description', nameParams(setDefaultAccount))}
                    confirmLabel={t('bankAccount.setDefaultConfirm.submit')}
                    auditLogged
                    onConfirm={handleSetDefault}
                />

                <ConfirmDialog
                    open={toggleAccount !== null}
                    onOpenChange={(open) => !open && setToggleAccount(null)}
                    title={isDisabling ? t('bankAccount.disableConfirm.title') : t('bankAccount.enableConfirm.title')}
                    description={
                        <>
                            {isDisabling
                                ? t('bankAccount.disableConfirm.description', nameParams(toggleAccount))
                                : t('bankAccount.enableConfirm.description', nameParams(toggleAccount))}
                            {loseDefaultNote(toggleAccount, isDisabling)}
                        </>
                    }
                    variant={isDisabling ? 'destructive' : 'default'}
                    confirmLabel={
                        isDisabling ? t('bankAccount.disableConfirm.submit') : t('bankAccount.enableConfirm.submit')
                    }
                    auditLogged
                    onConfirm={handleToggleStatus}
                />

                <ConfirmDialog
                    open={deleteAccount !== null}
                    onOpenChange={(open) => !open && setDeleteAccount(null)}
                    title={t('bankAccount.deleteConfirm.title')}
                    description={
                        <>
                            {t('bankAccount.deleteConfirm.description', nameParams(deleteAccount))}
                            {loseDefaultNote(deleteAccount, true)}
                        </>
                    }
                    variant="destructive"
                    confirmLabel={t('bankAccount.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />
            </div>
        </>
    )
}
