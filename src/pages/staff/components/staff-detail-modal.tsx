import { useTranslation } from 'react-i18next'

import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { hasRole } from '@/config/roles'
import { EGender, ERole, EntityStatus } from '@/types/common'
import type { Staff, UpdateStaffReq } from '@/types/staff'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { DetailModal, type DetailField } from '@/components/detail-modal'

type StaffDetailValues = {
    username: string
    role: string
    fullName: string
    email: string
    phoneNumber: string
    branchId: string
    dob: string
    gender: string
    description: string
}

type StaffDetailModalProps = {
    staff: Staff | null
    onOpenChange: (open: boolean) => void
    onSave: (id: string, payload: UpdateStaffReq) => Promise<void>
}

/**
 * Modal "Chi tiết nhân viên" — xem hồ sơ, bấm "Sửa" chuyển field sang input/dropdown ngay tại chỗ
 * (pattern DetailModal dùng chung cho toàn hệ thống, chốt cùng user 2026-08-08).
 *
 * `username`/`role` vẫn hiện dạng input/select nhưng khoá cứng (`editable: false`) vì
 * `UpdateStaffReqDTO` không nhận 2 field này — đổi role phải qua dialog "Gán vai trò" riêng
 * (menu (...) trên bảng), đổi username không có API nào hỗ trợ.
 */
export function StaffDetailModal({ staff, onOpenChange, onSave }: StaffDetailModalProps) {
    const { t } = useTranslation(['staff', 'common'])
    const { user } = useAuth()
    const { branches } = useBranch()
    const isSuperAdmin = hasRole(user?.role, ERole.SUPER_ADMIN)

    if (!staff) return null

    const values: StaffDetailValues = {
        username: staff.username,
        role: staff.role,
        fullName: staff.fullName,
        email: staff.email,
        phoneNumber: staff.phoneNumber,
        branchId: staff.branchId ?? '',
        dob: staff.dob?.slice(0, 10) ?? '',
        gender: staff.gender ?? '',
        description: staff.description ?? '',
    }

    const fields: DetailField<StaffDetailValues>[] = [
        { name: 'username', label: t('staff.form.username'), editable: false, required: true },
        {
            name: 'role',
            label: t('staff.form.role'),
            editable: false,
            required: true,
            type: 'select',
            options: [
                { value: ERole.STAFF, label: 'STAFF' },
                { value: ERole.ADMIN, label: 'ADMIN' },
                { value: ERole.SUPER_ADMIN, label: 'SUPER_ADMIN' },
            ],
            formatValue: () => <Badge variant="outline">{staff.role}</Badge>,
        },
        { name: 'fullName', label: t('staff.form.fullName'), editable: true, required: true, fullWidth: true },
        { name: 'email', label: t('staff.form.email'), editable: true, required: true, type: 'email' },
        { name: 'phoneNumber', label: t('staff.form.phoneNumber'), editable: true, required: true, type: 'tel' },
        {
            name: 'branchId',
            label: t('staff.form.branch'),
            editable: isSuperAdmin,
            // Backend (StaffServiceImpl): chi nhánh bắt buộc với mọi role trừ SUPER_ADMIN.
            required: staff.role !== ERole.SUPER_ADMIN,
            type: 'select',
            options: branches.map((b) => ({ value: b.id, label: b.name })),
            formatValue: () => staff.branchName ?? t('staff.list.noBranch'),
        },
        {
            name: 'gender',
            label: t('staff.form.gender'),
            editable: true,
            type: 'select',
            options: [
                { value: EGender.MALE, label: t('common:gender.MALE') },
                { value: EGender.FEMALE, label: t('common:gender.FEMALE') },
                { value: EGender.OTHER, label: t('common:gender.OTHER') },
            ],
        },
        { name: 'dob', label: t('staff.form.dob'), editable: true, type: 'date' },
        {
            name: 'description',
            label: t('staff.form.description'),
            editable: true,
            type: 'textarea',
            fullWidth: true,
        },
    ]

    const statusField: DetailField<StaffDetailValues> = {
        label: t('staff.list.column.status'),
        readOnly: true,
        formatValue: () =>
            staff.status === EntityStatus.ACTIVE ? (
                <StatusBadge tone="success">{t('staff.list.statusActive')}</StatusBadge>
            ) : (
                <StatusBadge tone="danger">{t('staff.list.statusLocked')}</StatusBadge>
            ),
    }

    /* Trạng thái Zalo nhận OTP (Phase 19): chỉ đã/chưa — backend không bao giờ trả chat id. */
    const zaloField: DetailField<StaffDetailValues> = {
        label: t('staff.zalo.label'),
        readOnly: true,
        formatValue: () =>
            staff.zaloLinked ? (
                <StatusBadge tone="success">{t('staff.zalo.linked')}</StatusBadge>
            ) : (
                <StatusBadge tone="muted">{t('staff.zalo.notLinked')}</StatusBadge>
            ),
    }

    const handleSave = async (submitted: StaffDetailValues) => {
        await onSave(staff.id, {
            fullName: submitted.fullName,
            email: submitted.email,
            phoneNumber: submitted.phoneNumber,
            branchId: isSuperAdmin ? submitted.branchId || undefined : undefined,
            dob: submitted.dob ? new Date(submitted.dob).toISOString() : undefined,
            gender: (submitted.gender as typeof staff.gender) || null,
            description: submitted.description ?? '',
        })
    }

    return (
        <DetailModal
            open={staff !== null}
            onOpenChange={onOpenChange}
            title={staff.fullName}
            fields={[statusField, zaloField, ...fields]}
            values={values}
            onSave={handleSave}
        />
    )
}
