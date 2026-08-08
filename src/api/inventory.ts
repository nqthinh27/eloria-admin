import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockGoodsReceipts, mockStockCounts, mockStocks } from '@/mocks/inventory'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    GoodsReceipt,
    GoodsReceiptPayload,
    GoodsReceiptSearchReq,
    Stock,
    StockAdjustmentPayload,
    StockCount,
    StockCountPayload,
    StockCountSearchReq,
    StockSearchReq,
} from '@/types/inventory'

/** Service tồn kho — CHƯA có API thật (PLAN Phase 6), theo `13-kho-hang-ton-kho.png`. */
export const stockApi = {
    async search(body: StockSearchReq, pagination?: SearchPagination): Promise<BaseListRes<Stock>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockStocks,
                body,
                (item, keyword) =>
                    item.skuCode.toLowerCase().includes(keyword) ||
                    item.productName.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<Stock>>('/stock/search', body, pagination)
    },

    /** Điều chỉnh tồn thủ công — hành động nhạy cảm, backend ghi audit log. */
    async adjust(payload: StockAdjustmentPayload): Promise<Stock> {
        if (useMock) {
            await mockDelay()
            const found = mockStocks.find(
                (s) => s.skuId === payload.skuId && s.branchId === payload.branchId,
            )
            if (!found) throw new Error(`Mock: không tìm thấy tồn kho SKU ${payload.skuId}`)
            found.onHand += payload.quantityDelta
            found.available += payload.quantityDelta
            return found
        }
        return apiClient.post<Stock>('/stock/adjust', payload)
    },
}

/** Service phiếu nhập kho — CHƯA có API thật (PLAN Phase 6), theo `14-kho-hang-phieu-nhap.png`. */
export const goodsReceiptApi = {
    async search(
        body: GoodsReceiptSearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<GoodsReceipt>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockGoodsReceipts,
                body,
                (item, keyword) => item.code.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<GoodsReceipt>>('/goods-receipt/search', body, pagination)
    },

    async create(payload: GoodsReceiptPayload): Promise<GoodsReceipt> {
        if (useMock) {
            await mockDelay()
            const created: GoodsReceipt = {
                id: `gr-mock-${Date.now()}`,
                code: `PN-MOCK-${mockGoodsReceipts.length + 1}`,
                branchId: payload.branchId,
                branchName: payload.branchId,
                supplierName: payload.supplierName ?? null,
                status: 'DRAFT',
                lines: payload.lines,
                totalQuantity: payload.lines.reduce((sum, l) => sum + l.quantity, 0),
                totalCost: payload.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0),
                createdBy: 'mock-user',
                createdDate: new Date().toISOString(),
            }
            mockGoodsReceipts.unshift(created)
            return created
        }
        return apiClient.post<GoodsReceipt>('/goods-receipt', payload)
    },
}

/** Service kiểm kê kho — CHƯA có API thật (PLAN Phase 6), theo `15-kho-hang-kiem-ke.png`. */
export const stockCountApi = {
    async search(
        body: StockCountSearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<StockCount>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockStockCounts,
                body,
                (item, keyword) => item.code.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<StockCount>>('/stock-count/search', body, pagination)
    },

    async create(payload: StockCountPayload): Promise<StockCount> {
        if (useMock) {
            await mockDelay()
            const created: StockCount = {
                id: `sc-mock-${Date.now()}`,
                code: `KK-MOCK-${mockStockCounts.length + 1}`,
                branchId: payload.branchId,
                branchName: payload.branchId,
                type: payload.type,
                status: 'IN_PROGRESS',
                lines: payload.skuIds.map((skuId) => ({
                    skuId,
                    skuCode: skuId,
                    systemQuantity: 0,
                    countedQuantity: 0,
                    variance: 0,
                })),
                createdBy: 'mock-user',
                createdDate: new Date().toISOString(),
                completedDate: null,
            }
            mockStockCounts.unshift(created)
            return created
        }
        return apiClient.post<StockCount>('/stock-count', payload)
    },
}
