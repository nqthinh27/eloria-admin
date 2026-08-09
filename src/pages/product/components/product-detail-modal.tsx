import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Barcode, ImageIcon, Loader2, Pencil, Plus, Upload } from 'lucide-react'

import { productApi, skuApi } from '@/api/product'
import { toastSuccess, toastWarning } from '@/lib/toast'
import { formatDate, formatVnd } from '@/lib/format'
import { apiBaseUrl } from '@/config/app'
import { EGender, EntityStatus } from '@/types/common'
import type { Color, Product, Size, Sku } from '@/types/product'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GenerateSkuDialog } from './generate-sku-dialog'
import { SkuBarcodeDialog } from './sku-barcode-dialog'

/** Backend phục vụ ảnh qua `GET /image?imageUrl=` (`[ANONYMOUS]`). */
function imageSrc(url: string) {
    return `${apiBaseUrl}/image?imageUrl=${encodeURIComponent(url)}`
}

const MAX_IMAGES = 10
/** Số SKU mỗi lần tải — bảng SKU dùng infinite scroll, cuộn tới cuối thì nối thêm trang sau. */
const SKU_PAGE_SIZE = 20

type ProductDetailModalProps = {
    /** `null` = đóng. Là bản rút gọn từ danh sách; modal tự gọi chi tiết để có `categories`. */
    product: Product | null
    onOpenChange: (open: boolean) => void
    colors: Color[]
    sizes: Size[]
    canWrite: boolean
    onEdit: (product: Product) => void
    /** Gọi lại khi dữ liệu đổi để danh sách ngoài cập nhật theo. */
    onChanged: () => void
}

/**
 * Modal "Chi tiết sản phẩm" — 3 tab: Thông tin · Bảng SKU · Ảnh.
 *
 * Không dùng `DetailModal` chung như màn Nhân viên/Khách hàng vì màn này cần nhiều khối phức tạp
 * (bảng SKU phân trang riêng, lưới ảnh, nút sinh ma trận) chứ không phải form field phẳng — sửa
 * sản phẩm đi qua `ProductFormDialog` riêng.
 *
 * ⚠️ **`GET /product/{id}` KHÔNG trả kèm SKU** dù `summary` của api-docs ghi "+ bảng SKU"
 * (kiểm chứng bằng dữ liệu thật 2026-08-09) ⇒ phải gọi riêng `POST /sku/search?productId=`.
 */
