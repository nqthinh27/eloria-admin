import { useCallback, useMemo, useState } from 'react'
import type { SortingState, VisibilityState } from '@tanstack/react-table'

import { toastSuccess } from '@/lib/toast'

/**
 * State dùng chung cho **mọi bảng danh sách** (CONVENTIONS mục 5.2).
 *
 * Gom `page` · `sort` · `cột đang ẩn` · `nonce tải lại` vào một chỗ thay vì để mỗi màn tự khai lại
 * bộ `useState` giống hệt nhau (trước đây 9 màn lặp y nguyên đoạn này).
 *
 * Hai nhóm thao tác **cố ý hành xử khác nhau**:
 * - **Đổi truy vấn** (filter, từ khoá, sort) ⇒ `page` về **1**: kết quả là tập dữ liệu khác hẳn,
 *   đứng ở trang 5 của tập cũ là vô nghĩa.
 * - **Ghi dữ liệu xong / bấm tải lại** ⇒ **giữ nguyên** `page`, `sort`, filter, scroll
 *   (CONVENTIONS mục 5.1). Đây là lý do `refresh()` chỉ tăng `reloadNonce` chứ không đụng gì khác.
 */

/**
 * Đổi `SortingState` (khoá theo **id cột ở FE**) sang tham số `SearchPagination.sort` của backend
 * (`["field,ASC"]`).
 *
 * Tên field lấy từ `meta.sortField` của cột nếu có, ngược lại dùng chính `column.id`.
 *
 * ⚠️ **Sai tên field ⇒ backend trả HTTP 500**, không phải 400 (`PropertyReferenceException` rơi vào
 * handler `Exception` chung) — xem CLAUDE.md mục "Sort phía server". Vì vậy cột nào backend không
 * sort được **phải** khai `enableSorting: false` chứ không được để mặc định.
 *
 * `columns` cho phép bỏ trống khi mọi `id` cột đã trùng tên field backend.
 */
export function toSearchSort(
    sorting: SortingState,
    fallback: string[],
    /** Chỉ cần `id` + `meta.sortField` — nhận kiểu tối giản để mọi `ColumnDef<T>` truyền vào được. */
    columns?: readonly { id?: string; meta?: { sortField?: string } }[],
): string[] {
    if (sorting.length === 0) return fallback
    return sorting.map((rule) => {
        const field = columns?.find((column) => column.id === rule.id)?.meta?.sortField ?? rule.id
        return `${field},${rule.desc ? 'DESC' : 'ASC'}`
    })
}

export type TableState = {
    page: number
    setPage: (page: number) => void
    sorting: SortingState
    /** Đổi sort ⇒ tự về trang 1 (đây là đổi truy vấn, không phải mutation). */
    setSorting: (sorting: SortingState) => void
    columnVisibility: VisibilityState
    setColumnVisibility: (value: VisibilityState) => void
    /**
     * Tăng mỗi lần bấm "Tải lại". Đưa vào dep của `load` để ép gọi lại API mà **không** phải
     * đụng tới `page`/filter — nhờ vậy ngữ cảnh bảng được giữ nguyên.
     */
    reloadNonce: number
    /** Tải lại danh sách, giữ nguyên page/sort/filter/scroll. */
    refresh: () => void
    /**
     * Chạy lượt tải lại **do người dùng bấm nút Tải lại**, kèm phản hồi rõ ràng
     * (user chốt 2026-08-28): gọi `run(signal)` rồi **toast báo đã cập nhật**.
     *
     * Phần "mờ bảng + spinner" do cờ `refreshing` của màn lo (truyền vào `DataTable.refreshing`);
     * hàm này chỉ phụ trách vế **báo đã xong**, vì đó là thứ mọi bảng đang thiếu.
     *
     * ⚠️ Chỉ dùng trong effect nghe `reloadNonce`. **Không** dùng cho reload sau mutation — chỗ đó
     * đã có toast riêng của hành động ("Tạo … thành công"), thêm toast nữa là ồn.
     */
    runRefresh: (run: (signal?: AbortSignal) => Promise<unknown>, signal?: AbortSignal) => Promise<void>
    /**
     * Đặt lại về trang 1 — **chỉ dùng khi đổi filter/từ khoá**, tuyệt đối không dùng sau mutation
     * (CONVENTIONS mục 5.1). Nhận callback để cập nhật filter trong cùng một lần gọi.
     */
    resetTo: (apply: () => void) => void
}

export function useTableState(initialSorting: SortingState = []): TableState {
    const [page, setPage] = useState(1)
    const [sorting, setSortingState] = useState<SortingState>(initialSorting)
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [reloadNonce, setReloadNonce] = useState(0)

    const setSorting = useCallback((next: SortingState) => {
        setSortingState(next)
        setPage(1)
    }, [])

    const refresh = useCallback(() => setReloadNonce((value) => value + 1), [])

    /*
     * Báo "đã cập nhật" sau khi tải lại xong, để mọi bảng phản hồi giống nhau.
     *
     * ⚠️ Request bị huỷ (đổi trang/rời màn giữa chừng) thì **không** toast — lượt tải mới đã tiếp
     * quản, báo "đã cập nhật" lúc đó là sai sự thật. Lỗi cũng không toast thành công: `load` của
     * màn tự nuốt lỗi và bật cờ `error`, còn api-client đã bắn toast lỗi riêng.
     */
    const runRefresh = useCallback(
        async (run: (signal?: AbortSignal) => Promise<unknown>, signal?: AbortSignal) => {
            await run(signal)
            if (signal?.aborted) return
            toastSuccess('dataTable.refreshed')
        },
        [],
    )

    const resetTo = useCallback((apply: () => void) => {
        apply()
        setPage(1)
    }, [])

    return useMemo(
        () => ({
            page,
            setPage,
            sorting,
            setSorting,
            columnVisibility,
            setColumnVisibility,
            reloadNonce,
            refresh,
            runRefresh,
            resetTo,
        }),
        [page, sorting, columnVisibility, reloadNonce, setSorting, refresh, runRefresh, resetTo],
    )
}
