import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/format'
import { EntityStatus } from '@/types/common'
import type { Category } from '@/types/product'
import { StatusBadge } from '@/components/status-badge'
import { DetailModal, type DetailField } from '@/components/detail-modal'

/**
 * Modal "Chi tiết danh mục" — nút Chi tiết là bắt buộc ở mọi bảng (CONVENTIONS mục 5.3).
 *
 * ⚠️ **Chỉ đọc, không inline edit**: `CreateCategoryReqDTO`/`UpdateCategoryReqDTO` có cùng bộ field
 * và ô "Danh mục cha" cần `SearchSelect` (loại chính nó + con cháu khỏi danh sách để không tự trỏ
 * vào mình) — `DetailModal` chỉ render `select` phẳng nên không diễn tả được. ⇒ Sửa vẫn đi qua
 * `CategoryFormDialog` (mục "Sửa" trong menu `(...)`).
 */
export function CategoryDetailModal({
    category,
    onOpenChange,
}: {
    category: Category | null
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation(['product', 'common'])

    if (!category) return null

    const fields: DetailField<Record<string, never>>[] = [
        {
            label: t('category.list.column.status'),
            readOnly: true,
            formatValue: () =>
                category.status === EntityStatus.ACTIVE ? (
                    <StatusBadge tone="success">{t('category.list.statusActive')}</StatusBadge>
                ) : (
                    <StatusBadge tone="muted">{t('category.list.statusInactive')}</StatusBadge>
                ),
        },
        {
            label: t('category.list.column.code'),
            readOnly: true,
            formatValue: () => category.code,
        },
        {
            label: t('category.list.column.name'),
            readOnly: true,
            fullWidth: true,
            formatValue: () => category.name,
        },
        {
            label: t('category.list.column.parent'),
            readOnly: true,
            formatValue: () => category.parentName ?? t('category.list.noParent'),
        },
        {
            label: t('category.list.column.sortOrder'),
            readOnly: true,
            formatValue: () => category.sortOrder ?? '—',
        },
        {
            label: t('category.detail.createdDate'),
            readOnly: true,
            formatValue: () => formatDateTime(category.createdDate),
        },
        {
            label: t('category.detail.lastModifiedDate'),
            readOnly: true,
            formatValue: () =>
                category.lastModifiedDate ? formatDateTime(category.lastModifiedDate) : '—',
        },
    ]

    return (
        <DetailModal
            open={category !== null}
            onOpenChange={onOpenChange}
            title={category.name}
            fields={fields}
            values={{}}
            canEdit={false}
        />
    )
}
