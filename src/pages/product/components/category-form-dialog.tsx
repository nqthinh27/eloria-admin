import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { setFormErrorFromApi } from '@/lib/form-error'
import { COVER_ROTATE_MS } from '@/lib/image-spec'
import { normalizeCode } from '@/lib/validation'
import type { Category, CategoryPayload } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SearchSelect } from '@/components/search-select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CoverSlidesPreview } from '@/components/image/cover-slides-preview'
import { HoverSwapPreview } from '@/components/image/hover-swap-preview'
import { ImageLinkField } from '@/components/image/image-link-field'

/** Giá trị `Select` cho "không có danh mục cha" — Radix Select không nhận `value=""`. */
const NO_PARENT = '__none__'

/** 5 ô cover theo đúng thứ tự chạy slideshow. */
const COVER_FIELDS = ['coverLink1', 'coverLink2', 'coverLink3', 'coverLink4', 'coverLink5'] as const
type ImageFieldName = 'imageLink1' | 'imageLink2' | (typeof COVER_FIELDS)[number]

const buildSchema = (t: (key: string) => string) => {
    const link = z.string().trim().max(500, t('category.form.validation.linkMaxLength'))
    return z.object({
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
        description: z.string().trim().max(500, t('category.form.validation.descriptionMaxLength')),
        imageLink1: link,
        imageLink2: link,
        coverLink1: link,
        coverLink2: link,
        coverLink3: link,
        coverLink4: link,
        coverLink5: link,
        isDefault: z.boolean(),
    })
}

type CategoryFormValues = z.infer<ReturnType<typeof buildSchema>>

type CategoryFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới, có giá trị = sửa. */
    category: Category | null
    /** Danh sách để chọn danh mục cha — đã loại sẵn chính nó và con cháu ở màn gọi. */
    parentOptions: Category[]
    /** Danh mục đang giữ cờ mặc định (nếu có) — để báo trước "bật ở đây sẽ tự tắt ở danh mục kia". */
    currentDefault: Category | null
    onCreate: (payload: CategoryPayload) => Promise<void>
    onUpdate: (id: string, payload: CategoryPayload) => Promise<void>
}

const EMPTY_VALUES: CategoryFormValues = {
    code: '',
    name: '',
    parentId: NO_PARENT,
    sortOrder: '',
    description: '',
    imageLink1: '',
    imageLink2: '',
    coverLink1: '',
    coverLink2: '',
    coverLink3: '',
    coverLink4: '',
    coverLink5: '',
    isDefault: false,
}

/**
 * Dialog thêm/sửa danh mục theo `12-danh-muc-sp.png` (mockup chỉ vẽ nút "Thêm danh mục",
 * không vẽ form ⇒ dựng theo pattern form chuẩn — CONVENTIONS mục 6.2) + khối **"Hiển thị trên web
 * bán hàng"** (PLAN Phase 23, backend P13.1).
 *
 * `CreateCategoryReqDTO` và `UpdateCategoryReqDTO` có **cùng bộ field** (kể cả `code`),
 * khác `product` — nên form dùng chung cho cả 2 chế độ, không khoá field nào.
 *
 * ⚠️ **`parentId` theo ngữ nghĩa full-update**: bỏ field ⇒ backend chuyển danh mục về gốc. Form luôn
 * gửi cha hiện tại (state `parentId` được nạp từ `category.parentId`) nên chỉ đổi ảnh cũng không làm
 * danh mục con nhảy về gốc.
 */
