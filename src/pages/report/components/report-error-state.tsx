import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Khối lỗi tại chỗ của một báo cáo — lỗi đã được `api-client` toast một lần,
 * ở đây chỉ cho người dùng đường thử lại mà không phải tải lại cả trang.
 */
export function ReportErrorState({ onRetry }: { onRetry: () => void }) {
    const { t } = useTranslation('report')
    return (
        <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>{t('report.common.error')}</AlertTitle>
            <AlertDescription>
                <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
                    {t('report.common.retry')}
                </Button>
            </AlertDescription>
        </Alert>
    )
}
