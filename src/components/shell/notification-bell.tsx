import { useEffect, useRef, useState } from 'react'
import { enUS, vi } from 'date-fns/locale'
import { Bell, Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/use-notifications'
import { formatNotificationTime } from '@/lib/notification-time'
import { badgeLabel } from '@/lib/notification-state'
import { isNotificationSoundEnabled, setNotificationSoundEnabled } from '@/lib/notification-sound'
import { cn } from '@/lib/utils'
import type { NotificationRes } from '@/types/notification'
import { NotificationIcon } from './notification-icon'

/**
 * Quả chuông thông báo (Phase 25 · backend Phase 18b). Hiển thị `title`/`content` **nguyên văn**
 * — server đã render tiếng Việt theo từng người nhận, UI EN vẫn hiện nội dung VI.
 */
export function NotificationBell() {
    const { t, i18n } = useTranslation('menu')
    const navigate = useNavigate()
    const {
        badge,
        items,
        hasMore,
        loaded,
        open,
        loadingFirst,
        loadingMore,
        error,
        setOpen,
        loadFirstPage,
        loadMore,
        select,
    } = useNotifications()

    const label = badgeLabel(badge)
    const [soundOn, setSoundOn] = useState(isNotificationSoundEnabled)
    const toggleSound = () => {
        setNotificationSoundEnabled(!soundOn)
        setSoundOn(!soundOn)
    }
    const scrollRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)

    /*
     * Cuộn vô hạn bằng IntersectionObserver (không thêm thư viện). Tạo lại observer mỗi khi số dòng
     * đổi: nếu sau khi tải thêm mà sentinel VẪN còn trong khung nhìn thì observer mới bắn ngay, nhờ
     * đó danh sách ngắn hơn khung vẫn tự tải tiếp cho tới `hasMore = false`.
     */
    useEffect(() => {
        const sentinel = sentinelRef.current
        const root = scrollRef.current
        if (!open || !sentinel || !root || !hasMore || loadingMore || loadingFirst || error) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) void loadMore()
            },
            { root, rootMargin: '0px 0px 80px 0px' },
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [open, hasMore, loadingMore, loadingFirst, error, items.length, loadMore])

    const dateLocale = i18n.language === 'en' ? enUS : vi

    const handleSelect = async (item: NotificationRes) => {
        const target = await select(item)
        // Không có màn đích (vd PAYMENT_UNMATCHED) hoặc thông báo đã mất ⇒ ở lại danh sách.
        if (!target) return
        setOpen(false)
        navigate(target)
    }

    const showSkeleton = (loadingFirst && items.length === 0) || (!loaded && !error)
    const showEmpty = loaded && !loadingFirst && !error && items.length === 0

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9"
                    title={t('shell.notifications')}
                    aria-label={
                        label ? t('shell.notificationsUnread', { count: badge }) : t('shell.notifications')
                    }>
                    <Bell className="size-4.5" />
                    {label && (
                        <span
                            aria-hidden="true"
                            className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold">
                            {label}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
                <div className="flex items-center justify-between border-b px-4 py-2">
                    <span className="text-sm font-semibold">{t('shell.notifications')}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={toggleSound}
                        title={soundOn ? t('shell.notificationsSoundOff') : t('shell.notificationsSoundOn')}
                        aria-label={
                            soundOn ? t('shell.notificationsSoundOff') : t('shell.notificationsSoundOn')
                        }
                        aria-pressed={soundOn}>
                        {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                    </Button>
                </div>

                <div ref={scrollRef} className="max-h-[min(28rem,70vh)] overflow-y-auto">
                    {showSkeleton ? (
                        <div className="space-y-3 p-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="space-y-1.5">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            ))}
                        </div>
                    ) : error && items.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-sm">
                            {t('shell.notificationsLoadError')}
                            <Button variant="outline" size="sm" onClick={() => void loadFirstPage()}>
                                {t('shell.notificationsRetry')}
                            </Button>
                        </div>
                    ) : showEmpty ? (
                        <p className="text-muted-foreground p-6 text-center text-sm">
                            {t('shell.notificationsEmpty')}
                        </p>
                    ) : (
                        <ul>
                            {items.map((item) => (
                                <li key={item.id} className="border-b last:border-b-0">
                                    <button
                                        type="button"
                                        onClick={() => void handleSelect(item)}
                                        className={cn(
                                            'hover:bg-accent focus-visible:bg-accent flex w-full items-start gap-2.5 px-4 py-3 text-left outline-hidden transition-colors',
                                            !item.read && 'bg-primary/5',
                                        )}>
                                        <NotificationIcon type={item.type} />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    'block text-sm',
                                                    item.read ? 'font-medium' : 'font-semibold',
                                                )}>
                                                {!item.read && (
                                                    <span
                                                        className="bg-primary mr-1.5 inline-block size-2 rounded-full align-middle"
                                                        title={t('shell.notificationsUnreadDot')}
                                                    />
                                                )}
                                                {item.title}
                                            </span>
                                            <span className="text-muted-foreground mt-0.5 block text-sm break-words">
                                                {item.content}
                                            </span>
                                            <span className="text-muted-foreground/80 mt-1 block text-xs">
                                                {formatNotificationTime(item.createdDate, dateLocale)}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {hasMore && !error && <div ref={sentinelRef} className="h-px" />}
                    {loadingMore && (
                        <div className="space-y-1.5 p-4">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    )}
                    {error && items.length > 0 && (
                        <div className="flex justify-center p-3">
                            <Button variant="outline" size="sm" onClick={() => void loadMore()}>
                                {t('shell.notificationsRetry')}
                            </Button>
                        </div>
                    )}
                    {loaded && !hasMore && !error && items.length > 0 && (
                        <p className="text-muted-foreground p-3 text-center text-xs">
                            {t('shell.notificationsEnd')}
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

/** Hiện khi `NotificationBell` gặp lỗi render (xem `ErrorBoundary` ở `AppTopbar`): chuông tĩnh, không hoạt động. */
export function NotificationBellFallback() {
    const { t } = useTranslation('menu')
    return (
        <Button variant="ghost" size="icon" className="size-9" disabled aria-label={t('shell.notifications')}>
            <Bell className="size-4.5" />
        </Button>
    )
}