export function ProductDetailModal({
    product,
    onOpenChange,
    colors,
    sizes,
    canWrite,
    onEdit,
    onChanged,
}: ProductDetailModalProps) {
    const { t } = useTranslation(['product', 'common'])

    const [detail, setDetail] = useState<Product | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [skus, setSkus] = useState<Sku[]>([])
    const [loadingSkus, setLoadingSkus] = useState(false)
    /** Tổng SKU phía server — để biết còn trang nào chưa tải. */
    const [skuTotal, setSkuTotal] = useState(0)
    const [skuPage, setSkuPage] = useState(1)
    const [loadingMoreSkus, setLoadingMoreSkus] = useState(false)
    const [barcodeSku, setBarcodeSku] = useState<Sku | null>(null)
    /** Id SKU đang đổi trạng thái — khoá switch để tránh bấm liên tiếp. */
    const [togglingSkuId, setTogglingSkuId] = useState<string | null>(null)
    /*
     * Infinite scroll dùng **callback ref** thay vì `useRef` + `useEffect`.
     *
     * Lý do: phần tử mốc chỉ được render bên trong nhánh `skus.length > 0`, nên ở lần effect chạy
     * đầu tiên `ref.current` vẫn là `null` và observer không bao giờ được gắn — bảng đứng im ở
     * trang 1 (đã tái hiện). Callback ref được React gọi **đúng lúc** node vào/ra DOM, nên observer
     * luôn bám được.
     */
    const observerRef = useRef<IntersectionObserver | null>(null)
    /*
     * Callback của observer giữ closure lúc tạo; đọc state trực tiếp sẽ thấy giá trị cũ.
     * Dồn mọi thứ cần đọc lúc callback chạy vào một ref để luôn lấy giá trị mới nhất.
     */
    const scrollStateRef = useRef({
        hasMore: false,
        loading: false,
        loadingMore: false,
        loadMore: () => {},
    })
    const [generateOpen, setGenerateOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const productId = product?.id ?? null

    const loadDetail = useCallback(
        async (signal?: AbortSignal) => {
            if (!productId) return
            setLoadingDetail(true)
            try {
                const result = await productApi.getById(productId, signal)
                if (signal?.aborted) return
                setDetail(result)
            } catch {
                if (signal?.aborted) return
                setDetail(null)
            } finally {
                if (!signal?.aborted) setLoadingDetail(false)
            }
        },
        [productId],
    )

    /**
     * Nạp trang đầu của bảng SKU. Các trang sau do `loadMoreSkus()` nối thêm khi cuộn tới cuối
     * (infinite scroll) — sản phẩm nhiều màu × size có thể sinh hàng trăm SKU, tải hết một lần
     * vừa chậm vừa thừa.
     */
    const loadSkus = useCallback(
        async (signal?: AbortSignal) => {
            if (!productId) return
            setLoadingSkus(true)
            try {
                const res = await skuApi.search(
                    { productId },
                    { page: 1, size: SKU_PAGE_SIZE },
                    signal,
                )
                if (signal?.aborted) return
                setSkus(res.data)
                setSkuTotal(res.total)
                setSkuPage(1)
            } catch {
                if (signal?.aborted) return
                setSkus([])
                setSkuTotal(0)
            } finally {
                if (!signal?.aborted) setLoadingSkus(false)
            }
        },
        [productId],
    )

    const loadMoreSkus = useCallback(async () => {
        if (!productId) return
        const nextPage = skuPage + 1
        setLoadingMoreSkus(true)
        try {
            const res = await skuApi.search({ productId }, { page: nextPage, size: SKU_PAGE_SIZE })
            // Lọc trùng id: tránh nhân đôi khi trang trước vừa bị đổi trạng thái/sắp xếp lại.
            setSkus((prev) => {
                const seen = new Set(prev.map((s) => s.id))
                return [...prev, ...res.data.filter((s) => !seen.has(s.id))]
            })
            setSkuTotal(res.total)
            setSkuPage(nextPage)
        } catch {
            // api-client đã toast lỗi; giữ nguyên danh sách đang có.
        } finally {
            setLoadingMoreSkus(false)
        }
    }, [productId, skuPage])

    useEffect(() => {
        if (!productId) {
            setDetail(null)
            setSkus([])
            setSkuTotal(0)
            setSkuPage(1)
            return
        }
        const controller = new AbortController()
        void loadDetail(controller.signal)
        void loadSkus(controller.signal)
        return () => controller.abort()
    }, [productId, loadDetail, loadSkus])

    const hasMoreSkus = skus.length < skuTotal

    // Luôn giữ giá trị mới nhất cho callback của observer (xem ghi chú ở `scrollStateRef`).
    scrollStateRef.current = {
        hasMore: hasMoreSkus,
        loading: loadingSkus,
        loadingMore: loadingMoreSkus,
        loadMore: () => void loadMoreSkus(),
    }

    /**
     * Callback ref cho phần tử mốc cuối bảng: node xuất hiện thì gắn observer, biến mất thì ngắt.
     * `root` là chính khung cuộn của bảng (`[data-sku-scroll]`), không phải viewport — bảng nằm
     * trong modal có vùng cuộn riêng.
     */
    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        observerRef.current?.disconnect()
        if (!node) return

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return
                const st = scrollStateRef.current
                if (!st.hasMore || st.loading || st.loadingMore) return
                st.loadMore()
            },
            { root: node.closest('[data-sku-scroll]'), rootMargin: '120px' },
        )
        observerRef.current.observe(node)
    }, [])

    /* Ngắt observer khi modal đóng để không giữ node đã gỡ. */
    useEffect(() => () => observerRef.current?.disconnect(), [])

    if (!product) return null

    const current = detail ?? product

    const genderLabels: Record<EGender, string> = {
        [EGender.MALE]: t('product.detail.genderMale'),
        [EGender.FEMALE]: t('product.detail.genderFemale'),
        [EGender.OTHER]: t('product.detail.genderOther'),
    }

    const handleGenerate = async (colorIds: string[], sizeIds: string[]) => {
        await productApi.generateSku(product.id, { colorIds, sizeIds })
        toastSuccess('product.toast.skuGenerated', { ns: 'product' })
        await loadSkus()
        onChanged()
    }

    /**
     * Bật/tắt trạng thái một SKU.
     *
     * Cập nhật **tại chỗ đúng dòng đó** thay vì `loadSkus()` — nạp lại sẽ reset bảng về trang 1 và
     * mất hết các trang người dùng đã cuộn tải thêm (infinite scroll). `togglingSkuId` khoá switch
     * trong lúc chờ để không bấm liên tiếp sinh nhiều request trái chiều.
     */
    const handleToggleSku = async (sku: Sku) => {
        if (togglingSkuId) return
        const next =
            sku.status === EntityStatus.ACTIVE ? EntityStatus.INACTIVE : EntityStatus.ACTIVE
        setTogglingSkuId(sku.id)
        try {
            await skuApi.updateStatus(sku.id, next)
            setSkus((prev) =>
                prev.map((s) => (s.id === sku.id ? { ...s, status: next } : s)),
            )
            toastSuccess('product.toast.skuStatusUpdated', { ns: 'product' })
        } catch {
            // api-client đã toast lỗi; giữ nguyên trạng thái cũ trên UI.
        } finally {
            setTogglingSkuId(null)
        }
    }

    const handleUpload = async (files: FileList | null) => {
        if (!files?.length) return
        if (files.length > MAX_IMAGES) {
            toastWarning('product.images.tooMany', { ns: 'product' })
            if (fileInputRef.current) fileInputRef.current.value = ''
            return
        }
        setUploading(true)
        try {
            await productApi.uploadImages(product.id, Array.from(files))
            toastSuccess('product.toast.imagesUploaded', { ns: 'product' })
            await loadDetail()
            onChanged()
        } catch {
            // api-client đã toast lỗi.
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    /** Size hợp lệ để sinh SKU = cùng `sizeGroup` với sản phẩm. */
    const eligibleSizes = current.sizeGroup
        ? sizes.filter((s) => s.sizeGroup === current.sizeGroup)
        : []

    const info: { label: string; value: React.ReactNode }[] = [
        { label: t('product.detail.code'), value: current.code },
        { label: t('product.detail.price'), value: formatVnd(current.price) },
        {
            label: t('product.detail.brand'),
            value: current.brandName ?? t('product.list.noBrand'),
        },
        { label: t('product.detail.material'), value: current.material ?? t('product.detail.notUpdated') },
        {
            label: t('product.detail.gender'),
            value: current.gender ? genderLabels[current.gender] : t('product.detail.notUpdated'),
        },
        {
            label: t('product.detail.sizeGroup'),
            value: current.sizeGroup ?? t('product.detail.notUpdated'),
        },
        { label: t('product.detail.createdDate'), value: formatDate(current.createdDate) },
        {
            label: t('product.detail.shortDescription'),
            value: current.shortDescription ?? t('product.detail.notUpdated'),
        },
    ]

    return (
        <Dialog open={product !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-3">
                        {current.name}
                        {current.status === EntityStatus.ACTIVE ? (
                            <StatusBadge tone="success">{t('product.list.statusActive')}</StatusBadge>
                        ) : (
                            <StatusBadge tone="muted">{t('product.list.statusInactive')}</StatusBadge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="info">
                    <TabsList>
                        <TabsTrigger value="info">{t('product.detail.infoTab')}</TabsTrigger>
                        <TabsTrigger value="sku">{t('product.detail.skuTab')}</TabsTrigger>
                        <TabsTrigger value="images">{t('product.detail.imagesTab')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 pt-4">
                        {loadingDetail ? (
                            <Skeleton className="h-40 w-full" />
                        ) : (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {info.map((item) => (
                                        <div key={item.label}>
                                            <p className="text-muted-foreground text-xs">{item.label}</p>
                                            <div className="mt-1 text-sm">{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        {t('product.detail.categories')}
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {current.categories.length ? (
                                            current.categories.map((c) => (
                                                <Badge key={c.id} variant="outline">
                                                    {c.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm">
                                                {t('product.detail.notUpdated')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {canWrite && (
                                    <div className="flex justify-end">
                                        <Button variant="outline" onClick={() => onEdit(current)}>
                                            <Pencil className="size-4" />
                                            {t('product.detail.editButton')}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="sku" className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm">
                                {skus.length}/{skuTotal} {t('product.sku.resultLabel')}
                            </p>
                            {canWrite && (
                                <Button size="sm" onClick={() => setGenerateOpen(true)}>
                                    <Plus className="size-4" />
                                    {t('product.sku.generateButton')}
                                </Button>
                            )}
                        </div>

                        {loadingSkus ? (
                            <Skeleton className="h-40 w-full" />
                        ) : skus.length === 0 ? (
                            <p className="text-muted-foreground py-8 text-center text-sm">
                                {t('product.sku.empty')}
                            </p>
                        ) : (
                            <div
                                data-sku-scroll
                                className="max-h-[22rem] overflow-x-auto overflow-y-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted text-muted-foreground sticky top-0 z-10 text-xs">
                                        <tr>
                                            <th className="p-3 text-left">
                                                {t('product.sku.column.skuCode')}
                                            </th>
                                            <th className="p-3 text-left">
                                                {t('product.sku.column.color')}
                                            </th>
                                            <th className="p-3 text-left">
                                                {t('product.sku.column.size')}
                                            </th>
                                            <th className="p-3 text-left">
                                                {t('product.sku.column.ean')}
                                            </th>
                                            <th className="p-3 text-left">
                                                {t('product.sku.column.status')}
                                            </th>
                                            <th className="p-3 text-left">
                                                {t('product.sku.column.barcode')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {skus.map((sku) => (
                                            <tr key={sku.id} className="border-t">
                                                <td className="p-3 font-mono text-xs">{sku.skuCode}</td>
                                                <td className="p-3">{sku.colorName ?? '—'}</td>
                                                <td className="p-3">{sku.sizeLabel ?? '—'}</td>
                                                <td className="text-muted-foreground p-3 font-mono text-xs">
                                                    {sku.ean ?? t('product.sku.noEan')}
                                                </td>
                                                <td className="p-3">
                                                    {/* Switch thay badge + nut nguon - bat/tat ngay tai cho. */}
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={sku.status === EntityStatus.ACTIVE}
                                                            disabled={
                                                                !canWrite || togglingSkuId === sku.id
                                                            }
                                                            aria-label={
                                                                sku.status === EntityStatus.ACTIVE
                                                                    ? t('product.sku.actionDeactivate')
                                                                    : t('product.sku.actionActivate')
                                                            }
                                                            onCheckedChange={() =>
                                                                void handleToggleSku(sku)
                                                            }
                                                        />
                                                        <span className="text-muted-foreground text-xs">
                                                            {sku.status === EntityStatus.ACTIVE
                                                                ? t('product.list.statusActive')
                                                                : t('product.list.statusInactive')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        aria-label={t('product.barcode.view')}
                                                        title={t('product.barcode.view')}
                                                        onClick={() => setBarcodeSku(sku)}>
                                                        <Barcode className="size-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/*
                                  * Mốc cuộn: lọt vào tầm nhìn ⇒ tải trang SKU kế tiếp.
                                  * PHẢI có chiều cao thật (`h-px`) — div cao 0px không bao giờ được
                                  * IntersectionObserver báo giao nhau, infinite scroll sẽ chết câm.
                                  */}
                                <div ref={sentinelRef} className="h-px" />

                                {loadingMoreSkus && (
                                    <p className="text-muted-foreground flex items-center justify-center gap-2 py-3 text-xs">
                                        <Loader2 className="size-3 animate-spin" />
                                        {t('product.sku.loadingMore')}
                                    </p>
                                )}
                                {!hasMoreSkus && skus.length > SKU_PAGE_SIZE && (
                                    <p className="text-muted-foreground py-3 text-center text-xs">
                                        {t('product.sku.allLoaded')}
                                    </p>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="images" className="space-y-4 pt-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-muted-foreground text-xs">{t('product.images.hint')}</p>
                            {canWrite && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}>
                                    {uploading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Upload className="size-4" />
                                    )}
                                    {uploading
                                        ? t('product.images.uploading')
                                        : t('product.images.uploadButton')}
                                </Button>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => void handleUpload(e.target.files)}
                        />

                        {current.images.length === 0 ? (
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-sm">
                                <ImageIcon className="size-8" />
                                {t('product.images.empty')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {current.images.map((url) => (
                                    <img
                                        key={url}
                                        src={imageSrc(url)}
                                        alt={current.name}
                                        className="bg-muted aspect-square w-full rounded-md object-cover"
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <SkuBarcodeDialog
                    sku={barcodeSku}
                    onOpenChange={(open) => !open && setBarcodeSku(null)}
                />

                <GenerateSkuDialog
                    open={generateOpen}
                    onOpenChange={setGenerateOpen}
                    colors={colors}
                    sizes={eligibleSizes}
                    missingSizeGroup={!current.sizeGroup}
                    onSubmit={handleGenerate}
                />
            </DialogContent>
        </Dialog>
    )
}
