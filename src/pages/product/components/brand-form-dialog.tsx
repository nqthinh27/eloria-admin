import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { toastSuccess, toastWarning } from '@/lib/toast'
import { normalizeCode } from '@/lib/validation'
import type { Brand, BrandPayload } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploadField } from '@/components/image/image-upload-field'
import { brandApi } from '@/api/product'

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
        description: z.string().trim().max(500, t('brand.form.validation.descriptionMaxLength')),
    })

type BrandFormValues = z.infer<ReturnType<typeof buildSchema>>

type BrandFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới. */
    brand: Brand | null
    /** Trả thương hiệu vừa tạo (cần `id` để upload logo đã chọn). */
    onCreate: (payload: BrandPayload) => Promise<Brand>
    onUpdate: (id: string, payload: BrandPayload) => Promise<void>
    /** Gọi **một lần khi dialog đóng** nếu đã upload/xoá logo (BE31) — màn ngoài phải nạp lại. */
    onMediaChanged?: () => void
}

/** Dialog thêm/sửa thương hiệu. Sửa được cả `code` (khác Sản phẩm) — backend kiểm tra trùng loại trừ chính nó. */
export function BrandFormDialog({ open, onOpenChange, brand, onCreate, onUpdate, onMediaChanged }: BrandFormDialogProps) {
    const { t } = useTranslation(['brand', 'common', 'image'])
    const isEdit = brand !== null
    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<BrandFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { code: '', name: '', address: '', description: '' },
    })

    /** Bản ghi mới nhất (cập nhật theo DTO mỗi lần upload/xoá logo) — prop `brand` chỉ là ảnh chụp lúc mở. */
    const [saved, setSaved] = useState<Brand | null>(null)
    /** Thêm mới: logo đã chọn, chờ có `id` (sau khi `POST /brand`) mới upload. */
    const [stagedLogo, setStagedLogo] = useState<File | null>(null)
    const [logoBusy, setLogoBusy] = useState(false)
    /** Logo đã đổi trên backend trong lúc dialog mở ⇒ nạp lại danh sách một lần khi đóng. */
    const mediaDirtyRef = useRef(false)
    useEffect(() => {
        if (open || !mediaDirtyRef.current) return
        mediaDirtyRef.current = false
        onMediaChanged?.()
    }, [open, onMediaChanged])

    useEffect(() => {
        if (!open) return
        setSaved(brand)
        setStagedLogo(null)
        setLogoBusy(false)
        form.reset({
            code: brand?.code ?? '',
            name: brand?.name ?? '',
            address: brand?.address ?? '',
            description: brand?.description ?? '',
        })
    }, [open, brand, form])

    const onSubmit = async (values: BrandFormValues) => {
        const payload: BrandPayload = {
            code: values.code,
            name: values.name,
            address: values.address || undefined,
            description: values.description || undefined,
        }
        try {
            if (isEdit) {
                await onUpdate(brand.id, payload)
            } else {
                const created = await onCreate(payload)
                // Tạo trước, upload sau (P13.3). Lỗi đã được api-client toast; không rollback thương hiệu.
                if (stagedLogo) {
                    try {
                        await brandApi.uploadLogo(created.id, stagedLogo)
                        mediaDirtyRef.current = true
                    } catch {
                        toastWarning('brand.toast.logoFailed', { ns: 'brand' })
                    }
                }
            }
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

                        {/* Chỉ upload file (P13.3): sửa ⇒ gửi/xoá ngay; thêm mới ⇒ giữ chờ tới khi tạo xong. */}
                        <ImageUploadField
                            spec="LOGO_SQUARE"
                            label={t('brand.form.logo')}
                            caption={saved ? t('image:field.appliesNow') : undefined}
                            savedLink={saved?.logoUrl ?? null}
                            pendingFile={stagedLogo}
                            busy={logoBusy}
                            disabled={isSubmitting}
                            onSelectFile={async (file) => {
                                if (!saved) {
                                    setStagedLogo(file)
                                    return
                                }
                                setLogoBusy(true)
                                try {
                                    setSaved(await brandApi.uploadLogo(saved.id, file))
                                    mediaDirtyRef.current = true
                                    toastSuccess('field.uploaded', { ns: 'image' })
                                } catch {
                                    // api-client đã toast lỗi (quá 2MB, sai định dạng…).
                                } finally {
                                    setLogoBusy(false)
                                }
                            }}
                            onRemove={async () => {
                                if (!saved) {
                                    setStagedLogo(null)
                                    return
                                }
                                setLogoBusy(true)
                                try {
                                    setSaved(await brandApi.deleteLogo(saved.id))
                                    mediaDirtyRef.current = true
                                    toastSuccess('field.removed', { ns: 'image' })
                                } catch {
                                    // api-client đã toast lỗi.
                                } finally {
                                    setLogoBusy(false)
                                }
                            }}
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
