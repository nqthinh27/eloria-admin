import { useMock } from '@/config/app'
import { apiClient, search } from '@/lib/api-client'
import { mockProductCategories, mockProducts, mockSkus } from '@/mocks/product'
import { mockDelay, paginateMock } from '@/mocks/mock-utils'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    Product,
    ProductCategory,
    ProductCategoryPayload,
    ProductCategorySearchReq,
    ProductPayload,
    ProductSearchReq,
    Sku,
} from '@/types/product'

/** Service danh mục sản phẩm — CHƯA có API thật (PLAN Phase 6). */
export const productCategoryApi = {
    async search(
        body: ProductCategorySearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<ProductCategory>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockProductCategories,
                body,
                (item, keyword) =>
                    item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<ProductCategory>>('/product-category/search', body, pagination)
    },

    async create(payload: ProductCategoryPayload): Promise<ProductCategory> {
        if (useMock) {
            await mockDelay()
            const parent = mockProductCategories.find((c) => c.id === payload.parentId)
            const created: ProductCategory = {
                id: `cat-mock-${Date.now()}`,
                code: `CAT${String(mockProductCategories.length + 1).padStart(3, '0')}`,
                name: payload.name,
                parentId: payload.parentId ?? null,
                parentName: parent?.name ?? null,
                productCount: 0,
                brandCount: 0,
                collectionCount: 0,
                status: 1,
            }
            mockProductCategories.unshift(created)
            return created
        }
        return apiClient.post<ProductCategory>('/product-category', payload)
    },

    async update(id: string, payload: ProductCategoryPayload): Promise<ProductCategory> {
        if (useMock) {
            await mockDelay()
            const found = mockProductCategories.find((c) => c.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy danh mục ${id}`)
            found.name = payload.name
            return found
        }
        return apiClient.put<ProductCategory>(`/product-category/${id}`, payload)
    },

    async remove(id: string): Promise<null> {
        if (useMock) {
            await mockDelay()
            const index = mockProductCategories.findIndex((c) => c.id === id)
            if (index >= 0) mockProductCategories.splice(index, 1)
            return null
        }
        return apiClient.delete<null>(`/product-category/${id}`)
    },
}

/** Service sản phẩm & SKU — CHƯA có API thật (PLAN Phase 6). */
export const productApi = {
    async search(
        body: ProductSearchReq,
        pagination?: SearchPagination,
    ): Promise<BaseListRes<Product>> {
        if (useMock) {
            await mockDelay()
            return paginateMock(
                mockProducts,
                body,
                (item, keyword) =>
                    item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword),
                pagination,
            )
        }
        return search<BaseListRes<Product>>('/product/search', body, pagination)
    },

    async getById(id: string): Promise<Product> {
        if (useMock) {
            await mockDelay()
            const found = mockProducts.find((p) => p.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy sản phẩm ${id}`)
            return found
        }
        return apiClient.get<Product>(`/product/${id}`)
    },

    async create(payload: ProductPayload): Promise<Product> {
        if (useMock) {
            await mockDelay()
            const categoryNames = payload.categoryIds
                .map((id) => mockProductCategories.find((c) => c.id === id)?.name)
                .filter((name): name is string => Boolean(name))
            const created: Product = {
                id: `prd-mock-${Date.now()}`,
                code: `SP${String(mockProducts.length + 1).padStart(3, '0')}`,
                name: payload.name,
                categoryIds: payload.categoryIds,
                categoryNames,
                brandName: payload.brandName ?? null,
                basePrice: 0,
                totalStock: 0,
                imageUrl: null,
                lifecycle: 'NEW',
                status: 1,
                createdDate: new Date().toISOString(),
            }
            mockProducts.unshift(created)
            return created
        }
        return apiClient.post<Product>('/product', payload)
    },

    async update(id: string, payload: ProductPayload): Promise<Product> {
        if (useMock) {
            await mockDelay()
            const found = mockProducts.find((p) => p.id === id)
            if (!found) throw new Error(`Mock: không tìm thấy sản phẩm ${id}`)
            Object.assign(found, payload)
            return found
        }
        return apiClient.put<Product>(`/product/${id}`, payload)
    },

    async remove(id: string): Promise<null> {
        if (useMock) {
            await mockDelay()
            const index = mockProducts.findIndex((p) => p.id === id)
            if (index >= 0) mockProducts.splice(index, 1)
            return null
        }
        return apiClient.delete<null>(`/product/${id}`)
    },

    /** SKU thuộc 1 sản phẩm — ma trận màu × size (`11-san-pham.png`). */
    async listSkus(productId: string): Promise<Sku[]> {
        if (useMock) {
            await mockDelay()
            return mockSkus.filter((s) => s.productId === productId)
        }
        return apiClient.get<Sku[]>(`/product/${productId}/sku`)
    },
}
