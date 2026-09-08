import { useTranslation } from 'react-i18next'

import { formatDate, formatDateTime, formatNumber, formatVnd } from '@/lib/format'
import { EPromotionType, type Promotion } from '@/types/promotion'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { DetailModal, type DetailField } from '@/components/detail-modal'

const STATUS_TONE: Record<Promotion['status'], StatusTone> = {
    DRAFT: 'muted',
    SCHEDULED: 'info',
    RUNNING: 'success',
    PAUSED: 'warning',
    ENDED: 'muted',
}

/**
 * Modal "Chi tiết khuyến mại" — nút Chi tiết là bắt buộc ở mọi bảng (CONVENTIONS mục 5.3).
 *
 * ⚠️ **Chỉ đọc, không có inline edit** (khác modal Nhân viên/Khách hàng): form khuyến mại có
 * **field phụ thuộc lẫn nhau** — `targetId` chỉ hiện khi `target !== ALL`, `maxDiscount` chỉ có
 * nghĩa khi `type === PERCENT`, và mức giảm validate khác nhau theo `type`. `DetailModal` render
 * field phẳng nên không diễn tả được các ràng buộc đó. ⇒ Sửa vẫn đi qua `PromotionFormDialog`
 * (mục "Sửa" trong menu `(...)`), modal này để xem nhanh **đầy đủ** field mà bảng không đủ chỗ hiện
 * (ngưỡng đơn tối thiểu, trần giảm, giới hạn lượt/khách, thời điểm tạo & sửa gần nhất).
 */
export function PromotionDetailModal({
    promotion,
    onOpenChange,
}: {
    promotion: Promotion | null
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation(['promotion', 'common'])

    if (!promotion) return null

    /** Một bảng `promotion` gánh 3 vai — suy ra từ `code` + `customerId`. */
    const kind = !promotion.code ? 'auto' : promotion.customerId ? 'personal' : 'coupon'

    const dash = '—'
    const unlimited = t('promotion.list.noPeriod')

    const fields: DetailField<Record<string, never>>[] = [
        {
            label: t('promotion.list.column.status'),
            readOnly: true,
            formatValue: () => (
                <StatusBadge tone={STATUS_TONE[promotion.status]}>
                    {t(`promotion.status.${promotion.status}`)}
                </StatusBadge>
            ),
        },
        {
            label: t('promotion.kind.label'),
            readOnly: true,
            formatValue: () => t(`promotion.kind.${kind}`),
        },
        {
            label: t('promotion.list.column.name'),
            readOnly: true,
            fullWidth: true,
            formatValue: () => promotion.name,
        },
        {
            label: t('promotion.list.column.code'),
            readOnly: true,
            formatValue: () => promotion.code ?? t('promotion.list.noCode'),
        },
        {
            label: t('promotion.list.column.type'),
            readOnly: true,
            formatValue: () => t(`promotion.type.${promotion.type}`),
        },
        {
            label: t('promotion.list.column.value'),
            readOnly: true,
            formatValue: () =>
                promotion.type === EPromotionType.PERCENT
                    ? `${promotion.value}%`
                    : formatVnd(promotion.value),
        },
        {
            label: t('promotion.form.maxDiscount'),
            readOnly: true,
            /* Trần giảm chỉ có nghĩa với PERCENT — loại FIXED hiện gạch ngang thay vì số vô nghĩa. */
            formatValue: () =>
                promotion.type !== EPromotionType.PERCENT
                    ? dash
                    : promotion.maxDiscount != null
                      ? formatVnd(promotion.maxDiscount)
                      : unlimited,
        },
        {
            label: t('promotion.form.target'),
            readOnly: true,
            formatValue: () => t(`promotion.target.${promotion.target}`),
        },
        {
            label: t('promotion.list.column.channel'),
            readOnly: true,
            formatValue: () => t(`promotion.channel.${promotion.channel}`),
        },
        {
            label: t('promotion.form.branch'),
            readOnly: true,
            formatValue: () => promotion.branchName ?? t('promotion.list.branchAll'),
        },
        {
            label: t('promotion.form.minAmount'),
            readOnly: true,
            formatValue: () =>
                promotion.minAmount != null ? formatVnd(promotion.minAmount) : dash,
        },
        {
            label: t('promotion.list.column.usage'),
            readOnly: true,
            formatValue: () =>
                promotion.usageLimit == null
                    ? formatNumber(promotion.usageCount)
                    : `${formatNumber(promotion.usageCount)} / ${formatNumber(promotion.usageLimit)}`,
        },
        {
            label: t('promotion.form.perCustomerLimit'),
            readOnly: true,
            formatValue: () =>
                promotion.perCustomerLimit != null
                    ? formatNumber(promotion.perCustomerLimit)
                    : unlimited,
        },
        {
            label: t('promotion.form.startDate'),
            readOnly: true,
            formatValue: () => (promotion.startDate ? formatDate(promotion.startDate) : dash),
        },
        {
            label: t('promotion.form.endDate'),
            readOnly: true,
            formatValue: () => (promotion.endDate ? formatDate(promotion.endDate) : dash),
        },
        {
            label: t('promotion.detail.createdDate'),
            readOnly: true,
            formatValue: () => formatDateTime(promotion.createdDate),
        },
        {
            label: t('promotion.detail.lastModifiedDate'),
            readOnly: true,
            formatValue: () => formatDateTime(promotion.lastModifiedDate),
        },
    ]

    return (
        <DetailModal
            open={promotion !== null}
            onOpenChange={onOpenChange}
            title={promotion.name}
            fields={fields}
            values={{}}
            /* Không có inline edit — xem ghi chú đầu file. */
            canEdit={false}
        />
    )
}