export function CategoryFormDialog({
    open,
    onOpenChange,
    category,
    parentOptions,
    currentDefault,
    onCreate,
    onUpdate,
}: CategoryFormDialogProps) {
    const { t } = useTranslation(['product', 'common', 'image'])
    const isEdit = category !== null

    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(schema),
        defaultValues: EMPTY_VALUES,
    })

    /** Các ô ảnh đang dưới mức tối thiểu — chặn lưu cho tới khi đổi ảnh khác hoặc xoá. */
    const [blockedFields, setBlockedFields] = useState<Partial<Record<ImageFieldName, boolean>>>({})
    /** Giá trị đang chờ người dùng xác nhận "về 0 danh mục mặc định" (xem `onSubmit`). */
    const [pendingValues, setPendingValues] = useState<CategoryFormValues | null>(null)

    useEffect(() => {
        if (!open) return
        setBlockedFields({})
        setPendingValues(null)
        form.reset({
            code: category?.code ?? '',
            name: category?.name ?? '',
            parentId: category?.parentId ?? NO_PARENT,
            sortOrder: category?.sortOrder != null ? String(category.sortOrder) : '',
            description: category?.description ?? '',
            // `imageUrl` cũ luôn trùng `imageLink1` sau backfill; vẫn đọc làm dự phòng cho dòng chưa qua backfill.
            imageLink1: category?.imageLink1 ?? category?.imageUrl ?? '',
            imageLink2: category?.imageLink2 ?? '',
            coverLink1: category?.coverLink1 ?? '',
            coverLink2: category?.coverLink2 ?? '',
            coverLink3: category?.coverLink3 ?? '',
            coverLink4: category?.coverLink4 ?? '',
            coverLink5: category?.coverLink5 ?? '',
            isDefault: category?.isDefault === true,
        })
    }, [open, category, form])

    const hasBlockedImage = Object.values(blockedFields).some(Boolean)

    const save = async (values: CategoryFormValues) => {
        /*
         * Field nội dung (P13.1): bỏ field = GIỮ NGUYÊN, `""` = XOÁ. Chỉ gửi `""` khi ô **vừa bị xoá**
         * (trước có giá trị, nay trống). Ô vốn đã trống thì bỏ field: đo thật 2026-10-10 cho thấy backend
         * lưu `""` (không phải `null`) và trả `""` lại, nên gửi `""` bừa sẽ biến mọi cột null thành
         * chuỗi rỗng — storefront kiểm `null` có thể coi chuỗi rỗng là "có ảnh".
         */
        const content = (value: string, original: string | null | undefined) =>
            value ? value : original ? '' : undefined
        const payload: CategoryPayload = {
            code: values.code,
            name: values.name,
            // Luôn gửi cha hiện tại; "Không có" mới là chủ ý chuyển về gốc.
            parentId: values.parentId === NO_PARENT ? undefined : values.parentId,
            sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
            description: content(values.description, category?.description),
            // `imageUrl` cũ trùng `imageLink1` nên cũng tính là "ô vốn có giá trị".
            imageLink1: content(values.imageLink1, category?.imageLink1 ?? category?.imageUrl),
            imageLink2: content(values.imageLink2, category?.imageLink2),
            coverLink1: content(values.coverLink1, category?.coverLink1),
            coverLink2: content(values.coverLink2, category?.coverLink2),
            coverLink3: content(values.coverLink3, category?.coverLink3),
            coverLink4: content(values.coverLink4, category?.coverLink4),
            coverLink5: content(values.coverLink5, category?.coverLink5),
            isDefault: values.isDefault,
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

    const onSubmit = async (values: CategoryFormValues) => {
        if (hasBlockedImage) return
        /*
         * Tắt mặc định của danh mục đang giữ cờ mà không chọn ai khác ⇒ bảng về **0** danh mục mặc định
         * ⇒ mất hẳn khối ảnh ngang ở Trang chủ. API vẫn cho phép (không phải lỗi) nhưng đó là thứ đáng
         * dừng lại hỏi — xác nhận trước khi lưu (PLAN Phase 23, user chốt 2026-10-06).
         */
        if (isEdit && category.isDefault === true && !values.isDefault) {
            setPendingValues(values)
            return
        }
        await save(values)
    }

    const isSubmitting = form.formState.isSubmitting

    const watched = form.watch([
        'name',
        'description',
        'imageLink1',
        'imageLink2',
        'coverLink1',
        'coverLink2',
        'coverLink3',
        'coverLink4',
        'coverLink5',
        'isDefault',
    ])
    const [watchName, watchDescription, tile1, tile2, ...rest] = watched
    const coverLinks = rest.slice(0, COVER_FIELDS.length) as string[]
    const watchIsDefault = rest[COVER_FIELDS.length] as boolean

    /** Ô ảnh dùng chung `ImageLinkField` — báo `blocked` lên `blockedFields`. */
    const renderImageField = (
        name: ImageFieldName,
        spec: 'CATEGORY_TILE' | 'BANNER_WIDE',
        label: string,
        caption?: string,
        previewNote?: string,
    ) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <ImageLinkField
                        spec={spec}
                        label={label}
                        caption={caption}
                        previewNote={previewNote}
                        value={field.value}
                        onChange={field.onChange}
                        onInspect={(result) =>
                            setBlockedFields((prev) =>
                                prev[name] === (result?.status === 'blocked')
                                    ? prev
                                    : { ...prev, [name]: result?.status === 'blocked' },
                            )
                        }
                    />
                    <FormMessage />
                </FormItem>
            )}
        />
    )

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

                        {/* ───────── Khối "Hiển thị trên web bán hàng" (Phase 23) ───────── */}
                        <section className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className="text-sm font-semibold">{t('category.form.web.title')}</h3>
                                <p className="text-muted-foreground text-xs">
                                    {t('category.form.web.subtitle')}
                                </p>
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('category.form.description')}</FormLabel>
                                        <p className="text-muted-foreground text-xs">
                                            {t('category.form.descriptionCaption')}
                                        </p>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                rows={3}
                                                maxLength={500}
                                                placeholder={t('category.form.descriptionPlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Hai ô tile + xem trước đổi ảnh khi rê chuột. */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
                                <div className="space-y-4">
                                    {renderImageField(
                                        'imageLink1',
                                        'CATEGORY_TILE',
                                        t('category.form.tile1.label'),
                                        t('category.form.tile1.caption'),
                                    )}
                                    {renderImageField(
                                        'imageLink2',
                                        'CATEGORY_TILE',
                                        t('category.form.tile2.label'),
                                        t('category.form.tile2.caption'),
                                    )}
                                    <p className="text-muted-foreground text-xs">
                                        {t('category.form.tile.bothEmpty')}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium">
                                        {t('category.form.tile.previewTitle')}
                                    </p>
                                    <HoverSwapPreview
                                        primary={tile1 as string}
                                        secondary={tile2 as string}
                                    />
                                </div>
                            </div>

                            {/* Năm ô cover + xem trước slideshow 4 giây/ảnh. */}
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-medium">
                                        {t('category.form.cover.title')}
                                    </h4>
                                    <p className="text-muted-foreground text-xs leading-relaxed">
                                        {t('category.form.cover.caption', {
                                            seconds: COVER_ROTATE_MS / 1000,
                                        })}{' '}
                                        {t('image:slides.gapNote')}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium">{t('image:slides.previewTitle')}</p>
                                    <CoverSlidesPreview
                                        links={coverLinks}
                                        title={watchName as string}
                                        description={watchDescription as string}
                                    />
                                </div>
                                {COVER_FIELDS.map((name, i) => (
                                    <div key={name}>
                                        {renderImageField(
                                            name,
                                            'BANNER_WIDE',
                                            t('category.form.cover.label', { n: i + 1 }),
                                            undefined,
                                            t('image:slides.textOverlay'),
                                        )}
                                    </div>
                                ))}
                            </div>

                            <FormField
                                control={form.control}
                                name="isDefault"
                                render={({ field }) => (
                                    <FormItem className="bg-muted/40 space-y-1.5 rounded-lg border p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <FormLabel className="text-sm font-medium">
                                                {t('category.form.isDefault.label')}
                                            </FormLabel>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </div>
                                        <p className="text-muted-foreground text-xs leading-relaxed">
                                            {t('category.form.isDefault.caption')}
                                        </p>
                                        {watchIsDefault &&
                                            currentDefault &&
                                            currentDefault.id !== category?.id && (
                                                <p className="text-xs font-medium">
                                                    {t('category.form.isDefault.willSwitch', {
                                                        name: currentDefault.name,
                                                    })}
                                                </p>
                                            )}
                                    </FormItem>
                                )}
                            />
                        </section>

                        {hasBlockedImage && (
                            <p className="text-destructive text-xs">{t('image:field.blockedNotice')}</p>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting || hasBlockedImage}>
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

                {/* Cảnh báo (không phải lỗi) khi lưu sẽ đưa hệ thống về 0 danh mục mặc định. */}
                <ConfirmDialog
                    open={pendingValues !== null}
                    onOpenChange={(next) => !next && setPendingValues(null)}
                    variant="destructive"
                    title={t('category.defaultWarning.title')}
                    description={t('category.defaultWarning.description', { name: category?.name })}
                    confirmLabel={t('category.defaultWarning.confirm')}
                    onConfirm={async () => {
                        if (pendingValues) await save(pendingValues)
                    }}
                />
            </DialogContent>
        </Dialog>
    )
}
