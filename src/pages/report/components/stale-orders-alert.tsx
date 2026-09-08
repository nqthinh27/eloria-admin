import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'

import { orderApi } from '@/api/order'
import { STALE_PENDING_DAYS, isStalePending } from '@/lib/stale-order'
import { EOrderStatus } from '@/types/order'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Cảnh báo **đơn `PENDING` treo lâu đang giam tồn kho** (PLAN Phase 16 mục ①).
 *
 * Vì sao cần: từ 2026-08-14 backend **trừ tồn ngay khi tạo đơn** và **không có cơ chế tự huỷ đơn**
 * ⇒ đơn bị bỏ quên giữ hàng vô thời hạn. Không có API nào dọn hộ, nên FE chỉ có thể **chỉ ra**
 * để nhân viên vào huỷ tay.
 *
 * ⚠️ **Lọc phía client**: `OrderSearchReq` không có filter theo tuổi đơn, nên component tự nạp
 * đơn `PENDING` rồi đếm. Xin `size` lớn hơn nhu cầu hiển thị vì cần **đếm đúng**, không phải
 * lấy vài dòng đầu — và so `data.length` với `total` để biết còn bị cắt hay không
 * (trần phân trang của backend, CLAUDE.md mục `size` cap).
 */
export function StaleOrdersAlert({ branchId }: { branchId?: string }) {
    const { t } = useTranslation('report')
    const [count, setCount] = useState(0)
    /** `true` khi backend cắt bớt trang ⇒ con số đang là **tối thiểu**, không phải tổng thật. */
    const [truncated, setTruncated] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        orderApi
            .search(
                { orderStatus: EOrderStatus.PENDING, branchId },
                { page: 1, size: 200, sort: ['createdDate,ASC'] },
                controller.signal,
            )
            .then((res) => {
                setCount(res.data.filter((o) => isStalePending(o.status, o.createdDate)).length)
                setTruncated(res.data.length < res.total)
            })
            .catch(() => {
                /* api-client đã toast; khối cảnh báo phụ lỗi thì không chặn cả dashboard. */
            })
        return () => controller.abort()
    }, [branchId])

    if (count === 0) return null

    return (
        <Alert>
            <AlertTriangle className="text-warning" />
            <AlertTitle>{t('report.stalePending.title')}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
                <span>
                    {t('report.stalePending.description', {
                        count,
                        days: STALE_PENDING_DAYS,
                    })}
                    {/* Nói rõ khi con số bị trần phân trang cắt, đừng để người đọc tưởng là tổng. */}
                    {truncated && ' (≥)'}
                </span>
                <Button variant="outline" size="sm" asChild>
                    <Link to="/orders">
                        {t('report.stalePending.action')}
                        <ChevronRight />
                    </Link>
                </Button>
            </AlertDescription>
        </Alert>
    )
}
