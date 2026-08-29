import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { z } from 'zod'

import { setFormErrorFromApi } from '@/lib/form-error'
import { normalizeCode } from '@/lib/validation'
import { EGender } from '@/types/common'
import { EMaterial } from '@/types/product'
import type { Brand, Category, CreateProductReq, Product, UpdateProductReq } from '@/types/product'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchSelect } from '@/components/search-select'

/** Radix Select không nhận `value=""` ⇒ dùng sentinel cho lựa chọn "để trống". */
const NONE = '__none__'

const buildSchema = (t: (key: string) => string, isEdit: boolean) =>
    z.object({
        code: isEdit
            ? z.string().optional()
            : z
                  .string()
                  .trim()
                  .min(1, t('product.form.validation.codeRequired'))
                  .max(50, t('product.form.validation.codeMaxLength')),
        name: z
            .string()
            .trim()
            .min(1, t('product.form.validation.nameRequired'))
            .max(200, t('product.form.validation.nameMaxLength')),
        price: z
            .string()
            .min(1, t('product.form.validation.priceRequired'))
            .refine((v) => Number(v) >= 0, t('product.form.validation.priceMin')),
        // Giá vốn **tuỳ chọn** ⇒ chuỗi rỗng hợp lệ; chỉ chặn số âm (backend `@DecimalMin(0)`).
        costPrice: z
            .string()
            .refine(
                (v) => v.trim() === '' || Number(v) >= 0,
                t('product.form.validation.costPriceMin'),
            ),
        brandId: z.string().optional(),
        material: z.string().optional(),
        gender: z.string().optional(),
        sizeGroup: z.string().optional(),
        categoryIds: z.array(z.string()),
        shortDescription: z.string().optional(),
        description: z.string().optional(),
    })

type ProductFormValues = z.infer<ReturnType<typeof buildSchema>>

type ProductFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới, có giá trị = sửa. */
    product: Product | null
    brands: Brand[]
    categories: Category[]
    /** Các nhóm size có thật trong bảng `size` (vd `Áo`, `Quần`) — nguồn để dựng ma trận SKU. */
    sizeGroups: string[]
    onCreate: (payload: CreateProductReq) => Promise<void>
    onUpdate: (id: string, payload: UpdateProductReq) => Promise<void>
}

/**
 * Dialog thêm/sửa sản phẩm cha theo `11-san-pham.png` (mockup chỉ vẽ nút "Thêm sản phẩm",
 * không vẽ form ⇒ pattern form chuẩn, CONVENTIONS mục 6.2).
 *
 * `UpdateProductReqDTO` **không có `code`** ⇒ khi sửa, field mã hiển thị nhưng bị khoá.
 * `material` là **enum fix cứng** phía backend (COTTON|LINEN|SILK|WOOL), không có API danh mục
 * chất liệu — FE fix cứng đúng 4 giá trị (chốt cùng user 2026-08-09).
 */
