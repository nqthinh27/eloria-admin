import type { Control, FieldValues, Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/** Trần của backend (`@Size`) — vượt ⇒ HTTP 400. */
export const META_TITLE_MAX = 150
export const META_DESCRIPTION_MAX = 300
/** Độ dài **khuyến nghị** để Google không cắt chữ ở kết quả tìm kiếm (chỉ gợi ý, không chặn). */
const META_TITLE_RECOMMENDED = 60
const META_DESCRIPTION_RECOMMENDED = 160

/** Hai field SEO mà form chứa `SeoFields` phải có. */
export type SeoFormValues = { metaTitle: string; metaDescription: string }

function Counter({ length, recommended, max }: { length: number; recommended: number; max: number }) {
    const { t } = useTranslation('common')
    return (
        <span
            className={cn(
                'text-muted-foreground tabular-nums',
                length > recommended && 'text-amber-600',
                length >= max && 'text-destructive',
            )}>
            {t('seo.counter', { length, recommended, max })}
        </span>
    )
}

/**
 * Khối **SEO (tuỳ chọn)** dùng chung cho form Sản phẩm + Danh mục (Phase 24 mục 2): `metaTitle`,
 * `metaDescription` và **slug chỉ đọc** để admin biết URL trên web.
 *
 * Để trống ⇒ storefront tự sinh từ tên/mô tả — ghi chú ngay dưới ô. Form cha nhớ gửi **chuỗi đã
 * trim** (`""` ⇒ xoá).
 *
 * `slug` là `null` khi thêm mới: backend tự sinh sau khi tạo nên chưa có để hiện.
 */
export function SeoFields<T extends FieldValues & SeoFormValues>({
    control,
    slug,
    titleValue,
    descriptionValue,
    disabled,
}: {
    control: Control<T>
    slug: string | null
    /** Giá trị đang gõ — để đếm ký tự (form cha `watch`). */
    titleValue: string
    descriptionValue: string
    disabled?: boolean
}) {
    const { t } = useTranslation('common')

    return (
        <section className="space-y-4 border-t pt-4">
            <div>
                <h3 className="text-sm font-semibold">{t('seo.title')}</h3>
                <p className="text-muted-foreground text-xs">{t('seo.subtitle')}</p>
            </div>

            <div>
                <p className="text-sm leading-none font-medium">{t('seo.slug')}</p>
                {slug ? (
                    <p className="text-muted-foreground mt-2 font-mono text-xs break-all">/{slug}</p>
                ) : (
                    <p className="text-muted-foreground mt-2 text-xs">{t('seo.slugAfterCreate')}</p>
                )}
            </div>

            <FormField
                control={control}
                name={'metaTitle' as Path<T>}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('seo.metaTitle')}</FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                value={field.value ?? ''}
                                maxLength={META_TITLE_MAX}
                                disabled={disabled}
                                placeholder={t('seo.metaTitlePlaceholder')}
                            />
                        </FormControl>
                        <div className="flex items-start justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">{t('seo.emptyFallback')}</span>
                            <Counter
                                length={titleValue.length}
                                recommended={META_TITLE_RECOMMENDED}
                                max={META_TITLE_MAX}
                            />
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name={'metaDescription' as Path<T>}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('seo.metaDescription')}</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                value={field.value ?? ''}
                                rows={3}
                                maxLength={META_DESCRIPTION_MAX}
                                disabled={disabled}
                                placeholder={t('seo.metaDescriptionPlaceholder')}
                            />
                        </FormControl>
                        <div className="flex items-start justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">{t('seo.emptyFallback')}</span>
                            <Counter
                                length={descriptionValue.length}
                                recommended={META_DESCRIPTION_RECOMMENDED}
                                max={META_DESCRIPTION_MAX}
                            />
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>
    )
}
