import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { postApi } from '@/api/cms'
import type { Post, PostListItem } from '@/types/cms'
import { PostPreview, StorePreviewDialog } from './store-preview'

/**
 * Xem trước bài **đã lưu** từ danh sách (D5): storefront chỉ trả bài PUBLISHED nên nháp/hẹn giờ không có
 * trang để mở. Dựng bằng khung mô phỏng web dùng chung (`store-preview.tsx`) — cùng giao diện với nút
 * "Xem trước" trong form soạn bài.
 */
export function PostPreviewDialog({
    post,
    onOpenChange,
}: {
    post: PostListItem | null
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation(['post', 'common'])
    const [detail, setDetail] = useState<Post | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (!post) return
        setDetail(null)
        setFailed(false)
        const controller = new AbortController()
        postApi
            .getById(post.id, controller.signal)
            .then(setDetail)
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true)
            })
        return () => controller.abort()
    }, [post])

    return (
        <StorePreviewDialog open={post !== null} onOpenChange={onOpenChange} title={t('post:post.preview.title')}>
            {!detail && !failed && (
                <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    {t('post:post.form.loading')}
                </p>
            )}
            {failed && <p className="text-destructive p-6 text-sm">{t('post:post.preview.loadFailed')}</p>}
            {detail && (
                <PostPreview
                    typeLabel={t(`post:post.type.${detail.type}`)}
                    title={detail.title}
                    excerpt={detail.excerpt ?? ''}
                    coverUrl={detail.coverUrl}
                    coverFile={null}
                    content={detail.content ?? ''}
                />
            )}
        </StorePreviewDialog>
    )
}
