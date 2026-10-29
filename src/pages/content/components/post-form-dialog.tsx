import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, X } from 'lucide-react'
import { z } from 'zod'

import { postApi } from '@/api/cms'
import { productApi } from '@/api/product'
import { toastSuccess, toastWarning } from '@/lib/toast'
import type { PagedSearchLoader } from '@/hooks/use-paged-search'
import { EntityStatus } from '@/types/common'
import { POST_TYPES, type Post, type PostListItem, type PostPayload, type PostType } from '@/types/cms'
import type { Product } from '@/types/product'
import { setFormErrorFromApi } from '@/lib/form-error'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AsyncSuggest } from '@/components/async-suggest'
import { SeoFields, META_DESCRIPTION_MAX, META_TITLE_MAX } from '@/components/seo-fields'
import { ImageUploadField } from '@/components/image/image-upload-field'
import { RichTextEditor } from './rich-text-editor'

/** Trần backend `CreatePostReqDTO.productIds`. */
const MAX_PRODUCTS = 12
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Backend (P15.1) trả 400 nếu title/excerpt/metaTitle/metaDescription chứa `<` hoặc `>`. */
const NO_ANGLE = /^[^<>]*$/

/** Ràng buộc lấy từ `CreatePostReqDTO`/`UpdatePostReqDTO` (cùng bộ field). */
const buildSchema = (t: (key: string) => string) => {
    const noAngle = t('post.form.validation.noAngleBrackets')
    return z.object({
        title: z
            .string()
            .trim()
            .min(1, t('post.form.validation.titleRequired'))
            .max(255, t('post.form.validation.titleMaxLength'))
            .regex(NO_ANGLE, noAngle),
        // Tuỳ chọn: tạo mới không có ô này (backend sinh từ tiêu đề); sửa để trống = giữ slug hiện tại.
        slug: z
            .string()
            .trim()
            .max(150, t('post.form.validation.slugMaxLength'))
            .refine((value) => value === '' || SLUG_PATTERN.test(value), t('post.form.validation.slugPattern')),
        type: z.enum(POST_TYPES),
        excerpt: z.string().trim().max(500, t('post.form.validation.excerptMaxLength')).regex(NO_ANGLE, noAngle),
        content: z.string().max(200000, t('post.form.validation.contentMaxLength')),
        metaTitle: z
            .string()
            .trim()
            .max(META_TITLE_MAX, t('post.form.validation.metaTitleMaxLength'))
            .regex(NO_ANGLE, noAngle),
        metaDescription: z
            .string()
            .trim()
            .max(META_DESCRIPTION_MAX, t('post.form.validation.metaDescriptionMaxLength'))
            .regex(NO_ANGLE, noAngle),
    })
}

type PostFormValues = z.infer<ReturnType<typeof buildSchema>>

type ProductChip = { id: string; name: string; code?: string }

type PostFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = viết bài mới; có giá trị = sửa (form nạp lại chi tiết đủ `content`/`productIds`). */
    post: PostListItem | null
    onCreate: (payload: PostPayload) => Promise<Post>
    onUpdate: (id: string, payload: PostPayload) => Promise<Post>
    /** Gọi **một lần khi dialog đóng** nếu ảnh bìa đã đổi trên backend — màn ngoài phải nạp lại. */
    onMediaChanged?: () => void
}

const EMPTY_VALUES: PostFormValues = {
    title: '',
    slug: '',
    type: 'NEWS',
    excerpt: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
}

/**
 * Dialog soạn bài viết (Phase 20).
 *
 * - **Không có trạng thái** trong form: bài mới luôn DRAFT, đổi trạng thái ở `PostStatusDialog`.
 * - **Ảnh bìa chỉ upload** (P13.3): thêm mới ⇒ giữ file chờ tới khi tạo xong; sửa ⇒ gửi/xoá ngay.
 * - **Slug**: ô chỉ hiện khi sửa; tạo mới không gửi slug ⇒ backend sinh từ tiêu đề (P15.1).
 * - `productIds`: tạo mới gửi mảng (bỏ trống nếu rỗng); sửa **luôn gửi** mảng để `[]` gỡ hết.
 */
