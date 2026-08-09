import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Pencil } from 'lucide-react'
import type { TFunction } from 'i18next'

import { EntityStatus } from '@/types/common'
import type { Customer } from '@/types/customer'
import { formatDate, formatNumber } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type CustomerColumnActions = {
    onViewDetail: (customer: Customer) => void
    onEdit: (customer: Customer) => void
    /** ADMIN+ mới sửa được hồ sơ (`PUT /customer/{id}` là `[ADMIN]`). */
    canEdit: boolean
}

/**
 * Cột bảng Khách hàng — giữ đúng bố cục `10-khach-hang.png` (avatar tròn chữ cái đầu + tên,
 * dòng phụ mờ bên dưới; cột liên hệ SĐT trên/email dưới; THAO TÁC là icon con mắt bên phải).
 *
 * ⚠️ **Lệch có chủ đích so với mockup**: 4 cột PHÂN HẠNG · SỐ ĐƠN · TỔNG CHI TIÊU · LẦN CUỐI MUA
 * bị thay bằng CHI NHÁNH · ĐIỂM TÍCH LUỸ · TRẠNG THÁI · NGÀY TẠO. Lý do: `CustomerResDTO` thật
 * không có các field đó và backend chưa có entity đơn hàng nào để tính (xác nhận qua api-docs +
 * source + gọi API thật 2026-08-09) — user đã chốt phương án bám DTO thật. Khi Phase 12 có API
 * đơn hàng thì bổ sung lại cho khớp mockup.
 */
export function buildCustomerColumns(
    t: TFunction<['customer', 'common']>,
    actions: CustomerColumnActions,
): ColumnDef<Customer, unknown>[] {
    return [
        {
            id: 'customer',
            header: t('customer.list.column.customer'),
            cell: ({ row }) => {
                const customer = row.original
                const initial = customer.fullName.charAt(0).toUpperCase()
                return (
                    <div className="flex items-center gap-3">
                        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                            {initial}
                        </span>
                        <div className="min-w-0">
                            <p className="font-medium">{customer.fullName}</p>
                            <p className="text-muted-foreground text-xs">{customer.phoneNumber}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            id: 'contact',
            header: t('customer.list.column.contact'),
            size: 200,
            cell: ({ row }) => (
                <span className="text-muted-foreground text-sm">
                    {row.original.email ?? t('customer.list.noEmail')}
                </span>
            ),
        },
        {
            id: 'branch',
            header: t('customer.list.column.branch'),
            size: 160,
            cell: ({ row }) => row.original.branchName ?? t('customer.list.noBranch'),
        },
        {
            id: 'membershipPoint',
            header: t('customer.list.column.membershipPoint'),
            size: 130,
            cell: ({ row }) => formatNumber(row.original.membershipPoint ?? 0),
        },
        {
            id: 'status',
            header: t('customer.list.column.status'),
            size: 130,
            cell: ({ row }) =>
                row.original.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('customer.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('customer.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            id: 'createdDate',
            header: t('customer.list.column.createdDate'),
            size: 110,
            cell: ({ row }) => formatDate(row.original.createdDate),
        },
        {
            id: 'actions',
            header: t('customer.list.column.actions'),
            size: 88,
            cell: ({ row }) => {
                const customer = row.original
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            title={t('common:action.detail')}
                            aria-label={t('common:action.detail')}
                            onClick={() => actions.onViewDetail(customer)}>
                            <Eye className="size-4" />
                        </Button>
                        {/* Chỉ ADMIN+ có hành động phụ — STAFF không có gì trong menu nên ẩn hẳn nút. */}
                        {actions.canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 shrink-0"
                                        aria-label={t('customer.list.column.actions')}>
                                        <MoreHorizontal className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => actions.onEdit(customer)}>
                                        <Pencil className="size-4" />
                                        {t('customer.list.actionEdit')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )
            },
        },
    ]
}
