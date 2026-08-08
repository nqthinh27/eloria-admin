import { apiClient } from '@/lib/api-client'
import type { AdministrativeAddress } from '@/types/administrative-address'
import type { BaseListRes } from '@/types/common'

/** Service địa chỉ hành chính — API thật (không mock), 2 cấp: Tỉnh/Thành → Phường/Xã. */
export const administrativeAddressApi = {
    /** `[STAFF] GET /administrative-address/provinces`. */
    getProvinces() {
        return apiClient.get<BaseListRes<AdministrativeAddress>>('/administrative-address/provinces')
    },

    /** `[STAFF] GET /administrative-address/wards?provinceCode=` — `provinceCode` là `id` tỉnh. */
    getWards(provinceCode: string) {
        return apiClient.get<BaseListRes<AdministrativeAddress>>('/administrative-address/wards', {
            params: { provinceCode },
        })
    },
}
