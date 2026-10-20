import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { postApi } from '@/api/cms'
import { ApiError } from '@/lib/api-error'
import { toastError } from '@/lib/toast'
import { POST_STATUSES, type Post, type PostListItem, type PostStatus, type PostStatusPayload } from '@/types/cms'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateInput } from '@/components/date-input'

type PostStatusDialogProps = {
    /** `null` = đóng. */
    post: PostListItem | null
    onOpenChange: (open: boolean) => void
    onSubmit: (payload: PostStatusPayload) => Promise<void>
}

/** `yyyy-MM-dd` + `HH:mm` (giờ máy) → ISO UTC; không hợp lệ ⇒ `null`. */
function toIso(date: string, time: string): string | null {
    if (!date || !time) return null
    const value = new Date(`${date}T${time}:00`)
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

/**
 * Đổi trạng thái bài (`POST /post/update-status`): đăng ngay · hẹn giờ · gỡ · về nháp.
 *
 * Nạp **chi tiết** bài khi mở vì danh sách không mang `content`:
 * - chưa có nội dung ⇒ chặn PUBLISHED/SCHEDULED tại chỗ (backend trả `statusTransitionInvalid`).
 */
export function PostStatusDialog({ post: current, onOpenChange, onSubmit }: PostStatusDialogProps) {
    const { t } = useTranslation(['post', 'common'])
    const open = current !== null
    // Giữ bài gần nhất để nội dung không co lại trong lúc dialog đang mờ dần.
    const lastPost = useRef<PostListItem | null>(null)
    if (current) lastPost.current = current
    const post = current ?? lastPost.current

    const [detail, setDetail] = useState<Post | null>(null)
    const [loadFailed, setLoadFailed] = useState(false)
    const [target, setTarget] = useState<PostStatus | ''>('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [touched, setTouched] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    /** Lỗi backend gắn vào ô thời điểm đăng (`error.post.scheduleInvalid`). */
    const [serverScheduleError, setServerScheduleError] = useState<string | null>(null)

    useEffect(() => {
        if (!current) return
        const post = current
        setDetail(null)
        setLoadFailed(false)
        setTarget('')
        setDate('')
        setTime('')
        setTouched(false)
        setServerScheduleError(null)
        const controller = new AbortController()
        postApi
            .getById(post.id, controller.signal)
            .then(setDetail)
            .catch(() => {
                if (!controller.signal.aborted) setLoadFailed(true)
            })
        return () => controller.abort()
    }, [current])

    const hasContent = Boolean(detail?.content && detail.content.trim())

    const options = useMemo(
        () =>
            POST_STATUSES.filter(
                (status) =>
                    status !== post?.postStatus &&
                    // Bài nháp chưa từng đăng ⇒ không có gì để "gỡ".
                    !(post?.postStatus === 'DRAFT' && status === 'UNPUBLISHED'),
            ),
        [post?.postStatus],
    )

    const needContent = (status: PostStatus) =>
        (status === 'PUBLISHED' || status === 'SCHEDULED') && !hasContent

    const scheduledIso = target === 'SCHEDULED' ? toIso(date, time) : null
    const scheduleError = (() => {
        if (target === 'SCHEDULED' && serverScheduleError) return serverScheduleError
        if (target !== 'SCHEDULED' || !touched) return null
        if (!date) return t('post:post.statusDialog.validation.dateRequired')
        if (!time) return t('post:post.statusDialog.validation.timeRequired')
        if (!scheduledIso || new Date(scheduledIso).getTime() <= Date.now()) {
            return t('post:post.statusDialog.validation.future')
        }
        return null
    })()

    const handleSubmit = async () => {
        if (!post || !target) return
        setTouched(true)
        let publishedAt: string | undefined
        if (target === 'SCHEDULED') {
            const iso = toIso(date, time)
            if (!iso || new Date(iso).getTime() <= Date.now()) return
            publishedAt = iso
        }
        setSubmitting(true)
        setServerScheduleError(null)
        try {
            await onSubmit({ id: post.id, postStatus: target, publishedAt })
            onOpenChange(false)
        } catch (error) {
            // scheduleInvalid ⇒ hiện dưới ô thời điểm đăng; lỗi chuyển trạng thái chỉ toast. Giữ dialog mở.
            if (error instanceof ApiError && error.subKey === 'error.post.scheduleInvalid') {
                setServerScheduleError(error.message)
            } else if (error instanceof ApiError && !error.toasted) {
                toastError(error)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const blocked = !detail || !target || needContent(target as PostStatus)

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('post:post.statusDialog.title')}</DialogTitle>
                </DialogHeader>

                {post && (
                    <div className="space-y-4">
                        <div className="space-y-0.5">
                            <p className="text-muted-foreground text-xs">{t('post:post.statusDialog.current')}</p>
                            <p className="text-sm font-medium">
                                {post.title} — {t(`post:post.status.${post.postStatus}`)}
                            </p>
                        </div>

                        {!detail && !loadFailed && (
                            <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                <Loader2 className="size-4 animate-spin" />
                                {t('post:post.form.loading')}
                            </p>
                        )}
                        {loadFailed && <p className="text-destructive text-sm">{t('post:post.form.loadFailed')}</p>}

                        {detail && (
                            <>
                                <div className="space-y-1.5">
                                    <Label>
                                        {t('post:post.statusDialog.target')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={target}
                                        onValueChange={(value) => {
                                            setTarget(value as PostStatus)
                                            setTouched(false)
                                        }}>
                                        <SelectTrigger className="w-full" aria-label={t('post:post.statusDialog.target')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {options.map((status) => (
                                                <SelectItem key={status} value={status} disabled={needContent(status)}>
                                                    {t(`post:post.statusDialog.action.${status}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!hasContent && (
                                        <p className="text-muted-foreground text-xs">
                                            {t('post:post.statusDialog.needContent')}
                                        </p>
                                    )}
                                </div>

                                {target === 'SCHEDULED' && (
                                    <div className="space-y-2">
                                        <Label>
                                            {t('post:post.statusDialog.publishedAtLabel')}{' '}
                                            <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <span className="text-muted-foreground text-xs">
                                                    {t('post:post.statusDialog.date')}
                                                </span>
                                                <DateInput
                                                    value={date}
                                                    onChange={(value) => {
                                                        setDate(value)
                                                        setServerScheduleError(null)
                                                    }}
                                                    aria-invalid={touched && !date}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-muted-foreground text-xs">
                                                    {t('post:post.statusDialog.time')}
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={time}
                                                    aria-invalid={touched && Boolean(date) && Boolean(scheduleError)}
                                                    onChange={(event) => setTime(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        {scheduleError && <p className="text-destructive text-sm">{scheduleError}</p>}
                                        <p className="text-muted-foreground text-xs">
                                            {t('post:post.statusDialog.scheduleNote')}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button type="button" disabled={blocked || submitting} onClick={() => void handleSubmit()}>
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {t('post:post.statusDialog.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
