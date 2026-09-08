import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, PackageSearch, RefreshCw, Search, ShoppingCart } from 'lucide-react'

import { categoryApi, productApi, skuApi } from '@/api/product'
import { stockItemApi } from '@/api/inventory'
import { formatVnd } from '@/lib/format'
import { toastError, toastSuccess, toastWarning } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { EntityStatus } from '@/types/common'
import type { Category, Product } from '@/types/product'
import type { StockItem } from '@/types/inventory'
import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

/** Trần nạp danh mục nền (danh mục, và sản phẩm của một danh mục). */
const MAX_REFS = 500
/** Số dòng nạp mỗi lượt cuộn. Nhỏ để lượt đầu hiện nhanh, cuộn tới đâu nạp tới đó. */
const PAGE_SIZE = 30

const ALL = 'ALL'

/**
 * Một biến thể bán được: tồn kho của SKU tại chi nhánh, ghép thêm giá lấy từ sản phẩm cha.
 *
 * ⚠️ **Giá phải fallback về `Product.price`**: `SkuResDTO.unitPrice` đã có field nhưng **luôn
 * `null`** trên dữ liệu thật (không API nào đặt được giá theo SKU) — xem CLAUDE.md.
 * Giá này **chỉ để hiển thị**; giá tính tiền do server chốt ở `cart/preview`.
 */
type SellableSku = StockItem & {
    price: number
    productId: string | null
}

/**
 * Cột trái màn POS theo `03-pos-ban-hang.png`: ô quét barcode/tìm nhanh, hàng pill lọc theo
 * danh mục, bảng *Tên SP · Mã SP · Tồn · Giá*.
 *
 * ⚠️ **Lệch có chủ đích so với mockup** (đo trên API thật 2026-08-18):
 * - Mockup liệt kê **sản phẩm cha**, nhưng đơn hàng bán theo **SKU** (`OrderLineReq.skuId`) và
 *   tồn cũng theo SKU × chi nhánh ⇒ bảng ở đây liệt kê **SKU**, có thêm size/màu. Chọn sản phẩm
 *   cha rồi mới chọn biến thể sẽ thêm một bước mà mockup không có.
 * - Pill danh mục của mockup ghi cứng *Tất cả / Áo / Quần / Váy / Khoác*; ở đây **nạp động** từ
 *   `category/search`. ⚠️ Backend lọc `categoryId` **không roll-up lên danh mục cha** (đo thật:
 *   lọc theo `AO` trả 0 dù có sản phẩm thuộc `AO-SM`) ⇒ chỉ hiện **danh mục lá** (`level` sâu nhất
 *   có sản phẩm), tránh pill bấm vào ra rỗng.
 * - ⚠️ **`keyword` của `stock-item/search` chỉ khớp MÃ SKU, không khớp tên sản phẩm** (đo thật:
 *   `"jeans"` → 0, `"SP003"` → 8). Muốn tìm theo tên phải qua `product/search` rồi lọc lại
 *   phía client ⇒ ô tìm kiếm ở đây **lọc phía client** trên tập tồn đã nạp, và cảnh báo khi
 *   tập đó bị cắt bởi trần phân trang.
 */
