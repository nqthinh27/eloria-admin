import { useEffect, useState } from 'react'

import { administrativeAddressApi } from '@/api/administrative-address'
import type { AdministrativeAddress } from '@/types/administrative-address'

/**
 * Cache theo phiên: danh sách tỉnh/phường gần như bất biến, mở modal khách nào cũng gọi lại là phí.
 * Lưu **promise** (không lưu kết quả) để 2 modal mở sát nhau dùng chung một request; lỗi thì xoá
 * khỏi cache để lần mở sau thử lại.
 */
let provincesCache: Promise<AdministrativeAddress[]> | null = null
const wardsCache = new Map<string, Promise<AdministrativeAddress[]>>()

function loadProvinces() {
    provincesCache ??= administrativeAddressApi
        .getProvinces()
        .then((res) => res.data)
        .catch((error: unknown) => {
            provincesCache = null
            throw error
        })
    return provincesCache
}

function loadWards(provinceCode: string) {
    let cached = wardsCache.get(provinceCode)
    if (!cached) {
        cached = administrativeAddressApi
            .getWards(provinceCode)
            .then((res) => res.data)
            .catch((error: unknown) => {
                wardsCache.delete(provinceCode)
                throw error
            })
        wardsCache.set(provinceCode, cached)
    }
    return cached
}

type AddressNames = { provinceName: string | null; wardName: string | null }

/**
 * Tra **tên** tỉnh/phường từ `provinceCode`/`wardCode` — backend chỉ trả mã (khách hàng, chi
 * nhánh), tên phải tra qua `/administrative-address/provinces` + `/wards?provinceCode=`.
 *
 * Tra không được (lỗi mạng, mã không còn trong danh mục) ⇒ trả `null` chứ không ném — caller
 * hiển thị phần địa chỉ còn lại, không dựng thông báo lỗi chỉ vì thiếu tên phường.
 */
export function useAddressNames(provinceCode: string | null, wardCode: string | null): AddressNames {
    const [state, setState] = useState<{ key: string; names: AddressNames } | null>(null)
    const key = `${provinceCode ?? ''}|${wardCode ?? ''}`

    useEffect(() => {
        if (!provinceCode) return
        let alive = true
        void (async () => {
            let provinceName: string | null = null
            let wardName: string | null = null
            try {
                const provinces = await loadProvinces()
                provinceName = provinces.find((item) => item.id === provinceCode)?.name ?? null
            } catch {
                /* giữ null */
            }
            if (wardCode) {
                try {
                    const wards = await loadWards(provinceCode)
                    wardName = wards.find((item) => item.id === wardCode)?.name ?? null
                } catch {
                    /* giữ null */
                }
            }
            if (alive) setState({ key, names: { provinceName, wardName } })
        })()
        return () => {
            alive = false
        }
    }, [provinceCode, wardCode, key])

    // Chưa nạp xong (hoặc kết quả của khách trước) ⇒ rỗng, tránh chớp tên của khách khác.
    return state?.key === key ? state.names : { provinceName: null, wardName: null }
}
