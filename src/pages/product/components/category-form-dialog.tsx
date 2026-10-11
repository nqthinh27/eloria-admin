import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { toastSuccess, toastWarning } from '@/lib/toast'
import { setFormErrorFromApi } from '@/lib/form-error'
import { COVER_ROTATE_MS } from '@/lib/image-spec'
import { normalizeCode } from '@/lib/validation'
import type { Category, CategoryImageSlot, CategoryPayload } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SearchSelect } from '@/components/search-select'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { META_DESCRIPTION_MAX, META_TITLE_MAX, SeoFields } from '@/components/seo-fields'
import { CoverSlidesPreview } from '@/components/image/cover-slides-preview'
import { HoverSwapPreview } from '@/components/image/hover-swap-preview'
import { ImageUploadField } from '@/components/image/image-upload-field'
import { categoryApi } from '@/api/product'

/** Giá trị `Select` cho "không có danh mục cha" — Radix Select không nhận `value=""`. */
const NO_PARENT = '__none__'

/** 5 ô cover theo đúng thứ tự chạy slideshow. */
const COVER_SLOTS = ['cover1', 'cover2', 'cover3', 'cover4', 'cover5'] as const satisfies CategoryImageSlot[]

/** Slot multipart của `POST /category/{id}/images` (BE31) → field đọc ra trong `Category`. */
const SLOT_FIELD = {
    image1: 'imageLink1',
    image2: 'imageLink2',
    cover1: 'coverLink1',
    cover2: 'coverLink2',
    cover3: 'coverLink3',
    cover4: 'coverLink4',
    cover5: 'coverLink5',
} as const satisfies Record<CategoryImageSlot, keyof Category>

type StagedFiles = Partial<Record<CategoryImageSlot, File>>

const buildSchema = (t: (key: string) => string) => {
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
        isDefault: z.boolean(),
        metaTitle: z.string().trim().max(META_TITLE_MAX, t('category.form.validation.metaTitleMax')),
        metaDescription: z
            .string()
            .trim()
            .max(META_DESCRIPTION_MAX, t('category.form.validation.metaDescriptionMax')),
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
    /** Trả danh mục vừa tạo (cần `id` để upload ảnh đã chọn); `undefined` = chưa tạo (vd xung đột mặc định). */
    onCreate: (payload: CategoryPayload) => Promise<Category | undefined>
    onUpdate: (id: string, payload: CategoryPayload) => Promise<void>
    /** Gọi **một lần khi dialog đóng** nếu đã upload/xoá ảnh (BE31) — ảnh đã ghi vào DB nên màn ngoài phải nạp lại. */
    onMediaChanged?: () => void
}

