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
 *
 * ⚠️ **Sort phía server** (CONVENTIONS mục 5.2): `id` cột ở FE khác tên field backend nên phải khai
 * `meta.sortField`. Cột **CHI NHÁNH bị khoá sort** vì `branchName` chỉ có ở DTO, không phải cột
 * thật của `SysUser` — sort vào đó backend trả **500**, xem CLAUDE.md mục "Sort phía server".
 *
 * Thứ tự cột theo CONVENTIONS mục 5.6: **STT → định danh → tên**. `CustomerResDTO` **không có
 * `code`**, và `id` là UUID vô nghĩa với người dùng ⇒ trường định danh custom là **SĐT** — vừa là
 * khoá duy nhất thật (backend `existsByPhoneNumber` toàn cục), vừa là thứ nhân viên dùng để tra
 * khách ở quầy. Vì vậy SĐT được **tách khỏi** ô ghép tên+SĐT cũ thành cột riêng đứng trước cột tên.
 */
export function buildCustomerColumns(
    t: TFunction<['customer', 'common']>,
    actions: CustomerColumnActions,
): ColumnDef<Customer, unknown>[] {
    return [
        {
            id: 'phoneNumber',
            header: t('customer.list.column.phone'),
            size: 150,
            // Cột định danh (SĐT là khoá duy nhất của khách) — không cho ẩn, và được ghim khi cuộn.
            enableHiding: false,
            // `phoneNumber` là cột thật của `SysUser` ⇒ backend sort được.
            meta: { sortField: 'phoneNumber', columnLabel: t('customer.list.column.phone') },
            cell: ({ row }) => (
                <span className="font-mono text-xs">{row.original.phoneNumber}</span>
            ),
        },
        {
            id: 'customer',
            header: t('customer.list.column.customer'),
            size: 240,
            // Cột tên — không cho ẩn, người dùng sẽ không biết đang xem hồ sơ của ai.
            enableHiding: false,
            meta: { sortField: 'fullName', columnLabel: t('customer.list.column.customer') },
            cell: ({ row }) => {
                const customer = row.original
                const initial = customer.fullName.charAt(0).toUpperCase()
                return (
                    <div className="flex items-center gap-3">
                        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                            {initial}
                        </span>
                        <p className="truncate font-medium">{customer.fullName}</p>
                    </div>
                )
            },
        },
        {
            id: 'contact',
            header: t('customer.list.column.contact'),
            size: 200,
            meta: { sortField: 'email', columnLabel: t('customer.list.column.contact') },
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
            // ⚠️ `branchName` KHÔNG phải cột của `SysUser` (chỉ có ở DTO) ⇒ sort vào đây backend 500.
            enableSorting: false,
            meta: { columnLabel: t('customer.list.column.branch') },
            cell: ({ row }) => row.original.branchName ?? t('customer.list.noBranch'),
        },
        {
            id: 'membershipPoint',
            header: t('customer.list.column.membershipPoint'),
            size: 130,
            meta: {
                sortField: 'membershipPoint',
                columnLabel: t('customer.list.column.membershipPoint'),
                // Số đếm ⇒ căn phải cho thẳng cột chữ số (CONVENTIONS mục 5.6).
                align: 'right',
            },
            cell: ({ row }) => (
                <span className="tabular-nums">{formatNumber(row.original.membershipPoint ?? 0)}</span>
            ),
        },
        {
            id: 'status',
            header: t('customer.list.column.status'),
            size: 130,
            meta: {
                sortField: 'status',
                columnLabel: t('customer.list.column.status'),
                // Badge trong cột hẹp cố định ⇒ căn giữa cho cân (CONVENTIONS mục 5.6).
                align: 'center',
            },
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
            meta: { sortField: 'createdDate', columnLabel: t('customer.list.column.createdDate') },
            cell: ({ row }) => formatDate(row.original.createdDate),
        },
        {
            id: 'actions',
            header: t('customer.list.column.actions'),
            size: 88,
            // Đường vào mọi thao tác — không cho ẩn, và không có gì để sort.
            enableHiding: false,
            enableSorting: false,
            meta: { columnLabel: t('customer.list.column.actions'), align: 'center' },
            cell: ({ row }) => {
                const customer = row.original
                return (
                    <div className="flex items-center justify-center gap-1">
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
