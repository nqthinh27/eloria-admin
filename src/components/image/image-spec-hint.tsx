import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatBytes, IMAGE_SPEC, type ImageSpecKey } from '@/lib/image-spec'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Dòng gợi ý đặt ngay dưới mọi ô ảnh: tỉ lệ · kích thước khuyến nghị · tối thiểu · định dạng · dung
 * lượng, kèm popover "Vì sao?" giải thích ảnh nằm trong khung nào bên web khách.
 *
 * Mọi con số lấy từ `IMAGE_SPEC` rồi nội suy — bản dịch không chứa số nào (PLAN Phase 22 mục 6).
 */
export function ImageSpecHint({ spec, className }: { spec: ImageSpecKey; className?: string }) {
    const { t } = useTranslation('image')
    const s = IMAGE_SPEC[spec]

    return (
        <p className={cn('text-muted-foreground text-xs leading-relaxed', className)}>
            {t('hint.line', {
                ratio: s.ratioLabel,
                rw: s.recommended.w,
                rh: s.recommended.h,
                mw: s.min.w,
                mh: s.min.h,
                formats: s.formats.map((f) => f.toUpperCase()).join('/'),
                size: formatBytes(s.maxBytes),
            })}{' '}
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="text-primary inline-flex items-center gap-0.5 align-baseline font-medium hover:underline">
                        <Info className="size-3" />
                        {t('hint.why')}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-1 text-sm" align="start">
                    <p className="font-medium">{t('hint.whyTitle')}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        {t(`why.${spec}`, {
                            ratio: s.ratioLabel,
                            mobileRatio: s.mobile?.ratioLabel,
                            // Phần bề ngang ảnh còn lại trên mobile = tỉ lệ khung mobile ÷ tỉ lệ ảnh gốc (§3).
                            visible: s.mobile
                                ? Number(((s.mobile.ratio / s.ratio) * 100).toFixed(1)).toLocaleString('vi-VN')
                                : undefined,
                        })}
                    </p>
                </PopoverContent>
            </Popover>
        </p>
    )
}
