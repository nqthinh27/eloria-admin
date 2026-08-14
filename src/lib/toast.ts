import { toast } from 'sonner'

import i18n from '@/i18n'
import { ApiError, resolveErrorMessage } from '@/lib/api-error'

/**
 * Tham số của các hàm toast: `ns` chọn namespace i18n, các key còn lại là **biến nội suy**
 * cho chuỗi dịch (ví dụ `{{count}}` trong "Đã tạo {{count}} phiếu điều chỉnh").
 */
type ToastOptions = { ns?: string } & Record<string, unknown>

/**
 * Toast thành công.
 *
 * CONVENTIONS mục 3.1: mỗi màn hình phải truyền message riêng của mình
 * ("Tạo sản phẩm thành công", "Cập nhật chi nhánh thành công"), không dùng câu chung chung.
 * Truyền vào **khoá i18n**, không truyền chuỗi cứng.
 */
export function toastSuccess(messageKey: string, options?: ToastOptions) {
    const { ns, ...values } = options ?? {}
    toast.success(i18n.t(messageKey, { ns: ns ?? 'common', defaultValue: messageKey, ...values }))
}

/**
 * Toast lỗi. api-client tự gọi hàm này cho mọi lỗi, trừ khi request bật `skipErrorToast`.
 * Màn hình hiếm khi cần gọi trực tiếp.
 */
export function toastError(error: unknown) {
    if (error instanceof ApiError) {
        if (error.isSilent) return
        toast.error(error.message)
        return
    }

    toast.error(resolveErrorMessage(null, null, 'http.unknown'))
}

export function toastInfo(messageKey: string, options?: ToastOptions) {
    const { ns, ...values } = options ?? {}
    toast.info(i18n.t(messageKey, { ns: ns ?? 'common', defaultValue: messageKey, ...values }))
}

export function toastWarning(messageKey: string, options?: ToastOptions) {
    const { ns, ...values } = options ?? {}
    toast.warning(i18n.t(messageKey, { ns: ns ?? 'common', defaultValue: messageKey, ...values }))
}
