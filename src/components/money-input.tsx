import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatThousands, parseMoneyInput } from '@/lib/money-input-format'
import { Input } from '@/components/ui/input'

/**
 * Ô nhập số tiền — hiển thị **có dấu `.` ngăn cách hàng nghìn** (`1.500.000`) kèm hậu tố **`đ`**,
 * nhưng giá trị trả ra là **số thuần** (CONVENTIONS mục 5.5).
 *
 * ⚠️ **Vì sao không dùng `<Input type="number">`**: trình duyệt không cho chèn dấu ngăn cách vào
 * `type="number"` (mọi ký tự không phải số bị coi là giá trị rỗng), nên `1.500.000` là bất khả thi.
 * Ô này là input text tự kiểm soát hiển thị.
 *
 * Hợp đồng dữ liệu: `value`/`onChange` là **chuỗi chỉ gồm chữ số** (`"1500000"`), hoặc `''` khi
 * trống — đúng thứ `Number(value)` parse được để gửi API. Component **không bao giờ** đẩy dấu chấm
 * ra ngoài, nên payload gửi backend luôn là chữ số thuần.
 */
export function MoneyInput({
    value,
    onChange,
    id,
    disabled,
    className,
    placeholder,
    /** Hậu tố hiển thị bên phải ô. `đ` cho tiền; truyền `%` khi ô đang ở chế độ phần trăm. */
    suffix = 'đ',
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    onBlur,
}: {
    /** Chuỗi chữ số thuần (`"1500000"`) hoặc `''`. */
    value: string
    /** Trả về chuỗi chữ số thuần, **không có dấu ngăn cách**. */
    onChange: (value: string) => void
    id?: string
    disabled?: boolean
    className?: string
    placeholder?: string
    suffix?: string | null
    'aria-invalid'?: boolean
    /**
     * Tên đọc được cho trình đọc màn hình. **Bắt buộc truyền** khi ô không có `<Label htmlFor>`
     * đi kèm (ô lọc, ô trong bảng) — nếu không, trình đọc chỉ đọc được giá trị chứ không biết ô là gì.
     */
    'aria-label'?: string
    onBlur?: () => void
}) {
    /*
     * Giữ chuỗi hiển thị tách khỏi `value`: người dùng xoá hết rồi gõ lại phải mượt, không bị
     * format nhảy lung tung giữa chừng.
     */
    const [display, setDisplay] = useState(() => formatThousands(value))

    /* Form `reset()` (mở dialog cho bản ghi khác) phải đẩy được giá trị mới vào ô. */
    useEffect(() => {
        setDisplay(formatThousands(value))
    }, [value])

    const handleChange = (raw: string) => {
        const digits = parseMoneyInput(raw)
        setDisplay(formatThousands(digits))
        onChange(digits)
    }

    return (
        <div className={cn('relative', className)}>
            <Input
                id={id}
                value={display}
                disabled={disabled}
                placeholder={placeholder}
                inputMode="numeric"
                aria-invalid={ariaInvalid}
                aria-label={ariaLabel}
                className={cn('tabular-nums', suffix && 'pr-8')}
                onChange={(event) => handleChange(event.target.value)}
                onBlur={onBlur}
            />
            {suffix && (
                <span
                    aria-hidden
                    className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                    {suffix}
                </span>
            )}
        </div>
    )
}
