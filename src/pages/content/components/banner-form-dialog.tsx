import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { bannerApi } from '@/api/cms'
import { toastSuccess, toastWarning } from '@/lib/toast'
import type { Banner, BannerPayload } from '@/types/cms'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/date-input'
import { ImageUploadField } from '@/components/image/image-upload-field'

/** Khớp `CreateBannerReqDTO.ctaUrl`: `http(s)://…` hoặc `/path` (không `//`, không `javascript:`). */
const CTA_URL_PATTERN = /^(https?:\/\/\S+|\/(?!\/)\S*)$/

/** `yyyy-MM-dd` → đầu ngày / cuối ngày theo giờ máy, ISO UTC. */
const startOfDayIso = (date: string) => new Date(`${date}T00:00:00`).toISOString()
const endOfDayIso = (date: string) => new Date(`${date}T23:59:59`).toISOString()
const toDateValue = (iso: string | null) => (iso ? format(new Date(iso), 'yyyy-MM-dd') : '')

const buildSchema = (t: (key: string) => string) =>
    z
        .object({
            title: z
                .string()
                .trim()
                .min(1, t('banner.form.validation.titleRequired'))
                .max(150, t('banner.form.validation.titleMaxLength')),
            subtitle: z.string().trim().max(255, t('banner.form.validation.subtitleMaxLength')),
            ctaLabel: z.string().trim().max(100, t('banner.form.validation.ctaLabelMaxLength')),
            ctaUrl: z
                .string()
                .trim()
                .max(500, t('banner.form.validation.ctaUrlMaxLength'))
                .refine((value) => value === '' || CTA_URL_PATTERN.test(value), t('banner.form.validation.ctaUrlInvalid')),
            sortOrder: z
                .string()
                .trim()
                .refine((value) => value === '' || /^\d+$/.test(value), t('banner.form.validation.sortOrderInvalid')),
            effectiveFrom: z.string(),
            effectiveTo: z.string(),
        })
        .refine((v) => !v.effectiveFrom || !v.effectiveTo || v.effectiveFrom <= v.effectiveTo, {
            path: ['effectiveTo'],
            message: t('banner.form.validation.periodInvalid'),
        })

type BannerFormValues = z.infer<ReturnType<typeof buildSchema>>

type BannerFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới. */
    banner: Banner | null
    onCreate: (payload: BannerPayload) => Promise<Banner>
    onUpdate: (id: string, payload: BannerPayload) => Promise<void>
    /** Gọi **một lần khi dialog đóng** nếu ảnh đã đổi trên backend — màn ngoài phải nạp lại. */
    onMediaChanged?: () => void
}

const EMPTY: BannerFormValues = {
    title: '',
    subtitle: '',
    ctaLabel: '',
    ctaUrl: '',
    sortOrder: '',
    effectiveFrom: '',
    effectiveTo: '',
}

/**
 * Dialog thêm/sửa banner. v1 chỉ có vị trí `HOME_HERO` (D6) ⇒ **không có dropdown vị trí**, spec ảnh
 * cố định `HOME_HERO` (21:10 · 2520×1200, vùng an toàn 960×1200 giữa). Ảnh **chỉ upload** (P13.3).
 *
 * `PUT` là **thay toàn bộ** (đo 2026-10-13): field bỏ trống ⇒ null, nên form luôn gửi đủ bộ field đang hiển thị.
 * Khoảng hiệu lực để trống = không giới hạn.
 */
