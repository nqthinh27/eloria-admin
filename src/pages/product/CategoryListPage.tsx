import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, Boxes, Eye, MoreHorizontal, Pencil, Plus, Power, Star, Trash2 } from 'lucide-react'

import { categoryApi } from '@/api/product'
import { ApiError } from '@/lib/api-error'
import { resolveImageSrc } from '@/lib/image-spec'
import { toastError, toastSuccess, toastWarning } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useTableState } from '@/hooks/use-table-state'
import { hasRole } from '@/config/roles'
import { EntityStatus, ERole } from '@/types/common'
import type { Category, CategoryPayload } from '@/types/product'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { CategoryDetailModal } from './components/category-detail-modal'
import { CategoryFormDialog } from './components/category-form-dialog'
import { SetDefaultCategoryDialog } from './components/set-default-category-dialog'

const ALL_LEVELS = 'ALL'
const ALL_DEFAULTS = 'ALL'
const ONLY_DEFAULT = 'DEFAULT'
/** Subkey backend trả (HTTP 409) khi 2 người cùng bật danh mục mặc định một lúc — BE33 (handoff P13.2). */
const DEFAULT_RACE_SUBKEY = 'error.category.defaultConflict'
const PAGE_SIZE = 10
/** Trần số danh mục nạp một lần. Vượt ngưỡng này phải chuyển sang phân trang phía server. */
const MAX_CATEGORIES = 200

/**
 * Màn "Danh mục sản phẩm" theo `12-danh-muc-sp.png` — PLAN Phase 9. Chạy trên **API thật**.
 *
 * ⚠️ **Lệch có chủ đích so với mockup**: mockup có 3 cột SỐ SẢN PHẨM · THƯƠNG HIỆU · BỘ SƯU TẬP,
 * nhưng `CategoryResDTO` **không có** các số đếm này và backend cũng không có API bộ sưu tập.
 * Thay bằng THỨ TỰ · TRẠNG THÁI (field thật của DTO). Xem PLAN Phase 9.
 */
