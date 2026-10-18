import { useEffect, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Camera, Loader2 } from 'lucide-react'

import { authApi } from '@/api/auth'
import { branchApi } from '@/api/branch'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api-error'
import { formatDateTime } from '@/lib/format'
import { toastError, toastSuccess, toastWarning } from '@/lib/toast'
import { PHONE_PATTERN } from '@/lib/validation'
import { EGender, type SysUser } from '@/types/common'
import { DetailModal, type DetailField } from '@/components/detail-modal'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type ProfileValues = {
    username: string
    email: string
    role: string
    fullName: string
    phoneNumber: string
    dob: string
    gender: string
    description: string
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Backend giới hạn 2MB/file. */
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

function initialsOf(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Avatar + nút đổi ảnh — upload ngay khi chọn file (`POST /sys-user/update-avatar`), không đợi bấm Lưu. */
function AvatarField({ user }: { user: SysUser }) {
    const { t } = useTranslation('auth')
    const { updateUser } = useAuth()
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleFile = async (file: File | undefined) => {
        if (!file) return
        if (!AVATAR_TYPES.includes(file.type)) {
            toastWarning('auth.account.profile.avatarTypeError', { ns: 'auth' })
            return
        }
        if (file.size > AVATAR_MAX_BYTES) {
            toastWarning('auth.account.profile.avatarSizeError', { ns: 'auth' })
            return
        }
        setUploading(true)
        try {
            const url = await authApi.updateAvatar(file)
            updateUser({ ...user, imageUrl: url })
            toastSuccess('auth.account.profile.avatarUpdated', { ns: 'auth' })
        } catch {
            // api-client đã toast lỗi.
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    return (
        <div className="flex items-center gap-4">
            <Avatar className="size-16">
                {user.imageUrl && <AvatarImage src={user.imageUrl} alt={user.fullName} />}
                <AvatarFallback className="bg-accent text-accent-foreground text-lg font-semibold">
                    {initialsOf(user.fullName)}
                </AvatarFallback>
            </Avatar>
            <input
                ref={inputRef}
                type="file"
                accept={AVATAR_TYPES.join(',')}
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                {uploading ? t('auth.account.profile.uploadingAvatar') : t('auth.account.profile.changeAvatar')}
            </Button>
        </div>
    )
}

type ProfileDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * "Tài khoản của tôi" — mở ở chế độ XEM, bấm "Sửa" mới thành form (chốt U3, pattern `DetailModal`).
 * Chỉ sửa được `fullName · phoneNumber · dob · gender · description`; username/email/vai trò/chi nhánh
 * hiện dạng khoá (backend Q5: không đổi email/username qua đây). Lưu xong cập nhật `user` trong
 * `AuthProvider` để top bar đổi tên/ảnh ngay.
 */
export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
    const { t } = useTranslation(['auth', 'menu', 'staff', 'common'])
    const { user, updateUser } = useAuth()
    const [branchName, setBranchName] = useState<string | null>(null)

    /* Tên chi nhánh: `SysUser` chỉ có `branchId` ⇒ tra `GET /branch/{id}` ([STAFF]) mỗi lần mở modal. */
    const branchId = user?.branchId ?? null
    useEffect(() => {
        if (!open || !branchId) return
        const controller = new AbortController()
        branchApi
            .getById(branchId, controller.signal)
            .then((branch) => setBranchName(branch.name))
            .catch(() => {
                // Không có tên thì hiện "—"; api-client đã xử lý toast nếu là lỗi thật.
            })
        return () => controller.abort()
    }, [open, branchId])

    if (!user) return null

    const values: ProfileValues = {
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber ?? '',
        dob: user.dob?.slice(0, 10) ?? '',
        gender: user.gender ?? '',
        description: user.description ?? '',
    }

    const fields: DetailField<ProfileValues>[] = [
        {
            label: t('auth:auth.account.profile.changeAvatar'),
            readOnly: true,
            fullWidth: true,
            formatValue: () => <AvatarField user={user} />,
        },
        { name: 'fullName', label: t('auth:auth.account.profile.fullName'), editable: true, fullWidth: true },
        { name: 'username', label: t('auth:auth.account.profile.username'), editable: false },
        { name: 'email', label: t('auth:auth.account.profile.email'), editable: false, type: 'email' },
        { name: 'phoneNumber', label: t('auth:auth.account.profile.phoneNumber'), editable: true, type: 'tel' },
        {
            name: 'role',
            label: t('auth:auth.account.profile.role'),
            editable: false,
            formatValue: () => <Badge variant="outline">{t(`menu:role.${user.role}`)}</Badge>,
        },
        {
            label: t('auth:auth.account.profile.branch'),
            readOnly: true,
            formatValue: () =>
                user.branchId ? (branchName ?? '—') : t('auth:auth.account.profile.noBranch'),
        },
        {
            name: 'gender',
            label: t('auth:auth.account.profile.gender'),
            editable: true,
            type: 'select',
            options: [
                { value: EGender.MALE, label: t('staff:gender.MALE') },
                { value: EGender.FEMALE, label: t('staff:gender.FEMALE') },
                { value: EGender.OTHER, label: t('staff:gender.OTHER') },
            ],
            formatValue: (v) => (v ? t(`staff:gender.${String(v)}`) : '—'),
        },
        { name: 'dob', label: t('auth:auth.account.profile.dob'), editable: true, type: 'date' },
        {
            label: t('auth:auth.account.profile.zalo'),
            readOnly: true,
            // Chỉ hiện đã/chưa liên kết (+ thời điểm) — backend không bao giờ trả chat id.
            formatValue: () =>
                user.zaloLinked ? (
                    <span className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone="success">{t('auth:auth.account.profile.zaloLinked')}</StatusBadge>
                        {user.zaloLinkedAt && (
                            <span className="text-muted-foreground text-xs">
                                {t('auth:auth.account.profile.zaloLinkedAt', {
                                    time: formatDateTime(user.zaloLinkedAt),
                                })}
                            </span>
                        )}
                    </span>
                ) : (
                    <StatusBadge tone="muted">{t('auth:auth.account.profile.zaloNotLinked')}</StatusBadge>
                ),
        },
        {
            name: 'description',
            label: t('auth:auth.account.profile.description'),
            editable: true,
            type: 'textarea',
            fullWidth: true,
        },
    ]

    const handleSave = async (submitted: ProfileValues, form: UseFormReturn<ProfileValues>) => {
        // DetailModal không có schema ⇒ kiểm tối thiểu ở đây; lỗi báo tại ô và giữ chế độ sửa.
        const phone = submitted.phoneNumber.trim()
        const invalidName = submitted.fullName.trim() === ''
        const invalidPhone = phone !== '' && !PHONE_PATTERN.test(phone)
        if (invalidName) {
            form.setError('fullName', { type: 'validate', message: t('auth:auth.validation.fullNameRequired') })
        }
        if (invalidPhone) {
            form.setError('phoneNumber', { type: 'validate', message: t('auth:auth.validation.phoneInvalid') })
        }
        if (invalidName || invalidPhone) throw new Error('validation')

        try {
            const updated = await authApi.updateMe({
                fullName: submitted.fullName.trim(),
                phoneNumber: phone || undefined,
                dob: submitted.dob ? new Date(submitted.dob).toISOString() : undefined,
                gender: (submitted.gender as EGender) || undefined,
                description: submitted.description.trim() || undefined,
            })
            updateUser(updated)
            toastSuccess('auth.account.profile.updated', { ns: 'auth' })
        } catch (error) {
            // SĐT trùng (`EXISTED` + `PHONE_EXISTED`) báo tại ô; lỗi khác toast. Ném lại để modal giữ chế độ sửa.
            if (error instanceof ApiError && error.subKey?.toLowerCase().includes('phone')) {
                form.setError('phoneNumber', { type: 'server', message: error.message })
            } else {
                toastError(error)
            }
            throw error
        }
    }

    return (
        <DetailModal
            open={open}
            onOpenChange={onOpenChange}
            title={t('auth:auth.account.profile.title')}
            fields={fields}
            values={values}
            onSave={handleSave}
            contentClassName="sm:max-w-xl"
        />
    )
}
