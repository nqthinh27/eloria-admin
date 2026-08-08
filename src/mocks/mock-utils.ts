import { ApiError, ApiErrorKind } from '@/lib/api-error'
import type { BaseListRes, SearchPagination, SearchReq } from '@/types/common'

/** Độ trễ giả lập cho mọi lời gọi mock — mô phỏng network thật để UI loading state lộ ra khi dev. */
const MOCK_DELAY_MS = 400

export function mockDelay(ms = MOCK_DELAY_MS): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Lỗi giả lập dùng để test error state — ném ra đúng shape `ApiError` như api-client thật trả về. */
export function mockError(message = 'Lỗi mô phỏng (mock)'): ApiError {
    return new ApiError({
        kind: ApiErrorKind.SERVER,
        status: 500,
        message,
        serverMessage: message,
    })
}

/**
 * Từ khoá đặc biệt để chủ động test error state của màn hình khi dùng mock — gõ đúng chuỗi này
 * vào ô tìm kiếm của bất kỳ `.search()` nào ở mock layer sẽ ném lỗi thay vì trả kết quả rỗng.
 * Không xuất hiện trong dữ liệu mẫu nên không va với tìm kiếm thật.
 */
export const MOCK_ERROR_KEYWORD = '__mock_error__'

/**
 * Lọc + phân trang phía client cho toàn bộ mock data — mô phỏng đúng hành vi `POST .../search`
 * thật (`page` 1-based, `size` mặc định 10, cả hai ở query param — xem `SearchPagination`) để khi
 * đổi sang API thật, tầng UI không phải sửa gì (PLAN Phase 6 DoD). Ném lỗi khi
 * `keyword === MOCK_ERROR_KEYWORD` để test error state.
 */
export function paginateMock<T>(
    all: T[],
    body: SearchReq | undefined,
    matchKeyword: (item: T, keyword: string) => boolean,
    pagination?: SearchPagination,
): BaseListRes<T> {
    const page = pagination?.page ?? 1
    const size = pagination?.size ?? 10
    const keyword = body?.keyword?.trim().toLowerCase()

    if (keyword === MOCK_ERROR_KEYWORD) {
        throw mockError()
    }

    const filtered = keyword ? all.filter((item) => matchKeyword(item, keyword)) : all
    const start = (page - 1) * size

    return {
        total: filtered.length,
        data: filtered.slice(start, start + size),
    }
}
