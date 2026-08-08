import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/format'
import type { AuditLog } from '@/types/audit-log'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Thử parse JSON, trả `null` khi hỏng để component tự quyết định fallback hiển thị raw string.
 *
 * Xác nhận bằng dữ liệu thật (test 2026-08-08): backend luôn bọc `oldValue`/`newValue` trong
 * MỘT MẢNG chứa đúng 1 object (`"[{...}]"`), không phải object trần như suy đoán ban đầu từ
 * api-docs (chỉ khai `type: string`, không nói rõ cấu trúc bên trong) — nên phải bóc phần tử
 * đầu của mảng trước khi hiển thị field-by-field.
 */
function tryParseJson(value: string | null): Record<string, unknown> | null {
    if (!value) return null
    try {
        const parsed: unknown = JSON.parse(value)
        const record = Array.isArray(parsed) ? parsed[0] : parsed
        return typeof record === 'object' && record !== null
            ? (record as Record<string, unknown>)
            : null
    } catch {
        return null
    }
}

function ValueBlock({ label, raw }: { label: string; raw: string | null }) {
    const { t } = useTranslation('staff')
    const parsed = tryParseJson(raw)

    if (!raw) {
        return (
            <div>
                <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                    {label}
                </p>
                <p className="text-muted-foreground text-sm">{t('staff.auditLog.detail.noData')}</p>
            </div>
        )
    }

    return (
        <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                {label}
            </p>
            {parsed ? (
                <div className="bg-muted space-y-1 rounded-md p-3 text-sm">
                    {Object.entries(parsed).map(([field, fieldValue]) => (
                        <div key={field} className="flex gap-2">
                            <span className="text-muted-foreground shrink-0 font-mono text-xs">
                                {field}:
                            </span>
                            <span className="break-all">{String(fieldValue)}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    <p className="text-muted-foreground mb-1 text-xs">
                        {t('staff.auditLog.detail.parseFallback')}
                    </p>
                    <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                        {raw}
                    </pre>
                </div>
            )}
        </div>
    )
}

export function AuditLogDetailDialog({
    log,
    onOpenChange,
}: {
    log: AuditLog | null
    onOpenChange: (open: boolean) => void
}) {
    const { t } = useTranslation('staff')

    return (
        <Dialog open={log !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('staff.auditLog.detail.title', { id: log?.id ?? '' })}</DialogTitle>
                </DialogHeader>

                {log && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {t('staff.auditLog.detail.action')}
                                </p>
                                <p className="font-medium">{log.action}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {t('staff.auditLog.detail.entity')}
                                </p>
                                <p className="font-medium">{log.entityName}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {t('staff.auditLog.detail.entityId')}
                                </p>
                                <p className="font-mono text-xs">{log.entityId}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {t('staff.auditLog.detail.performedBy')}
                                </p>
                                <p className="font-medium">{log.fullName ?? log.username ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    {t('staff.auditLog.detail.time')}
                                </p>
                                <p>{formatDateTime(log.createdDate)}</p>
                            </div>
                            {log.ipAddress && (
                                <div>
                                    <p className="text-muted-foreground text-xs">
                                        {t('staff.auditLog.detail.ipAddress')}
                                    </p>
                                    <p className="font-mono text-xs">{log.ipAddress}</p>
                                </div>
                            )}
                        </div>

                        <ValueBlock label={t('staff.auditLog.detail.oldValue')} raw={log.oldValue} />
                        <ValueBlock label={t('staff.auditLog.detail.newValue')} raw={log.newValue} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
