import type { ColumnDef } from '@tanstack/react-table'
import { Lock, MoreHorizontal, Pencil, Trash2, Unlock } from 'lucide-react'
import type { TFunction } from 'i18next'

import { EntityStatus } from '@/types/common'
import type { Banner } from '@/types/cms'
import { formatDate } from '@/lib/format'
import { BannerThumb } from './banner-thumb'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type BannerColumnActions = {
    onEdit: (banner: Banner) => void
    onToggleStatus: (banner: Banner) => void
    onDelete: (banner: Banner) => void
}

export type BannerPeriodState = 'always' | 'upcoming' | 'running' | 'expired'

/** Khoảng hiệu lực so với **bây giờ** (giờ máy) — chỉ để hiển thị, backend mới là nơi quyết định. */
export function bannerPeriodState(banner: Pick<Banner, 'effectiveFrom' | 'effectiveTo'>, now = Date.now()): BannerPeriodState {
    const from = banner.effectiveFrom ? new Date(banner.effectiveFrom).getTime() : null
    const to = banner.effectiveTo ? new Date(banner.effectiveTo).getTime() : null
    if (from === null && to === null) return 'always'
    if (from !== null && now < from) return 'upcoming'
    if (to !== null && now > to) return 'expired'
    return 'running'
}

/** Banner có hiện trên web không: ACTIVE + có ảnh + đang trong hiệu lực. */
export function isBannerVisible(banner: Banner, now = Date.now()): boolean {
    return (
        banner.status === EntityStatus.ACTIVE &&
        Boolean(banner.imageUrl) &&
        bannerPeriodState(banner, now) !== 'upcoming' &&
        bannerPeriodState(banner, now) !== 'expired'
    )
}

const PERIOD_TONE: Record<BannerPeriodState, StatusTone> = {
    always: 'muted',
    upcoming: 'info',
    running: 'success',
    expired: 'danger',
}

/**
 * Cột bảng Banner: STT · ẢNH · TIÊU ĐỀ · NÚT · THỨ TỰ · HIỆU LỰC · TRẠNG THÁI · THAO TÁC.
 *
 * Sort chỉ mở ở field thuộc **entity `Banner`** (title · sortOrder · effectiveFrom · status).
 * Ảnh/nút/thao tác khoá sort. Banner chưa có ảnh **không hiện trên web** dù ACTIVE ⇒ ghi chú ngay
 * dưới tiêu đề để admin không tưởng banner lỗi.
 */
export function buildBannerColumns(
    t: TFunction<['banner', 'common']>,
    actions: BannerColumnActions,
): ColumnDef<Banner, unknown>[] {
    return [
        {
            id: 'image',
            header: t('banner.list.column.image'),
            size: 130,
            enableSorting: false,
            meta: { columnLabel: t('banner.list.column.image') },
            cell: ({ row }) => <BannerThumb url={row.original.imageUrl} />,
        },
        {
            id: 'title',
            header: t('banner.list.column.title'),
            size: 300,
            enableHiding: false,
            meta: { sortField: 'title', columnLabel: t('banner.list.column.title') },
            cell: ({ row }) => (
                <div className="min-w-0">
                    <p className="truncate font-medium">{row.original.title}</p>
                    {row.original.subtitle && (
                        <p className="text-muted-foreground truncate text-xs">{row.original.subtitle}</p>
                    )}
                    {!row.original.imageUrl && (
                        <p className="text-xs text-amber-600">{t('banner.list.noImage')}</p>
                    )}
                </div>
            ),
        },
        {
            id: 'cta',
            header: t('banner.list.column.cta'),
            size: 200,
            enableSorting: false,
            meta: { columnLabel: t('banner.list.column.cta') },
            cell: ({ row }) =>
                row.original.ctaLabel || row.original.ctaUrl ? (
                    <div className="min-w-0">
                        <p className="truncate text-sm">{row.original.ctaLabel || t('banner.list.noValue')}</p>
                        <p className="text-muted-foreground truncate font-mono text-xs">
                            {row.original.ctaUrl || t('banner.list.noValue')}
                        </p>
                    </div>
                ) : (
                    t('banner.list.noValue')
                ),
        },
        {
            id: 'sortOrder',
            header: t('banner.list.column.sortOrder'),
            size: 90,
            meta: { sortField: 'sortOrder', columnLabel: t('banner.list.column.sortOrder'), align: 'center' },
            cell: ({ row }) => row.original.sortOrder ?? t('banner.list.noValue'),
        },
        {
            id: 'effectiveFrom',
            header: t('banner.list.column.period'),
            size: 210,
            meta: { sortField: 'effectiveFrom', columnLabel: t('banner.list.column.period') },
            cell: ({ row }) => {
                const { effectiveFrom, effectiveTo } = row.original
                const state = bannerPeriodState(row.original)
                return (
                    <div className="flex flex-col items-start gap-0.5">
                        <StatusBadge tone={PERIOD_TONE[state]}>{t(`banner.list.periodState.${state}`)}</StatusBadge>
                        {state !== 'always' && (
                            <span className="text-muted-foreground text-xs">
                                {effectiveFrom ? formatDate(effectiveFrom) : '…'} →{' '}
                                {effectiveTo ? formatDate(effectiveTo) : '…'}
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            id: 'status',
            header: t('banner.list.column.status'),
            size: 140,
            meta: { sortField: 'status', columnLabel: t('banner.list.column.status'), align: 'center' },
            cell: ({ row }) =>
                row.original.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('banner.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('banner.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            id: 'actions',
            header: t('banner.list.column.actions'),
            size: 64,
            enableHiding: false,
            enableSorting: false,
            meta: { columnLabel: t('banner.list.column.actions'), align: 'center' },
            cell: ({ row }) => {
                const banner = row.original
                const isActive = banner.status === EntityStatus.ACTIVE
                return (
                    <div className="flex items-center justify-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label={t('banner.list.column.actions')}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => actions.onEdit(banner)}>
                                    <Pencil className="size-4" />
                                    {t('banner.list.actionEdit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => actions.onToggleStatus(banner)}>
                                    {isActive ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                                    {isActive ? t('banner.list.actionDeactivate') : t('banner.list.actionActivate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(banner)}>
                                    <Trash2 className="size-4" />
                                    {t('banner.list.actionDelete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}
