import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { setFormErrorFromApi } from '@/lib/form-error'
import { normalizeCode } from '@/lib/validation'
import type { Category, CategoryPayload } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SearchSelect } from '@/components/search-select'

/** Giá trị `Select` cho "không có danh mục cha" — Radix Select không nhận `value=""`. */
const NO_PARENT = '__none__'

const buildSchema = (t: (key: string) => string) =>
    z.object({
        code: z
            .string()
            .trim()
            .min(1, t('category.form.validation.codeRequired'))
            .max(50, t('category.form.validation.codeMaxLength')),
        name: z
            .string()
            .trim()
            .min(1, t('category.form.validation.nameRequired'))
            .max(150, t('category.form.validation.nameMaxLength')),
        parentId: z.string().optional(),
        sortOrder: z.string().optional(),
    })

type CategoryFormValues = z.infer<ReturnType<typeof buildSchema>>

type CategoryFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới, có giá trị = sửa. */
    category: Category | null
    /** Danh sách để chọn danh mục cha — đã loại sẵn chính nó và con cháu ở màn gọi. */
    parentOptions: Category[]
    onCreate: (payload: CategoryPayload) => Promise<void>
    onUpdate: (id: string, payload: CategoryPayload) => Promise<void>
}

/**
 * Dialog thêm/sửa danh mục theo `12-danh-muc-sp.png` (mockup chỉ vẽ nút "Thêm danh mục",
 * không vẽ form ⇒ dựng theo pattern form chuẩn — CONVENTIONS mục 6.2).
 *
 * `CreateCategoryReqDTO` và `UpdateCategoryReqDTO` có **cùng bộ field** (kể cả `code`),
 * khác `product` — nên form dùng chung cho cả 2 chế độ, không khoá field nào.
 */
export function CategoryFormDialog({
    open,
    onOpenChange,
    category,
    parentOptions,
    onCreate,
    onUpdate,
}: CategoryFormDialogProps) {
    const { t } = useTranslation(['product', 'common'])
    const isEdit = category !== null

    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { code: '', name: '', parentId: NO_PARENT, sortOrder: '' },
    })

    useEffect(() => {
        if (!open) return
        form.reset({
            code: category?.code ?? '',
            name: category?.name ?? '',
            parentId: category?.parentId ?? NO_PARENT,
            sortOrder: category?.sortOrder != null ? String(category.sortOrder) : '',
        })
    }, [open, category, form])

    const onSubmit = async (values: CategoryFormValues) => {
        const payload: CategoryPayload = {
            code: values.code,
            name: values.name,
            parentId: values.parentId === NO_PARENT ? undefined : values.parentId,
            sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
        }

        try {
            if (isEdit) {
                await onUpdate(category.id, payload)
            } else {
                await onCreate(payload)
            }
            onOpenChange(false)
        } catch (error) {
            setFormErrorFromApi(form, error, {}, 'code')
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('category.form.editTitle') : t('category.form.addTitle')}
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
                                            {t('category.form.code')}{' '}
                                            <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                // Chuẩn hoá ngay lúc gõ, cùng luật với backend.
                                                onChange={(event) =>
                                                    field.onChange(
                                                        normalizeCode(event.target.value),
                                                    )
                                                }
                                                placeholder={t('category.form.codePlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sortOrder"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('category.form.sortOrder')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="number"
                                                placeholder={t('category.form.sortOrderPlaceholder')}
                                            />
                                        </FormControl>
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
                                        {t('category.form.name')}{' '}
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('category.form.namePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="parentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('category.form.parent')}</FormLabel>
                                    {/* Cây danh mục có thể lớn ⇒ picker có ô tìm kiếm (lọc phía FE). */}
                                    <SearchSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder={t('category.form.parentPlaceholder')}
                                        options={[
                                            { value: NO_PARENT, label: t('category.form.parentNone') },
                                            ...parentOptions.map((option) => ({
                                                value: option.id,
                                                label: option.name,
                                                hint: option.code,
                                            })),
                                        ]}
                                    />
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
                                    ? t('category.form.submitting')
                                    : isEdit
                                      ? t('category.form.submitUpdate')
                                      : t('category.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