export default function CategoryListPage() {
    const { t } = useTranslation(['product', 'common'])
    const { user } = useAuth()
    /** Toàn bộ API ghi của nhóm sản phẩm là `[SUPER_ADMIN]` — ADMIN gọi cũng 403. */
    const canWrite = hasRole(user?.role, ERole.SUPER_ADMIN)

    const [allCategories, setAllCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    /**
     * Đang tải lại ngầm: **mờ bảng + spinner + icon nút xoay**, nhưng KHÔNG nháy skeleton —
     * dữ liệu cũ nằm nguyên để không mất vị trí đọc (CONVENTIONS mục 5.2).
     */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [levelFilter, setLevelFilter] = useState<string>(ALL_LEVELS)
    const [defaultFilter, setDefaultFilter] = useState<string>(ALL_DEFAULTS)
    const [setDefaultOpen, setSetDefaultOpen] = useState(false)

    /*
     * page · cột ẩn/hiện · nonce tải lại — xem `use-table-state`.
     *
     * ⚠️ Màn này **cố ý KHÔNG dùng `sorting` của hook**: bảng chạy sort phía client (xem ghi chú
     * ở `<DataTable>` bên dưới), nên không có gì để đẩy lên `SearchPagination.sort`.
     */
    /*
     * Cột ẩn sẵn (CONVENTIONS mục 5.6): THỨ TỰ chỉ dùng lúc sắp lại menu danh mục, không phải
     * thông tin tra cứu thường ngày — bật lại ở dropdown "Hiển thị cột" khi cần.
     */
    const table = useTableState([], { sortOrder: false })
    const { page, setPage, columnVisibility, setColumnVisibility } = table

    const [formCategory, setFormCategory] = useState<Category | null | 'new'>(null)
    const [detailCategory, setDetailCategory] = useState<Category | null>(null)
    const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
    const [statusCategory, setStatusCategory] = useState<Category | null>(null)

    /*
     * Nạp **một lần** toàn bộ cây danh mục rồi tự lọc + phân trang phía client.
     *
     * Trước đây màn này gọi 2 API cho cùng một bảng: `size=10` cho bảng và `size=200` cho dropdown
     * "danh mục cha" — lãng phí (user báo 2026-08-09). Cây danh mục nhỏ (hàng chục mục) nên nạp
     * trọn một lần là đủ, và còn sửa được 2 khuyết điểm của cách cũ:
     *   - Bộ lọc cấp (gốc/con) trước đây chỉ lọc trong **10 dòng của trang hiện tại** ⇒ sai số tổng;
     *     giờ lọc trên toàn bộ cây nên số trang và tổng luôn đúng.
     *   - Tìm kiếm cũng không cần gọi lại API mỗi lần gõ.
     * Nếu sau này danh mục vượt `MAX_CATEGORIES` thì phải chuyển lại sang phân trang phía server.
     */
    const load = useCallback(async (signal?: AbortSignal, quiet = false) => {
        /*
         * `quiet` = nạp lại ngầm (nút Tải lại / sau khi ghi dữ liệu): giữ nguyên dữ liệu đang
         * hiển thị thay vì nháy skeleton, để không mất vị trí đọc (CONVENTIONS mục 5.1 + 5.2).
         */
        if (quiet) setRefreshing(true)
        else setLoading(true)
        setError(false)
        try {
            const result = await categoryApi.search(
                {},
                { page: 1, size: MAX_CATEGORIES, sort: ['code,ASC'] },
                signal,
            )
            setAllCategories(result.data)
        } catch {
            // Request bị huỷ (unmount / StrictMode remount) không phải lỗi thật.
            if (signal?.aborted) return
            setError(true)
        } finally {
            if (!signal?.aborted) {
                setLoading(false)
                setRefreshing(false)
            }
        }
    }, [])

    /* Huỷ request khi unmount — tránh set state trên component đã gỡ và bỏ request thừa. */
    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    /*
     * Nút Tải lại: giữ nguyên page/sort/filter/scroll, chỉ gọi lại API.
     * `runRefresh` bọc thêm **toast báo đã cập nhật** khi xong (user chốt 2026-08-28) — trong lúc
     * chạy thì cờ `refreshing` làm mờ bảng + hiện spinner.
     */
    useEffect(() => {
        if (table.reloadNonce === 0) return
        const controller = new AbortController()
        void table.runRefresh((signal) => load(signal, true), controller.signal)
        return () => controller.abort()
        // `load` cố ý không nằm trong dep: chỉ chạy khi người dùng bấm Tải lại.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table.reloadNonce])

    /*
     * Lọc keyword + cấp, rồi cắt trang — tất cả phía client trên dữ liệu đã nạp.
     * `CategorySearchReqDTO` chỉ có `parentId` (lọc theo 1 cha cụ thể), không có tham số
     * "chỉ lấy gốc"/"chỉ lấy con" nên phần lọc cấp vốn đã phải làm ở client.
     */
    const filtered = useMemo(() => {
        const kw = keyword.trim().toLowerCase()
        return allCategories.filter((c) => {
            if (levelFilter === 'ROOT' && c.level !== 0) return false
            if (levelFilter === 'CHILD' && c.level === 0) return false
            // Đã nạp trọn cây nên lọc "mặc định" ở client cho khỏi tốn thêm request (cùng lý do lọc cấp).
            if (defaultFilter === ONLY_DEFAULT && c.isDefault !== true) return false
            if (!kw) return true
            return c.name.toLowerCase().includes(kw) || c.code.toLowerCase().includes(kw)
        })
    }, [allCategories, keyword, levelFilter, defaultFilter])

    /** Danh mục đang giữ cờ mặc định (kể cả khi đang INACTIVE — backend vẫn tính nó chiếm chỗ). */
    const currentDefault = useMemo(
        () => allCategories.find((c) => c.isDefault === true) ?? null,
        [allCategories],
    )
    /*
     * Web chỉ dùng danh mục mặc định **đang hoạt động** — mặc định mà bị tắt thì khối ảnh ngang cuối
     * Trang chủ cũng biến mất, nên banner cảnh báo tính theo "mặc định đang hoạt động".
     */
    const hasActiveDefault = currentDefault?.status === EntityStatus.ACTIVE

    const total = filtered.length
    const visibleData = useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page],
    )

    /* Xoá/lọc xong có thể rơi vào trang trống (ví dụ đang ở trang 3 mà chỉ còn 1 trang). */
    useEffect(() => {
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
        if (page > lastPage) setPage(lastPage)
        // `setPage` nay đến từ `useTableState` (không còn là setter `useState` cục bộ) nên phải khai
        // vào dep cho đúng luật hook; bản thân nó là setter ổn định, thêm vào không gây chạy lại.
    }, [total, page, setPage])

    const handleSearchChange = (value: string) => {
        table.resetTo(() => setKeyword(value))
    }

    /** Ghi dữ liệu xong ⇒ nạp lại ngầm, **giữ nguyên** page/filter (CONVENTIONS mục 5.1). */
    const reload = useCallback(() => load(undefined, true), [load])

    /**
     * Ghi danh mục (thêm/sửa) có xử lý riêng cho cờ **mặc định** (handoff P13.1):
     *
     * - Bật mặc định cho B khi A đang giữ ⇒ chỉ **1 request**, server tự gỡ A trong cùng transaction ⇒
     *   **không popup**, chỉ toast nêu tên A và B (chuyển A→B không làm mất gì trên web khách).
     * - 2 người cùng bật một lúc ⇒ HTTP 409 `error.category.defaultConflict` (BE33). Màn **tự xử lý**:
     *   tắt toast mặc định, báo đúng câu rồi nạp lại để UI đồng bộ. Trả `false` = đã xử lý xung đột, không toast thành công.
     */
    const saveCategory = async (
        run: (options?: { skipErrorToast: boolean }) => Promise<Category>,
        payload: CategoryPayload,
        savedId: string | null,
        successKey: string,
    ): Promise<Category | undefined> => {
        const turningOn = payload.isDefault === true
        let result: Category
        try {
            result = await run(turningOn ? { skipErrorToast: true } : undefined)
        } catch (error) {
            if (
                turningOn &&
                error instanceof ApiError &&
                error.status === 409 &&
                error.subKey === DEFAULT_RACE_SUBKEY
            ) {
                toastWarning('category.toast.defaultRace', { ns: 'product' })
                await reload()
                return undefined
            }
            // Đã tắt toast mặc định ở trên nên báo lỗi tại đây để hành vi giống mọi lần ghi khác.
            if (turningOn) toastError(error)
            throw error
        }

        const switchedFrom =
            turningOn && currentDefault && currentDefault.id !== savedId ? currentDefault : null
        if (switchedFrom) {
            toastSuccess('category.toast.defaultSwitched', {
                ns: 'product',
                from: switchedFrom.name,
                to: payload.name,
            })
        } else {
            toastSuccess(successKey, { ns: 'product' })
        }
        await reload()
        return result
    }

    const handleCreate = (payload: CategoryPayload) =>
        saveCategory((options) => categoryApi.create(payload, options), payload, null, 'category.toast.created')

    const handleUpdate = async (id: string, payload: CategoryPayload) => {
        await saveCategory(
            (options) => categoryApi.update(id, payload, options),
            payload,
            id,
            'category.toast.updated',
        )
    }

    /**
     * Đặt một danh mục làm mặc định từ menu dòng / banner cảnh báo — không qua form nên phải tự dựng
     * payload **an toàn**: `PUT` là full-update với `parentId` (bỏ ⇒ về gốc) nên gửi lại đủ code · name ·
     * cha · thứ tự; các field nội dung bỏ hẳn ⇒ backend giữ nguyên.
     */
    const handleSetDefault = (category: Category) => {
        const payload: CategoryPayload = {
            code: category.code,
            name: category.name,
            parentId: category.parentId ?? undefined,
            sortOrder: category.sortOrder ?? undefined,
            isDefault: true,
        }
        return handleUpdate(category.id, payload)
    }

    /*
     * `columns` được memo theo `[t, canWrite]` nên menu dòng sẽ giữ bản `handleSetDefault` cũ (với
     * `currentDefault` cũ ⇒ toast "chuyển từ A sang B" nêu sai A). Qua ref để luôn gọi bản mới nhất.
     */
    const setDefaultRef = useRef(handleSetDefault)
    useEffect(() => {
        setDefaultRef.current = handleSetDefault
    })

    const handleDelete = async () => {
        if (!deleteCategory) return
        await categoryApi.remove(deleteCategory.id)
        toastSuccess('category.toast.deleted', { ns: 'product' })
        await reload()
    }

    const handleToggleStatus = async () => {
        if (!statusCategory) return
        const next =
            statusCategory.status === EntityStatus.ACTIVE
                ? EntityStatus.INACTIVE
                : EntityStatus.ACTIVE
        await categoryApi.updateStatus(statusCategory.id, next)
        toastSuccess('category.toast.statusUpdated', { ns: 'product' })
        await reload()
    }

    /** Loại chính nó khỏi danh sách cha để tránh tự trỏ vào mình (backend cũng chặn). */
    const parentOptions = useMemo(() => {
        const editing = formCategory === 'new' || formCategory === null ? null : formCategory
        return allCategories.filter((c) => c.id !== editing?.id)
    }, [allCategories, formCategory])

    /*
     * ⚠️ **Không khai `meta.sortField`** cho màn này: bảng sort phía client (xem ghi chú ở
     * `<DataTable>` bên dưới) nên không có field nào được đẩy lên backend.
     * `meta.columnLabel` thì vẫn bắt buộc — đó là nhãn hiển thị trong dropdown bật/tắt cột.
     */
    const columns = useMemo<ColumnDef<Category, unknown>[]>(
        () => [
            {
                id: 'code',
                header: t('category.list.column.code'),
                // Cột định danh, nằm trong dải ghim ⇒ không cho ẩn (CONVENTIONS mục 5.6).
                size: 140,
                enableHiding: false,
                meta: { columnLabel: t('category.list.column.code') },
                cell: ({ row }) => (
                    <span className="text-muted-foreground font-mono text-xs">
                        {row.original.code}
                    </span>
                ),
            },
            {
                id: 'name',
                header: t('category.list.column.name'),
                // Cột ghim ⇒ bắt buộc khai `size` để dải ghim không lệch khi cuộn (mục 5.6).
                size: 260,
                // Cột tên — ẩn đi thì không biết đang xem danh mục nào.
                enableHiding: false,
                meta: { columnLabel: t('category.list.column.name') },
                cell: ({ row }) => {
                    // Ảnh đại diện = `imageLink1` (backend đã bỏ `imageUrl` — P13.3).
                    const thumb = row.original.imageLink1
                    return (
                        <div className="flex items-center gap-3">
                            {thumb ? (
                                <img
                                    src={resolveImageSrc(thumb)}
                                    alt=""
                                    className="bg-muted size-8 shrink-0 rounded-lg object-cover"
                                />
                            ) : (
                                <span className="bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                                    <Boxes className="size-4" />
                                </span>
                            )}
                            <span className="font-medium">{row.original.name}</span>
                        </div>
                    )
                },
            },
            {
                id: 'default',
                header: t('category.list.column.default'),
                size: 120,
                // Badge ⇒ căn giữa (CONVENTIONS mục 5.6). Toàn bảng chỉ có tối đa 1 dòng có badge.
                meta: { columnLabel: t('category.list.column.default'), align: 'center' },
                cell: ({ row }) =>
                    row.original.isDefault === true ? (
                        <StatusBadge tone="info">{t('category.list.defaultBadge')}</StatusBadge>
                    ) : null,
            },
            {
                id: 'parent',
                header: t('category.list.column.parent'),
                size: 180,
                meta: { columnLabel: t('category.list.column.parent') },
                cell: ({ row }) =>
                    row.original.parentName ? (
                        <Badge variant="outline">{row.original.parentName}</Badge>
                    ) : (
                        <span className="text-muted-foreground text-sm">
                            {t('category.list.noParent')}
                        </span>
                    ),
            },
            {
                id: 'sortOrder',
                header: t('category.list.column.sortOrder'),
                size: 100,
                // Số thứ tự sắp xếp ⇒ căn phải cho thẳng cột chữ số (CONVENTIONS mục 5.6).
                meta: { columnLabel: t('category.list.column.sortOrder'), align: 'right' },
                cell: ({ row }) => (
                    <span className="tabular-nums">{row.original.sortOrder ?? '—'}</span>
                ),
            },
            {
                id: 'status',
                header: t('category.list.column.status'),
                size: 140,
                // Badge ⇒ căn giữa (CONVENTIONS mục 5.6).
                meta: { columnLabel: t('category.list.column.status'), align: 'center' },
                cell: ({ row }) =>
                    row.original.status === EntityStatus.ACTIVE ? (
                        <StatusBadge tone="success">{t('category.list.statusActive')}</StatusBadge>
                    ) : (
                        <StatusBadge tone="muted">{t('category.list.statusInactive')}</StatusBadge>
                    ),
            },
            {
                id: 'actions',
                header: t('category.list.column.actions'),
                size: 88,
                // Đường vào mọi thao tác — không cho ẩn, và không có gì để sort.
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('category.list.column.actions'), align: 'center' },
                cell: ({ row }) => {
                    const category = row.original
                    const isActive = category.status === EntityStatus.ACTIVE
                    return (
                        <div className="flex items-center justify-center gap-1">
                            {/* Nut Chi tiet LUON hien, khong gate theo quyen (CONVENTIONS muc 5.3). */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                title={t('category.list.actionView')}
                                aria-label={t('category.list.actionView')}
                                onClick={() => setDetailCategory(category)}>
                                <Eye className="size-4" />
                            </Button>

                            {/* Chi role ghi moi co hanh dong => menu tu an voi nguoi chi xem. */}
                            {canWrite && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 shrink-0"
                                            aria-label={t('category.list.column.actions')}>
                                            <MoreHorizontal className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onSelect={() => setFormCategory(category)}>
                                            <Pencil className="size-4" />
                                            {t('category.list.actionEdit')}
                                        </DropdownMenuItem>
                                        {/* Danh mục mặc định phải đang hoạt động mới có nghĩa trên web ⇒ chỉ mời đặt khi ACTIVE. */}
                                        {category.isDefault !== true && isActive && (
                                            <DropdownMenuItem
                                                onSelect={() => {
                                                    // Lỗi đã được toast trong `saveCategory`.
                                                    void setDefaultRef.current(category).catch(() => {})
                                                }}>
                                                <Star className="size-4" />
                                                {t('category.list.actionSetDefault')}
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            onSelect={() => setStatusCategory(category)}>
                                            <Power className="size-4" />
                                            {isActive
                                                ? t('category.list.actionDeactivate')
                                                : t('category.list.actionActivate')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            variant="destructive"
                                            onSelect={() => setDeleteCategory(category)}>
                                            <Trash2 className="size-4" />
                                            {t('category.list.actionDelete')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )
                },
            },
        ],
        [t, canWrite],
    )

    const isDeactivating = statusCategory?.status === EntityStatus.ACTIVE

    return (
        <>
            {/*
              Nút **tác động dữ liệu** đặt cùng hàng tiêu đề màn (CONVENTIONS mục 5, chốt 2026-08-28);
              hàng dưới chỉ còn search/filter + điều khiển bảng.
            */}
            <PageHeader
                title={t('category.pageTitle')}
                description={t('category.pageDescription')}
                actions={
                    canWrite && (
                        <Button onClick={() => setFormCategory('new')}>
                            <Plus />
                            {t('category.list.addButton')}
                        </Button>
                    )
                }
            />

            <div className="space-y-4">
                {/*
                  * Chưa có danh mục mặc định đang hoạt động ⇒ web **ẩn hẳn** khối ảnh ngang cuối Trang chủ
                  * (không có ảnh thay thế — PO chốt 2026-10-06), nên cảnh báo phải nói đúng như vậy.
                  * Chỉ hiện sau khi nạp xong và cây không rỗng để không nháy lúc đang tải.
                  */}
                {!loading && !error && allCategories.length > 0 && !hasActiveDefault && (
                    <Alert className="border-warning bg-warning-muted flex items-start gap-3">
                        <AlertTriangle className="text-warning" />
                        <div className="col-start-2 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0 space-y-0.5">
                                <AlertTitle>{t('category.list.noDefaultBanner.title')}</AlertTitle>
                                <AlertDescription>
                                    {t('category.list.noDefaultBanner.description')}
                                </AlertDescription>
                            </div>
                            {canWrite && (
                                <Button size="sm" variant="outline" onClick={() => setSetDefaultOpen(true)}>
                                    {t('category.list.noDefaultBanner.action')}
                                </Button>
                            )}
                        </div>
                    </Alert>
                )}

                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder={t('category.list.searchPlaceholder')}
                    filters={
                        <>
                            <Select
                                value={levelFilter}
                                onValueChange={(v) => table.resetTo(() => setLevelFilter(v))}>
                                <SelectTrigger aria-label={t('product.list.allStatuses')} className="w-full sm:w-44">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_LEVELS}>{t('category.list.allLevels')}</SelectItem>
                                    <SelectItem value="ROOT">{t('category.list.levelRoot')}</SelectItem>
                                    <SelectItem value="CHILD">{t('category.list.levelChild')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={defaultFilter}
                                onValueChange={(v) => table.resetTo(() => setDefaultFilter(v))}>
                                <SelectTrigger
                                    aria-label={t('category.list.filterDefaultLabel')}
                                    className="w-full sm:w-52">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_DEFAULTS}>{t('category.list.allDefaults')}</SelectItem>
                                    <SelectItem value={ONLY_DEFAULT}>{t('category.list.onlyDefault')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    }
                    tableControls={
                        <DataTableControls
                            columns={columns}
                            columnVisibility={columnVisibility}
                            onColumnVisibilityChange={setColumnVisibility}
                            onRefresh={table.refresh}
                            refreshing={refreshing}
                        />
                    }
                />

                {/*
                 * ⚠️ **Cố ý KHÔNG truyền `sorting` / `onSortingChange`** ⇒ `DataTable` chạy ở chế
                 * độ mặc định là **sort phía client**. Ở màn này đó là lựa chọn ĐÚNG, khác hẳn các
                 * bảng phân trang phía server:
                 *
                 * - Màn này nạp **trọn cây danh mục một lần** (`page:1, size:MAX_CATEGORIES`) rồi
                 *   tự cắt trang ở client ⇒ `allCategories` chính là **toàn bộ tập kết quả**, không
                 *   phải một lát cắt 10 dòng. Sort client vì thế cho ra thứ tự đúng trên toàn bộ dữ
                 *   liệu, y hệt sort server.
                 * - Ngược lại, bảng phân trang phía server chỉ giữ ≤ `size` dòng của trang hiện tại
                 *   nên sort client sẽ **sắp xếp sai mà người dùng không biết** — đó là lý do
                 *   CONVENTIONS mục 5.2 cấm dùng nó ở những màn kia.
                 * - Hệ quả: cũng **không cần** `meta.sortField`, vì không có gì đẩy lên
                 *   `SearchPagination.sort`.
                 *
                 * ⚠️ Nếu sau này danh mục vượt `MAX_CATEGORIES` và phải chuyển sang phân trang phía
                 * server thì **bắt buộc** đổi luôn sang sort server + khai `meta.sortField`.
                 */}
                <DataTable
                    columns={columns}
                    data={visibleData}
                    getRowId={(row) => row.id}
                    loading={loading}
                    refreshing={refreshing}
                    error={error}
                    onRetry={load}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    unitLabel={t('category.list.resultLabel')}
                    emptyState={t('category.list.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <CategoryDetailModal
                    category={detailCategory}
                    onOpenChange={(open) => !open && setDetailCategory(null)}
                />

                <CategoryFormDialog
                    open={formCategory !== null}
                    onOpenChange={(open) => !open && setFormCategory(null)}
                    category={
                        formCategory === 'new' || formCategory === null ? null : formCategory
                    }
                    parentOptions={parentOptions}
                    currentDefault={currentDefault}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    onMediaChanged={() => void reload()}
                />

                <SetDefaultCategoryDialog
                    open={setDefaultOpen}
                    onOpenChange={setSetDefaultOpen}
                    categories={allCategories}
                    onConfirm={handleSetDefault}
                />

                <ConfirmDialog
                    open={deleteCategory !== null}
                    onOpenChange={(open) => !open && setDeleteCategory(null)}
                    title={t('category.deleteConfirm.title')}
                    description={
                        <>
                            {t('category.deleteConfirm.description', { name: deleteCategory?.name })}
                            {/* Xoá danh mục mặc định ⇒ về 0 mặc định (đường ③ — cùng nội dung cảnh báo với 2 đường kia). */}
                            {deleteCategory?.isDefault === true && (
                                <span className="text-foreground mt-2 block font-medium">
                                    {t('category.defaultWarning.body')}
                                </span>
                            )}
                        </>
                    }
                    variant="destructive"
                    confirmLabel={
                        deleteCategory?.isDefault === true
                            ? t('category.defaultWarning.confirm')
                            : t('category.deleteConfirm.submit')
                    }
                    auditLogged
                    onConfirm={handleDelete}
                />

                <ConfirmDialog
                    open={statusCategory !== null}
                    onOpenChange={(open) => !open && setStatusCategory(null)}
                    title={
                        isDeactivating
                            ? t('category.statusConfirm.deactivateTitle')
                            : t('category.statusConfirm.activateTitle')
                    }
                    description={
                        isDeactivating ? (
                            <>
                                {t('category.statusConfirm.deactivateDescription', {
                                    name: statusCategory?.name,
                                })}
                                {/* Tắt danh mục mặc định ⇒ web không còn dùng nó ⇒ về 0 mặc định (đường ②). */}
                                {statusCategory?.isDefault === true && (
                                    <span className="text-foreground mt-2 block font-medium">
                                        {t('category.defaultWarning.body')}
                                    </span>
                                )}
                            </>
                        ) : (
                            t('category.statusConfirm.activateDescription', {
                                name: statusCategory?.name,
                            })
                        )
                    }
                    confirmLabel={
                        isDeactivating && statusCategory?.isDefault === true
                            ? t('category.defaultWarning.confirm')
                            : undefined
                    }
                    variant={isDeactivating ? 'destructive' : 'default'}
                    auditLogged
                    onConfirm={handleToggleStatus}
                />
            </div>
        </>
    )
}
