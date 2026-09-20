import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Lock, MoreHorizontal, Pencil, Star, Trash2, Unlock } from 'lucide-react'
import type { TFunction } from 'i18next'

import { EntityStatus } from '@/types/common'
import type { BankAccount } from '@/types/bank-account'
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

type BankAccountColumnActions = {
    onViewDetail: (account: BankAccount) => void
    onEdit: (account: BankAccount) => void
    onSetDefault: (account: BankAccount) => void
    onToggleStatus: (account: BankAccount) => void
    onDelete: (account: BankAccount) => void
}

/**
 * Cột bảng Tài khoản ngân hàng: STT · SỐ TÀI KHOẢN · NGÂN HÀNG · CHỦ TÀI KHOẢN · MẶC ĐỊNH ·
 * TRẠNG THÁI · NGÀY TẠO · THAO TÁC. Không có mockup ⇒ dựng theo pattern list chuẩn (CONVENTIONS 6.2).
 *
 * Thứ tự cột theo mục 5.6 (**STT → định danh → tên**): `BankAccountResDTO` không có `code`, `id` là
 * UUID vô nghĩa ⇒ định danh là **số tài khoản** (duy nhất theo cặp BIN + số TK), cột tên là NGÂN HÀNG
 * (kèm mã BIN chữ phụ). Cột STT do `DataTable` tự chèn.
 *
 * Sort (whitelist = field entity `BankAccount`): `accountNumber` · `bankName` · `accountName` ·
 * `status` · `createdDate`. Cột MẶC ĐỊNH khoá sort (field boolean `isDefault` chưa đo) — đã có badge
 * và banner cảnh báo nên không cần sort.
 *
 * THAO TÁC: "Chi tiết" + `(...)` gom Sửa · Đặt mặc định · Bật/Tắt · Xoá. "Đặt mặc định" chỉ hiện khi
 * TK đang bật và chưa phải mặc định (backend từ chối TK đã tắt: `error.bankAccount.inactive`).
 */
export function buildBankAccountColumns(
    t: TFunction<['bankAccount', 'common']>,
    actions: BankAccountColumnActions,
): ColumnDef<BankAccount, unknown>[] {
    return [
        {
            id: 'accountNumber',
            header: t('bankAccount.list.column.accountNumber'),
            size: 170,
            enableHiding: false,
            meta: {
                sortField: 'accountNumber',
                columnLabel: t('bankAccount.list.column.accountNumber'),
            },
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.accountNumber}</span>,
        },
        {
            id: 'bank',
            header: t('bankAccount.list.column.bank'),
            size: 220,
            enableHiding: false,
            meta: { sortField: 'bankName', columnLabel: t('bankAccount.list.column.bank') },
            cell: ({ row }) => (
                <div className="min-w-0">
                    <p className="truncate font-medium">{row.original.bankName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                        {t('bankAccount.list.column.bin')}: {row.original.bankBin}
                    </p>
                </div>
            ),
        },
        {
            id: 'accountName',
            header: t('bankAccount.list.column.accountName'),
            size: 240,
            meta: {
                sortField: 'accountName',
                columnLabel: t('bankAccount.list.column.accountName'),
            },
            cell: ({ row }) => <span className="truncate">{row.original.accountName}</span>,
        },
        {
            id: 'isDefault',
            header: t('bankAccount.list.column.isDefault'),
            size: 120,
            enableSorting: false,
            meta: { columnLabel: t('bankAccount.list.column.isDefault'), align: 'center' },
            cell: ({ row }) =>
                row.original.isDefault ? (
                    <Badge>{t('bankAccount.list.defaultBadge')}</Badge>
                ) : (
                    <span className="text-muted-foreground">{t('bankAccount.list.noneDefault')}</span>
                ),
        },
        {
            id: 'status',
            header: t('bankAccount.list.column.status'),
            size: 120,
            meta: {
                sortField: 'status',
                columnLabel: t('bankAccount.list.column.status'),
                align: 'center',
            },
            cell: ({ row }) =>
                row.original.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('bankAccount.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="danger">{t('bankAccount.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            id: 'createdDate',
            header: t('bankAccount.list.column.createdDate'),
            size: 110,
            meta: {
                sortField: 'createdDate',
                columnLabel: t('bankAccount.list.column.createdDate'),
            },
            cell: ({ row }) => formatDate(row.original.createdDate),
        },
        {
            id: 'actions',
            header: t('bankAccount.list.column.actions'),
            size: 88,
            enableHiding: false,
            enableSorting: false,
            meta: { columnLabel: t('bankAccount.list.column.actions'), align: 'center' },
            cell: ({ row }) => {
                const account = row.original
                const isActive = account.status === EntityStatus.ACTIVE
                const canSetDefault = isActive && !account.isDefault
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            title={t('common:action.detail')}
                            aria-label={t('common:action.detail')}
                            onClick={() => actions.onViewDetail(account)}>
                            <Eye className="size-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0"
                                    aria-label={t('bankAccount.list.column.actions')}>
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => actions.onEdit(account)}>
                                    <Pencil className="size-4" />
                                    {t('bankAccount.list.actionEdit')}
                                </DropdownMenuItem>
                                {canSetDefault && (
                                    <DropdownMenuItem onSelect={() => actions.onSetDefault(account)}>
                                        <Star className="size-4" />
                                        {t('bankAccount.list.actionSetDefault')}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => actions.onToggleStatus(account)}>
                                    {isActive ? (
                                        <Lock className="size-4" />
                                    ) : (
                                        <Unlock className="size-4" />
                                    )}
                                    {isActive
                                        ? t('bankAccount.list.actionDisable')
                                        : t('bankAccount.list.actionEnable')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => actions.onDelete(account)}>
                                    <Trash2 className="size-4" />
                                    {t('bankAccount.list.actionDelete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}
