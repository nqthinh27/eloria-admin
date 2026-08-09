import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Boxes, MoreHorizontal, Pencil, Plus, Power, Trash2 } from 'lucide-react'

import { categoryApi } from '@/api/product'
import { toastSuccess } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { EntityStatus, ERole } from '@/types/common'
import type { Category, CategoryPayload } from '@/types/product'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CategoryFormDialog } from './components/category-form-dialog'

const ALL_LEVELS = 'ALL'
const PAGE_SIZE = 10
/** Trần số danh mục nạp một lần. Vượt ngưỡng này phải chuyển sang phân trang phía server. */
const MAX_CATEGORIES = 200

/**
 * Màn "Danh mục sản phẩm" theo `12-danh-muc-sp.png` — PLAN Phase 9. Chạy trên **API thật**.
 *
 * ⚠️ **Lệch có chủ đích so với mockup**: mockup có 3 cột SỐ SẢN PHẨM · THƯƠNG HIỆU · BỘ SƯU TẬP,
 * nhưng `CategoryResDTO` **không có** các số đếm này và backend cũng không có API bộ sưu tập.
 * Thay bằng THỨ TỰ · TRẠNG THÁI (field thật của DTO). Xem PLAN Phase 9.
 */
export default function CategoryListPage() {
    const { t } = useTranslation(['product', 'common'])
    const { user } = useAuth()
    /** Toàn bộ API ghi của nhóm sản phẩm là `[SUPER_ADMIN]` — ADMIN gọi cũng 403. */
    const canWrite = hasRole(user?.role, ERole.SUPER_ADMIN)

    const [allCategories, setAllCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [levelFilter, setLevelFilter] = useState<string>(ALL_LEVELS)

    const [formCategory, setFormCategory] = useState<Category | null | 'new'>(null)
    const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
    const [statusCategory, setStatusCategory] = useState<Category | null>(null)

    /*
     * Nạp **một lần** toàn bộ cây danh mục rồi tự lọc + phân trang phía client.
     *
     * Trước đây màn này gọi 2 API cho cùng một bảng: `size=10` cho bảng và `size=200` cho dropdown
     * "danh mục cha" — lãng phí (user báo 2026-08-09). Cây danh mục nhỏ (hàng chục mục) nên nạp
     * trọn một lần là đủ, và còn sửa được 2 khuyết điểm của cách cũ:
     *   - Bộ lọc cấp (gốc/con) trước đây chỉ lọc trong **10 dòng của trang hiện tại** ⇒ sai số tổng;
     *     giờ lọc trên toàn bộ cây nên số trang và tổng luôn đúng.
     *   - Tìm kiếm cũng không cần gọi lại API mỗi lần gõ.
     * Nếu sau này danh mục vượt `MAX_CATEGORIES` thì phải chuyển lại sang phân trang phía server.
     */
    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(false)
        try {
            const result = await categoryApi.search(
                {},
                { page: 1, size: MAX_CATEGORIES, sort: ['code,ASC'] },
                signal,
            )
            setAllCategories(result.data)
        } catch {
            // Request bị huỷ (unmount / StrictMode remount) không phải lỗi thật.
            if (signal?.aborted) return
            setError(true)
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }, [])

    /* Huỷ request khi unmount — tránh set state trên component đã gỡ và bỏ request thừa. */
    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    /*
     * Lọc keyword + cấp, rồi cắt trang — tất cả phía client trên dữ liệu đã nạp.
     * `CategorySearchReqDTO` chỉ có `parentId` (lọc theo 1 cha cụ thể), không có tham số
     * "chỉ lấy gốc"/"chỉ lấy con" nên phần lọc cấp vốn đã phải làm ở client.
     */
    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        return allCategories.filter((c) => {
            if (levelFilter === 'ROOT' && c.level !== 0) return false
            if (levelFilter === 'CHILD' && c.level === 0) return false
            if (!kw) return true
            return c.name.toLowerCase().includes(kw) || c.code.toLowerCase().includes(kw)
        })
    }, [allCategories, keyword, levelFilter])

    const total = filtered.length
    const visibleData = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page],
    )

    /* Xoá/lọc xong có thể rơi vào trang trống (ví dụ đang ở trang 3 mà chỉ còn 1 trang). */
    useEffect(() => {
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
        if (page > lastPage) setPage(lastPage)
    }, [total, page])

    const handleSearchChange = (value: string) => {
        setKeyword(value)
        setPage(1)
    }

    const reload = load

    const handleCreate = async (payload: CategoryPayload) => {
        await categoryApi.create(payload)
        toastSuccess('category.toast.created', { ns: 'product' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: CategoryPayload) => {
        await categoryApi.update(id, payload)
        toastSuccess('category.toast.updated', { ns: 'product' })
        await reload()
    }

    const handleDelete = async () => {
        if (!deleteCategory) return
        await categoryApi.remove(deleteCategory.id)
        toastSuccess('category.toast.deleted', { ns: 'product' })
        await reload()
    }

    const handleToggleStatus = async () => {
        if (!statusCategory) return
        const next =
            statusCategory.status === EntityStatus.ACTIVE
                ? EntityStatus.INACTIVE
                : EntityStatus.ACTIVE
        await categoryApi.updateStatus(statusCategory.id, next)
        toastSuccess('category.toast.statusUpdated', { ns: 'product' })
        await reload()
    }

    /** Loại chính nó khỏi danh sách cha để tránh tự trỏ vào mình (backend cũng chặn). */
    const parentOptions = useMemo(() => {
        const editing = formCategory === 'new' || formCategory === null ? null : formCategory
        return allCategories.filter((c) => c.id !== editing?.id)
    }, [allCategories, formCategory])

    const columns: ColumnDef<Category, unknown>[] = [
        {
            id: 'code',
            header: t('category.list.column.code'),
            size: 110,
            cell: ({ row }) => (
                <span className="text-muted-foreground font-mono text-xs">{row.original.code}</span>
            ),
        },
        {
            id: 'name',
            header: t('category.list.column.name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Boxes className="size-4" />
                    </span>
                    <span className="font-medium">{row.original.name}</span>
                </div>
            ),
        },
        {
            id: 'parent',
            header: t('category.list.column.parent'),
            size: 180,
            cell: ({ row }) =>
                row.original.parentName ? (
                    <Badge variant="outline">{row.original.parentName}</Badge>
                ) : (
                    <span className="text-muted-foreground text-sm">
                        {t('category.list.noParent')}
                    </span>
                ),
        },
        {
            id: 'sortOrder',
            header: t('category.list.column.sortOrder'),
            size: 100,
            cell: ({ row }) => row.original.sortOrder ?? '—',
        },
        {
            id: 'status',
            header: t('category.list.column.status'),
            size: 140,
            cell: ({ row }) =>
                row.original.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('category.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('category.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            id: 'actions',
            header: t('category.list.column.actions'),
            size: 88,
            cell: ({ row }) => {
                const category = row.original
                if (!canWrite) return null
                const isActive = category.status === EntityStatus.ACTIVE
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            title={t('category.list.actionEdit')}
                            aria-label={t('category.list.actionEdit')}
                            onClick={() => setFormCategory(category)}>
                            <Pencil className="size-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label={t('category.list.column.actions')}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setStatusCategory(category)}>
                                    <Power className="size-4" />
                                    {isActive
                                        ? t('category.list.actionDeactivate')
                                        : t('category.list.actionActivate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setDeleteCategory(category)}>
                                    <Trash2 className="size-4" />
                                    {t('category.list.actionDelete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]

    const isDeactivating = statusCategory?.status === EntityStatus.ACTIVE

    return (
        <>
            <PageHeader title={t('category.pageTitle')} description={t('category.pageDescription')} />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('category.list.searchPlaceholder')}
                    filters={
                        <Select
                            value={levelFilter}
                            onValueChange={(v) => {
                                setLevelFilter(v)
                                setPage(1)
                            }}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL_LEVELS}>{t('category.list.allLevels')}</SelectItem>
                                <SelectItem value="ROOT">{t('category.list.levelRoot')}</SelectItem>
                                <SelectItem value="CHILD">{t('category.list.levelChild')}</SelectItem>
                            </SelectContent>
                        </Select>
                    }
                    actions={
                        canWrite && (
                            <Button onClick={() => setFormCategory('new')}>
                                <Plus />
                                {t('category.list.addButton')}
                            </Button>
                        )
                    }
                />

                <DataTable
                    columns={columns}
                    data={visibleData}
                    getRowId={(row) => row.id}
                    loading={loading}
                    error={error}
                    onRetry={load}
                    unitLabel={t('category.list.resultLabel')}
                    emptyState={t('category.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <CategoryFormDialog
                    open={formCategory !== null}
                    onOpenChange={(open) => !open && setFormCategory(null)}
                    category={
                        formCategory === 'new' || formCategory === null ? null : formCategory
                    }
                    parentOptions={parentOptions}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <ConfirmDialog
                    open={deleteCategory !== null}
                    onOpenChange={(open) => !open && setDeleteCategory(null)}
                    title={t('category.deleteConfirm.title')}
                    description={t('category.deleteConfirm.description', {
                        name: deleteCategory?.name,
                    })}
                    variant="destructive"
                    confirmLabel={t('category.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />

                <ConfirmDialog
                    open={statusCategory !== null}
                    onOpenChange={(open) => !open && setStatusCategory(null)}
                    title={
                        isDeactivating
                            ? t('category.statusConfirm.deactivateTitle')
                            : t('category.statusConfirm.activateTitle')
                    }
                    description={
                        isDeactivating
                            ? t('category.statusConfirm.deactivateDescription', {
                                  name: statusCategory?.name,
                              })
                            : t('category.statusConfirm.activateDescription', {
                                  name: statusCategory?.name,
                              })
                    }
                    variant={isDeactivating ? 'destructive' : 'default'}
                    auditLogged
                    onConfirm={handleToggleStatus}
                />
            </div>
        </>
    )
}