export function ProductFormDialog({
    open,
    onOpenChange,
    product,
    brands,
    categories,
    sizeGroups,
    onCreate,
    onUpdate,
}: ProductFormDialogProps) {
    const { t } = useTranslation(['product', 'common'])
    const isEdit = product !== null

    const schema = useMemo(() => buildSchema(t, isEdit), [t, isEdit])

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: '',
            name: '',
            price: '',
            costPrice: '',
            brandId: NONE,
            material: NONE,
            gender: NONE,
            sizeGroup: NONE,
            categoryIds: [],
            shortDescription: '',
            description: '',
        },
    })

    useEffect(() => {
        if (!open) return
        form.reset({
            code: product?.code ?? '',
            name: product?.name ?? '',
            price: product ? String(product.price) : '',
            costPrice: product?.costPrice != null ? String(product.costPrice) : '',
            brandId: product?.brandId ?? NONE,
            material: product?.material ?? NONE,
            gender: product?.gender ?? NONE,
            sizeGroup: product?.sizeGroup ?? NONE,
            categoryIds: product?.categories.map((c) => c.id) ?? [],
            shortDescription: product?.shortDescription ?? '',
            description: product?.description ?? '',
        })
    }, [open, product, form])

    const onSubmit = async (values: ProductFormValues) => {
        const common = {
            name: values.name,
            price: Number(values.price),
            // Bỏ trống ⇒ **không gửi field**: khi tạo là "chưa có giá vốn", khi sửa là
            // "giữ nguyên giá cũ" (backend partial-update, không xoá về null).
            costPrice: values.costPrice.trim() === '' ? undefined : Number(values.costPrice),
            brandId: values.brandId === NONE ? undefined : values.brandId,
            material: values.material === NONE ? undefined : (values.material as EMaterial),
            gender: values.gender === NONE ? undefined : (values.gender as EGender),
            sizeGroup: values.sizeGroup === NONE ? undefined : values.sizeGroup,
            categoryIds: values.categoryIds,
            shortDescription: values.shortDescription || undefined,
            description: values.description || undefined,
        }

        try {
            if (isEdit) {
                await onUpdate(product.id, common)
            } else {
                await onCreate({ ...common, code: values.code! })
            }
            onOpenChange(false)
        } catch (error) {
            setFormErrorFromApi(form, error, {}, isEdit ? 'name' : 'code')
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('product.form.editTitle') : t('product.form.addTitle')}
                    </DialogTitle>
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
                                            {t('product.form.code')}
                                            {!isEdit && <span className="text-destructive"> *</span>}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ''}
                                                disabled={isEdit}
                                                // Chuẩn hoá ngay lúc gõ, cùng luật với backend.
                                                onChange={(event) =>
                                                    field.onChange(
                                                        normalizeCode(event.target.value),
                                                    )
                                                }
                                                placeholder={t('product.form.codePlaceholder')}
                                            />
                                        </FormControl>
                                        {isEdit && (
                                            <p className="text-muted-foreground text-xs">
                                                {t('product.form.codeLockedHint')}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('product.form.price')}{' '}
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min={0}
                                                placeholder={t('product.form.pricePlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/*
                              Giá vốn — Phase 7 đợt 1. Dialog này chỉ mở được khi `canWrite`
                              (= SUPER_ADMIN, xem ProductListPage) nên không cần gate thêm ở đây.
                            */}
                            <FormField
                                control={form.control}
                                name="costPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('product.form.costPrice')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                min={0}
                                                placeholder={t('product.form.costPricePlaceholder')}
                                            />
                                        </FormControl>
                                        <p className="text-muted-foreground text-xs">
                                            {isEdit
                                                ? t('product.form.costPriceKeepHint')
                                                : t('product.form.costPriceHint')}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('product.form.name')}{' '}
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('product.form.namePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="brandId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('product.form.brand')}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('product.form.brandPlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>
                                                    {t('product.form.brandPlaceholder')}
                                                </SelectItem>
                                                {brands.map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="material"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('product.form.material')}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('product.form.materialPlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>
                                                    {t('product.form.materialPlaceholder')}
                                                </SelectItem>
                                                {Object.values(EMaterial).map((m) => (
                                                    <SelectItem key={m} value={m}>
                                                        {m}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('product.form.gender')}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('product.form.genderPlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>
                                                    {t('product.form.genderPlaceholder')}
                                                </SelectItem>
                                                <SelectItem value={EGender.MALE}>
                                                    {t('product.detail.genderMale')}
                                                </SelectItem>
                                                <SelectItem value={EGender.FEMALE}>
                                                    {t('product.detail.genderFemale')}
                                                </SelectItem>
                                                <SelectItem value={EGender.OTHER}>
                                                    {t('product.detail.genderOther')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sizeGroup"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('product.form.sizeGroup')}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('product.form.sizeGroupPlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={NONE}>
                                                    {t('product.form.sizeGroupPlaceholder')}
                                                </SelectItem>
                                                {sizeGroups.map((g) => (
                                                    <SelectItem key={g} value={g}>
                                                        {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-muted-foreground text-xs">
                                            {t('product.form.sizeGroupHint')}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="categoryIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('product.form.categories')}</FormLabel>
                                    {/* Chọn nhiều + có ô tìm kiếm — danh mục có thể rất nhiều. */}
                                    <SearchSelect
                                        multiple
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder={t('product.form.categoriesPlaceholder')}
                                        options={categories.map((c) => ({
                                            value: c.id,
                                            label: c.name,
                                            hint: c.code,
                                        }))}
                                    />
                                    {/* Hiện danh mục đã chọn dạng chip để không phải mở dropdown mới biết. */}
                                    {field.value.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {field.value.map((id) => {
                                                const found = categories.find((c) => c.id === id)
                                                if (!found) return null
                                                return (
                                                    <Badge
                                                        key={id}
                                                        variant="secondary"
                                                        className="gap-1">
                                                        {found.name}
                                                        <button
                                                            type="button"
                                                            aria-label={t('common:searchSelect.removeItem', { name: found.name })}
                                                            onClick={() =>
                                                                field.onChange(
                                                                    field.value.filter(
                                                                        (v) => v !== id,
                                                                    ),
                                                                )
                                                            }>
                                                            <X className="size-3" />
                                                        </button>
                                                    </Badge>
                                                )
                                            })}
                                        </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="shortDescription"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('product.form.shortDescription')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder={t('product.form.shortDescriptionPlaceholder')}
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
                                    ? t('product.form.submitting')
                                    : isEdit
                                      ? t('product.form.submitUpdate')
                                      : t('product.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