export function PostFormDialog({ open, onOpenChange, post, onCreate, onUpdate, onMediaChanged }: PostFormDialogProps) {
    const { t } = useTranslation(['post', 'common', 'image'])
    const isEdit = post !== null
    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<PostFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES })

    const [detail, setDetail] = useState<Post | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)
    const [products, setProducts] = useState<ProductChip[]>([])
    const [productWarn, setProductWarn] = useState(false)
    const [productKeyword, setProductKeyword] = useState('')
    const [stagedCover, setStagedCover] = useState<File | null>(null)
    const [coverBusy, setCoverBusy] = useState(false)
    const mediaDirtyRef = useRef(false)

    useEffect(() => {
        if (open || !mediaDirtyRef.current) return
        mediaDirtyRef.current = false
        onMediaChanged?.()
    }, [open, onMediaChanged])

    // Mở dialog: dọn trạng thái; sửa ⇒ nạp chi tiết đủ (danh sách không có content/productIds).
    useEffect(() => {
        if (!open) return
        setDetail(null)
        setLoadFailed(false)
        setProducts([])
        setProductWarn(false)
        setProductKeyword('')
        setStagedCover(null)
        setCoverBusy(false)
        form.reset(EMPTY_VALUES)
        if (!post) return

        const controller = new AbortController()
        setLoading(true)
        void (async () => {
            try {
                const full = await postApi.getById(post.id, controller.signal)
                if (controller.signal.aborted) return
                setDetail(full)
                form.reset({
                    title: full.title,
                    slug: full.slug,
                    type: full.type,
                    excerpt: full.excerpt ?? '',
                    content: full.content ?? '',
                    metaTitle: full.metaTitle ?? '',
                    metaDescription: full.metaDescription ?? '',
                })
                // Backend chỉ trả `productIds` ⇒ đọc tên từng sản phẩm để hiện chip.
                const settled = await Promise.allSettled(
                    full.productIds.map((id) => productApi.getById(id, controller.signal)),
                )
                if (controller.signal.aborted) return
                const chips: ProductChip[] = []
                settled.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        chips.push({ id: result.value.id, name: result.value.name, code: result.value.code })
                    } else {
                        // Vẫn giữ id để lưu lại không làm rơi liên kết âm thầm.
                        chips.push({ id: full.productIds[index], name: full.productIds[index] })
                        setProductWarn(true)
                    }
                })
                setProducts(chips)
            } catch {
                if (!controller.signal.aborted) setLoadFailed(true)
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        })()
        return () => controller.abort()
    }, [open, post, isEdit, form])

    const isSubmitting = form.formState.isSubmitting
    const busy = isSubmitting || loading || coverBusy

    const loadProductPage: PagedSearchLoader<Product> = useCallback(async ({ keyword, page, size, signal }) => {
        const result = await productApi.search(
            { keyword: keyword || undefined, status: EntityStatus.ACTIVE },
            { page, size },
            signal,
        )
        return { items: result.data, total: result.total }
    }, [])

    const addProduct = (product: Product) => {
        setProductKeyword('')
        setProducts((current) => {
            if (current.length >= MAX_PRODUCTS || current.some((p) => p.id === product.id)) return current
            return [...current, { id: product.id, name: product.name, code: product.code }]
        })
    }

    const onSubmit = async (values: PostFormValues) => {
        // `PUT` với content rỗng trên bài đang PUBLISHED/SCHEDULED bị backend từ chối ⇒ chặn tại ô.
        if (
            isEdit &&
            (post?.postStatus === 'PUBLISHED' || post?.postStatus === 'SCHEDULED') &&
            !values.content.trim()
        ) {
            form.setError('content', { message: t('post.form.validation.contentRequiredWhenLive') })
            return
        }
        const payload: PostPayload = {
            // Tạo mới: ô slug ẩn ⇒ luôn rỗng ⇒ không gửi. Sửa: rỗng ⇒ backend giữ slug cũ.
            slug: values.slug || undefined,
            title: values.title,
            excerpt: values.excerpt,
            content: values.content,
            type: values.type,
            // `""` = xoá (storefront tự sinh từ tiêu đề/tóm tắt).
            metaTitle: values.metaTitle,
            metaDescription: values.metaDescription,
        }
        const productIds = products.map((p) => p.id)
        try {
            if (isEdit && post) {
                await onUpdate(post.id, { ...payload, productIds })
            } else {
                if (productIds.length > 0) payload.productIds = productIds
                const created = await onCreate(payload)
                // Tạo trước, upload sau (P13.3). Lỗi đã được api-client toast; không rollback bài.
                if (stagedCover) {
                    try {
                        await postApi.uploadCover(created.id, stagedCover)
                        mediaDirtyRef.current = true
                    } catch {
                        toastWarning('post.toast.coverFailed', { ns: 'post' })
                    }
                }
            }
            onOpenChange(false)
        } catch (error) {
            // slug trùng ⇒ dưới ô slug; sản phẩm không hợp lệ ⇒ dưới ô sản phẩm; giữ form mở để sửa lại.
            setFormErrorFromApi(form, error)
        }
    }

    const watched = form.watch()

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('post:post.form.editTitle') : t('post:post.form.addTitle')}</DialogTitle>
                </DialogHeader>

                {loading && (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        {t('post:post.form.loading')}
                    </p>
                )}
                {loadFailed && <p className="text-destructive text-sm">{t('post:post.form.loadFailed')}</p>}

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                        noValidate
                        hidden={loading || loadFailed}>
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="content-start">
                                    <FormLabel>
                                        {t('post:post.form.title')} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('post:post.form.titlePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className={isEdit ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'grid grid-cols-1 gap-4'}>
                            {/* Chỉ hiện khi sửa: tạo mới để backend tự sinh slug từ tiêu đề. */}
                            {isEdit && (
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem className="content-start">
                                            <FormLabel>{t('post:post.form.slug')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="font-mono"
                                                    placeholder={t('post:post.form.slugPlaceholder')}
                                                    onChange={(event) => field.onChange(event.target.value.toLowerCase())}
                                                />
                                            </FormControl>
                                            <FormDescription>{t('post:post.form.slugHelp')}</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="content-start">
                                        <FormLabel>
                                            {t('post:post.form.type')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => field.onChange(value as PostType)}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {POST_TYPES.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {t(`post:post.type.${type}`)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Chỉ upload file (P13.3): sửa ⇒ gửi/xoá ngay; thêm mới ⇒ giữ chờ tới khi tạo xong. */}
                        <ImageUploadField
                            spec="POST_COVER"
                            label={t('post:post.form.cover')}
                            caption={
                                <>
                                    {t('post:post.form.coverCaption')}
                                    {detail && <> {t('image:field.appliesNow')}</>}
                                </>
                            }
                            savedLink={detail?.coverUrl ?? null}
                            pendingFile={stagedCover}
                            busy={coverBusy}
                            disabled={isSubmitting}
                            onSelectFile={async (file) => {
                                if (!detail) {
                                    setStagedCover(file)
                                    return
                                }
                                setCoverBusy(true)
                                try {
                                    setDetail(await postApi.uploadCover(detail.id, file))
                                    mediaDirtyRef.current = true
                                    toastSuccess('field.uploaded', { ns: 'image' })
                                } catch {
                                    // api-client đã toast lỗi (quá 15MB, sai định dạng…).
                                } finally {
                                    setCoverBusy(false)
                                }
                            }}
                            onRemove={async () => {
                                if (!detail) {
                                    setStagedCover(null)
                                    return
                                }
                                setCoverBusy(true)
                                try {
                                    setDetail(await postApi.deleteCover(detail.id))
                                    mediaDirtyRef.current = true
                                    toastSuccess('field.removed', { ns: 'image' })
                                } catch {
                                    // api-client đã toast lỗi.
                                } finally {
                                    setCoverBusy(false)
                                }
                            }}
                        />

                        <FormField
                            control={form.control}
                            name="excerpt"
                            render={({ field }) => (
                                <FormItem className="content-start">
                                    <FormLabel>{t('post:post.form.excerpt')}</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} rows={2} placeholder={t('post:post.form.excerptPlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem className="content-start">
                                    <FormLabel>{t('post:post.form.content')}</FormLabel>
                                    <RichTextEditor value={field.value} onChange={field.onChange} disabled={isSubmitting} />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <p className="text-sm leading-none font-medium">{t('post:post.form.products')}</p>
                            <p className="text-muted-foreground text-xs">
                                {t('post:post.form.productsHint', { max: MAX_PRODUCTS })}
                            </p>
                            {products.length > 0 && (
                                <ul className="flex flex-wrap gap-2">
                                    {products.map((product) => (
                                        <li
                                            key={product.id}
                                            className="bg-accent text-accent-foreground flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm">
                                            <span className="max-w-56 truncate">{product.name}</span>
                                            <button
                                                type="button"
                                                className="hover:bg-background/60 rounded-full p-0.5"
                                                aria-label={t('post:post.form.productsRemove', { name: product.name })}
                                                disabled={isSubmitting}
                                                onClick={() =>
                                                    setProducts((current) => current.filter((p) => p.id !== product.id))
                                                }>
                                                <X className="size-3.5" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {products.length >= MAX_PRODUCTS ? (
                                <p className="text-muted-foreground text-xs">
                                    {t('post:post.form.productsLimit', { max: MAX_PRODUCTS })}
                                </p>
                            ) : (
                                <AsyncSuggest<Product>
                                    value={productKeyword}
                                    onValueChange={setProductKeyword}
                                    loadPage={loadProductPage}
                                    getKey={(p) => p.id}
                                    minChars={0}
                                    disabled={isSubmitting}
                                    icon={<Search className="size-4" />}
                                    placeholder={t('post:post.form.productsSearch')}
                                    ariaLabel={t('post:post.form.products')}
                                    emptyLabel={t('post:post.form.productsEmpty')}
                                    onPick={addProduct}
                                    renderItem={(p) => (
                                        <span className="flex items-center justify-between gap-3">
                                            <span className="truncate">{p.name}</span>
                                            <span className="text-muted-foreground shrink-0 font-mono text-xs">
                                                {p.code}
                                            </span>
                                        </span>
                                    )}
                                />
                            )}
                            {productWarn && <p className="text-xs text-amber-600">{t('post:post.form.productsLoadFailed')}</p>}
                        </div>

                        <SeoFields
                            control={form.control}
                            slug={watched.slug || null}
                            titleValue={watched.metaTitle}
                            descriptionValue={watched.metaDescription}
                            disabled={isSubmitting}
                        />

                        {!isEdit && <p className="text-muted-foreground text-xs">{t('post:post.form.statusNote')}</p>}

                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting
                                    ? t('post:post.form.submitting')
                                    : isEdit
                                      ? t('post:post.form.submitUpdate')
                                      : t('post:post.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
