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
import {
    DataTableRefreshButton,
    RefreshingOverlay,
} from '@/components/data-table/data-table-view-options'
import { useTableState } from '@/hooks/use-table-state'
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
    /** Tải lại ngầm — chỉ quay icon, giữ nguyên lưới đang xem (CONVENTIONS mục 5.2). */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>(ALL)
    const [categoryFilter, setCategoryFilter] = useState<string>(ALL)

    /*
     * Màn này là **lưới card**, không phải bảng ⇒ chỉ dùng `page` + `refresh` của `useTableState`.
     * Không có `sorting`/`columnVisibility` vì không có cột nào để bật/tắt hay bấm sort
     * (CONVENTIONS mục 5.2 nói về bảng; lưới card chỉ cần nút Tải lại).
     */
    const table = useTableState()
    const { page, setPage } = table

    const [categories, setCategories] = useState<Category[]>([])
    const [brands, setBrands] = useState<Brand[]>([])
    const [colors, setColors] = useState<Color[]>([])
    const [sizes, setSizes] = useState<Size[]>([])

    const [formProduct, setFormProduct] = useState<Product | null | 'new'>(null)
    const [detailProduct, setDetailProduct] = useState<Product | null>(null)

    /**
     * `quiet` = nạp lại ngầm (nút Tải lại / sau khi ghi dữ liệu): giữ nguyên lưới đang hiển thị
     * thay vì nháy skeleton, để không mất vị trí đọc (CONVENTIONS mục 5.1 + 5.2).
     */
    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
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
                if (!signal?.aborted) {
                    setLoading(false)
                    setRefreshing(false)
                }
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

    /*
     * Nút Tải lại: giữ nguyên page/filter/scroll, chỉ gọi lại API.
     * `runRefresh` bọc thêm **toast báo đã cập nhật** khi xong (user chốt 2026-08-28) — trong lúc
     * chạy thì cờ `refreshing` làm mờ lưới + hiện spinner.
     */
    useEffect(() => {
        if (table.reloadNonce === 0) return
        const controller = new AbortController()
        void table.runRefresh((signal) => load(signal, true), controller.signal)
        return () => controller.abort()
        // `load` cố ý không nằm trong dep: chỉ chạy khi người dùng bấm Tải lại.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table.reloadNonce])

    /** Ghi dữ liệu xong ⇒ nạp lại ngầm, **giữ nguyên** page/filter (CONVENTIONS mục 5.1). */
    const reload = useCallback(() => load(undefined, true), [load])

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
        table.resetTo(() => setKeyword(value))
    }

    const handleCreate = async (payload: CreateProductReq) => {
        await productApi.create(payload)
        toastSuccess('product.toast.created', { ns: 'product' })
        await reload()
    }

    const handleUpdate = async (id: string, payload: UpdateProductReq) => {
        const updated = await productApi.update(id, payload)
        toastSuccess('product.toast.updated', { ns: 'product' })
        setDetailProduct((current) => (current?.id === id ? updated : current))
        await reload()
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <>
            {/*
              Nút **tác động dữ liệu** đặt cùng hàng tiêu đề màn (CONVENTIONS mục 5, chốt 2026-08-28);
              hàng dưới chỉ còn search/filter + điều khiển bảng.
            */}
            <PageHeader
                title={t('product.pageTitle')}
                description={t('product.pageDescription')}
                actions={
                    canWrite && (
                        <Button onClick={() => setFormProduct('new')}>
                            <Plus />
                            {t('product.list.addButton')}
                        </Button>
                    )
                }
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('product.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => table.resetTo(() => setStatusFilter(v))}>
                                <SelectTrigger aria-label={t('product.list.allStatuses')} className="w-full sm:w-44">
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
                                onChange={(v) => table.resetTo(() => setCategoryFilter(v))}
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
                    tableControls={
                        /*
                          Lưới card không đi qua `DataTable` nên chỉ có nút Tải lại, không có
                          dropdown ẩn/hiện cột (không có cột nào để ẩn). Vẫn đặt **cùng hàng
                          search/filter** như mọi bảng khác (CONVENTIONS mục 5, chốt 2026-08-28).
                        */
                        <DataTableRefreshButton
                            onRefresh={table.refresh}
                            refreshing={refreshing}
                        />
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
                    /* `relative` để lớp phủ "đang tải lại" bám đúng vùng lưới card. */
                    <div className="relative">
                        {refreshing && <RefreshingOverlay />}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {data.map((product) => (
                            /*
                              `Card` render ra `<div>` nên phải tự khai `role`/`tabIndex` +
                              `Enter`/`Space` thì mới mở được chi tiết bằng bàn phím.
                            */
                            <Card
                                key={product.id}
                                role="button"
                                tabIndex={0}
                                aria-label={product.name}
                                className="focus-visible:ring-ring cursor-pointer gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
                                onClick={() => setDetailProduct(product)}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return
                                    event.preventDefault()
                                    setDetailProduct(product)
                                }}>
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
                                onClick={() => setPage(page - 1)}>
                                {t('common:dataTable.prevPage')}
                            </Button>
                            <span className="text-sm">
                                {t('common:dataTable.pageOf', { page, pageCount: totalPages })}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}>
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
                    /* Ghi từ modal chi tiết (sinh SKU, đổi ảnh) ⇒ nạp lại ngầm, giữ nguyên trang. */
                    onChanged={reload}
                />
            </div>
        </>
    )
}
