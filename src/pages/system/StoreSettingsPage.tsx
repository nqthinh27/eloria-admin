import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { LoyaltyCard } from './components/LoyaltyCard'

/**
 * Màn "Cài đặt cửa hàng online" — **chỉ SUPER_ADMIN**.
 *
 * Hiện chỉ có thẻ **Điểm thưởng** (`loyalty.*`, Phase 21b — `LoyaltyCard`, nút Lưu riêng).
 * Ô chi nhánh bán online (`store.branch_id`, Phase 24) đã **gỡ 2026-10-26 theo PO**: backend P14.1
 * không còn dùng khoá này. Phí ship/freeship không làm (thu thủ công).
 */
export default function StoreSettingsPage() {
    const { t } = useTranslation('storeSettings')

    return (
        <div>
            <PageHeader title={t('pageTitle')} description={t('pageDescription')} />
            <LoyaltyCard />
        </div>
    )
}
