import { apiClient } from '@/lib/api-client'
import type { SystemConfigItem, SystemConfigUpdateItem } from '@/types/system-config'

/**
 * Service **Cấu hình hệ thống** — 2 endpoint `/system-config`, **cả đọc lẫn ghi đều `[SUPER_ADMIN]`**
 * (ADMIN ⇒ 403 `error.token.forbidden`, không token ⇒ 401 — đo thật 2026-10-11).
 *
 * ⚠️ Backend **không validate giá trị**: `store.branch_id` nhận chuỗi bất kỳ (`"abc"`, UUID không
 * tồn tại đều 200). FE phải tự đảm bảo chỉ gửi id của chi nhánh có thật (chọn từ dropdown).
 */
export const systemConfigApi = {
    /** `[SUPER_ADMIN] GET /system-config` — mảng phẳng, không phân trang. */
    list(signal?: AbortSignal) {
        return apiClient.get<SystemConfigItem[]>('/system-config', { signal })
    },

    /**
     * `[SUPER_ADMIN] PUT /system-config` — upsert nhiều khoá, **chỉ nhận khoá đã seed**
     * (khoá lạ ⇒ 400 `error.systemConfig.notExisted`). Trả `data: null`.
     */
    update(items: SystemConfigUpdateItem[]) {
        return apiClient.put<null>('/system-config', items)
    },
}
