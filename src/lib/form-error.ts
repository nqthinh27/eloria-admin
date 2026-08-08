import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import { ApiError, ApiErrorKind } from '@/lib/api-error'

/**
 * Gắn lỗi 400/422 của backend vào đúng field của form.
 *
 * Backend chỉ trả **một** `ErrorResponse` (`{code, message, subKey}`), không có mảng lỗi theo field
 * (CONVENTIONS mục 3.2) — nên không thể map tự động. Caller khai báo `subKey` nào ứng với field nào
 * (ví dụ `{ 'error.username.duplicated': 'username' }`); `subKey` không có trong map ⇒ set vào
 * `fallbackField` (thường là field chính của form) để người dùng vẫn thấy lỗi thay vì chỉ có toast.
 *
 * Trả `true` nếu đã gắn được vào field, `false` nếu không phải lỗi 400/422 — lúc đó để nguyên
 * cho toast lỗi mặc định của api-client xử lý (gọi API kèm `skipErrorToast` khi dùng hàm này).
 */
export function setFormErrorFromApi<TFieldValues extends FieldValues>(
    form: UseFormReturn<TFieldValues>,
    error: unknown,
    subKeyToField: Partial<Record<string, Path<TFieldValues>>>,
    fallbackField?: Path<TFieldValues>,
): boolean {
    if (!(error instanceof ApiError) || error.kind !== ApiErrorKind.VALIDATION) {
        return false
    }

    const field = (error.subKey && subKeyToField[error.subKey]) || fallbackField
    if (!field) return false

    form.setError(field, { type: 'server', message: error.message })
    return true
}
