import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { normalizeCode } from '@/lib/validation'
import type { Brand, BrandPayload } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageLinkField } from '@/components/image/image-link-field'

/** Ràng buộc lấy từ `CreateBrandReqDTO`/`UpdateBrandReqDTO` (cùng bộ field). */
const buildSchema = (t: (key: string) => string) =>
    z.object({
        code: z
            .string()
            .min(1, t('brand.form.validation.codeRequired'))
            .max(50, t('brand.form.validation.codeMaxLength')),
        name: z
            .string()
            .trim()
            .min(1, t('brand.form.validation.nameRequired'))
            .max(150, t('brand.form.validation.nameMaxLength')),
        address: z.string().trim().max(255, t('brand.form.validation.addressMaxLength')),
        logoUrl: z.string().trim().max(256, t('brand.form.validation.logoUrlMaxLength')),
        description: z.string().trim().max(500, t('brand.form.validation.descriptionMaxLength')),
    })

type BrandFormValues = z.infer<ReturnType<typeof buildSchema>>

type BrandFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới. */
    brand: Brand | null
    onCreate: (payload: BrandPayload) => Promise<void>
    onUpdate: (id: string, payload: BrandPayload) => Promise<void>
}

/** Dialog thêm/sửa thương hiệu. Sửa được cả `code` (khác Sản phẩm) — backend kiểm tra trùng loại trừ chính nó. */
export function BrandFormDialog({ open, onOpenChange, brand, onCreate, onUpdate }: BrandFormDialogProps) {
    const { t } = useTranslation(['brand', 'common', 'image'])
    const isEdit = brand !== null
    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<BrandFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { code: '', name: '', address: '', logoUrl: '', description: '' },
    })

    const [logoBlocked, setLogoBlocked] = useState(false)

    useEffect(() => {
        if (!open) return
        setLogoBlocked(false)
        form.reset({
            code: brand?.code ?? '',
            name: brand?.name ?? '',
            address: brand?.address ?? '',
            logoUrl: brand?.logoUrl ?? '',
            description: brand?.description ?? '',
        })
    }, [open, brand, form])

    const onSubmit = async (values: BrandFormValues) => {
        // Logo dưới kích thước tối thiểu ⇒ chặn lưu (cảnh báo đã hiện ngay dưới ô logo).
        if (logoBlocked) return
        const payload: BrandPayload = {
            code: values.code,
            name: values.name,
            address: values.address || undefined,
            logoUrl: values.logoUrl || undefined,
            description: values.description || undefined,
        }
        try {
            if (isEdit) await onUpdate(brand.id, payload)
            else await onCreate(payload)
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi (vd trùng mã); giữ form mở để sửa lại.
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('brand.form.editTitle') : t('brand.form.addTitle')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('brand.form.code')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                // Chuẩn hoá ngay lúc gõ, cùng luật với backend.
                                                onChange={(event) => field.onChange(normalizeCode(event.target.value))}
                                                placeholder={t('brand.form.codePlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('brand.form.name')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t('brand.form.namePlaceholder')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('brand.form.address')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t('brand.form.addressPlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                                <FormItem>
                                    {/* Ô link + kiểm tra kích thước/tỉ lệ theo LOGO_SQUARE (PLAN Phase 22). */}
                                    <ImageLinkField
                                        spec="LOGO_SQUARE"
                                        label={t('brand.form.logoUrl')}
                                        value={field.value}
                                        onChange={field.onChange}
                                        onInspect={(result) => setLogoBlocked(result?.status === 'blocked')}
                                        maxLength={256}
                                    />
                                    {logoBlocked && (
                                        <p className="text-destructive text-xs">
                                            {t('image:field.blockedNotice')}
                                        </p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('brand.form.description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            rows={3}
                                            placeholder={t('brand.form.descriptionPlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting
                                    ? t('brand.form.submitting')
                                    : isEdit
                                      ? t('brand.form.submitUpdate')
                                      : t('brand.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
