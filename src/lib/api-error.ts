import i18n from '@/i18n'
import type { ErrorResponse } from '@/types/common'

/** Loại lỗi, để màn hình phân nhánh xử lý mà không phải tự đọc HTTP status. */
export const ApiErrorKind = {
    /** Backend trả `ErrorResponse` kèm HTTP status lỗi. */
    BUSINESS: 'BUSINESS',
    /** 401 — hết phiên, api-client đã thử refresh nhưng không cứu được. */
    UNAUTHORIZED: 'UNAUTHORIZED',
    /** 403 — không đủ quyền. */
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    /** 400/422 — sai dữ liệu đầu vào, thường map về từng field của form. */
    VALIDATION: 'VALIDATION',
    SERVER: 'SERVER',
    NETWORK: 'NETWORK',
    TIMEOUT: 'TIMEOUT',
    /** Request bị huỷ chủ động — KHÔNG hiển thị toast. */
    CANCELED: 'CANCELED',
    UNKNOWN: 'UNKNOWN',
} as const
export type ApiErrorKind = (typeof ApiErrorKind)[keyof typeof ApiErrorKind]

/**
 * Lỗi đã chuẩn hoá. Mọi lỗi từ api-client đều là instance của class này,
 * nên màn hình không bao giờ phải đụng tới `AxiosError` hay shape lỗi thô.
 */
export class ApiError extends Error {
    readonly kind: ApiErrorKind
    /** HTTP status; `0` khi lỗi mạng/timeout/huỷ. */
    readonly status: number
    /** Mã nghiệp vụ trong `ErrorResponse.code`. */
    readonly code: number | null
    /** Khoá i18n dạng `a.b.c` do backend trả. */
    readonly subKey: string | null
    /** Chỉ dùng để log/debug — KHÔNG hiển thị cho người dùng (CONVENTIONS mục 3.2). */
    readonly logInfo: string | null
    /** Nguyên văn `message` của backend, dùng làm fallback khi `subKey` chưa có bản dịch. */
    readonly serverMessage: string | null

    constructor(params: {
        kind: ApiErrorKind
        status: number
        message: string
        code?: number | null
        subKey?: string | null
        logInfo?: string | null
        serverMessage?: string | null
    }) {
        super(params.message)
        this.name = 'ApiError'
        this.kind = params.kind
        this.status = params.status
        this.code = params.code ?? null
        this.subKey = params.subKey ?? null
        this.logInfo = params.logInfo ?? null
        this.serverMessage = params.serverMessage ?? null
    }

    /** Có nên im lặng bỏ qua không (request bị huỷ chủ động). */
    get isSilent(): boolean {
        return this.kind === ApiErrorKind.CANCELED
    }
}

/** Nhận diện body có đúng shape `ErrorResponse` của backend không. */
export function isErrorResponse(body: unknown): body is ErrorResponse {
    if (typeof body !== 'object' || body === null) return false
    const b = body as Record<string, unknown>
    return typeof b.code === 'number' && typeof b.message === 'string'
}

/**
 * Chọn thông báo hiển thị cho người dùng, theo đúng thứ tự ưu tiên ở CONVENTIONS mục 3.2:
 *   1. `subKey` có bản dịch trong tài nguyên i18n ⇒ dùng bản dịch.
 *   2. Ngược lại ⇒ dùng `message` của backend.
 *   3. Không có cả hai ⇒ message mặc định của hệ thống.
 *
 * `logInfo` không bao giờ được dùng ở đây.
 */
export function resolveErrorMessage(
    subKey: string | null | undefined,
    serverMessage: string | null | undefined,
    fallbackKey = 'http.unknown',
): string {
    if (subKey) {
        // `errors` là namespace phẳng theo đúng subKey của backend.
        const translated = i18n.t(subKey, { ns: 'errors', defaultValue: '' })
        if (translated) return translated
    }
    if (serverMessage) return serverMessage
    return i18n.t(fallbackKey, { ns: 'common' })
}
