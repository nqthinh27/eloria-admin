import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Trang giữ chỗ. Nội dung thật (KPI card, biểu đồ doanh thu, tình trạng kho,
 * so sánh chi nhánh) được dựng ở PLAN Phase 15 theo `design/01-dashboard-bao-cao.png`.
 */
export default function Dashboard() {
    const { t } = useTranslation('menu')

    return (
        <>
            <PageHeader
                title={t('menu.dashboard')}
                description={t('shell.allBranches')}
            />
            <Card>
                <CardContent className="text-muted-foreground text-sm">
                    {t('shell.comingSoon')} (Phase 15)
                </CardContent>
            </Card>
        </>
    )
}
