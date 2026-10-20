import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import { ApiError, ApiErrorKind } from '@/lib/api-error'
import { toastError } from '@/lib/toast'

/**
 * `subKey` backend → tên field của form (đối chiếu `error.*` trong `ExceptionTranslator`/service backend).
 * Chỉ liệt kê lỗi **gắn được vào đúng một ô nhập**; lỗi trạng thái/nghiệp vụ chung (đơn đã đóng,
 * không đủ tồn…) cố ý KHÔNG có ở đây — chúng chỉ hiện toast, không đổ nhầm vào một ô.
 *
 * Tên field là tên trong DTO request, trùng tên field form của repo (`phoneNumber`, `code`, `slug`…).
 * Form nào đặt tên khác truyền `overrides`.
 */
const SUBKEY_TO_FIELD: Record<string, string> = {
    'error.username.existed': 'username',
    'error.username.invalid': 'username',
    'error.email.existed': 'email',
    'error.email.sameAsCurrent': 'email',
    'error.phone.existed': 'phoneNumber',
    'error.brand.codeExisted': 'code',
    'error.category.codeExisted': 'code',
    'error.color.codeExisted': 'code',
    'error.size.codeExisted': 'code',
    'error.product.codeExisted': 'code',
    'error.promotion.codeExisted': 'code',
    'error.promotion.codeInvalid': 'code',
    'error.promotion.targetRequired': 'targetId',
    'error.promotion.branchForbidden': 'branchId',
    'error.promotion.invalidValue': 'value',
    'error.promotion.invalidDate': 'endDate',
    'error.post.slugExisted': 'slug',
    'error.post.productInvalid': 'productIds',
    'error.branch.nameExisted': 'name',
    'error.address.provinceInvalid': 'provinceCode',
    'error.address.wardInvalid': 'wardCode',
    'error.address.incomplete': 'wardCode',
    'error.address.invalid': 'address',
    'error.branch.required': 'branchId',
    'error.branch.inactive': 'branchId',
    'error.role.notAllowed': 'role',
    'error.category.parentInvalid': 'parentId',
    'error.category.defaultConflict': 'isDefault',
    'error.bankAccount.binInvalid': 'bankBin',
    'error.bankAccount.existed': 'accountNumber',
    'error.banner.periodInvalid': 'effectiveTo',
    'error.warehouseLedger.transferBranchRequired': 'toBranchId',
    'error.warehouseLedger.transferSameBranch': 'toBranchId',
    'error.password.incorrect': 'currentPassword',
    'error.account.reauthFail': 'currentPassword',
    'error.otp.invalid': 'otp',
}

/** `error.input.invalid`: backend gộp lỗi @Valid thành `"field: message; field2: message2"`. */
const INVALID_INPUT_SUBKEY = 'error.input.invalid'

function hasField<TFieldValues extends FieldValues>(
    form: UseFormReturn<TFieldValues>,
    field: string,
): field is Path<TFieldValues> {
    // Ô đã render (Controller đăng ký vào `_fields`) hoặc có mặt trong giá trị form — field chỉ có
    // trong DTO mà form không có ô nhập thì `setError` sẽ không hiện ở đâu ⇒ coi như "không có ô".
    const registered = (form.control as unknown as { _fields?: Record<string, unknown> })._fields
    return Boolean(registered?.[field]) || Object.prototype.hasOwnProperty.call(form.getValues(), field)
}

/** Tách `"phoneNumber: Số điện thoại sai"` → `[['phoneNumber', 'Số điện thoại sai']]`. */
function parseInvalidInput(serverMessage: string | null): Array<[string, string]> {
    if (!serverMessage) return []
    return serverMessage
        .split(';')
        .map((part): [string, string] | null => {
            const idx = part.indexOf(':')
            if (idx <= 0) return null
            const field = part.slice(0, idx).trim()
            // `lines[0].quantity` → bỏ qua (không phải field phẳng của form).
            return /^[A-Za-z_]\w*$/.test(field) ? [field, part.slice(idx + 1).trim()] : null
        })
        .filter((entry): entry is [string, string] => entry !== null)
}

/**
 * Xác định **ô gây lỗi** của một `ApiError` 400/422/409 — dùng cho cả form RHF (qua
 * `setFormErrorFromApi`) lẫn form tự quản state (ledger, đổi trả…).
 *
 * Backend chỉ trả **một** `ErrorResponse` (`{code, message, subKey}`) — không có mảng lỗi theo field
 * (CONVENTIONS mục 3.2). Thứ tự xác định ô:
 *   1. `overrides[subKey]` — form tự khai (ví dụ field đặt tên lạ).
 *   2. Bảng `SUBKEY_TO_FIELD` mặc định ở trên.
 *   3. `error.input.invalid` — đọc tên field trong thông điệp `"field: message"` của @Valid.
 *
 * Không xác định được ô ⇒ mảng rỗng (không có ô "mặc định": đổ lỗi email vào ô tên đăng nhập là sai).
 */
export function resolveApiFieldErrors(
    error: unknown,
    overrides: Partial<Record<string, string>> = {},
): Array<{ field: string; message: string }> {
    if (!(error instanceof ApiError)) return []
    if (error.kind !== ApiErrorKind.VALIDATION && error.kind !== ApiErrorKind.BUSINESS) return []

    const subKey = error.subKey ?? ''
    const mapped = overrides[subKey] ?? SUBKEY_TO_FIELD[subKey]
    if (mapped) return [{ field: mapped, message: error.message }]
    if (subKey === INVALID_INPUT_SUBKEY) {
        return parseInvalidInput(error.serverMessage).map(([field, message]) => ({
            field,
            message: message || error.message,
        }))
    }
    return []
}

/**
 * Lỗi không gắn được vào ô nào ⇒ chỉ toast. api-client đã toast sẵn trừ khi gọi API kèm
 * `skipErrorToast`; cờ `toasted` chặn toast trùng.
 */
export function toastUnmappedApiError(error: unknown) {
    if (error instanceof ApiError && !error.toasted && !error.isSilent) {
        toastError(error)
        error.toasted = true
    }
}

/**
 * Gắn lỗi backend vào **đúng ô** của form React Hook Form. Ô tìm được phải **có trong form**;
 * không có ô nào khớp ⇒ **không gắn đâu cả**, chỉ toast.
 *
 * Trả `true` nếu đã gắn được vào ít nhất một ô.
 */
export function setFormErrorFromApi<TFieldValues extends FieldValues>(
    form: UseFormReturn<TFieldValues>,
    error: unknown,
    overrides: Partial<Record<string, Path<TFieldValues>>> = {},
): boolean {
    let attached = false
    for (const { field, message } of resolveApiFieldErrors(error, overrides)) {
        if (!hasField(form, field)) continue
        form.setError(field, { type: 'server', message })
        attached = true
    }
    if (!attached) toastUnmappedApiError(error)
    return attached
}
