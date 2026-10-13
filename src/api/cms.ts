import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, BaseListResStatus, EntityStatus, SearchPagination } from '@/types/common'
import type {
    Banner,
    BannerPayload,
    BannerSearchReq,
    Post,
    PostListItem,
    PostPayload,
    PostSearchReq,
    PostStatusPayload,
} from '@/types/cms'

/**
 * Service domain **Content/CMS** — bài viết · banner (backend Phase 15, handoff
 * `fe-handoff-phase15-admin.md`). **Mọi endpoint `[SUPER_ADMIN]`** (ADMIN/STAFF ⇒ 403).
 *
 * Ảnh theo luật P13.3: body create/update **không có field ảnh** (gửi ⇒ 400
 * `error.input.invalid`); ảnh chỉ qua các endpoint upload bên dưới.
 */
export const postApi = {
    /** `[SUPER_ADMIN] POST /post/search` — `keyword` lọc title/slug; dòng **không** có `content`. */
    search(body: PostSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<PostListItem>>('/post/search', body, pagination, { signal })
    },

    /** `[SUPER_ADMIN] GET /post/{id}` — bản đủ `content` + `productIds`. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<Post>(`/post/${id}`, { signal })
    },

    /** `[SUPER_ADMIN] POST /post` — luôn tạo **DRAFT**; `slug` bỏ trống ⇒ sinh từ tiêu đề; trùng slug ⇒ `error.post.slugExisted`. */
    create(payload: PostPayload) {
        return apiClient.post<Post>('/post', payload)
    },

    /** `[SUPER_ADMIN] PUT /post/{id}` — `productIds` bỏ trống = giữ nguyên, `[]` = gỡ hết. */
    update(id: string, payload: PostPayload) {
        return apiClient.put<Post>(`/post/${id}`, payload)
    },

    /** `[SUPER_ADMIN] POST /post/update-status` — publish / hẹn giờ / gỡ / về nháp. */
    updateStatus(payload: PostStatusPayload) {
        return apiClient.post<Post>('/post/update-status', payload)
    },

    /** `[SUPER_ADMIN] DELETE /post/{id}` — **xoá hẳn** (kèm file). */
    remove(id: string) {
        return apiClient.delete<null>(`/post/${id}`)
    },

    /** `[SUPER_ADMIN] POST /post/{id}/cover` — multipart field `cover`, ≤ 2 MB. */
    uploadCover(id: string, file: File) {
        const form = new FormData()
        form.append('cover', file)
        return apiClient.post<Post>(`/post/${id}/cover`, form)
    },

    /** `[SUPER_ADMIN] DELETE /post/{id}/cover`. */
    deleteCover(id: string) {
        return apiClient.delete<Post>(`/post/${id}/cover`)
    },

    /**
     * `[SUPER_ADMIN] POST /post/content-image` — ảnh chèn trong thân bài, multipart field `image`.
     * Trả `{ url: "/post/<file>" }` — **dán nguyên `url`** vào `<img src>`.
     */
    uploadContentImage(file: File) {
        const form = new FormData()
        form.append('image', file)
        return apiClient.post<{ url: string }>('/post/content-image', form)
    },
}

export const bannerApi = {
    /** `[SUPER_ADMIN] POST /banner/search` — kèm `activeTotal/inactiveTotal`. */
    search(body: BannerSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListResStatus<Banner>>('/banner/search', body, pagination, { signal })
    },

    /** `[SUPER_ADMIN] GET /banner/{id}`. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<Banner>(`/banner/${id}`, { signal })
    },

    /** `[SUPER_ADMIN] POST /banner` — tạo xong gọi `uploadImage`. `position` bỏ trống = `HOME_HERO`. */
    create(payload: BannerPayload) {
        return apiClient.post<Banner>('/banner', payload)
    },

    /** `[SUPER_ADMIN] PUT /banner/{id}` — `effectiveFrom` phải trước `effectiveTo` (`error.banner.periodInvalid`). */
    update(id: string, payload: BannerPayload) {
        return apiClient.put<Banner>(`/banner/${id}`, payload)
    },

    /** `[SUPER_ADMIN] POST /banner/update-status` — bật/tắt (0/1). */
    updateStatus(id: string, status: EntityStatus) {
        return apiClient.post<Banner | null>('/banner/update-status', { id, status })
    },

    /** `[SUPER_ADMIN] DELETE /banner/{id}` — xoá mềm + xoá file. */
    remove(id: string) {
        return apiClient.delete<null>(`/banner/${id}`)
    },

    /** `[SUPER_ADMIN] POST /banner/{id}/image` — multipart field `image`; ảnh cũ tự xoá file. */
    uploadImage(id: string, file: File) {
        const form = new FormData()
        form.append('image', file)
        return apiClient.post<Banner>(`/banner/${id}/image`, form)
    },
}
