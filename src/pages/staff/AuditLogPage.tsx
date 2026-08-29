import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

import { auditLogApi } from '@/api/audit-log'
import { formatDateTime } from '@/lib/format'
import { toSearchSort, useTableState } from '@/hooks/use-table-state'
import type { AuditLog } from '@/types/audit-log'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { DataTableControls } from '@/components/data-table/data-table-view-options'
import { AuditLogDetailDialog } from './components/audit-log-detail-dialog'

const PAGE_SIZE = 10
/** Mặc định của backend khi không truyền `sort`. Nhật ký luôn xem theo thời gian mới nhất trước. */
const DEFAULT_SORT = ['createdDate,DESC']

/** Màn "Nhật ký hệ thống" — mục menu riêng trong nhóm HỆ THỐNG. Chưa có mockup ⇒ pattern bảng chuẩn. */
export default function AuditLogPage() {
    const { t } = useTranslation(['staff', 'common'])

    const [data, setData] = useState<AuditLog[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    /**
     * Đang tải lại ngầm: **mờ bảng + spinner + icon nút xoay**, nhưng KHÔNG nháy skeleton —
     * dữ liệu cũ nằm nguyên để không mất vị trí đọc (CONVENTIONS mục 5.2).
     */
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [selected, setSelected] = useState<AuditLog | null>(null)

    /* page · sort · cột ẩn/hiện · nonce tải lại — xem `use-table-state`. */
    const table = useTableState()
    const { page, sorting, setSorting, columnVisibility, setColumnVisibility } = table

    /*
     * Khai trước `load` vì `toSearchSort` cần `meta.sortField` của cột để dịch id cột → field BE.
     *
     * `size` khai theo độ dài nội dung thật của từng cột — cột THAO TÁC (ngắn nhất) cố định
     * 72px thay vì bị `flex` kéo giãn dàn đều như các cột nội dung dài (chốt cùng user 2026-08-08).
     *
     * ⚠️ **Sort phía server** (CONVENTIONS mục 5.2): mọi cột ở đây đều là cột thật của entity
     * `AuditLog` — kể cả `branchName` (khác các module khác, nơi `branchName` chỉ có ở DTO).
     * `AuditLog` **không có field `status`** nên màn này không có cột trạng thái để sort.
     */
    const columns: ColumnDef<AuditLog, unknown>[] = useMemo(
        () => [
            {
                id: 'time',
                header: t('staff.auditLog.column.time'),
                size: 150,
                // Cột định danh của nhật ký: một dòng log được nhận ra bằng mốc thời gian.
                enableHiding: false,
                meta: { sortField: 'createdDate', columnLabel: t('staff.auditLog.column.time') },
                cell: ({ row }) => formatDateTime(row.original.createdDate),
            },
            {
                id: 'user',
                header: t('staff.auditLog.column.user'),
                size: 160,
                // Ô ghép `fullName` → `username`; sort theo `fullName` (field hiển thị chính).
                meta: { sortField: 'fullName', columnLabel: t('staff.auditLog.column.user') },
                cell: ({ row }) => row.original.fullName ?? row.original.username ?? '—',
            },
            {
                id: 'action',
                header: t('staff.auditLog.column.action'),
                size: 180,
                meta: { sortField: 'action', columnLabel: t('staff.auditLog.column.action') },
                cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
            },
            {
                id: 'entity',
                header: t('staff.auditLog.column.entity'),
                size: 140,
                meta: { sortField: 'entityName', columnLabel: t('staff.auditLog.column.entity') },
                cell: ({ row }) => row.original.entityName,
            },
            {
                id: 'branch',
                header: t('staff.auditLog.column.branch'),
                size: 140,
                // `branchName` là cột THẬT của `AuditLog` (log lưu sẵn tên chi nhánh lúc ghi) ⇒
                // sort được, khác hẳn `branchName` ở các module khác vốn chỉ là field của DTO.
                meta: { sortField: 'branchName', columnLabel: t('staff.auditLog.column.branch') },
                cell: ({ row }) => row.original.branchName ?? '—',
            },
            {
                id: 'actions',
                header: t('staff.auditLog.column.actions'),
                size: 72,
                // Đường vào xem chi tiết — không cho ẩn, và không có gì để sort.
                enableHiding: false,
                enableSorting: false,
                meta: { columnLabel: t('staff.auditLog.column.actions') },
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title={t('common:action.detail')}
                        aria-label={t('common:action.detail')}
                        onClick={() => setSelected(row.original)}>
                        <Eye className="size-4" />
                    </Button>
                ),
            },
        ],
        [t],
    )

    /**
     * `quiet` = nạp lại ngầm (nút Tải lại): giữ nguyên dữ liệu đang hiển thị thay vì nháy skeleton,
     * để không mất vị trí đọc (CONVENTIONS mục 5.1 + 5.2).
     */
    const load = useCallback(
        async (signal?: AbortSignal, quiet = false) => {
            if (quiet) setRefreshing(true)
            else setLoading(true)
            setError(false)
            try {
                const result = await auditLogApi.search(
                    { keyword: keyword || undefined },
                    { page, size: PAGE_SIZE, sort: toSearchSort(sorting, DEFAULT_SORT, columns) },
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
        [page, keyword, sorting, columns],
    )

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

    return (
        <>
            <PageHeader
                title={t('staff.auditLog.pageTitle')}
                description={t('staff.auditLog.pageDescription')}
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(v) => table.resetTo(() => setKeyword(v))}
                    searchPlaceholder={t('staff.auditLog.searchPlaceholder')}
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

                <DataTable
                    columns={columns}
                    data={data}
                    getRowId={(row) => String(row.id)}
                    loading={loading}
                    refreshing={refreshing}
                    error={error}
                    onRetry={load}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                    unitLabel={t('staff.auditLog.resultLabel')}
                    emptyState={t('staff.auditLog.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: table.setPage }}
                />

                <AuditLogDetailDialog
                    log={selected}
                    onOpenChange={(open) => !open && setSelected(null)}
                />
            </div>
        </>
    )
}
