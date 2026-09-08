import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarIcon } from 'lucide-react'
import { format, isValid, parse } from 'date-fns'
import { vi } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import {
    DISPLAY_FORMAT,
    VALUE_FORMAT,
    autoFormat,
    toDisplay,
    toValue,
} from '@/lib/date-input-format'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Ô nhập ngày theo **`dd/MM/yyyy`** — thay cho `<Input type="date">` (CONVENTIONS mục 5.4).
 *
 * ⚠️ **Vì sao không dùng `type="date"`**: input date của trình duyệt hiển thị theo **locale của
 * máy người dùng**, máy để tiếng Anh sẽ hiện `mm/dd/yyyy`; không có thuộc tính HTML hay CSS nào ép
 * được về `dd/MM/yyyy`. Ô này là input text tự kiểm soát hiển thị, kèm nút lịch để chọn nhanh.
 *
 * Hợp đồng dữ liệu **không đổi**: `value`/`onChange` vẫn là `yyyy-MM-dd` (hoặc `''` khi trống),
 * nên mọi form đang dùng `type="date"` thay sang đây là chạy, không phải sửa payload gửi API.
 */
export function DateInput({
    value,
    onChange,
    id,
    disabled,
    className,
    placeholder = DISPLAY_FORMAT.toLowerCase(),
    'aria-invalid': ariaInvalid,
}: {
    /** `yyyy-MM-dd` hoặc `''`. */
    value: string
    /** Trả về `yyyy-MM-dd`, hoặc `''` khi ô trống / chưa gõ đủ một ngày hợp lệ. */
    onChange: (value: string) => void
    id?: string
    disabled?: boolean
    className?: string
    placeholder?: string
    'aria-invalid'?: boolean
}) {
    const { t } = useTranslation('common')

    /*
     * Giữ chuỗi đang gõ tách khỏi `value`: người dùng gõ "07/09/20" là trạng thái dở dang, chưa
     * thành ngày hợp lệ — nếu đồng bộ thẳng vào form thì ký tự vừa gõ bị xoá ngay.
     */
    const [draft, setDraft] = useState(() => toDisplay(value))
    const [open, setOpen] = useState(false)

    /* Form `reset()` (mở dialog cho bản ghi khác) phải đẩy được giá trị mới vào ô. */
    useEffect(() => {
        setDraft(toDisplay(value))
    }, [value])

    const handleTyping = (raw: string) => {
        const next = autoFormat(raw)
        setDraft(next)
        const parsed = toValue(next)
        /* Gõ dở hoặc ngày không có thật ⇒ báo rỗng lên form để validate bắt được. */
        onChange(parsed ?? '')
    }

    /* Rời ô mà chuỗi không thành ngày ⇒ trả ô về đúng giá trị form đang giữ, không để rác. */
    const handleBlur = () => setDraft(toDisplay(value))

    const selected = value ? parse(value, VALUE_FORMAT, new Date()) : undefined

    return (
        <div className={cn('relative', className)}>
            <Input
                id={id}
                value={draft}
                disabled={disabled}
                placeholder={placeholder}
                inputMode="numeric"
                aria-invalid={ariaInvalid}
                className="pr-9"
                onChange={(event) => handleTyping(event.target.value)}
                onBlur={handleBlur}
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        /* `tabIndex={-1}` để Tab đi thẳng sang ô kế tiếp — bàn phím dùng ô text. */
                        tabIndex={-1}
                        aria-label={t('action.pickDate')}
                        className="text-muted-foreground absolute top-1/2 right-1 size-7 -translate-y-1/2">
                        <CalendarIcon className="size-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        locale={vi}
                        selected={selected && isValid(selected) ? selected : undefined}
                        defaultMonth={selected && isValid(selected) ? selected : undefined}
                        onSelect={(date) => {
                            if (!date) return
                            onChange(format(date, VALUE_FORMAT))
                            setDraft(format(date, DISPLAY_FORMAT))
                            setOpen(false)
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
