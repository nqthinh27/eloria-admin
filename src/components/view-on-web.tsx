import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Nút **"Xem trên web"** ở modal chi tiết Sản phẩm / Danh mục (Phase 24 mục 3) — mở trang storefront
 * ở tab mới. Kèm chú thích độ trễ: R1 chưa có webhook revalidate nên thay đổi hiện sau 5–10 phút.
 *
 * `inactive` ⇒ web sẽ không hiện bản ghi này (trả "không tìm thấy") — nói rõ để admin không tưởng
 * nút hỏng.
 */
export function ViewOnWeb({ href, inactive = false }: { href: string; inactive?: boolean }) {
    const { t } = useTranslation('common')

    return (
        <div className="space-y-1">
            <Button asChild variant="outline" size="sm">
                <a href={href} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                    {t('viewOnWeb.button')}
                </a>
            </Button>
            <p className="text-muted-foreground text-xs">{t('viewOnWeb.delay')}</p>
            {inactive && <p className="text-xs text-amber-600">{t('viewOnWeb.inactive')}</p>}
        </div>
    )
}
