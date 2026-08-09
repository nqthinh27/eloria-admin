import { useTranslation } from 'react-i18next'

import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { EGender, ERole, EntityStatus } from '@/types/common'
import type { Customer, UpdateCustomerReq } from '@/types/customer'
import { formatDate, formatNumber } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { DetailModal, type DetailField } from '@/components/detail-modal'

type CustomerDetailValues = {
    fullName: string
    phoneNumber: string
    email: string
    dob: string
    gender: string
}

type CustomerDetailModalProps = {
    customer: Customer | null
    onOpenChange: (open: boolean) => void
    onSave: (id: string, payload: UpdateCustomerReq) => Promise<void>
}

/**
 * Modal "Chi tiết khách hàng" — dùng lại `DetailModal` chung (xem → bấm "Sửa" chuyển sang input
 * tại chỗ), giống màn Nhân viên. Mockup `10-khach-hang.png` chỉ có icon con mắt ở cột THAO TÁC,
 * không vẽ nội dung modal ⇒ theo pattern chung (CONVENTIONS mục 6.2).
 *
 * `phoneNumber` khoá cứng (`editable: false`): `UpdateCustomerReqDTO` không nhận field này
 * (mapper backend `@Mapping(target = "phoneNumber", ignore = true)`) — hiện ra nhưng không sửa
 * được, thay vì ẩn đi để người dùng biết field tồn tại.
 *
 * Chi nhánh / điểm tích luỹ / ngày tạo là `readOnly` — backend không cho sửa qua API nào.
 */
export function CustomerDetailModal({ customer, onOpenChange, onSave }: CustomerDetailModalProps) {
    const { t } = useTranslation(['customer', 'common'])
    const { user } = useAuth()
    /** `PUT /customer/{id}` là `[ADMIN]` ⇒ STAFF chỉ xem, không mở được chế độ sửa. */
    const canEdit = hasRole(user?.role, ERole.ADMIN)

    if (!customer) return null

    const genderLabels: Record<EGender, string> = {
        [EGender.MALE]: t('customer.detail.genderMale'),
        [EGender.FEMALE]: t('customer.detail.genderFemale'),
        [EGender.OTHER]: t('customer.detail.genderOther'),
    }

    const values: CustomerDetailValues = {
        fullName: customer.fullName,
        phoneNumber: customer.phoneNumber,
        email: customer.email ?? '',
        dob: customer.dob?.slice(0, 10) ?? '',
        gender: customer.gender ?? '',
    }

    const fields: DetailField<CustomerDetailValues>[] = [
        {
            label: t('customer.list.column.status'),
            readOnly: true,
            formatValue: () =>
                customer.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('customer.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('customer.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            label: t('customer.list.column.membershipPoint'),
            readOnly: true,
            formatValue: () => formatNumber(customer.membershipPoint ?? 0),
        },
        { name: 'fullName', label: t('customer.form.fullName'), editable: canEdit, fullWidth: true },
        { name: 'phoneNumber', label: t('customer.form.phoneNumber'), editable: false, type: 'tel' },
        {
            name: 'email',
            label: t('customer.form.email'),
            editable: canEdit,
            type: 'email',
            formatValue: (value) => (value ? String(value) : t('customer.list.noEmail')),
        },
        {
            name: 'gender',
            label: t('customer.form.gender'),
            editable: canEdit,
            type: 'select',
            options: [
                { value: EGender.MALE, label: t('customer.detail.genderMale') },
                { value: EGender.FEMALE, label: t('customer.detail.genderFemale') },
                { value: EGender.OTHER, label: t('customer.detail.genderOther') },
            ],
            formatValue: (value) => genderLabels[value as EGender] ?? t('customer.detail.notUpdated'),
        },
        {
            name: 'dob',
            label: t('customer.form.dob'),
            editable: canEdit,
            type: 'date',
            formatValue: (value) => (value ? formatDate(String(value)) : t('customer.detail.notUpdated')),
        },
        {
            label: t('customer.form.branch'),
            readOnly: true,
            formatValue: () => customer.branchName ?? t('customer.list.noBranch'),
        },
        {
            label: t('customer.list.column.createdDate'),
            readOnly: true,
            formatValue: () => formatDate(customer.createdDate),
        },
    ]

    const handleSave = async (submitted: CustomerDetailValues) => {
        await onSave(customer.id, {
            fullName: submitted.fullName,
            email: submitted.email || undefined,
            dob: submitted.dob ? new Date(submitted.dob).toISOString() : undefined,
            gender: (submitted.gender as typeof customer.gender) || undefined,
        })
    }

    return (
        <DetailModal
            open={customer !== null}
            onOpenChange={onOpenChange}
            title={customer.fullName}
            fields={fields}
            values={values}
            onSave={handleSave}
            canEdit={canEdit}
        />
    )
}
