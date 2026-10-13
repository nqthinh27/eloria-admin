import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { postApi } from '@/api/cms'
import type { Post, PostListItem } from '@/types/cms'
import { toDisplayHtml } from '@/lib/cms-html'
import { resolveImageSrc } from '@/lib/image-spec'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Xem trước **ngay trong admin** (D5): storefront chỉ trả bài PUBLISHED nên nháp/hẹn giờ không có
 * trang để mở. Nội dung đã được backend sanitize khi lưu ⇒ render thẳng bằng cùng bộ thẻ CSS
 * `cms-prose` với vùng soạn thảo.
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
        <Dialog open={post !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('post:post.preview.title')}</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground text-xs">{t('post:post.preview.note')}</p>

                {!detail && !failed && (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        {t('post:post.form.loading')}
                    </p>
                )}
                {failed && <p className="text-destructive text-sm">{t('post:post.preview.loadFailed')}</p>}

                {detail && (
                    <article className="space-y-4">
                        {detail.coverUrl && (
                            <img
                                src={resolveImageSrc(detail.coverUrl)}
                                alt=""
                                className="aspect-video w-full rounded-md border object-cover"
                            />
                        )}
                        <h2 className="text-2xl font-semibold">{detail.title}</h2>
                        {detail.excerpt && <p className="text-muted-foreground italic">{detail.excerpt}</p>}
                        {detail.content ? (
                            <div
                                className="cms-prose"
                                // Nội dung đã sanitize phía backend khi lưu (whitelist h2–h4, p, ul/ol, a, img…).
                                dangerouslySetInnerHTML={{ __html: toDisplayHtml(detail.content) }}
                            />
                        ) : (
                            <p className="text-muted-foreground text-sm">{t('post:post.preview.empty')}</p>
                        )}
                    </article>
                )}
            </DialogContent>
        </Dialog>
    )
}
