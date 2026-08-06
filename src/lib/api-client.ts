import axios, {
    AxiosError,
    AxiosHeaders,
    type AxiosInstance,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from 'axios'

import { apiBaseUrl } from '@/config/app'
import { getCurrentLanguage } from '@/i18n'
import {
    ApiError,
    ApiErrorKind,
    isErrorResponse,
    resolveErrorMessage,
} from '@/lib/api-error'
import {
    getAccessToken,
    notifySessionExpired,
    setAccessToken,
} from '@/lib/token-store'
import { toastError } from '@/lib/toast'
import {
    RESPONSE_CODE_SUCCESS,
    type BaseResponse,
    type ErrorResponse,
} from '@/types/common'

/** Endpoint đổi refresh cookie lấy access token mới. */
const REFRESH_PATH = '/refresh'

/** Endpoint không bao giờ được retry sau refresh (tránh lặp vô hạn). */
const NO_RETRY_PATHS = [REFRESH_PATH, '/authenticate', '/logout']

/** Tuỳ chọn riêng của dự án, gắn thêm vào config của axios. */
export type ApiRequestOptions = {
    /**
     * Tắt toast lỗi mặc định khi màn hình muốn tự xử lý
     * (ví dụ form login hiển thị lỗi inline thay vì toast).
     */
    skipErrorToast?: boolean
    /** Không tự refresh khi gặp 401. */
    skipAuthRefresh?: boolean
}

type RequestConfig = AxiosRequestConfig & ApiRequestOptions
type InternalConfig = InternalAxiosRequestConfig & ApiRequestOptions & { _retried?: boolean }

export const http: AxiosInstance = axios.create({
    baseURL: apiBaseUrl,
    // Bắt buộc để cookie `refresh_token` được gửi kèm. Chỉ hoạt động khi same-origin,
    // xem CONVENTIONS mục 2 và dev proxy trong vite.config.ts.
    withCredentials: true,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config: InternalConfig) => {
    const headers = AxiosHeaders.from(config.headers)

    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept-Language', getCurrentLanguage())

    config.headers = headers
    return config
})

/* ------------------------------------------------------------------ *
 * Refresh single-flight
 *
 * Nhiều request cùng dính 401 một lúc chỉ được phép sinh MỘT lần gọi
 * `/refresh`; các request còn lại chờ chung promise đó rồi retry.
 * ------------------------------------------------------------------ */

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
    // Gọi bằng axios trần: không qua interceptor của `http` để tránh đệ quy 401.
    const response = await axios.post<BaseResponse<{ accessToken: string }>>(
        `${apiBaseUrl}${REFRESH_PATH}`,
        null,
        { withCredentials: true, timeout: 30_000 },
    )

    const token = response.data?.data?.accessToken
    if (response.data?.code !== RESPONSE_CODE_SUCCESS || !token) {
        throw new Error('Refresh response không hợp lệ')
    }

    setAccessToken(token)
    return token
}

function runRefreshOnce(): Promise<string> {
    refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
    })
    return refreshPromise
}

function isNoRetryPath(url: string | undefined): boolean {
    if (!url) return false
    return NO_RETRY_PATHS.some((path) => url.includes(path))
}

/* ------------------------------------------------------------------ *
 * Chuẩn hoá lỗi
 * ------------------------------------------------------------------ */

function kindFromStatus(status: number): ApiErrorKind {
    if (status === 401) return ApiErrorKind.UNAUTHORIZED
    if (status === 403) return ApiErrorKind.FORBIDDEN
    if (status === 404) return ApiErrorKind.NOT_FOUND
    if (status === 400 || status === 422) return ApiErrorKind.VALIDATION
    if (status >= 500) return ApiErrorKind.SERVER
    return ApiErrorKind.BUSINESS
}

function fallbackKeyForKind(kind: ApiErrorKind): string {
    switch (kind) {
        case ApiErrorKind.UNAUTHORIZED:
            return 'http.unauthorized'
        case ApiErrorKind.FORBIDDEN:
            return 'http.forbidden'
        case ApiErrorKind.NOT_FOUND:
            return 'http.notFound'
        case ApiErrorKind.SERVER:
            return 'http.serverError'
        case ApiErrorKind.NETWORK:
            return 'http.network'
        case ApiErrorKind.TIMEOUT:
            return 'http.timeout'
        default:
            return 'http.unknown'
    }
}

function toApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error

    if (axios.isCancel(error)) {
        return new ApiError({
            kind: ApiErrorKind.CANCELED,
            status: 0,
            message: 'Request đã bị huỷ',
        })
    }

    if (error instanceof AxiosError) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            const kind = ApiErrorKind.TIMEOUT
            return new ApiError({
                kind,
                status: 0,
                message: resolveErrorMessage(null, null, fallbackKeyForKind(kind)),
            })
        }

        if (!error.response) {
            const kind = ApiErrorKind.NETWORK
            return new ApiError({
                kind,
                status: 0,
                message: resolveErrorMessage(null, null, fallbackKeyForKind(kind)),
            })
        }

        const { status, data } = error.response
        const kind = kindFromStatus(status)
        const body: Partial<ErrorResponse> = isErrorResponse(data) ? data : {}

        return new ApiError({
            kind,
            status,
            code: body.code ?? null,
            subKey: body.subKey ?? null,
            logInfo: body.logInfo ?? null,
            serverMessage: body.message ?? null,
            message: resolveErrorMessage(body.subKey, body.message, fallbackKeyForKind(kind)),
        })
    }

    return new ApiError({
        kind: ApiErrorKind.UNKNOWN,
        status: 0,
        message: resolveErrorMessage(null, null, 'http.unknown'),
    })
}

http.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
        const config = (error as AxiosError).config as InternalConfig | undefined
        const status = (error as AxiosError).response?.status

        // 401 ⇒ thử refresh một lần rồi retry request gốc.
        if (
            status === 401 &&
            config &&
            !config._retried &&
            !config.skipAuthRefresh &&
            !isNoRetryPath(config.url)
        ) {
            try {
                const token = await runRefreshOnce()
                config._retried = true
                config.headers = AxiosHeaders.from(config.headers).set(
                    'Authorization',
                    `Bearer ${token}`,
                )
                return await http.request(config)
            } catch {
                // Refresh hỏng ⇒ hết phiên thật sự.
                notifySessionExpired()
            }
        }

        const apiError = toApiError(error)

        if (apiError.logInfo && import.meta.env.DEV) {
            console.error('[api]', config?.method?.toUpperCase(), config?.url, apiError.logInfo)
        }

        if (!config?.skipErrorToast && !apiError.isSilent) {
            toastError(apiError)
        }

        return Promise.reject(apiError)
    },
)

/* ------------------------------------------------------------------ *
 * Bóc `BaseResponse` — màn hình chỉ nhận `data`
 * ------------------------------------------------------------------ */

async function unwrap<T>(config: RequestConfig): Promise<T> {
    try {
        const response = await http.request<BaseResponse<T>>(config)
        const body = response.data

        // Backend luôn bọc BaseResponse; `code === 1` mới là thành công (KHÔNG phải 0).
        if (body?.code !== RESPONSE_CODE_SUCCESS) {
            throw new ApiError({
                kind: ApiErrorKind.BUSINESS,
                status: response.status,
                code: body?.code ?? null,
                serverMessage: body?.message ?? null,
                message: resolveErrorMessage(null, body?.message, 'http.unknown'),
            })
        }

        return body.data
    } catch (error) {
        const apiError = toApiError(error)

        // Lỗi ném ra từ chính khối trên chưa đi qua interceptor ⇒ tự toast ở đây.
        if (error instanceof ApiError && !config.skipErrorToast && !apiError.isSilent) {
            toastError(apiError)
        }

        throw apiError
    }
}

export const apiClient = {
    get: <T>(url: string, config?: RequestConfig) =>
        unwrap<T>({ ...config, method: 'GET', url }),

    post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
        unwrap<T>({ ...config, method: 'POST', url, data }),

    put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
        unwrap<T>({ ...config, method: 'PUT', url, data }),

    patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
        unwrap<T>({ ...config, method: 'PATCH', url, data }),

    delete: <T>(url: string, config?: RequestConfig) =>
        unwrap<T>({ ...config, method: 'DELETE', url }),
}

/**
 * Helper cho pattern `POST .../search` của backend.
 * Kết quả lồng 2 tầng: `data.total` và `data.data` (xem CONVENTIONS mục 3.1).
 */
export function search<TResult>(
    url: string,
    body: unknown,
    config?: RequestConfig,
): Promise<TResult> {
    return apiClient.post<TResult>(url, body, config)
}
