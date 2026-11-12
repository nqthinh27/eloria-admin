import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Eye, Images, Loader2, PenLine } from 'lucide-react'
import { z } from 'zod'

import { aboutPageApi } from '@/api/cms'
import { storefrontUrl } from '@/config/app'
import { setFormErrorFromApi } from '@/lib/form-error'
import { formatDateTime } from '@/lib/format'
import { resolveImageSrc } from '@/lib/image-spec'
import { toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { AboutPage, AboutPagePayload } from '@/types/cms'
import { ImageUploadField } from '@/components/image/image-upload-field'
import { PageHeader } from '@/components/page-header'
import { META_DESCRIPTION_MAX, META_TITLE_MAX, SeoFields } from '@/components/seo-fields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ViewOnWeb } from '@/components/view-on-web'
import { RichTextEditor } from './components/rich-text-editor'
import { AboutPreview, StorePreviewDialog } from './components/store-preview'

/** Đường dẫn trang trên storefront (`35.3.eloria-client` — route viết cứng). */
const STORE_PATH = 'trang/gioi-thieu'
const SLOT_COUNT = 5

/** Backend trả 400 nếu title/subtitle/meta chứa `<` hoặc `>`. */
const NO_ANGLE = /^[^<>]*$/

/** Ràng buộc lấy từ `UpdateAboutPageReqDTO` (backend P15.2). */
const buildSchema = (t: (key: string) => string) => {
    const noAngle = t('validation.noAngleBrackets')
    return z.object({
        title: z
            .string()
            .trim()
            .min(1, t('validation.titleRequired'))
            .max(150, t('validation.titleMaxLength'))
            .regex(NO_ANGLE, noAngle),
        subtitle: z.string().trim().max(255, t('validation.subtitleMaxLength')).regex(NO_ANGLE, noAngle),
        content: z.string().max(200000, t('validation.contentMaxLength')),
        metaTitle: z.string().trim().max(META_TITLE_MAX, t('validation.metaTitleMaxLength')).regex(NO_ANGLE, noAngle),
        metaDescription: z
            .string()
            .trim()
            .max(META_DESCRIPTION_MAX, t('validation.metaDescriptionMaxLength'))
            .regex(NO_ANGLE, noAngle),
    })
}

type AboutFormValues = z.infer<ReturnType<typeof buildSchema>>

const toValues = (page: AboutPage): AboutFormValues => ({
    title: page.title,
    subtitle: page.subtitle ?? '',
    content: page.content ?? '',
    metaTitle: page.metaTitle ?? '',
    metaDescription: page.metaDescription ?? '',
})

/** Ảnh web sẽ hiện: bỏ ô trống, số chẵn thì bỏ ảnh cuối — **cùng luật với backend** (`StoreContentMapper.oddImages`). */
function shownImages(images: (string | null)[]): string[] {
    const filled = images.filter((url): url is string => !!url)
    return filled.length % 2 === 0 ? filled.slice(0, Math.max(0, filled.length - 1)) : filled
}

/**
 * Màn **Nội dung / Về chúng tôi** (backend P15.2) — bảng 1 bản ghi nên **không có danh sách/lưới**:
 * mở ra là form sửa trực tiếp.
 *
 * - **Ảnh đầu trang** (5 ô theo slot): chọn ảnh là upload + lưu ngay (giống ảnh sản phẩm khi sửa); đổi chỗ
 *   bằng mũi tên (`PUT /image-order`). Có khung xem trước bố cục "to dần về giữa" đúng số ảnh web sẽ hiện.
 * - **Nội dung chữ** (tiêu đề, dòng giới thiệu, rich text, SEO): lưu bằng nút "Lưu nội dung".
 */
export default function AboutUsPage() {
    const { t } = useTranslation('aboutPage')
    const schema = useMemo(() => buildSchema(t), [t])
    const form = useForm<AboutFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { title: '', subtitle: '', content: '', metaTitle: '', metaDescription: '' },
    })

    const [page, setPage] = useState<AboutPage | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadFailed, setLoadFailed] = useState(false)
    const [busySlot, setBusySlot] = useState<number | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)

    const load = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true)
            setLoadFailed(false)
            try {
                const data = await aboutPageApi.get(signal)
                setPage(data)
                form.reset(toValues(data))
            } catch {
                if (signal?.aborted) return
                setLoadFailed(true)
            } finally {
                if (!signal?.aborted) setLoading(false)
            }
        },
        [form],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    const onSubmit = async (values: AboutFormValues) => {
        const payload: AboutPagePayload = {
            title: values.title,
            subtitle: values.subtitle || undefined,
            // Luôn gửi `content` (kể cả "") — không gửi mới là "giữ nguyên".
            content: values.content,
            metaTitle: values.metaTitle || undefined,
            metaDescription: values.metaDescription || undefined,
        }
        try {
            const saved = await aboutPageApi.update(payload)
            setPage(saved)
            form.reset(toValues(saved))
            toastSuccess('toast.saved', { ns: 'aboutPage' })
        } catch (error) {
            setFormErrorFromApi(form, error)
        }
    }

    /** Gọi API ảnh cho 1 ô; lỗi đã được api-client toast. Chỉ cập nhật `page` (không đụng form chữ đang soạn). */
    const runImage = async (slot: number, action: () => Promise<AboutPage>, toastKey: string) => {
        setBusySlot(slot)
        try {
            setPage(await action())
            toastSuccess(toastKey, { ns: 'aboutPage' })
        } catch {
            // api-client đã toast lỗi (quá 15MB, sai định dạng…).
        } finally {
            setBusySlot(null)
        }
    }

    const swap = (index: number, target: number) => {
        const order = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1)
        ;[order[index], order[target]] = [order[target], order[index]]
        void runImage(index + 1, () => aboutPageApi.updateImageOrder(order), 'toast.imageSaved')
    }

    const isSubmitting = form.formState.isSubmitting
    const watched = form.watch()

    if (loading && !page) {
        return (
            <div>
                <PageHeader title={t('pageTitle')} description={t('pageDescription')} />
                <div className="space-y-4">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        )
    }

    if (loadFailed || !page) {
        return (
            <div>
                <PageHeader title={t('pageTitle')} description={t('pageDescription')} />
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                    {t('loadFailed')}
                    <Button variant="outline" size="sm" onClick={() => void load()}>
                        {t('retry')}
                    </Button>
                </div>
            </div>
        )
    }

    const filled = page.images.filter(Boolean).length
    const shown = shownImages(page.images)

    return (
        <div>
            <PageHeader
                title={t('pageTitle')}
                description={t('pageDescription')}
                actions={
                    <>
                        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setPreviewOpen(true)}>
                            <Eye className="size-4" />
                            {t('common:storePreview.button')}
                        </Button>
                        <ViewOnWeb href={`${storefrontUrl}/${STORE_PATH}`} />
                    </>
                }
            />

            <StorePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} title={t('pageTitle')}>
                <AboutPreview
                    images={shown}
                    title={watched.title}
                    subtitle={watched.subtitle}
                    content={watched.content}
                />
            </StorePreviewDialog>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Images className="size-4" />
                        {t('images.title')}
                    </CardTitle>
                    <CardDescription>{t('images.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                        {page.images.map((url, index) => {
                            const slot = index + 1
                            return (
                                <div key={slot} className="space-y-2">
                                    <ImageUploadField
                                        spec="ABOUT_STRIP"
                                        label={t('images.slot', { n: slot })}
                                        caption={t('images.caption')}
                                        savedLink={url}
                                        busy={busySlot === slot}
                                        disabled={busySlot !== null}
                                        onSelectFile={(file) =>
                                            runImage(slot, () => aboutPageApi.uploadImage(slot, file), 'toast.imageSaved')
                                        }
                                        onRemove={() =>
                                            runImage(slot, () => aboutPageApi.deleteImage(slot), 'toast.imageRemoved')
                                        }
                                    />
                                    <div className="flex justify-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            title={t('images.moveLeft')}
                                            aria-label={t('images.moveLeft')}
                                            disabled={index === 0 || busySlot !== null}
                                            onClick={() => swap(index, index - 1)}>
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            title={t('images.moveRight')}
                                            aria-label={t('images.moveRight')}
                                            disabled={index === SLOT_COUNT - 1 || busySlot !== null}
                                            onClick={() => swap(index, index + 1)}>
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <p className={cn('text-sm', filled > 0 && filled % 2 === 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                        {filled === 0
                            ? t('images.countNone')
                            : filled % 2 === 0
                              ? t('images.countEven', { filled, shown: shown.length })
                              : t('images.count', { filled, shown: shown.length })}
                    </p>

                    {shown.length > 0 && <StripPreview images={shown} />}
                </CardContent>
            </Card>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <PenLine className="size-4" />
                        {t('content.title')}
                    </CardTitle>
                    <CardDescription>{t('content.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form id="about-page-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem className="content-start">
                                            <FormLabel>
                                                {t('content.heading')} <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder={t('content.headingPlaceholder')} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="subtitle"
                                    render={({ field }) => (
                                        <FormItem className="content-start">
                                            <FormLabel>{t('content.subtitle')}</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder={t('content.subtitlePlaceholder')} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem className="content-start">
                                        <FormLabel>{t('content.body')}</FormLabel>
                                        <RichTextEditor value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <SeoFields
                                control={form.control}
                                slug={STORE_PATH}
                                titleValue={watched.metaTitle}
                                descriptionValue={watched.metaDescription}
                                disabled={isSubmitting}
                            />
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Thanh lưu ghim đáy — form dài (editor + SEO), không bắt admin cuộn xuống cuối mới lưu được. */}
            <div className="bg-card sticky bottom-0 z-20 mt-4 rounded-md border shadow-sm">
                <div className="flex items-center justify-end gap-3 px-4 py-3">
                    <span className="text-muted-foreground mr-auto text-xs">
                        {form.formState.isDirty
                            ? t('unsaved')
                            : page.lastModifiedDate
                              ? t('lastSaved', { time: formatDateTime(page.lastModifiedDate) })
                              : null}
                    </span>
                    <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                        <Eye className="size-4" />
                        {t('common:storePreview.button')}
                    </Button>
                    <Button type="submit" form="about-page-form" disabled={isSubmitting || !form.formState.isDirty}>
                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                        {isSubmitting ? t('submitting') : t('submit')}
                    </Button>
                </div>
            </div>
        </div>
    )
}

/** Mô phỏng dải ảnh trên web: cùng khung 3:4, to dần về giữa (thu nhỏ theo khoảng cách tới ảnh giữa). */
function StripPreview({ images }: { images: string[] }) {
    const { t } = useTranslation('aboutPage')
    const center = (images.length - 1) / 2
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{t('images.preview')}</p>
            <div className="bg-muted/40 flex items-center justify-center gap-2 overflow-hidden rounded-md p-4">
                {images.map((url, index) => {
                    const distance = Math.abs(index - center)
                    return (
                        <img
                            key={`${url}-${index}`}
                            src={resolveImageSrc(url)}
                            alt={distance === 0 ? t('images.center') : ''}
                            className={cn(
                                'aspect-[3/4] shrink-0 rounded-sm object-cover shadow-sm',
                                distance === 0 ? 'w-32' : distance === 1 ? 'w-24' : 'w-16',
                            )}
                        />
                    )
                })}
            </div>
        </div>
    )
}
