import { useTranslation } from 'react-i18next'

import { formatDateTime, formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
    EReturnCondition,
    EReturnLineType,
    EReturnStatus,
    EReturnType,
    type ReturnDetail,
    type ReturnRequest,
} from '@/types/return'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_TONE: Record<EReturnStatus, StatusTone> = {
    PENDING_APPROVAL: 'warning',
    APPROVED: 'info',
    REJECTED: 'danger',
    COMPLETED: 'success',
}

/**
 * Modal **chi tiết phiếu đổi/trả**.
 *
 * Chỉ đọc: phiếu là **bản ghi lịch sử tiền/hàng, không sửa/không xoá** (backend không có
 * `PUT`/`DELETE` — sai thì từ chối rồi tạo phiếu mới), nên dùng `Dialog` thuần thay vì
 * `DetailModal` (component đó dựng quanh form sửa) — cùng lý do với modal chi tiết ca làm việc.
 *
 * ⚠️ **Bắt buộc nhận `request` đã nạp bằng `GET /return/{id}`**: `POST /return/search` trả
 * **`lines: null`**, mở modal từ dòng bảng sẽ không có hàng hoá nào để hiện.
 */
export function ReturnDetailModal({
    open,
    onOpenChange,
    request,
    loading,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: ReturnRequest | null
    loading: boolean
}) {
    const { t } = useTranslation(['return', 'order', 'common'])

    const rejected = request?.status === EReturnStatus.REJECTED
    /*
     * Hai dòng "chưa quyết toán / chưa nhận kho" chỉ có nghĩa với phiếu **đang chờ làm nốt**.
     * Phiếu `PENDING_APPROVAL` chưa tới lượt, phiếu `REJECTED` thì không bao giờ tới ⇒ hiện ra là
     * nói sai (bản mockup đầu tiên hiện "Chưa nhận hàng vào kho" trên cả phiếu đã bị từ chối).
     */
    const awaitingWork = request?.status === EReturnStatus.APPROVED
    const lines = request?.lines ?? []
    const returnedLines = lines.filter((l) => l.lineType === EReturnLineType.RETURNED)
    const deliveredLines = lines.filter((l) => l.lineType === EReturnLineType.DELIVERED)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                        {request ? t('return.detail.title', { code: request.code }) : '…'}
                        {request && (
                            <>
                                <StatusBadge tone={STATUS_TONE[request.status]}>
                                    {t(`return.status.${request.status}`)}
                                </StatusBadge>
                                <StatusBadge tone="muted">
                                    {t(`return.type.${request.type}`)}
                                </StatusBadge>
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {request?.orderCode
                            ? `${t('return.list.column.order')}: ${request.orderCode}`
                            : t('return.list.noOrder')}
                    </DialogDescription>
                </DialogHeader>

                {loading || !request ? (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-5 w-full" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Section title={t('return.detail.sectionInfo')}>
                            <Row
                                label={t('return.list.column.customer')}
                                value={
                                    request.customerName
                                        ? `${request.customerName}${request.customerPhone ? ` · ${request.customerPhone}` : ''}`
                                        : t('return.list.noCustomer')
                                }
                            />
                            <Row
                                label={t('return.list.column.branch')}
                                value={request.branchName ?? '—'}
                            />
                            <Row
                                label={t('return.list.column.staff')}
                                value={request.staffName ?? '—'}
                            />
                            <Row
                                label={t('return.list.column.createdDate')}
                                value={formatDateTime(request.createdDate)}
                            />
                            <Row label={t('return.form.reason')} value={request.reason ?? '—'} />
                            {/*
                              ⚠️ Backend **ghi đè lý do từ chối vào `description`** (dạng
                              "Từ chối: …"), `reason` giữ nguyên lý do khách trả hàng ⇒ nhãn phải
                              đổi theo trạng thái, nếu không người đọc tưởng khách trả vì lý do đó.
                            */}
                            {request.description && (
                                <Row
                                    label={
                                        rejected
                                            ? t('return.detail.rejectReason')
                                            : t('return.detail.note')
                                    }
                                    value={request.description}
                                    tone={rejected ? 'danger' : undefined}
                                />
                            )}
                            {request.approvedBy && (
                                <Row
                                    label={t('return.detail.approvedBy')}
                                    value={`${request.approvedBy}${
                                        request.approvedAt
                                            ? ` · ${formatDateTime(request.approvedAt)}`
                                            : ''
                                    }`}
                                />
                            )}
                        </Section>

                        <Section title={t('return.detail.sectionMoney')}>
                            <Row
                                label={t('return.detail.returnedAmount')}
                                value={formatVnd(request.returnedAmount)}
                            />
                            {request.type === EReturnType.EXCHANGE && (
                                <Row
                                    label={t('return.detail.deliveredAmount')}
                                    value={formatVnd(request.deliveredAmount)}
                                />
                            )}
                            {request.refundAmount > 0 && (
                                <Row
                                    label={t('return.detail.refundAmount')}
                                    value={formatVnd(request.refundAmount)}
                                    strong
                                />
                            )}
                            {request.collectAmount > 0 && (
                                <Row
                                    label={t('return.detail.collectAmount')}
                                    value={formatVnd(request.collectAmount)}
                                    strong
                                />
                            )}
                            {request.refundAmount === 0 && request.collectAmount === 0 && (
                                <p className="text-muted-foreground text-sm">
                                    {t('return.detail.noMoney')}
                                </p>
                            )}
                            {request.refundedAt ? (
                                <Row
                                    label={t('return.detail.refundMethod')}
                                    value={`${
                                        request.refundMethod
                                            ? t(`order.paymentMethod.${request.refundMethod}`, {
                                                  ns: 'order',
                                              })
                                            : '—'
                                    } · ${formatDateTime(request.refundedAt)}`}
                                />
                            ) : (
                                awaitingWork &&
                                (request.refundAmount > 0 || request.collectAmount > 0) && (
                                    <p className="text-muted-foreground text-sm">
                                        {t('return.detail.pendingRefund')}
                                    </p>
                                )
                            )}
                            {request.stockReceivedAt ? (
                                <Row
                                    label={t('return.detail.stockReceivedAt')}
                                    value={formatDateTime(request.stockReceivedAt)}
                                />
                            ) : (
                                awaitingWork && (
                                    <p className="text-muted-foreground text-sm">
                                        {t('return.detail.pendingStock')}
                                    </p>
                                )
                            )}
                            {/*
                              Phiếu kho `IN` do backend tự sinh khi có hàng bán lại — hiện mã để
                              người dùng tra ngược ở màn Kho hàng. `null` khi mọi dòng đều lỗi.
                            */}
                            {request.warehouseLedgerId && (
                                <Row
                                    label={t('return.detail.warehouseLedger')}
                                    value={request.warehouseLedgerId}
                                    mono
                                />
                            )}
                            {awaitingWork && (
                                <p className="text-muted-foreground text-xs">
                                    {t('return.detail.completedHint')}
                                </p>
                            )}
                        </Section>

                        <Section title={t('return.detail.sectionLines')}>
                            <LineGroup
                                title={t('return.lineType.RETURNED')}
                                lines={returnedLines}
                                showCondition
                            />
                            {deliveredLines.length > 0 && (
                                <LineGroup
                                    title={t('return.lineType.DELIVERED')}
                                    lines={deliveredLines}
                                />
                            )}
                        </Section>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {title}
            </h3>
            <div className="space-y-1.5">{children}</div>
        </section>
    )
}

function Row({
    label,
    value,
    strong,
    mono,
    tone,
}: {
    label: string
    value: string
    strong?: boolean
    mono?: boolean
    tone?: 'danger'
}) {
    return (
        <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span
                className={cn(
                    'sm:text-right',
                    strong && 'font-semibold tabular-nums',
                    mono && 'font-mono text-xs',
                    tone === 'danger' && 'text-destructive',
                )}
            >
                {value}
            </span>
        </div>
    )
}

function LineGroup({
    title,
    lines,
    showCondition,
}: {
    title: string
    lines: ReturnDetail[]
    showCondition?: boolean
}) {
    const { t } = useTranslation('return')
    if (lines.length === 0) return null
    return (
        <div className="space-y-1.5">
            <p className="text-xs font-medium">{title}</p>
            <div className="divide-y rounded-lg border">
                {lines.map((line) => (
                    <div
                        key={line.id}
                        className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{line.productName}</p>
                            <p className="text-muted-foreground font-mono text-xs">
                                {line.skuCode} · ×{line.quantity}
                                {line.reason ? ` · ${line.reason}` : ''}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {/* `conditionType` chỉ có sau khi đã nhận hàng vào kho. */}
                            {showCondition && line.conditionType && (
                                <StatusBadge
                                    tone={
                                        line.conditionType === EReturnCondition.RESALABLE
                                            ? 'success'
                                            : 'danger'
                                    }
                                >
                                    {t(`return.condition.${line.conditionType}`)}
                                </StatusBadge>
                            )}
                            <span className="text-sm font-medium tabular-nums">
                                {formatVnd(line.lineTotal)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
