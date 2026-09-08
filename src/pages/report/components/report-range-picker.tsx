import { useTranslation } from 'react-i18next'
import { useDateTyping } from '@/lib/date-input-format'

import { cn } from '@/lib/utils'
import {
    REPORT_GRANULARITIES,
    REPORT_PERIODS,
    type RangeError,
    type ReportGranularity,
    type ReportPeriod,
} from '@/lib/report-range'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

/**
 * Bộ lọc kỳ báo cáo: **đơn vị thống kê** (Ngày|Tháng|Năm) × **kỳ** (dựng sẵn / tuỳ chọn).
 *
 * ## Date picker kép (user chốt 2026-08-30)
 *
 * Chọn "Tuỳ chọn" thì hiện **hai ô ngày dính liền trong một khung**, ngăn bằng dấu `→` —
 * **bỏ hẳn nhãn "Từ ngày"/"Đến ngày"**: hình dạng ghép đôi + mũi tên đã nói rõ vế nào là đầu, vế
 * nào là cuối, nhãn chỉ làm hàng lọc cao thêm một dòng.
 *
 * ⚠️ Vẫn giữ `<label class="sr-only">` cho **cả hai ô**: bỏ nhãn là bỏ *phần nhìn thấy*, không
 * phải bỏ ngữ nghĩa — trình đọc màn hình vẫn phải phân biệt được hai ô, nếu không cả hai chỉ đọc
 * là "date field" giống hệt nhau.
 *
 * Hai ô còn ràng buộc lẫn nhau bằng `max`/`min` để chính trình duyệt chặn chọn ngược ngày.
 *
 * ## Trần độ dài kỳ
 *
 * Ngày ≤ 30 · Tháng ≤ 24 · Năm ≤ 10. Sửa ô ngày (hoặc đổi đơn vị thống kê) khiến khoảng vượt trần
 * ⇒ **`useReportRange` tự kéo ô vừa đổi về vừa đúng trần** và bắn toast báo con số — picker này
 * không tự validate/thông báo, chỉ còn hiện viền đỏ khi `rangeError` là `incomplete`/`reversed`.
 */
export function ReportRangePicker({
    period,
    onPeriodChange,
    granularity,
    onGranularityChange,
    customFrom,
    customTo,
    onCustomFromChange,
    onCustomToChange,
    rangeError,
}: {
    period: ReportPeriod
    onPeriodChange: (value: ReportPeriod) => void
    granularity: ReportGranularity
    onGranularityChange: (value: ReportGranularity) => void
    customFrom: string
    customTo: string
    onCustomFromChange: (value: string) => void
    onCustomToChange: (value: string) => void
    rangeError: RangeError | null
}) {
    const { t } = useTranslation('report')
    const invalid = rangeError !== null

    /*
     * Ô nhập gõ `dd/MM/yyyy` (CONVENTIONS mục 5.4). Không dùng `<DateInput>` được vì 2 ô ở đây nằm
     * chung MỘT khung viền — lồng `<Input>` có viền riêng vào sẽ thành "hộp trong hộp".
     * Giá trị `customFrom`/`customTo` vẫn là `yyyy-MM-dd`, phần còn lại của màn không phải đổi.
     */
    const fromTyping = useDateTyping(customFrom, onCustomFromChange)
    const toTyping = useDateTyping(customTo, onCustomToChange)

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Đơn vị thống kê đứng trước vì nó quyết định trần độ dài của ô kỳ bên cạnh. */}
            <Select
                value={granularity}
                onValueChange={(v) => onGranularityChange(v as ReportGranularity)}>
                <SelectTrigger className="w-[130px]" aria-label={t('report.granularity.label')}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {REPORT_GRANULARITIES.map((g) => (
                        <SelectItem key={g} value={g}>
                            {t(`report.granularity.${g}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={period} onValueChange={(v) => onPeriodChange(v as ReportPeriod)}>
                <SelectTrigger className="w-[150px]" aria-label={t('report.range.label')}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {REPORT_PERIODS.map((p) => (
                        <SelectItem key={p} value={p}>
                            {t(`report.range.${p}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {period === 'custom' && (
                /*
                 * Date picker kép: 2 ô trong 1 khung, ngăn bằng `→`. Khung ngoài mang viền + ring
                 * để trông như một control duy nhất; 2 input bên trong bỏ hết viền/ring riêng để
                 * không thành "hộp trong hộp".
                 */
                <div
                    className={cn(
                        'border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]',
                        invalid && 'border-destructive focus-within:ring-destructive/20',
                    )}>
                    <label htmlFor="report-from" className="sr-only">
                        {t('report.range.from')}
                    </label>
                    <input
                        id="report-from"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        value={fromTyping.display}
                        onChange={(e) => fromTyping.onType(e.target.value)}
                        onBlur={fromTyping.onBlur}
                        className="w-[104px] bg-transparent px-2 py-1 text-sm outline-none"
                    />
                    <span aria-hidden className="text-muted-foreground text-sm">
                        →
                    </span>
                    <label htmlFor="report-to" className="sr-only">
                        {t('report.range.to')}
                    </label>
                    <input
                        id="report-to"
                        inputMode="numeric"
                        placeholder="dd/mm/yyyy"
                        value={toTyping.display}
                        onChange={(e) => toTyping.onType(e.target.value)}
                        onBlur={toTyping.onBlur}
                        className="w-[104px] bg-transparent px-2 py-1 text-sm outline-none"
                    />
                </div>
            )}
        </div>
    )
}