export function BannerFormDialog({ open, onOpenChange, banner, onCreate, onUpdate, onMediaChanged }: BannerFormDialogProps) {
    const { t } = useTranslation(['banner', 'common', 'image'])
    const isEdit = banner !== null
    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<BannerFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

    const [saved, setSaved] = useState<Banner | null>(null)
    const [stagedImage, setStagedImage] = useState<File | null>(null)
    const [imageBusy, setImageBusy] = useState(false)
    const mediaDirtyRef = useRef(false)

    useEffect(() => {
        if (open || !mediaDirtyRef.current) return
        mediaDirtyRef.current = false
        onMediaChanged?.()
    }, [open, onMediaChanged])

    useEffect(() => {
        if (!open) return
        setSaved(banner)
        setStagedImage(null)
        setImageBusy(false)
        form.reset(
            banner
                ? {
                      title: banner.title,
                      subtitle: banner.subtitle ?? '',
                      ctaLabel: banner.ctaLabel ?? '',
                      ctaUrl: banner.ctaUrl ?? '',
                      sortOrder: banner.sortOrder === null ? '' : String(banner.sortOrder),
                      effectiveFrom: toDateValue(banner.effectiveFrom),
                      effectiveTo: toDateValue(banner.effectiveTo),
                  }
                : EMPTY,
        )
    }, [open, banner, form])

    const onSubmit = async (values: BannerFormValues) => {
        const payload: BannerPayload = {
            title: values.title,
            // `PUT` thay toàn bộ: field bỏ trống ⇒ về null. `ctaUrl: ""` bị 400 (pattern) nên phải **bỏ field**.
            subtitle: values.subtitle || undefined,
            ctaLabel: values.ctaLabel || undefined,
            ctaUrl: values.ctaUrl || undefined,
            sortOrder: values.sortOrder === '' ? undefined : Number(values.sortOrder),
            effectiveFrom: values.effectiveFrom ? startOfDayIso(values.effectiveFrom) : undefined,
            effectiveTo: values.effectiveTo ? endOfDayIso(values.effectiveTo) : undefined,
        }
        try {
            if (isEdit) {
                await onUpdate(banner.id, payload)
            } else {
                const created = await onCreate(payload)
                // Tạo trước, upload sau (P13.3). Lỗi đã được api-client toast; không rollback banner.
                if (stagedImage) {
                    try {
                        await bannerApi.uploadImage(created.id, stagedImage)
                        mediaDirtyRef.current = true
                    } catch {
                        toastWarning('banner.toast.imageFailed', { ns: 'banner' })
                    }
                }
            }
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi (vd periodInvalid); giữ form mở để sửa lại.
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('banner:banner.form.editTitle') : t('banner:banner.form.addTitle')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        {/* Chỉ upload file (P13.3): sửa ⇒ gửi/xoá không có endpoint xoá riêng ⇒ chỉ thay ảnh. */}
                        <ImageUploadField
                            spec="HOME_HERO"
                            label={t('banner:banner.form.image')}
                            caption={
                                <>
                                    {t('banner:banner.form.imageCaption')}
                                    {saved && <> {t('image:field.appliesNow')}</>}
                                </>
                            }
                            savedLink={saved?.imageUrl ?? null}
                            pendingFile={stagedImage}
                            busy={imageBusy}
                            disabled={isSubmitting}
                            onSelectFile={async (file) => {
                                if (!saved) {
                                    setStagedImage(file)
                                    return
                                }
                                setImageBusy(true)
                                try {
                                    setSaved(await bannerApi.uploadImage(saved.id, file))
                                    mediaDirtyRef.current = true
                                    toastSuccess('field.uploaded', { ns: 'image' })
                                } catch {
                                    // api-client đã toast lỗi (quá 2MB, sai định dạng…).
                                } finally {
                                    setImageBusy(false)
                                }
                            }}
                            onRemove={() => {
                                // Backend không có `DELETE /banner/{id}/image` — chỉ gỡ được file đang chờ.
                                setStagedImage(null)
                            }}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="content-start">
                                    <FormLabel>
                                        {t('banner:banner.form.title')} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t('banner:banner.form.titlePlaceholder')} />
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
                                    <FormLabel>{t('banner:banner.form.subtitle')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t('banner:banner.form.subtitlePlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="ctaLabel"
                                render={({ field }) => (
                                    <FormItem className="content-start">
                                        <FormLabel>{t('banner:banner.form.ctaLabel')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t('banner:banner.form.ctaLabelPlaceholder')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ctaUrl"
                                render={({ field }) => (
                                    <FormItem className="content-start">
                                        <FormLabel>{t('banner:banner.form.ctaUrl')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t('banner:banner.form.ctaUrlPlaceholder')} />
                                        </FormControl>
                                        <FormDescription>{t('banner:banner.form.ctaUrlHelp')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="sortOrder"
                            render={({ field }) => (
                                <FormItem className="content-start sm:max-w-xs">
                                    <FormLabel>{t('banner:banner.form.sortOrder')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} inputMode="numeric" placeholder="0" />
                                    </FormControl>
                                    <FormDescription>{t('banner:banner.form.sortOrderHelp')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="effectiveFrom"
                                render={({ field }) => (
                                    <FormItem className="content-start">
                                        <FormLabel>{t('banner:banner.form.effectiveFrom')}</FormLabel>
                                        <FormControl>
                                            <DateInput value={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="effectiveTo"
                                render={({ field }) => (
                                    <FormItem className="content-start">
                                        <FormLabel>{t('banner:banner.form.effectiveTo')}</FormLabel>
                                        <FormControl>
                                            <DateInput value={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <p className="text-muted-foreground -mt-2 text-xs">{t('banner:banner.form.periodHelp')}</p>

                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting || imageBusy}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting
                                    ? t('banner:banner.form.submitting')
                                    : isEdit
                                      ? t('banner:banner.form.submitUpdate')
                                      : t('banner:banner.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
