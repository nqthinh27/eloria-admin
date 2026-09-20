import { useTranslation } from 'react-i18next'

import { EntityStatus } from '@/types/common'
import type { BankAccount, UpdateBankAccountReq } from '@/types/bank-account'
import { formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { DetailModal, type DetailField } from '@/components/detail-modal'

type BankAccountDetailValues = {
    bankBin: string
    bankName: string
    accountNumber: string
    accountName: string
}

type BankAccountDetailModalProps = {
    account: BankAccount | null
    onOpenChange: (open: boolean) => void
    onSave: (id: string, payload: UpdateBankAccountReq) => Promise<void>
}

/**
 * Modal "Chi tiết tài khoản ngân hàng" — xem, bấm "Sửa" để sửa tại chỗ (pattern `DetailModal`).
 * Cờ mặc định và trạng thái hiển thị chỉ đọc: đổi qua menu (...) trên bảng (`set-default`,
 * `update-status`), `PUT` không nhận 2 field này.
 */
export function BankAccountDetailModal({
    account,
    onOpenChange,
    onSave,
}: BankAccountDetailModalProps) {
    const { t } = useTranslation(['bankAccount', 'common'])

    if (!account) return null

    const values: BankAccountDetailValues = {
        bankBin: account.bankBin,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
    }

    const fields: DetailField<BankAccountDetailValues>[] = [
        { name: 'bankName', label: t('bankAccount.form.bankName'), editable: true },
        { name: 'bankBin', label: t('bankAccount.form.bankBin'), editable: true },
        { name: 'accountNumber', label: t('bankAccount.form.accountNumber'), editable: true },
        { name: 'accountName', label: t('bankAccount.form.accountName'), editable: true },
        {
            label: t('bankAccount.list.column.isDefault'),
            readOnly: true,
            formatValue: () =>
                account.isDefault ? (
                    <Badge>{t('bankAccount.list.defaultBadge')}</Badge>
                ) : (
                    t('bankAccount.list.noneDefault')
                ),
        },
        {
            label: t('bankAccount.list.column.status'),
            readOnly: true,
            formatValue: () =>
                account.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('bankAccount.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="danger">{t('bankAccount.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            label: t('bankAccount.list.column.createdDate'),
            readOnly: true,
            formatValue: () => formatDateTime(account.createdDate),
        },
    ]

    return (
        <DetailModal
            open={account !== null}
            onOpenChange={onOpenChange}
            title={`${account.bankName} – ${account.accountNumber}`}
            fields={fields}
            values={values}
            onSave={(submitted) =>
                onSave(account.id, {
                    bankBin: submitted.bankBin.trim(),
                    bankName: submitted.bankName.trim(),
                    accountNumber: submitted.accountNumber.trim(),
                    accountName: submitted.accountName.trim(),
                })
            }
        />
    )
}
