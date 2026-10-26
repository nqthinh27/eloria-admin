import { useEffect, useState } from 'react'

import { pointApi } from '@/api/point'
import type { PointRules } from '@/types/point'

/** Giá trị mặc định PO chốt (Phase 16) — chỉ dùng khi chưa tải được `GET /points/rules`. */
const DEFAULT_RULES: PointRules = {
    earnAmountPerPoint: 50000,
    redeemValuePerPoint: 1000,
    maxRedeemPercent: 50,
}

let cached: PointRules | null = null

/** Xoá cache để lần mount sau (vd quay lại POS) tải lại luật — gọi sau khi SUPER_ADMIN đổi `loyalty.*`. */
export function resetPointRulesCache() {
    cached = null
}

/** Luật điểm hiện hành từ backend (cache theo phiên tải trang). Luôn trả được giá trị để hiển thị. */
export function usePointRules(): PointRules {
    const [rules, setRules] = useState<PointRules>(cached ?? DEFAULT_RULES)

    useEffect(() => {
        if (cached) return
        const controller = new AbortController()
        pointApi
            .rules(controller.signal)
            .then((data) => {
                cached = data
                setRules(data)
            })
            .catch(() => {
                // Giữ mặc định; luật hiển thị chỉ mang tính nhắc, server mới là nguồn chân lý.
            })
        return () => controller.abort()
    }, [])

    return rules
}
