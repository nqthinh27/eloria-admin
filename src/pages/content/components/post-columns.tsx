import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import type { TFunction } from 'i18next'

import type { PostListItem, PostStatus } from '@/types/cms'
import { formatDate, formatDateTime } from '@/lib/format'
import { PostCover } from './post-cover'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type PostColumnActions = {
    onPreview: (post: PostListItem) => void
    onEdit: (post: PostListItem) => void
    onChangeStatus: (post: PostListItem) => void
    onDelete: (post: PostListItem) => void
}

const STATUS_TONE: Record<PostStatus, 'success' | 'muted' | 'warning' | 'info'> = {
    PUBLISHED: 'success',
    SCHEDULED: 'info',
    DRAFT: 'muted',
    UNPUBLISHED: 'warning',
}

/**
 * Cột bảng Bài viết: STT · ẢNH · TIÊU ĐỀ · LOẠI · TRẠNG THÁI · NGÀY ĐĂNG · NGÀY TẠO · THAO TÁC.
 *
 * Sort chỉ mở ở field thuộc **entity `Post`** (title · type · postStatus · publishedAt ·
 * createdDate); `slug` nằm dưới tiêu đề nên không có cột riêng. Ảnh + thao tác khoá sort.
 *
 * `SCHEDULED`: bài hiện trên web ngay khi tới `publishedAt`; cron backend chỉ đổi nhãn sang
 * PUBLISHED vào đầu mỗi giờ (có thể trễ tới 1 giờ). ⇒ `SCHEDULED && publishedAt <= now` hiện là
 * "Đã đến giờ — đang xuất bản" (xanh), `> now` là "Đã lên lịch" (chờ). Nhãn lệch không phải lỗi.
 */
export function buildPostColumns(
    t: TFunction<['post', 'common']>,
    actions: PostColumnActions,
): ColumnDef<PostListItem, unknown>[] {
    return [
        {
            id: 'cover',
            header: t('post.list.column.cover'),
            size: 110,
            enableSorting: false,
            meta: { columnLabel: t('post.list.column.cover') },
            cell: ({ row }) => <PostCover url={row.original.coverUrl} title={row.original.title} />,
        },
        {
            id: 'title',
            header: t('post.list.column.title'),
            size: 340,
            enableHiding: false,
            meta: { sortField: 'title', columnLabel: t('post.list.column.title') },
            cell: ({ row }) => (
                <div className="min-w-0">
                    <p className="truncate font-medium">{row.original.title}</p>
                    <p className="text-muted-foreground truncate font-mono text-xs">/{row.original.slug}</p>
                </div>
            ),
        },
        {
            id: 'type',
            header: t('post.list.column.type'),
            size: 170,
            meta: { sortField: 'type', columnLabel: t('post.list.column.type') },
            cell: ({ row }) => t(`post.type.${row.original.type}`),
        },
        {
            id: 'postStatus',
            header: t('post.list.column.status'),
            size: 190,
            meta: { sortField: 'postStatus', columnLabel: t('post.list.column.status'), align: 'center' },
            cell: ({ row }) => {
                const { postStatus, publishedAt } = row.original
                const due =
                    postStatus === 'SCHEDULED' && publishedAt !== null && new Date(publishedAt).getTime() <= Date.now()
                return (
                    <div className="flex flex-col items-center gap-0.5">
                        {due ? (
                            <StatusBadge tone="success">{t('post.list.publishingNow')}</StatusBadge>
                        ) : (
                            <StatusBadge tone={STATUS_TONE[postStatus]}>{t(`post.status.${postStatus}`)}</StatusBadge>
                        )}
                        {postStatus === 'SCHEDULED' && !due && publishedAt && (
                            <span className="text-muted-foreground text-xs">
                                {t('post.list.scheduledWaiting', { time: formatDateTime(publishedAt) })}
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'publishedAt',
            header: t('post.list.column.publishedAt'),
            size: 150,
            meta: { sortField: 'publishedAt', columnLabel: t('post.list.column.publishedAt') },
            cell: ({ row }) =>
                row.original.publishedAt ? formatDateTime(row.original.publishedAt) : t('post.list.noValue'),
        },
        {
            id: 'createdDate',
            header: t('post.list.column.createdDate'),
            size: 110,
            meta: { sortField: 'createdDate', columnLabel: t('post.list.column.createdDate') },
            cell: ({ row }) => formatDate(row.original.createdDate),
        },
        {
            id: 'actions',
            header: t('post.list.column.actions'),
            size: 88,
            enableHiding: false,
            enableSorting: false,
            meta: { columnLabel: t('post.list.column.actions'), align: 'center' },
            cell: ({ row }) => {
                const post = row.original
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            title={t('post.list.actionPreview')}
                            aria-label={t('post.list.actionPreview')}
                            onClick={() => actions.onPreview(post)}>
                            <Eye className="size-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label={t('post.list.column.actions')}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => actions.onEdit(post)}>
                                    <Pencil className="size-4" />
                                    {t('post.list.actionEdit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => actions.onChangeStatus(post)}>
                                    <RefreshCw className="size-4" />
                                    {t('post.list.actionStatus')}
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(post)}>
                                    <Trash2 className="size-4" />
                                    {t('post.list.actionDelete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}
