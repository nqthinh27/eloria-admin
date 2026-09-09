import { useTranslation } from 'react-i18next'
import { Hourglass, RefreshCw } from 'lucide-react'

import { formatVnd } from '@/lib/format'
import type { WorkShift } from '@/types/shift'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Màn **"Ca đang chờ duyệt"** — PLAN Phase 15, quy trình duyệt ca (backend 2026-09-09 lần 2).
 *
 * Nhân viên gửi yêu cầu mở ca xong **chưa bán được ngay**: ca ở `WAITING_APPROVAL` cho tới khi
 * ADMIN duyệt. Không có màn này thì người dùng chỉ thấy màn mở ca trống rỗng (hoặc bấm mở ca lần
 * nữa rồi nhận `error.workShift.alreadyOpen` mà không hiểu vì sao).
 *
 * ⚠️ **Không tự động polling** — backend chưa có realtime/websocket cho ca (`POST /websocket` vẫn
 * chưa rõ mục đích, xem PLAN BE4). Đặt nút "Kiểm tra lại" để nhân viên chủ động tải lại sau khi
 * quản lý báo đã duyệt; polling ngầm sẽ đốt request vô ích suốt thời gian chờ.
 */
export function ShiftPendingCard({
    shift,
    onRefresh,
    refreshing,
}: {
    shift: WorkShift
    onRefresh: () => void
    refreshing: boolean
}) {
    const { t } = useTranslation(['order', 'common'])

    return (
        <div className="flex flex-1 items-center justify-center py-6">
            <Card className="w-full max-w-md p-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="bg-warning-muted text-warning flex size-14 items-center justify-center rounded-full">
                        <Hourglass className="size-7" />
                    </span>
                    <h2 className="mt-2 text-xl font-semibold">
                        {t('order.shift.pending.title')}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {t('order.shift.pending.subtitle')}
                    </p>
                </div>

                <dl className="bg-muted/40 mt-6 flex flex-col gap-2 rounded-lg p-4 text-sm">
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{t('order.shift.field.code')}</dt>
                        <dd className="font-medium">{shift.code}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                            {t('order.shift.field.openingCash')}
                        </dt>
                        <dd className="font-medium">{formatVnd(shift.openingCash)}</dd>
                    </div>
                    {shift.branchName && (
                        <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">
                                {t('order.shift.field.branch')}
                            </dt>
                            <dd className="font-medium">{shift.branchName}</dd>
                        </div>
                    )}
                </dl>

                <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={onRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />
                    {t('order.shift.pending.refresh')}
                </Button>
            </Card>
        </div>
    )
}
