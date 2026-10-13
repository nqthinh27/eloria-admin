import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { postApi } from '@/api/cms'
import { toastSuccess } from '@/lib/toast'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import {
    POST_STATUSES,
    POST_TYPES,
    type PostListItem,
    type PostPayload,
    type PostStatus,
    type PostStatusPayload,
    type PostType,
} from '@/types/cms'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { buildPostColumns } from './components/post-columns'
import { PostFormDialog } from './components/post-form-dialog'
import { PostPreviewDialog } from './components/post-preview-dialog'
import { PostStatusDialog } from './components/post-status-dialog'

const ALL = 'ALL'
const PAGE_SIZE = 10
const DEFAULT_SORT = ['createdDate,DESC']

/**
 * Màn "Bài viết" — **chỉ SUPER_ADMIN** (Phase 20; mọi `/post/*` đều `[SUPER_ADMIN]` kể cả
 * đọc, backend P15). Không có mockup ⇒ pattern list chuẩn (CONVENTIONS 6.2).
 *
 * Loại (`type`) chỉ là chủ đề bài viết, lọc bằng bộ lọc Loại. Trạng thái (Nháp / Đã lên lịch /
 * Đã đăng / Đã gỡ) là lifecycle riêng, **không** phải bật/tắt 1/0.
 */
export default function PostListPage() {
    const { t } = useTranslation(['post', 'common'])

    const [data, setData] = useState<PostListItem[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>(ALL)
    const [statusFilter, setStatusFilter] = useState<string>(ALL)

    // Ngày tạo ẩn sẵn: đã có NGÀY ĐĂNG, tránh bảng quá rộng (CONVENTIONS 5.6).
    const table = useTableState([], { createdDate: false })
    const { page, setPage, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    const [formPost, setFormPost] = useState<PostListItem | null | 'new'>(null)
    const [previewPost, setPreviewPost] = useState<PostListItem | null>(null)
    const [statusPost, setStatusPost] = useState<PostListItem | null>(null)
    const [deletePost, setDeletePost] = useState<PostListItem | null>(null)

    const columns = useMemo(
        () =>
            buildPostColumns(t, {
                onPreview: setPreviewPost,
                onEdit: setFormPost,
                onChangeStatus: setStatusPost,
                onDelete: setDeletePost,
            }),
        [t],
    )

    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await postApi.search(
                    {
                        keyword: keyword || undefined,
                        type: typeFilter === ALL ? undefined : (typeFilter as PostType),
                        postStatus: statusFilter === ALL ? undefined : (statusFilter as PostStatus),
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
        [page, keyword, typeFilter, statusFilter, sorting, columns],
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

    const handleCreate = async (payload: PostPayload) => {
        const created = await postApi.create(payload)
        toastSuccess('post.toast.created', { ns: 'post' })
        await reload()
        return created
    }

    const handleUpdate = async (id: string, payload: PostPayload) => {
        const updated = await postApi.update(id, payload)
        toastSuccess('post.toast.updated', { ns: 'post' })
        await reload()
        return updated
    }

    const handleStatus = async (payload: PostStatusPayload) => {
        await postApi.updateStatus(payload)
        toastSuccess('post.toast.statusUpdated', { ns: 'post' })
        await reload()
    }

    const handleDelete = async () => {
        if (!deletePost) return
        await postApi.remove(deletePost.id)
        toastSuccess('post.toast.deleted', { ns: 'post' })
        // Xoá dòng cuối của trang cuối ⇒ lùi một trang (đổi `page` đã tự kéo theo `load`).
        if (data.length === 1 && page > 1) setPage(page - 1)
        else await reload()
    }

    return (
        <>
            <PageHeader
                title={t('post.pageTitle')}
                description={t('post.pageDescription')}
                actions={
                    <Button onClick={() => setFormPost('new')}>
                        <Plus />
                        {t('post.list.addButton')}
                    </Button>
                }
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(value) => table.resetTo(() => setKeyword(value))}
                    searchPlaceholder={t('post.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select value={typeFilter} onValueChange={(v) => table.resetTo(() => setTypeFilter(v))}>
                                <SelectTrigger aria-label={t('post.list.allTypes')} className="w-full sm:w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('post.list.allTypes')}</SelectItem>
                                    {POST_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {t(`post.type.${type}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                                <SelectTrigger aria-label={t('post.list.allStatuses')} className="w-full sm:w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('post.list.allStatuses')}</SelectItem>
                                    {POST_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {t(`post.status.${status}`)}
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
                    unitLabel={t('post.list.resultLabel')}
                    emptyState={t('post.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <PostFormDialog
                    open={formPost !== null}
                    onOpenChange={(open) => !open && setFormPost(null)}
                    post={formPost === 'new' || formPost === null ? null : formPost}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    onMediaChanged={() => void reload()}
                />

                <PostPreviewDialog post={previewPost} onOpenChange={(open) => !open && setPreviewPost(null)} />

                <PostStatusDialog
                    post={statusPost}
                    onOpenChange={(open) => !open && setStatusPost(null)}
                    onSubmit={handleStatus}
                />

                <ConfirmDialog
                    open={deletePost !== null}
                    onOpenChange={(open) => !open && setDeletePost(null)}
                    title={t('post.deleteConfirm.title')}
                    description={t('post.deleteConfirm.description', { name: deletePost?.title })}
                    variant="destructive"
                    confirmLabel={t('post.deleteConfirm.submit')}
                    auditLogged
                    onConfirm={handleDelete}
                />
            </div>
        </>
    )
}
