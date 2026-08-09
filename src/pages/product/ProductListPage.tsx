import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Package, Plus } from 'lucide-react'

import { brandApi, categoryApi, colorApi, productApi, sizeApi } from '@/api/product'
import { toastSuccess } from '@/lib/toast'
import { formatVnd } from '@/lib/format'
import { apiBaseUrl } from '@/config/app'
import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { EntityStatus, ERole } from '@/types/common'
import type {
    Brand,
    Category,
    Color,
    CreateProductReq,
    Product,
    Size,
    UpdateProductReq,
} from '@/types/product'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { SearchSelect } from '@/components/search-select'
import { ProductFormDialog } from './components/product-form-dialog'
import { ProductDetailModal } from './components/product-detail-modal'

const ALL = 'ALL'
const PAGE_SIZE = 12
/** Trần số bản ghi khi nạp trọn danh mục nền (danh mục SP, thương hiệu, màu, size). */
const MAX_REFS = 200

/** Backend phục vụ ảnh qua `GET /image?imageUrl=` (`[ANONYMOUS]`). */
function imageSrc(url: string) {
    return `${apiBaseUrl}/image?imageUrl=${encodeURIComponent(url)}`
}

/**
 * Màn "Sản phẩm" theo `11-san-pham.png` — **card grid**, không phải bảng. PLAN Phase 9.
 * Chạy trên **API thật** (`POST /product/search`).
 *
 * ⚠️ **Lệch có chủ đích so với mockup** (xác nhận bằng api-docs + source + API thật 2026-08-09):
 * - Card mockup hiện **"Tồn: N"** — backend **chưa có API kho** (PLAN Phase 10) ⇒ bỏ dòng tồn.
 * - Badge mockup có **New / Markdown / Ngừng kinh doanh** — `Sku.status` mới chỉ là 0/1 và
 *   `Product.status` cũng 0/1, vòng đời riêng "để dành cho sau" (ghi chú trong `Sku.java`)
 *   ⇒ chỉ hiện Active / Ngừng kinh doanh.
 * - Card mockup có tag danh mục ("Áo sơ mi +1") — `POST /product/search` trả `categories` **luôn rỗng**
 *   (chỉ `GET /product/{id}` mới populate) ⇒ tag danh mục chỉ hiện trong modal chi tiết.
 */
