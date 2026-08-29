import type { ColumnDef } from '@tanstack/react-table'
import { Eye, KeyRound, Lock, MoreHorizontal, Pencil, Shield, Trash2, Unlock } from 'lucide-react'
import type { TFunction } from 'i18next'

import { EntityStatus } from '@/types/common'
import type { Staff } from '@/types/staff'
import { formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type StaffColumnActions = {
    onViewDetail: (staff: Staff) => void
    onEditFull: (staff: Staff) => void
    onAssignRole: (staff: Staff) => void
    onResetPassword: (staff: Staff) => void
    onToggleStatus: (staff: Staff) => void
    onDelete: (staff: Staff) => void
}

/**
 * Cột bảng Nhân viên theo `07-nhan-vien.png`: NHÂN VIÊN · CHI NHÁNH · VAI TRÒ · TRẠNG THÁI · NGÀY VÀO · THAO TÁC.
 *
 * THAO TÁC chỉ có 2 nút cố định: "Chi tiết" (mở modal xem/sửa inline — pattern chung toàn hệ thống)
 * và `(...)` chứa các hành động phụ (Sửa đầy đủ, Gán vai trò, Reset mật khẩu, Khoá/Mở, Xoá) — chốt
 * cùng user 2026-08-08. Cột NHÂN VIÊN linh hoạt (avatar + tên + email dài ngắn khác nhau); các cột
 * còn lại đặt `size` gần đúng độ dài nội dung thật để THAO TÁC (nội dung ngắn nhất) không bị kéo dãn.
 *
 * ⚠️ **Sort phía server** (CONVENTIONS mục 5.2): `id` cột ở FE khác tên field backend nên phải khai
 * `meta.sortField`. Cột **CHI NHÁNH bị khoá sort** vì `branchName` chỉ có ở DTO, không phải cột
 * thật của `SysUser` — sort vào đó backend trả **500**, xem CLAUDE.md mục "Sort phía server".
 */
export function buildStaffColumns(
    t: TFunction<['staff', 'common']>,
    actions: StaffColumnActions,
): ColumnDef<Staff, unknown>[] {
    return [
        {
            id: 'staff',
            header: t('staff.list.column.staff'),
            // Cột định danh — không cho ẩn, người dùng sẽ không biết đang xem dòng của ai.
            enableHiding: false,
            meta: { sortField: 'fullName', columnLabel: t('staff.list.column.staff') },
            cell: ({ row }) => {
                const staff = row.original
                const initial = staff.fullName.charAt(0).toUpperCase()
                return (
                    <div className="flex items-center gap-3">
                        <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                            {initial}
                        </span>
                        <div className="min-w-0">
                            <p className="font-medium">{staff.fullName}</p>
                            <p className="text-muted-foreground text-xs">{staff.email}</p>
                        </div>
                    </div>
                )
            },
        },
        {
            id: 'branch',
            header: t('staff.list.column.branch'),
            size: 160,
            // ⚠️ `branchName` KHÔNG phải cột của `SysUser` (chỉ có ở DTO) ⇒ sort vào đây backend 500.
            enableSorting: false,
            meta: { columnLabel: t('staff.list.column.branch') },
            cell: ({ row }) => row.original.branchName ?? t('staff.list.noBranch'),
        },
        {
            id: 'role',
            header: t('staff.list.column.role'),
            size: 130,
            meta: { sortField: 'role', columnLabel: t('staff.list.column.role') },
            cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
        },
        {
            id: 'status',
            header: t('staff.list.column.status'),
            size: 120,
            meta: { sortField: 'status', columnLabel: t('staff.list.column.status') },
            cell: ({ row }) =>
                row.original.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('staff.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="danger">{t('staff.list.statusLocked')}</StatusBadge>
                ),
        },
        {
            id: 'joinedDate',
            header: t('staff.list.column.joinedDate'),
            size: 110,
            meta: { sortField: 'createdDate', columnLabel: t('staff.list.column.joinedDate') },
            cell: ({ row }) => formatDate(row.original.createdDate),
        },
        {
            id: 'actions',
            header: t('staff.list.column.actions'),
            size: 88,
            // Đường vào mọi thao tác — không cho ẩn, và không có gì để sort.
            enableHiding: false,
            enableSorting: false,
            cell: ({ row }) => {
                const staff = row.original
                const isLocked = staff.status === EntityStatus.INACTIVE
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            title={t('common:action.detail')}
                            aria-label={t('common:action.detail')}
                            onClick={() => actions.onViewDetail(staff)}>
                            <Eye className="size-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label={t('staff.list.column.actions')}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => actions.onEditFull(staff)}>
                                    <Pencil className="size-4" />
                                    {t('staff.list.actionEdit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => actions.onAssignRole(staff)}>
                                    <Shield className="size-4" />
                                    {t('staff.list.actionAssignRole')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => actions.onResetPassword(staff)}>
                                    <KeyRound className="size-4" />
                                    {t('staff.list.actionResetPassword')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => actions.onToggleStatus(staff)}>
                                    {isLocked ? (
                                        <Unlock className="size-4" />
                                    ) : (
                                        <Lock className="size-4" />
                                    )}
                                    {isLocked
                                        ? t('staff.list.actionUnlock')
                                        : t('staff.list.actionLock')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => actions.onDelete(staff)}>
                                    <Trash2 className="size-4" />
                                    {t('staff.list.actionDelete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}
