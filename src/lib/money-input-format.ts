/**
 * Helper cho ô nhập tiền (CONVENTIONS mục 5.5) — tách khỏi `money-input.tsx` để file component
 * chỉ export component (giữ Fast Refresh, cùng lý do với `date-input-format.ts`).
 */

/**
 * Lọc chuỗi người dùng gõ về **chỉ còn chữ số**.
 *
 * Bỏ luôn dấu `.` — trong tiếng Việt dấu chấm là **ngăn cách hàng nghìn**, không phải dấu thập
 * phân, nên `1.500` phải hiểu là *một nghìn năm trăm*. Tiền VNĐ cũng không dùng phần lẻ.
 * Số `0` đứng đầu bị cắt (`007` ⇒ `7`), nhưng **giữ lại một số `0` đơn lẻ** vì `0` là giá trị hợp lệ.
 */
export function parseMoneyInput(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') return ''
    const trimmed = digits.replace(/^0+/, '')
    return trimmed === '' ? '0' : trimmed
}

/** `"1500000"` ⇒ `"1.500.000"`. Chuỗi rỗng giữ nguyên rỗng để placeholder còn hiện ra. */
export function formatThousands(digits: string): string {
    if (!digits) return ''
    return new Intl.NumberFormat('vi-VN').format(Number(digits))
}