const EMPTY_VALUES: CategoryFormValues = {
    code: '',
    name: '',
    parentId: NO_PARENT,
    sortOrder: '',
    description: '',
    isDefault: false,
    metaTitle: '',
    metaDescription: '',
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
    onMediaChanged,
}: CategoryFormDialogProps) {
    const { t } = useTranslation(['product', 'common', 'image'])
    const isEdit = category !== null

    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(schema),
        defaultValues: EMPTY_VALUES,
    })

    /** Bản ghi mới nhất (cập nhật theo DTO mỗi lần upload/xoá ảnh) — prop `category` chỉ là ảnh chụp lúc mở. */
    const [saved, setSaved] = useState<Category | null>(null)
    /** Thêm mới: file đã chọn, chờ có `id` (sau khi `POST /category`) mới upload. */
    const [staged, setStaged] = useState<StagedFiles>({})
    const [busySlot, setBusySlot] = useState<CategoryImageSlot | null>(null)
    /**
     * Ảnh đã đổi trên backend trong lúc dialog mở ⇒ nạp lại danh sách **một lần khi đóng** thay vì sau
     * mỗi slot (sửa 7 slot không kéo 7 lần `category/search`).
     */
    const mediaDirtyRef = useRef(false)
    useEffect(() => {
        if (open || !mediaDirtyRef.current) return
        mediaDirtyRef.current = false
        onMediaChanged?.()
    }, [open, onMediaChanged])
    /** Giá trị đang chờ người dùng xác nhận "về 0 danh mục mặc định" (xem `onSubmit`). */
    const [pendingValues, setPendingValues] = useState<CategoryFormValues | null>(null)

    useEffect(() => {
        if (!open) return
        setSaved(category)
        setStaged({})
        setBusySlot(null)
        setPendingValues(null)
        form.reset({
            code: category?.code ?? '',
            name: category?.name ?? '',
            parentId: category?.parentId ?? NO_PARENT,
            sortOrder: category?.sortOrder != null ? String(category.sortOrder) : '',
            description: category?.description ?? '',
            isDefault: category?.isDefault === true,
            metaTitle: category?.metaTitle ?? '',
            metaDescription: category?.metaDescription ?? '',
        })
    }, [open, category, form])

    const save = async (values: CategoryFormValues) => {
        const payload: CategoryPayload = {
            code: values.code,
            name: values.name,
            // Luôn gửi cha hiện tại; "Không có" mới là chủ ý chuyển về gốc.
            parentId: values.parentId === NO_PARENT ? undefined : values.parentId,
            sortOrder: values.sortOrder ? Number(values.sortOrder) : undefined,
            // `""` ⇒ xoá mô tả (backend chuẩn hoá về `null` — BE32). Ảnh không nằm trong payload (P13.3).
            description: values.description,
            isDefault: values.isDefault,
            // `""` ⇒ xoá (backend trim rồi về `null`).
            metaTitle: values.metaTitle,
            metaDescription: values.metaDescription,
        }

        try {
            if (isEdit) {
                await onUpdate(category.id, payload)
            } else {
                const created = await onCreate(payload)
                if (!created) return
                // Tạo trước, upload sau (P13.3). Lỗi từng slot đã được api-client toast; không rollback danh mục.
                const entries = Object.entries(staged) as [CategoryImageSlot, File][]
                let failed = 0
                for (const [slot, file] of entries) {
                    try {
                        await categoryApi.uploadImages(created.id, { [slot]: file })
                    } catch {
                        failed++
                    }
                }
                if (entries.length > 0) mediaDirtyRef.current = true
                if (failed > 0) toastWarning('category.toast.imagesPartial', { ns: 'product', count: failed })
            }
            onOpenChange(false)
        } catch (error) {
            setFormErrorFromApi(form, error, {}, 'code')
        }
    }

    const onSubmit = async (values: CategoryFormValues) => {
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

    const [watchName, watchDescription, watchIsDefault] = form.watch(['name', 'description', 'isDefault'])
    const [watchMetaTitle, watchMetaDescription] = form.watch(['metaTitle', 'metaDescription'])

    /** File đang chờ → object URL để các khung xem trước (hover/slideshow) hiện được trước khi upload. */
    const [stagedUrls, setStagedUrls] = useState<Partial<Record<CategoryImageSlot, string>>>({})
    useEffect(() => {
        // Tạo + thu hồi trong cùng effect (an toàn với StrictMode chạy effect hai lần ở dev).
        const urls = Object.fromEntries(
            Object.entries(staged).map(([slot, file]) => [slot, URL.createObjectURL(file)]),
        ) as Partial<Record<CategoryImageSlot, string>>
        setStagedUrls(urls)
        return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }, [staged])
    const linkOf = (slot: CategoryImageSlot) => stagedUrls[slot] ?? saved?.[SLOT_FIELD[slot]] ?? ''
    const coverLinks = COVER_SLOTS.map(linkOf)

    /** Sửa: upload ngay (cần `id`); thêm mới: giữ file chờ tới khi tạo xong. */
    const handleSelectFile = async (slot: CategoryImageSlot, file: File) => {
        if (!saved) {
            setStaged((prev) => ({ ...prev, [slot]: file }))
            return
        }
        setBusySlot(slot)
        try {
            setSaved(await categoryApi.uploadImages(saved.id, { [slot]: file }))
            mediaDirtyRef.current = true
            toastSuccess('field.uploaded', { ns: 'image' })
        } catch {
            // api-client đã toast lỗi (quá 2MB, sai định dạng…).
        } finally {
            setBusySlot(null)
        }
    }

    const handleRemove = async (slot: CategoryImageSlot) => {
        if (!saved) {
            setStaged((prev) => {
                const next = { ...prev }
                delete next[slot]
                return next
            })
            return
        }
        setBusySlot(slot)
        try {
            setSaved(await categoryApi.deleteImage(saved.id, slot))
            mediaDirtyRef.current = true
            toastSuccess('field.removed', { ns: 'image' })
        } catch {
            // api-client đã toast lỗi (vd slot đã trống: `error.image.notAvailable`).
        } finally {
            setBusySlot(null)
        }
    }

    const renderImageField = (
        slot: CategoryImageSlot,
        spec: 'CATEGORY_TILE' | 'BANNER_WIDE',
        label: string,
        caption?: string,
        previewNote?: string,
    ) => (
        <ImageUploadField
            spec={spec}
            label={label}
            caption={caption}
            previewNote={previewNote}
            savedLink={saved?.[SLOT_FIELD[slot]] ?? null}
            pendingFile={staged[slot] ?? null}
            busy={busySlot === slot}
            disabled={isSubmitting || busySlot !== null}
            onSelectFile={(file) => handleSelectFile(slot, file)}
            onRemove={() => handleRemove(slot)}
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
                                {/* Sửa: ảnh ghi ngay qua endpoint riêng (P13.3) — nói rõ Huỷ không hoàn tác ảnh. */}
                                {saved && (
                                    <p className="mt-1 text-xs font-medium">{t('image:field.appliesNow')}</p>
                                )}
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
                                        'image1',
                                        'CATEGORY_TILE',
                                        t('category.form.tile1.label'),
                                        t('category.form.tile1.caption'),
                                    )}
                                    {renderImageField(
                                        'image2',
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
                                        primary={linkOf('image1')}
                                        secondary={linkOf('image2')}
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
                                        title={watchName}
                                        description={watchDescription}
                                    />
                                </div>
                                {COVER_SLOTS.map((slot, i) => (
                                    <div key={slot}>
                                        {renderImageField(
                                            slot,
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

                        <SeoFields
                            control={form.control}
                            slug={saved?.slug ?? null}
                            titleValue={watchMetaTitle}
                            descriptionValue={watchMetaDescription}
                            disabled={isSubmitting}
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
