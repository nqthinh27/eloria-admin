import { useEffect, useState } from 'react'
import { format, isValid, parse } from 'date-fns'

/** Định dạng người dùng gõ và nhìn thấy (CONVENTIONS mục 5.4). */
export const DISPLAY_FORMAT = 'dd/MM/yyyy'
/** Định dạng của `value`/`onChange` — giữ nguyên `yyyy-MM-dd` để tầng form/API không phải đổi. */
export const VALUE_FORMAT = 'yyyy-MM-dd'

/** `yyyy-MM-dd` ⇒ `dd/MM/yyyy`; giá trị rỗng/hỏng ⇒ chuỗi rỗng. */
export function toDisplay(value: string): string {
    if (!value) return ''
    const parsed = parse(value, VALUE_FORMAT, new Date())
    return isValid(parsed) ? format(parsed, DISPLAY_FORMAT) : ''
}

/** `dd/MM/yyyy` ⇒ `yyyy-MM-dd`; gõ dở hoặc ngày không có thật ⇒ `null`. */
export function toValue(display: string): string | null {
    const trimmed = display.trim()
    if (trimmed.length !== DISPLAY_FORMAT.length) return null
    const parsed = parse(trimmed, DISPLAY_FORMAT, new Date())
    if (!isValid(parsed)) return null
    /*
     * `date-fns` "cuộn" ngày quá tháng (31/02 ⇒ 03/03) thay vì báo lỗi. Format ngược lại rồi so
     * chuỗi để bắt đúng những ngày không tồn tại.
     */
    return format(parsed, DISPLAY_FORMAT) === trimmed ? format(parsed, VALUE_FORMAT) : null
}

/** Chèn dấu `/` khi người dùng gõ, và chặn mọi ký tự không phải chữ số. */
export function autoFormat(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}


/**
 * Phần logic gõ `dd/MM/yyyy` tách riêng, cho những chỗ **không dùng được `<DateInput>`** vì đã tự
 * dựng khung riêng — ví dụ picker kép "từ ngày → đến ngày" của màn Báo cáo, nơi 2 ô nằm chung một
 * viền nên không thể lồng thêm `<Input>` có viền của nó.
 *
 * Trả về `{ display, onType, onBlur }` để gắn thẳng vào một `<input>` trần.
 */
export function useDateTyping(value: string, onChange: (value: string) => void) {
    const [draft, setDraft] = useState(() => toDisplay(value))

    useEffect(() => {
        setDraft(toDisplay(value))
    }, [value])

    return {
        display: draft,
        onType: (raw: string) => {
            const next = autoFormat(raw)
            setDraft(next)
            onChange(toValue(next) ?? '')
        },
        onBlur: () => setDraft(toDisplay(value)),
    }
}