export function ProductPicker({
    branchId,
    onAdd,
    reloadSignal,
}: {
    branchId: string | null
    /** Bắn hiệu ứng "bay vào giỏ" từ toạ độ dòng vừa bấm — xem `fly-to-cart.tsx`. */
    onAdd?: (sourceEl: HTMLElement) => void
    /**
     * Tăng lên mỗi khi màn cha ghi dữ liệu xong (bán được một đơn) ⇒ nạp lại tồn
     * (CONVENTIONS mục 5.1). Đơn vừa tạo đã **trừ tồn thật** nên số đang hiện là số cũ.
     */
    reloadSignal?: number
}) {
    const { t } = useTranslation(['order', 'common'])
    const { lines, addLine } = useCart()
    /** Dòng vừa vượt tồn khi bấm thêm — chỉ để bật animation rung, tự tắt sau khi chạy xong. */
    const [shakeSkuId, setShakeSkuId] = useState<string | null>(null)

    const [stock, setStock] = useState<SellableSku[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    /** Nạp trang **đầu tiên** (hiện skeleton). Nạp thêm khi cuộn dùng `loadingMore`. */
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>(ALL)
    /** Trang đã nạp xong (1-based). `0` = chưa nạp gì. */
    const [page, setPage] = useState(0)
    /** Tổng số dòng của truy vấn hiện tại — dùng để biết còn gì để nạp không. */
    const [total, setTotal] = useState(0)
    /**
     * Tăng lên để **ép nạp lại từ đầu** mà không phải đụng `categoryFilter`/`branchId`.
     * Dùng cho nút Tải lại và cho việc nạp lại sau khi bán xong (CONVENTIONS mục 5.1).
     */
    const [reloadNonce, setReloadNonce] = useState(0)

    const scrollRef = useRef<HTMLDivElement>(null)
    /** Chặn nhiều lượt nạp chồng nhau khi người dùng cuộn nhanh. */
    const fetchingRef = useRef(false)

    const hasMore = stock.length < total

    /**
     * Nạp **một trang** dòng hàng bán được.
     *
     * ⚠️ **Hai đường lấy dữ liệu khác nhau, do giới hạn của backend:**
     * - **Tab "Tất cả"**: phân trang thẳng trên `stock-item/search` — đây là nguồn duy nhất có sẵn
     *   tồn theo SKU × chi nhánh.
     * - **Tab một danh mục**: `stock-item/search` **không nhận `categoryId` lẫn `productId`**
     *   (`StockItemSearchReq` chỉ có `branchId`/`skuId`/`lowStockOnly`) ⇒ phải **phân trang theo
     *   sản phẩm**: `product/search?categoryId` lấy trang sản phẩm, rồi `sku/search` theo từng
     *   sản phẩm của trang đó, rồi ghép tồn. Vì vậy `total` của tab danh mục là **số sản phẩm**,
     *   không phải số SKU — chỉ dùng để biết còn trang để nạp hay không, không hiển thị ra UI.
     *
     * Cả hai đường đều **gọi lại từ trang 1 mỗi khi đổi tab** (user chốt 2026-08-28).
     */
    const fetchPage = useCallback(
        async (nextPage: number, signal?: AbortSignal) => {
            if (categoryFilter === ALL) {
                const [stockRes, productRes, skuRes] = await Promise.all([
                    stockItemApi.search(
                        { branchId: branchId ?? undefined },
                        { page: nextPage, size: PAGE_SIZE, sort: ['skuId,ASC'] },
                        signal,
                    ),
                    // Giá chỉ có ở sản phẩm cha; SKU nào ACTIVE thì mới bán được.
                    productApi.search(
                        { status: EntityStatus.ACTIVE },
                        { page: 1, size: MAX_REFS, sort: ['name,ASC'] },
                        signal,
                    ),
                    skuApi.search(
                        { status: EntityStatus.ACTIVE },
                        { page: 1, size: MAX_REFS, sort: ['id,ASC'] },
                        signal,
                    ),
                ])

                const priceByProduct = new Map<string, number>(
                    productRes.data.map((product: Product) => [product.id, product.price]),
                )
                const productIdBySku = new Map<string, string>(
                    skuRes.data.map((sku) => [sku.id, sku.productId]),
                )
                const activeSkuIds = new Set(skuRes.data.map((sku) => sku.id))

                const rows = stockRes.data
                    .filter((item) => activeSkuIds.has(item.skuId))
                    .map((item) => {
                        const productId = productIdBySku.get(item.skuId) ?? null
                        return {
                            ...item,
                            productId,
                            price: (productId && priceByProduct.get(productId)) || 0,
                        }
                    })
                return { rows, total: stockRes.total }
            }

            /* ---- Tab một danh mục: phân trang theo SẢN PHẨM ---- */
            const productRes = await productApi.search(
                { categoryId: categoryFilter, status: EntityStatus.ACTIVE },
                { page: nextPage, size: PAGE_SIZE, sort: ['name,ASC'] },
                signal,
            )
            if (productRes.data.length === 0) return { rows: [], total: productRes.total }

            const priceByProduct = new Map<string, number>(
                productRes.data.map((product) => [product.id, product.price]),
            )

            /*
             * `sku/search` chỉ nhận **một** `productId` ⇒ phải gọi song song theo từng sản phẩm của
             * trang. `PAGE_SIZE` giữ nhỏ (30) chính vì lý do này — trang càng lớn càng nhiều request.
             */
            const skuLists = await Promise.all(
                productRes.data.map((product) =>
                    skuApi.search(
                        { productId: product.id, status: EntityStatus.ACTIVE },
                        { page: 1, size: MAX_REFS, sort: ['id,ASC'] },
                        signal,
                    ),
                ),
            )
            const skus = skuLists.flatMap((result) => result.data)
            if (skus.length === 0) return { rows: [], total: productRes.total }

            /*
             * Lấy tồn của đúng những SKU vừa tìm được. `stock-item/search` chỉ lọc được **một**
             * `skuId` mỗi lần nên gọi song song; dòng nào không có bản ghi tồn ⇒ bỏ qua (chi nhánh
             * này chưa từng nhập hàng đó).
             */
            const stockLists = await Promise.all(
                skus.map((sku) =>
                    stockItemApi.search(
                        { branchId: branchId ?? undefined, skuId: sku.id },
                        { page: 1, size: 1 },
                        signal,
                    ),
                ),
            )

            const productIdBySku = new Map<string, string>(skus.map((sku) => [sku.id, sku.productId]))
            const rows = stockLists
                .flatMap((result) => result.data)
                .map((item) => {
                    const productId = productIdBySku.get(item.skuId) ?? null
                    return {
                        ...item,
                        productId,
                        price: (productId && priceByProduct.get(productId)) || 0,
                    }
                })
            return { rows, total: productRes.total }
        },
        [branchId, categoryFilter],
    )

    /**
     * Nạp lại **từ đầu**: dùng khi đổi tab danh mục, đổi chi nhánh, hoặc bấm Tải lại.
     * Cuộn bảng về đầu vì tập dữ liệu đã khác hẳn.
     */
    useEffect(() => {
        const controller = new AbortController()
        setLoading(true)
        setError(false)
        fetchingRef.current = true

        fetchPage(1, controller.signal)
            .then(({ rows, total: nextTotal }) => {
                if (controller.signal.aborted) return
                setStock(rows)
                setTotal(nextTotal)
                setPage(1)
                if (scrollRef.current) scrollRef.current.scrollTop = 0
                /*
                 * Báo "đã cập nhật" khi tải lại xong (CONVENTIONS mục 5.2) — chỉ từ lần bấm Tải lại
                 * / bán xong trở đi, **không** toast ở lần nạp đầu tiên lúc mở màn.
                 */
                if (reloadNonce > 0) toastSuccess('dataTable.refreshed', { ns: 'common' })
            })
            .catch(() => {
                if (controller.signal.aborted) return
                setError(true)
                setStock([])
                setTotal(0)
                setPage(0)
            })
            .finally(() => {
                fetchingRef.current = false
                if (!controller.signal.aborted) setLoading(false)
            })

        return () => controller.abort()
    }, [fetchPage, reloadNonce])

    /** Nạp thêm trang kế — **cộng dồn** vào danh sách đang hiển thị, không cuộn đi đâu cả. */
    const loadMore = useCallback(async () => {
        if (fetchingRef.current || loading || !hasMore) return
        fetchingRef.current = true
        setLoadingMore(true)
        try {
            const { rows, total: nextTotal } = await fetchPage(page + 1)
            setStock((prev) => {
                /* Chống trùng: SKU đã có thì bỏ qua (trang có thể lệch khi dữ liệu đổi giữa chừng). */
                const seen = new Set(prev.map((row) => row.skuId))
                return [...prev, ...rows.filter((row) => !seen.has(row.skuId))]
            })
            setTotal(nextTotal)
            setPage((current) => current + 1)
        } catch {
            // api-client đã toast; giữ nguyên danh sách đang có để không mất thứ đang xem.
        } finally {
            fetchingRef.current = false
            setLoadingMore(false)
        }
    }, [fetchPage, page, hasMore, loading])

    /** Cuộn tới gần đáy ⇒ nạp thêm. Ngưỡng 200px để dữ liệu kịp về trước khi chạm đáy thật. */
    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) void loadMore()
    }, [loadMore])

    const refresh = useCallback(() => setReloadNonce((value) => value + 1), [])

    /*
     * Nạp lại tồn sau khi màn cha báo có đơn vừa tạo (CONVENTIONS mục 5.1): `POST /order`
     * **trừ tồn thật ngay lập tức** nên con số `available` đang hiển thị đã cũ.
     */
    useEffect(() => {
        if (reloadSignal === undefined || reloadSignal === 0) return
        refresh()
    }, [reloadSignal, refresh])

    /* Danh mục cho hàng pill — chỉ lấy danh mục lá (xem ghi chú đầu file). */
    useEffect(() => {
        const controller = new AbortController()
        categoryApi
            .search(
                { status: EntityStatus.ACTIVE },
                { page: 1, size: MAX_REFS, sort: ['sortOrder,ASC'] },
                controller.signal,
            )
            .then((result) => {
                const parentIds = new Set(
                    result.data.map((category) => category.parentId).filter(Boolean) as string[],
                )
                setCategories(result.data.filter((category) => !parentIds.has(category.id)))
            })
            .catch(() => {
                // api-client đã toast; hàng pill để rỗng chứ không làm vỡ màn bán hàng.
                if (!controller.signal.aborted) setCategories([])
            })
        return () => controller.abort()
    }, [])

    /**
     * Đổi tab danh mục ⇒ **query lại từ trang 1** (user chốt 2026-08-28).
     * Việc nạp do chính effect ở trên lo, vì `fetchPage` có dep `categoryFilter`.
     */
    const applyCategory = useCallback((categoryId: string) => setCategoryFilter(categoryId), [])

    /**
     * Lọc theo từ khoá — **phía client, trên phần đã nạp**.
     *
     * ⚠️ `keyword` của `stock-item/search` **chỉ khớp mã SKU, không khớp tên sản phẩm**
     * (đo thật: `"jeans"` → 0, `"SP003"` → 8) nên không đẩy được xuống server mà vẫn tìm theo tên.
     * Hệ quả: từ khoá chỉ soi được phần **đã cuộn tới** — ô tìm kiếm có cảnh báo cho việc này.
     */
    const visible = useMemo(() => {
        const needle = keyword.trim().toLowerCase()
        if (!needle) return stock
        return stock.filter(
            (item) =>
                item.productName?.toLowerCase().includes(needle) ||
                item.skuId.toLowerCase().includes(needle) ||
                item.colorName?.toLowerCase().includes(needle) ||
                item.sizeLabel?.toLowerCase().includes(needle),
        )
    }, [stock, keyword])

    /**
     * Thêm vào giỏ — kèm animation.
     *
     * ⚠️ Đây chỉ là **cảnh báo sớm phía client** dựa trên tồn đã nạp lúc mở màn: tồn thật có thể
     * đã đổi (đơn khác vừa lấy hàng) — điểm chặn chắc chắn duy nhất vẫn là `error.stock.insufficient`
     * ở `POST /order` (xem CLAUDE.md, mục "Mô hình tồn kho"). Ở đây chỉ để nhân viên **thấy ngay**
     * lúc bấm, thay vì phải chờ tới bước thanh toán.
     */
    const handleAdd = useCallback(
        (item: SellableSku, sourceEl: HTMLElement | null) => {
            if (item.available <= 0) {
                toastWarning('order.pos.outOfStock', { ns: 'order' })
                return
            }

            const inCart = lines.find((line) => line.skuId === item.skuId)?.quantity ?? 0
            if (inCart + 1 > item.available) {
                setShakeSkuId(item.skuId)
                window.setTimeout(() => setShakeSkuId((current) => (current === item.skuId ? null : current)), 400)
                toastWarning('order.pos.cart.insufficient', { ns: 'order', count: item.available })
                return
            }

            addLine({
                skuId: item.skuId,
                skuCode: item.skuCode,
                productName: item.productName,
                colorName: item.colorName,
                sizeLabel: item.sizeLabel,
                unitPrice: item.price,
                available: item.available,
                // Mặc định không chiết khấu; nhân viên chỉnh riêng từng dòng ở cột giỏ hàng.
                discountType: 'percent',
                discountValue: 0,
            })
            if (sourceEl) onAdd?.(sourceEl)
        },
        [addLine, lines, onAdd],
    )

    /**
     * Quét barcode: đầu đọc mã vạch gõ EAN rồi bắn `Enter`.
     * Dùng `GET /sku/by-ean/{ean}` (Phase 9) — khớp đúng 1 SKU thì thêm thẳng vào giỏ.
     */
    const handleScan = useCallback(async () => {
        const ean = keyword.trim()
        if (!ean) return

        // Khớp thẳng mã SKU đang hiển thị thì khỏi gọi API.
        const direct = stock.find((item) => item.skuId.toLowerCase() === ean.toLowerCase())
        if (direct) {
            // Quét barcode không có dòng bảng để bay từ đó — bỏ qua animation.
            handleAdd(direct, null)
            setKeyword('')
            return
        }

        // Chỉ thử tra EAN khi chuỗi trông giống mã vạch (toàn số) — tránh gọi API thừa khi gõ tên.
        if (!/^\d{8,14}$/.test(ean)) return

        try {
            const sku = await skuApi.getByEan(ean)
            const item = stock.find((row) => row.skuId === sku.id)
            if (!item) {
                // SKU có thật nhưng không có tồn ở chi nhánh này.
                toastWarning('order.pos.outOfStock', { ns: 'order' })
                return
            }
            handleAdd(item, null)
            setKeyword('')
        } catch (scanError) {
            toastError(scanError)
        }
    }, [keyword, stock, handleAdd])

    return (
        <Card className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                void handleScan()
                            }
                        }}
                        placeholder={t('order.pos.searchPlaceholder')}
                        aria-label={t('order.pos.searchPlaceholder')}
                        className="pl-9"
                        autoFocus
                    />
                </div>
                {/* Tải lại giữ nguyên tab danh mục + từ khoá (CONVENTIONS mục 5.2). */}
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={refresh}
                    disabled={loading}
                    aria-label={t('common:dataTable.refresh')}
                    title={t('common:dataTable.refresh')}>
                    <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                </Button>
            </div>

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={categoryFilter === ALL ? 'default' : 'outline'}
                        onClick={() => void applyCategory(ALL)}>
                        {t('order.pos.allCategories')}
                    </Button>
                    {categories.map((category) => (
                        <Button
                            key={category.id}
                            type="button"
                            size="sm"
                            variant={categoryFilter === category.id ? 'default' : 'outline'}
                            onClick={() => void applyCategory(category.id)}>
                            {category.name}
                        </Button>
                    ))}
                </div>
            )}

            {/*
              Từ khoá chỉ lọc phần ĐÃ CUỘN TỚI (backend không tìm được theo tên sản phẩm —
              xem `visible`). Cảnh báo khi còn trang chưa nạp để người dùng không tưởng là hết hàng.
            */}
            {keyword.trim() !== '' && hasMore && (
                <p className="text-warning bg-warning-muted rounded-md px-3 py-2 text-xs">
                    {t('order.pos.searchPartial')}
                </p>
            )}

            <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-card text-muted-foreground sticky top-0 z-10">
                        <tr className="border-b">
                            <th className="px-3 py-2 text-left text-xs font-medium">
                                {t('order.pos.column.product')}
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium">
                                {t('order.pos.column.sku')}
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium">
                                {t('order.pos.column.stock')}
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium">
                                {t('order.pos.column.price')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading &&
                            Array.from({ length: 6 }).map((_, index) => (
                                <tr key={index} className="border-b">
                                    <td className="px-3 py-3" colSpan={4}>
                                        <Skeleton className="h-5 w-full" />
                                    </td>
                                </tr>
                            ))}

                        {!loading &&
                            visible.map((item) => {
                                const soldOut = item.available <= 0
                                return (
                                    /*
                                      Hàng bảng là **thao tác chính** của màn POS (thêm hàng vào
                                      giỏ) nên phải bấm được bằng bàn phím: `role="button"` +
                                      `tabIndex` đưa hàng vào tab order, `Enter`/`Space` kích hoạt
                                      như chuột. Hàng hết tồn không nhận focus (`tabIndex={-1}`).
                                    */
                                    <tr
                                        key={item.id}
                                        role="button"
                                        tabIndex={soldOut ? -1 : 0}
                                        aria-disabled={soldOut || undefined}
                                        onClick={(event) => handleAdd(item, event.currentTarget)}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'Enter' && event.key !== ' ') return
                                            // Space cuộn trang nếu không chặn.
                                            event.preventDefault()
                                            handleAdd(item, event.currentTarget)
                                        }}
                                        className={cn(
                                            'border-b transition-colors',
                                            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                                            soldOut
                                                ? 'cursor-not-allowed opacity-50'
                                                : 'hover:bg-muted/60 cursor-pointer',
                                            // Vượt tồn ngay lúc bấm ⇒ rung báo lỗi thay vì bay vào giỏ.
                                            shakeSkuId === item.skuId && 'animate-pos-shake-error',
                                        )}>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                                                    <ShoppingCart className="size-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">
                                                        {item.productName}
                                                    </p>
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        {[item.sizeLabel, item.colorName]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-muted-foreground px-3 py-3 font-mono text-xs">
                                            {item.skuId}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {soldOut ? (
                                                <span className="text-destructive">
                                                    {t('order.pos.outOfStock')}
                                                </span>
                                            ) : (
                                                item.available
                                            )}
                                        </td>
                                        <td className="text-primary px-3 py-3 text-right font-medium tabular-nums">
                                            {formatVnd(item.price)}
                                        </td>
                                    </tr>
                                )
                            })}
                    </tbody>
                </table>

                {/* Đang nạp thêm khi cuộn — KHÔNG thay bảng bằng skeleton để không mất chỗ đang xem. */}
                {loadingMore && (
                    <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
                        <Loader2 className="size-4 animate-spin" />
                        {t('order.pos.loadingMore')}
                    </div>
                )}

                {!loading && visible.length === 0 && (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center">
                        <PackageSearch className="size-10 opacity-40" />
                        <p className="font-medium">
                            {error ? t('order.pos.loadError') : t('order.pos.empty')}
                        </p>
                        <p className="text-xs">
                            {error ? t('order.pos.loadErrorHint') : t('order.pos.emptyHint')}
                        </p>
                        {error && (
                            <Button variant="outline" size="sm" onClick={refresh}>
                                {t('common:action.retry')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}
