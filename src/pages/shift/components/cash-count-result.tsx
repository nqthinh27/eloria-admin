import { useTranslation } from 'react-i18next'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { formatVnd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { WorkShift } from '@/types/shift'

/**
 * Khối **kết quả kiểm quỹ** của một ca đã chốt (tiền đầu ca · kỳ vọng · đã đếm · lệch quỹ).
 *
 * Dùng chung ở **cả 2** chỗ chốt ca — nhân viên tự chốt (`CloseShiftDialog` ở màn POS) và quản lý
 * chốt hộ (`ShiftCloseByIdDialog` ở màn Ca làm việc) — để hai nơi không bao giờ hiển thị lệch
 * nhau khi sửa.
 *
 * ⚠️ **Không tự tính lại `cashDifference`**: backend đã tính (`closingCash − expectedCash`),
 * FE tính lại là mở đường cho hai con số mâu thuẫn.
 */
export function CashCountResult({ shift }: { shift: WorkShift }) {
    const { t } = useTranslation(['order'])

    /*
     * **Âm = thiếu quỹ** (đỏ, đáng lo), dương = thừa (vàng), `0`/`null` = khớp (xanh).
     */
    const difference = shift.cashDifference
    const diffTone =
        difference === null || difference === 0
            ? 'text-success'
            : difference < 0
              ? 'text-destructive'
              : 'text-warning'

    const money = (value: number | null) => (value === null ? '—' : formatVnd(value))

    return (
        <div className="flex flex-col gap-3">
            <dl className="bg-muted/40 flex flex-col gap-2 rounded-lg p-4 text-sm">
                <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('order.shift.field.openingCash')}</dt>
                    <dd className="font-medium">{formatVnd(shift.openingCash)}</dd>
                </div>
                <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('order.shift.field.expectedCash')}</dt>
                    <dd className="font-medium">{money(shift.expectedCash)}</dd>
                </div>
                <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{t('order.shift.field.closingCash')}</dt>
                    <dd className="font-medium">{money(shift.closingCash)}</dd>
                </div>
                <div className="border-border mt-1 flex items-center justify-between border-t pt-2">
                    <dt className="font-medium">{t('order.shift.field.cashDifference')}</dt>
                    <dd
                        className={cn(
                            'flex items-center gap-1.5 text-base font-semibold',
                            diffTone,
                        )}
                    >
                        {difference !== null && difference !== 0 && (
                            <span aria-hidden="true">
                                {difference < 0 ? (
                                    <TrendingDown className="size-4" />
                                ) : (
                                    <TrendingUp className="size-4" />
                                )}
                            </span>
                        )}
                        {money(difference)}
                    </dd>
                </div>
            </dl>

            <p className="text-muted-foreground text-xs">
                {difference === null || difference === 0
                    ? t('order.shift.close.balanced')
                    : difference < 0
                      ? t('order.shift.close.short', { amount: formatVnd(Math.abs(difference)) })
                      : t('order.shift.close.over', { amount: formatVnd(difference) })}
            </p>
        </div>
    )
}
