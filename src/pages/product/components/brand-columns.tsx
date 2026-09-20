import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Lock, MoreHorizontal, Pencil, Trash2, Unlock } from 'lucide-react'
import type { TFunction } from 'i18next'

import { EntityStatus } from '@/types/common'
import type { Brand } from '@/types/product'
import { formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { BrandLogo } from './brand-logo'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type BrandColumnActions = {
    onViewDetail: (brand: Brand) => void
    onEdit: (brand: Brand) => void
    onToggleStatus: (brand: Brand) => void
    onDelete: (brand: Brand) => void
}

/**
 * Cột bảng Thương hiệu: STT · MÃ · THƯƠNG HIỆU · ĐỊA CHỈ · MÔ TẢ (ẩn sẵn) · TRẠNG THÁI · NGÀY TẠO ·
 * THAO TÁC. Không có mockup ⇒ dựng theo pattern list chuẩn (CONVENTIONS 6.2).
 *
 * Thứ tự **STT → MÃ → TÊN** (mục 5.6): `BrandResDTO` có `code` thật. Cột STT do `DataTable` tự chèn.
 *
 * Sort: `BrandResDTO` **trùng entity** (docs/backend/README.md mục Sort) nên mọi field DTO đều sort
 * được; chỉ mở `code` · `name` · `address` · `status` · `createdDate`. `description` là đoạn văn dài,
 * sort vô nghĩa ⇒ khoá.
 *
 * Cột MÔ TẢ **ẩn sẵn**: văn bản dài tới 500 ký tự, đã có trong modal chi tiết.
 */
export function buildBrandColumns(
    t: TFunction<['brand', 'common']>,
    actions: BrandColumnActions,
): ColumnDef<Brand, unknown>[] {
    return [
        {
            id: 'code',
            header: t('brand.list.column.code'),
            size: 130,
            enableHiding: false,
            meta: { sortField: 'code', columnLabel: t('brand.list.column.code') },
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
        },
        {
            id: 'name',
            header: t('brand.list.column.name'),
            size: 260,
            enableHiding: false,
            meta: { sortField: 'name', columnLabel: t('brand.list.column.name') },
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <BrandLogo brand={row.original} />
                    <p className="truncate font-medium">{row.original.name}</p>
                </div>
            ),
        },
        {
            id: 'address',
            header: t('brand.list.column.address'),
            size: 240,
            meta: { sortField: 'address', columnLabel: t('brand.list.column.address') },
            cell: ({ row }) => (
                <span className="truncate">{row.original.address || t('brand.list.noValue')}</span>
            ),
        },
        {
            id: 'description',
            header: t('brand.list.column.description'),
            size: 280,
            enableSorting: false,
            meta: { columnLabel: t('brand.list.column.description') },
            cell: ({ row }) => (
                <span className="text-muted-foreground line-clamp-2">
                    {row.original.description || t('brand.list.noValue')}
                </span>
            ),
        },
        {
            id: 'status',
            header: t('brand.list.column.status'),
            size: 140,
            meta: { sortField: 'status', columnLabel: t('brand.list.column.status'), align: 'center' },
            cell: ({ row }) =>
                row.original.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('brand.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('brand.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            id: 'createdDate',
            header: t('brand.list.column.createdDate'),
            size: 110,
            meta: { sortField: 'createdDate', columnLabel: t('brand.list.column.createdDate') },
            cell: ({ row }) => formatDate(row.original.createdDate),
        },
        {
            id: 'actions',
            header: t('brand.list.column.actions'),
            size: 88,
            enableHiding: false,
            enableSorting: false,
            meta: { columnLabel: t('brand.list.column.actions'), align: 'center' },
            cell: ({ row }) => {
                const brand = row.original
                const isActive = brand.status === EntityStatus.ACTIVE
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            title={t('common:action.detail')}
                            aria-label={t('common:action.detail')}
                            onClick={() => actions.onViewDetail(brand)}>
                            <Eye className="size-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label={t('brand.list.column.actions')}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => actions.onEdit(brand)}>
                                    <Pencil className="size-4" />
                                    {t('brand.list.actionEdit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => actions.onToggleStatus(brand)}>
                                    {isActive ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                                    {isActive
                                        ? t('brand.list.actionDeactivate')
                                        : t('brand.list.actionActivate')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => actions.onDelete(brand)}>
                                    <Trash2 className="size-4" />
                                    {t('brand.list.actionDelete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}
