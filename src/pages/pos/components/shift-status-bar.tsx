import { useTranslation } from 'react-i18next'
import { Clock, LogOut, Wallet } from 'lucide-react'

import { formatVnd } from '@/lib/format'
import type { WorkShift } from '@/types/shift'
import { Button } from '@/components/ui/button'

/**
 * Thanh trạng thái **ca đang mở** trên đầu màn POS — PLAN Phase 15.
 *
 * Cho nhân viên thấy đang bán trong ca nào (mã ca · giờ mở · tiền đầu ca) và lối chốt ca.
 * Mockup `02-pos-mo-ca.png` không vẽ thanh này (frame đó là lúc **chưa** mở ca), nên phần hiển
 * thị khi **đã** mở ca do FE thiết kế theo cùng ngôn ngữ giao diện.
 */
export function ShiftStatusBar({
    shift,
    onClose,
}: {
    shift: WorkShift
    onClose: () => void
}) {
    const { t } = useTranslation(['order'])

    /*
     * Chỉ hiện **giờ:phút** chứ không hiện cả ngày: ca luôn là ca đang mở của hôm nay, thêm ngày
     * chỉ làm dài thanh mà không thêm thông tin.
     */
    const openedTime = new Date(shift.openedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    })

    return (
        <div className="bg-success-muted border-success/20 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-medium">
                {/* Chấm xanh = ca đang mở. `aria-hidden` vì nhãn chữ ngay bên cạnh đã nói rõ. */}
                <span
                    className="bg-success size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                />
                {t('order.shift.bar.open', { code: shift.code })}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                {t('order.shift.bar.openedAt', { time: openedTime })}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5">
                <Wallet className="size-3.5 shrink-0" aria-hidden="true" />
                {t('order.shift.bar.openingCash', { amount: formatVnd(shift.openingCash) })}
            </span>

            {shift.branchName && (
                <span className="text-muted-foreground hidden sm:inline">{shift.branchName}</span>
            )}

            <Button variant="outline" size="sm" className="ms-auto" onClick={onClose}>
                <LogOut className="size-4" />
                {t('order.shift.bar.closeShift')}
            </Button>
        </div>
    )
}
