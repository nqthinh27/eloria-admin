import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-header'
import { PillTabs } from '@/components/pill-tabs'
import { StockTab } from './StockTab'
import { LedgerTab } from './LedgerTab'
import { StockCountTab } from './StockCountTab'

/**
 * Màn "Kho hàng & Tồn kho" — 3 tab pill theo `13-kho-hang-ton-kho.png`,
 * `14-kho-hang-phieu-nhap.png`, `15-kho-hang-kiem-ke.png` (PLAN Phase 10).
 * Chạy trên **API thật** (`stock-item`, `warehouse-ledger`, `stock-count`).
 *
 * ⚠️ **Lệch có chủ đích so với mockup** (đối chiếu api-docs + source + API thật 2026-08-10):
 * - Tab 2 mockup tên "Phiếu nhập" nhưng backend gộp **nhập/xuất/chuyển** vào cùng một entity
 *   `WarehouseLedger` với `type` khác nhau ⇒ đặt tên tab là **"Phiếu kho"** và có bộ lọc loại phiếu.
 *   Đặt tên "Phiếu nhập" sẽ che mất 2/3 chức năng backend đang có.
 * - Cột "chậm luân chuyển > 60 ngày" của mockup **không dựng được**: `StockItemResDTO` không có
 *   ngày xuất bán gần nhất và backend chưa có domain đơn hàng để suy ra (xem báo cáo Phase 10).
 */
export default function InventoryPage() {
    const { t } = useTranslation('inventory')
    const [tab, setTab] = useState('stock')

    return (
        <>
            <PageHeader
                title={t('inventory.pageTitle')}
                description={t('inventory.pageDescription')}
            />

            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <PillTabs
                    items={[
                        { value: 'stock', label: t('inventory.tab.stock') },
                        { value: 'ledger', label: t('inventory.tab.ledger') },
                        { value: 'count', label: t('inventory.tab.count') },
                    ]}
                />

                {/*
                 * Mỗi tab tự nạp dữ liệu khi được mount. `TabsContent` của Radix unmount tab ẩn,
                 * nên chuyển tab qua lại sẽ nạp lại — đúng rule "không cache giữa các màn"
                 * (CONVENTIONS mục 5), và cũng là cách để tab Tồn kho thấy ngay kết quả sau khi
                 * một phiếu vừa được duyệt ở tab Phiếu kho.
                 */}
                <TabsContent value="stock">
                    <StockTab />
                </TabsContent>

                <TabsContent value="ledger">
                    <LedgerTab />
                </TabsContent>

                <TabsContent value="count">
                    <StockCountTab />
                </TabsContent>
            </Tabs>
        </>
    )
}