export default function ProductListPage() {
    const { t } = useTranslation(['product', 'common'])
    const { user } = useAuth()
    /** Toàn bộ API ghi của nhóm sản phẩm là `[SUPER_ADMIN]` — ADMIN gọi cũng 403. */
    const canWrite = hasRole(user?.role, ERole.SUPER_ADMIN)

    const [data, setData] = useState<Product[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL)
    const [categoryFilter, setCategoryFilter] = useState<string>(ALL)

    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [colors, setColors] = useState<Color[]>([])
    const [sizes, setSizes] = useState<Size[]>([])

    const [formProduct, setFormProduct] = useState<Product | null | 'new'>(null)
    const [detailProduct, setDetailProduct] = useState<Product | null>(null)

    const load = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true)
            setError(false)
            try {
                const result = await productApi.search(
                    {
                        keyword: keyword || undefined,
                        status:
                            statusFilter === ALL ? undefined : (Number(statusFilter) as EntityStatus),
                        categoryId: categoryFilter === ALL ? undefined : categoryFilter,
                    },
                    { page, size: PAGE_SIZE, sort: ['code,ASC'] },
                    signal,
                )
                setData(result.data)
                setTotal(result.total)
            } catch {
                if (signal?.aborted) return
                setError(true)
            } finally {
                if (!signal?.aborted) setLoading(false)
            }
        },
        [page, keyword, statusFilter, categoryFilter],
    )

    /*
     * Danh mục nền cho bộ lọc + form + dialog sinh SKU.
     *
     * **Cố ý KHÔNG cache giữa các màn** (chốt với user 2026-08-09): admin khác có thể thêm/sửa
     * danh mục, thương hiệu, màu, size bất cứ lúc nào — cache sẽ khiến màn này hiển thị dữ liệu cũ
     * mà FE không có cách nào biết. Vào màn là nạp lại cho đúng dữ liệu mới nhất.
     *
     * Yêu cầu là **không gọi trùng trong CÙNG một màn**: 4 request này khác endpoint nhau, chạy
     * song song trong đúng một effect, mỗi endpoint đúng 1 lần.
     */
    const loadRefs = useCallback(async (signal?: AbortSignal) => {
        const [cats, brs, cls, szs] = await Promise.all([
            categoryApi.search({}, { page: 1, size: MAX_REFS, sort: ['code,ASC'] }, signal).catch(() => null),
            brandApi.search({}, { page: 1, size: MAX_REFS, sort: ['name,ASC'] }, signal).catch(() => null),
            colorApi.search({}, { page: 1, size: MAX_REFS, sort: ['name,ASC'] }, signal).catch(() => null),
            sizeApi.search({}, { page: 1, size: MAX_REFS, sort: ['sortOrder,ASC'] }, signal).catch(() => null),
        ])
        if (signal?.aborted) return
        if (cats) setCategories(cats.data)
        if (brs) setBrands(brs.data)
        if (cls) setColors(cls.data)
        if (szs) setSizes(szs.data)
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    useEffect(() => {
        const controller = new AbortController()
        void loadRefs(controller.signal)
        return () => controller.abort()
    }, [loadRefs])

    const sizeGroups = useMemo(
        () => [...new Set(sizes.map((s) => s.sizeGroup).filter(Boolean))],
        [sizes],
    )

    const handleSearchChange = (value: string) => {
        setKeyword(value)
        setPage(1)
    }

    const handleCreate = async (payload: CreateProductReq) => {
        await productApi.create(payload)
        toastSuccess('product.toast.created', { ns: 'product' })
        await load()
    }

    const handleUpdate = async (id: string, payload: UpdateProductReq) => {
        const updated = await productApi.update(id, payload)
        toastSuccess('product.toast.updated', { ns: 'product' })
        setDetailProduct((current) => (current?.id === id ? updated : current))
        await load()
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <>
            <PageHeader title={t('product.pageTitle')} description={t('product.pageDescription')} />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('product.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => {
                                    setStatusFilter(v)
                                    setPage(1)
                                }}>
                                <SelectTrigger className="w-full sm:w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{t('product.list.allStatuses')}</SelectItem>
                                    <SelectItem value={String(EntityStatus.ACTIVE)}>
                                        {t('product.list.statusActive')}
                                    </SelectItem>
                                    <SelectItem value={String(EntityStatus.INACTIVE)}>
                                        {t('product.list.statusInactive')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>

            {/* Danh mục có thể rất nhiều ⇒ dùng picker có ô tìm kiếm (lọc phía FE). */}
                            <SearchSelect
                                className="w-full sm:w-52"
                                value={categoryFilter}
                                onChange={(v) => {
                                    setCategoryFilter(v)
                                    setPage(1)
                                }}
                                options={[
                                    { value: ALL, label: t('product.list.allCategories') },
                                    ...categories.map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                        hint: c.code,
                                    })),
                                ]}
                            />
                        </>
                    }
                    actions={
                        canWrite && (
                            <Button onClick={() => setFormProduct('new')}>
                                <Plus />
                                {t('product.list.addButton')}
                            </Button>
                        )
                    }
                />

                {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-72 w-full rounded-xl" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-3 py-16">
                        <Package className="size-8" />
                        <p className="text-sm">{t('common:dataTable.error')}</p>
                        <Button variant="outline" onClick={() => void load()}>
                            {t('common:action.retry')}
                        </Button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-3 py-16">
                        <Package className="size-8" />
                        <p className="text-sm">{t('product.list.empty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {data.map((product) => (
                            <Card
                                key={product.id}
                                className="cursor-pointer gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md"
                                onClick={() => setDetailProduct(product)}>
                                <div className="bg-muted relative flex aspect-square items-center justify-center">
                                    {product.images[0] ? (
                                        <img
                                            src={imageSrc(product.images[0])}
                                            alt={product.name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="text-muted-foreground/40 size-12" />
                                    )}
                                    <div className="absolute top-3 right-3">
                                        {product.status === EntityStatus.ACTIVE ? (
                                            <StatusBadge tone="success">
                                                {t('product.list.statusActive')}
                                            </StatusBadge>
                                        ) : (
                                            <StatusBadge tone="muted">
                                                {t('product.list.statusInactive')}
                                            </StatusBadge>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 p-4">
                                    <p className="text-muted-foreground font-mono text-xs">
                                        {product.code}
                                    </p>
                                    <p className="line-clamp-2 font-medium">{product.name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {product.brandName ?? t('product.list.noBrand')}
                                    </p>
                                    <p className="text-primary text-lg font-semibold">
                                        {formatVnd(product.price)}
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {!loading && !error && total > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p className="text-muted-foreground text-sm">
                            {t('common:dataTable.showingRange', {
                                from: (page - 1) * PAGE_SIZE + 1,
                                to: Math.min(page * PAGE_SIZE, total),
                                total,
                                unit: t('product.list.resultLabel'),
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}>
                                {t('common:dataTable.prevPage')}
                            </Button>
                            <span className="text-sm">
                                {t('common:dataTable.pageOf', { page, pageCount: totalPages })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}>
                                {t('common:dataTable.nextPage')}
                            </Button>
                        </div>
                    </div>
                )}

                <ProductFormDialog
                    open={formProduct !== null}
                    onOpenChange={(open) => !open && setFormProduct(null)}
                    product={formProduct === 'new' || formProduct === null ? null : formProduct}
                    brands={brands}
                    categories={categories}
                    sizeGroups={sizeGroups}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                />

                <ProductDetailModal
                    product={detailProduct}
                    onOpenChange={(open) => !open && setDetailProduct(null)}
                    colors={colors}
                    sizes={sizes}
                    canWrite={canWrite}
                    onEdit={(p) => {
                        setDetailProduct(null)
                        setFormProduct(p)
                    }}
                    onChanged={load}
                />
            </div>
        </>
    )
}
