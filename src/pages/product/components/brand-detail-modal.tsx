import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/format'
import { EntityStatus } from '@/types/common'
import type { Brand } from '@/types/product'
import { StatusBadge } from '@/components/status-badge'
import { DetailModal, type DetailField } from '@/components/detail-modal'

/**
 * Modal "Chi tiết thương hiệu" — nút Chi tiết là bắt buộc ở mọi bảng (CONVENTIONS mục 5.3).
 *
 * **Chỉ đọc, không inline edit**: form Sửa cần chuẩn hoá `code` ngay lúc gõ + kiểm tra độ dài
 * theo DTO (`DetailModal` dùng chung không có validate) ⇒ sửa đi qua `BrandFormDialog`
 * (mục "Sửa" trong menu `(...)`), giống Danh mục SP.
 */
export function BrandDetailModal({
    brand,
    onOpenChange,
}: {
    brand: Brand | null
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation(['brand', 'common'])

    if (!brand) return null

    const none = t('brand.list.noValue')
    const fields: DetailField<Record<string, never>>[] = [
        {
            label: t('brand.list.column.status'),
            readOnly: true,
            formatValue: () =>
                brand.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('brand.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('brand.list.statusInactive')}</StatusBadge>
                ),
        },
        { label: t('brand.list.column.code'), readOnly: true, formatValue: () => brand.code },
        { label: t('brand.list.column.name'), readOnly: true, fullWidth: true, formatValue: () => brand.name },
        {
            label: t('brand.list.column.address'),
            readOnly: true,
            fullWidth: true,
            formatValue: () => brand.address || none,
        },
        {
            label: t('brand.form.logoUrl'),
            readOnly: true,
            fullWidth: true,
            formatValue: () =>
                brand.logoUrl ? (
                    <div className="flex items-center gap-3">
                        <img
                            src={brand.logoUrl}
                            alt=""
                            className="size-12 rounded-md border object-contain"
                            onError={(event) => (event.currentTarget.style.display = 'none')}
                        />
                        <span className="text-muted-foreground min-w-0 break-all text-xs">{brand.logoUrl}</span>
                    </div>
                ) : (
                    none
                ),
        },
        {
            label: t('brand.list.column.description'),
            readOnly: true,
            fullWidth: true,
            formatValue: () => <span className="whitespace-pre-wrap">{brand.description || none}</span>,
        },
        {
            label: t('brand.list.column.createdDate'),
            readOnly: true,
            formatValue: () => formatDateTime(brand.createdDate),
        },
        {
            label: t('brand.list.column.lastModifiedDate'),
            readOnly: true,
            formatValue: () => (brand.lastModifiedDate ? formatDateTime(brand.lastModifiedDate) : none),
        },
    ]

    return (
        <DetailModal
            open={brand !== null}
            onOpenChange={onOpenChange}
            title={brand.name}
            fields={fields}
            values={{}}
            canEdit={false}
        />
    )
}
