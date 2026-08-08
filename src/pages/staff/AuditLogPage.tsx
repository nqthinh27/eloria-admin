import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

import { auditLogApi } from '@/api/audit-log'
import { formatDateTime } from '@/lib/format'
import type { AuditLog } from '@/types/audit-log'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { AuditLogDetailDialog } from './components/audit-log-detail-dialog'

const PAGE_SIZE = 10

/** Màn "Nhật ký hệ thống" — mục menu riêng trong nhóm HỆ THỐNG. Chưa có mockup ⇒ pattern bảng chuẩn. */
export default function AuditLogPage() {
    const { t } = useTranslation(['staff', 'common'])

    const [data, setData] = useState<AuditLog[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [selected, setSelected] = useState<AuditLog | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const result = await auditLogApi.search(
                { keyword: keyword || undefined },
                { page, size: PAGE_SIZE },
            )
            setData(result.data)
            setTotal(result.total)
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [page, keyword])

    useEffect(() => {
        void load()
    }, [load])

    // `size` khai theo độ dài nội dung thật của từng cột — cột THAO TÁC (ngắn nhất) cố định
    // 120px thay vì bị `flex` kéo giãn dàn đều như các cột nội dung dài (chốt cùng user 2026-08-08).
    const columns: ColumnDef<AuditLog, unknown>[] = [
        {
            id: 'time',
            header: t('staff.auditLog.column.time'),
            size: 150,
            cell: ({ row }) => formatDateTime(row.original.createdDate),
        },
        {
            id: 'user',
            header: t('staff.auditLog.column.user'),
            size: 160,
            cell: ({ row }) => row.original.fullName ?? row.original.username ?? '—',
        },
        {
            id: 'action',
            header: t('staff.auditLog.column.action'),
            size: 180,
            cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
        },
        {
            id: 'entity',
            header: t('staff.auditLog.column.entity'),
            size: 140,
            cell: ({ row }) => row.original.entityName,
        },
        {
            id: 'branch',
            header: t('staff.auditLog.column.branch'),
            size: 140,
            cell: ({ row }) => row.original.branchName ?? '—',
        },
        {
            id: 'actions',
            header: t('staff.auditLog.column.actions'),
            size: 72,
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
    ]

    return (
        <>
            <PageHeader
                title={t('staff.auditLog.pageTitle')}
                description={t('staff.auditLog.pageDescription')}
            />

            <div className="space-y-4">
                <DataTableToolbar
                    searchValue={keyword}
                    onSearchChange={(v) => {
                        setKeyword(v)
                        setPage(1)
                    }}
                    searchPlaceholder={t('staff.auditLog.searchPlaceholder')}
                />

                <DataTable
                    columns={columns}
                    data={data}
                    getRowId={(row) => String(row.id)}
                    loading={loading}
                    error={error}
                    onRetry={load}
                    unitLabel={t('staff.auditLog.resultLabel')}
                    emptyState={t('staff.auditLog.empty')}
                    pagination={{ page, size: PAGE_SIZE, total, onPageChange: setPage }}
                />

                <AuditLogDetailDialog
                    log={selected}
                    onOpenChange={(open) => !open && setSelected(null)}
                />
            </div>
        </>
    )
}
