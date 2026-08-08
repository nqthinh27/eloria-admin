import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Nút "Xuất dữ liệu" chuẩn hoá vị trí (góc phải tiêu đề màn, theo `01/04/07`) — PLAN Phase 5.
 * Chưa có backend export, chỉ chuẩn hoá UI: 1 định dạng ⇒ nút đơn; nhiều định dạng ⇒ dropdown.
 */
export function ExportButton({
    onExportExcel,
    onExportPdf,
}: {
    onExportExcel: () => void
    onExportPdf?: () => void
}) {
    const { t } = useTranslation('common')

    if (!onExportPdf) {
        return (
            <Button variant="outline" onClick={onExportExcel}>
                <Download />
                {t('action.export')}
            </Button>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Download />
                    {t('action.export')}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onExportExcel}>
                    {t('action.exportExcel')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onExportPdf}>{t('action.exportPdf')}</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
