import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Trang giữ chỗ cho các module sẽ dựng ở phase sau.
 * Có mặt để điều hướng của Phase 3 chạy được đầy đủ, không phải màn nghiệp vụ thật.
 */
export default function Placeholder({
    titleKey,
    phase,
}: {
    titleKey: string
    phase: number
}) {
    const { t } = useTranslation('menu')

    return (
        <>
            <PageHeader title={t(titleKey)} />
            <Card>
                <CardContent className="text-muted-foreground text-sm">
                    {t('shell.comingSoon')} (Phase {phase})
                </CardContent>
            </Card>
        </>
    )
}
