import { EGoodsReceiptStatus, EStockCountStatus, EStockCountType, EStockStatus } from '@/types/inventory'
import type { GoodsReceipt, Stock, StockCount } from '@/types/inventory'

const BRANCH_HN = 'branch-hn-hoan-kiem'

/** Tồn kho mẫu — nguyên văn từ `13-kho-hang-ton-kho.png`. */
export const mockStocks: Stock[] = [
    { skuId: 'sku-001', skuCode: 'SP001-S-TRG', productName: 'Áo sơ mi linen trắng basic', size: 'S', color: 'Trắng', branchId: BRANCH_HN, onHand: 12, reserved: 2, available: 10, minStock: 5, status: EStockStatus.NORMAL, daysSinceLastSale: 3 },
    { skuId: 'sku-002', skuCode: 'SP001-M-TRG', productName: 'Áo sơ mi linen trắng basic', size: 'M', color: 'Trắng', branchId: BRANCH_HN, onHand: 8, reserved: 1, available: 7, minStock: 5, status: EStockStatus.NORMAL, daysSinceLastSale: 1 },
    { skuId: 'sku-003', skuCode: 'SP001-L-TRG', productName: 'Áo sơ mi linen trắng basic', size: 'L', color: 'Trắng', branchId: BRANCH_HN, onHand: 3, reserved: 0, available: 3, minStock: 5, status: EStockStatus.LOW, daysSinceLastSale: 12 },
    { skuId: 'sku-004', skuCode: 'SP002-28-XD', productName: 'Quần jeans slim fit', size: '28', color: 'Xanh đen', branchId: BRANCH_HN, onHand: 5, reserved: 2, available: 3, minStock: 3, status: EStockStatus.NORMAL, daysSinceLastSale: 5 },
    { skuId: 'sku-005', skuCode: 'SP002-30-XD', productName: 'Quần jeans slim fit', size: '30', color: 'Xanh đen', branchId: BRANCH_HN, onHand: 0, reserved: 0, available: 0, minStock: 3, status: EStockStatus.OUT_OF_STOCK, daysSinceLastSale: 65 },
    { skuId: 'sku-006', skuCode: 'SP006-M-XNH', productName: 'Áo thun polo cotton piqué', size: 'M', color: 'Xanh navy', branchId: BRANCH_HN, onHand: 45, reserved: 3, available: 42, minStock: 10, status: EStockStatus.NORMAL, daysSinceLastSale: 0 },
    { skuId: 'sku-007', skuCode: 'SP007-32-GR', productName: 'Quần kaki cargo slate grey', size: '32', color: 'Xám', branchId: BRANCH_HN, onHand: 2, reserved: 1, available: 1, minStock: 5, status: EStockStatus.LOW, daysSinceLastSale: 8 },
]

/** Phiếu nhập mẫu — mockup `14` chỉ có empty state nên tự dựng theo mô tả PLAN Phase 10. */
export const mockGoodsReceipts: GoodsReceipt[] = [
    {
        id: 'gr-001',
        code: 'PN-2407-001',
        branchId: BRANCH_HN,
        branchName: 'HN – Hoàn Kiếm',
        supplierName: 'Xưởng may Thành Công',
        status: EGoodsReceiptStatus.RECEIVED,
        lines: [
            { skuId: 'sku-001', skuCode: 'SP001-S-TRG', quantity: 20, unitCost: 350_000 },
            { skuId: 'sku-002', skuCode: 'SP001-M-TRG', quantity: 20, unitCost: 350_000 },
        ],
        totalQuantity: 40,
        totalCost: 14_000_000,
        createdBy: 'Trần Văn Minh',
        createdDate: '2024-07-01T00:00:00Z',
    },
]

/** Phiên kiểm kê mẫu — mockup `15` chỉ có empty state nên tự dựng theo mô tả PLAN Phase 10. */
export const mockStockCounts: StockCount[] = [
    {
        id: 'sc-001',
        code: 'KK-2406-001',
        branchId: BRANCH_HN,
        branchName: 'HN – Hoàn Kiếm',
        type: EStockCountType.PARTIAL,
        status: EStockCountStatus.COMPLETED,
        lines: [
            { skuId: 'sku-003', skuCode: 'SP001-L-TRG', systemQuantity: 5, countedQuantity: 3, variance: -2 },
        ],
        createdBy: 'Lê Thị Hoa',
        createdDate: '2024-06-28T00:00:00Z',
        completedDate: '2024-06-28T00:00:00Z',
    },
]
