import { EntityStatus } from '@/types/common'
import { ESkuLifecycle, type Product, type ProductCategory, type Sku } from '@/types/product'

/** Danh mục mẫu — nguyên văn từ `12-danh-muc-sp.png`. */
export const mockProductCategories: ProductCategory[] = [
    { id: 'cat-001', code: 'CAT001', name: 'Áo sơ mi', parentId: 'cat-ao', parentName: 'Áo', productCount: 42, brandCount: 3, collectionCount: 4, status: EntityStatus.ACTIVE },
    { id: 'cat-002', code: 'CAT002', name: 'Áo thun', parentId: 'cat-ao', parentName: 'Áo', productCount: 65, brandCount: 4, collectionCount: 5, status: EntityStatus.ACTIVE },
    { id: 'cat-003', code: 'CAT003', name: 'Áo khoác', parentId: 'cat-ao', parentName: 'Áo', productCount: 28, brandCount: 3, collectionCount: 3, status: EntityStatus.ACTIVE },
    { id: 'cat-004', code: 'CAT004', name: 'Quần jeans', parentId: 'cat-quan', parentName: 'Quần', productCount: 37, brandCount: 2, collectionCount: 4, status: EntityStatus.ACTIVE },
    { id: 'cat-005', code: 'CAT005', name: 'Quần âu', parentId: 'cat-quan', parentName: 'Quần', productCount: 24, brandCount: 2, collectionCount: 3, status: EntityStatus.ACTIVE },
    { id: 'cat-006', code: 'CAT006', name: 'Quần short', parentId: 'cat-quan', parentName: 'Quần', productCount: 18, brandCount: 2, collectionCount: 2, status: EntityStatus.ACTIVE },
    { id: 'cat-007', code: 'CAT007', name: 'Váy đầm', parentId: 'cat-vay', parentName: 'Váy', productCount: 31, brandCount: 3, collectionCount: 4, status: EntityStatus.ACTIVE },
    { id: 'cat-008', code: 'CAT008', name: 'Chân váy', parentId: 'cat-vay', parentName: 'Váy', productCount: 19, brandCount: 2, collectionCount: 3, status: EntityStatus.ACTIVE },
]

/** Sản phẩm mẫu — nguyên văn từ `11-san-pham.png`. */
export const mockProducts: Product[] = [
    { id: 'prd-001', code: 'SP001', name: 'Áo sơ mi linen trắng basic', categoryIds: ['cat-001'], categoryNames: ['Áo sơ mi'], brandName: null, basePrice: 590_000, totalStock: 143, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE, createdDate: '2024-01-10T00:00:00Z' },
    { id: 'prd-002', code: 'SP002', name: 'Quần jeans slim fit xanh đen', categoryIds: ['cat-004'], categoryNames: ['Quần jeans'], brandName: null, basePrice: 890_000, totalStock: 67, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE, createdDate: '2024-01-15T00:00:00Z' },
    { id: 'prd-003', code: 'SP003', name: 'Đầm maxi floral mùa hè', categoryIds: ['cat-007'], categoryNames: ['Váy đầm'], brandName: null, basePrice: 1_290_000, totalStock: 34, imageUrl: null, lifecycle: ESkuLifecycle.MARKDOWN, status: EntityStatus.ACTIVE, createdDate: '2024-02-01T00:00:00Z' },
    { id: 'prd-004', code: 'SP004', name: 'Áo khoác bomber oversize đen', categoryIds: ['cat-003'], categoryNames: ['Áo khoác'], brandName: null, basePrice: 1_590_000, totalStock: 22, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE, createdDate: '2024-02-10T00:00:00Z' },
    { id: 'prd-005', code: 'SP005', name: 'Chân váy midi pleated kem', categoryIds: ['cat-008'], categoryNames: ['Chân váy'], brandName: null, basePrice: 750_000, totalStock: 0, imageUrl: null, lifecycle: ESkuLifecycle.DISCONTINUED, status: EntityStatus.INACTIVE, createdDate: '2023-11-05T00:00:00Z' },
    { id: 'prd-006', code: 'SP006', name: 'Áo thun polo cotton piqué', categoryIds: ['cat-002'], categoryNames: ['Áo thun'], brandName: null, basePrice: 420_000, totalStock: 215, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE, createdDate: '2024-03-01T00:00:00Z' },
    { id: 'prd-007', code: 'SP007', name: 'Quần kaki cargo slate grey', categoryIds: ['cat-005'], categoryNames: ['Quần âu'], brandName: null, basePrice: 720_000, totalStock: 8, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE, createdDate: '2024-03-10T00:00:00Z' },
    { id: 'prd-008', code: 'SP008', name: 'Áo blazer tweed houndstooth', categoryIds: ['cat-003'], categoryNames: ['Áo khoác'], brandName: null, basePrice: 2_190_000, totalStock: 11, imageUrl: null, lifecycle: ESkuLifecycle.NEW, status: EntityStatus.ACTIVE, createdDate: '2024-07-20T00:00:00Z' },
]

/** SKU mẫu — khớp mã ở `13-kho-hang-ton-kho.png` (`SP001-S-TRG`…). */
export const mockSkus: Sku[] = [
    { id: 'sku-001', code: 'SP001-S-TRG', productId: 'prd-001', productName: 'Áo sơ mi linen trắng basic', color: 'Trắng', size: 'S', barcode: '8938501000011', price: 590_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
    { id: 'sku-002', code: 'SP001-M-TRG', productId: 'prd-001', productName: 'Áo sơ mi linen trắng basic', color: 'Trắng', size: 'M', barcode: '8938501000028', price: 590_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
    { id: 'sku-003', code: 'SP001-L-TRG', productId: 'prd-001', productName: 'Áo sơ mi linen trắng basic', color: 'Trắng', size: 'L', barcode: '8938501000035', price: 590_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
    { id: 'sku-004', code: 'SP002-28-XD', productId: 'prd-002', productName: 'Quần jeans slim fit xanh đen', color: 'Xanh đen', size: '28', barcode: '8938502000011', price: 890_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
    { id: 'sku-005', code: 'SP002-30-XD', productId: 'prd-002', productName: 'Quần jeans slim fit xanh đen', color: 'Xanh đen', size: '30', barcode: '8938502000028', price: 890_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
    { id: 'sku-006', code: 'SP006-M-XNH', productId: 'prd-006', productName: 'Áo thun polo cotton piqué', color: 'Xanh navy', size: 'M', barcode: '8938506000011', price: 420_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
    { id: 'sku-007', code: 'SP007-32-GR', productId: 'prd-007', productName: 'Quần kaki cargo slate grey', color: 'Xám', size: '32', barcode: '8938507000011', price: 720_000, imageUrl: null, lifecycle: ESkuLifecycle.ACTIVE, status: EntityStatus.ACTIVE },
]
