import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { skuApi } from '@/api/product'
import { EntityStatus } from '@/types/common'
import type { Sku } from '@/types/product'
import type { SearchSelectOption } from '@/components/search-select'
import type { PagedSearchLoader } from '@/hooks/use-paged-search'

/** Nhãn thống nhất cho mọi ô chọn SKU trong toàn app. */
export function skuOptionOf(sku: Sku): SearchSelectOption {
    return {
        value: sku.id,
        /*
         * ⚠️ Phải có **mã SKU**: một sản phẩm sinh ra hàng chục SKU **trùng hệt `productName`**
         * (đo thật: 67 SKU chỉ có 7 tên khác nhau, riêng "Áo sơ mi linen" có 12 SKU). Chỉ hiện tên
         * là người dùng không thể biết mình đang chọn màu/size nào.
         */
        label: `${sku.skuCode} — ${sku.productName ?? ''}`.trim(),
        hint: [sku.colorName, sku.sizeLabel].filter(Boolean).join(' · '),
    }
}

/**
 * Nguồn dữ liệu dùng chung cho **mọi ô chọn SKU** — trả về đúng bộ props để đổ thẳng vào
 * `<SearchSelect {...selectProps} />`.
 *
 * **Luôn tra phía server, 10 SKU mỗi lượt + infinite scroll** (CONVENTIONS mục 5.7, user chốt
 * 2026-09-13). Không còn nhánh "nạp hết rồi lọc phía FE": catalog SKU là danh mục **lớn nhất và
 * tăng nhanh nhất** trong hệ thống (mỗi sản phẩm sinh ra hàng chục biến thể màu × size), nên nó là
 * chỗ chắc chắn sẽ vượt trần 200 của backend. Tra server ngay từ đầu thì hành vi **không đổi** khi
 * catalog lớn lên, thay vì âm thầm đổi kiểu vào một ngày nào đó.
 *
 * Là **hook chứ không phải component** vì một dialog thường có nhiều dòng hàng: dựng thành component
 * thì mỗi dòng tự giữ một bộ state riêng. Ở đây mỗi `SearchSelect` chỉ gọi API **khi được mở ra**,
 * nên 10 dòng hàng đóng lại không sinh request nào.
 *
 * ⚠️ **Chỉ lấy SKU `ACTIVE`.** SKU đã ngừng kinh doanh mà vẫn chọn được thì lỗi chỉ nổ ở bước sau
 * (duyệt phiếu đổi mới trừ tồn), tức **người tạo phiếu không phải người lãnh lỗi**.
 *
 * ✅ **`keyword` khớp cả tên sản phẩm** — `POST /sku/search` soi `sku.id` · `ean` · `product.name` ·
 * `product.code` (**BE29**, backend mở rộng 2026-09-13; trước đó chỉ khớp mã nên gõ "linen" trả 0).
 * Đo thật sau khi sửa: `"linen"` ⇒ 12 · `"Áo sơ mi"` (có dấu) ⇒ 12 · `"SP001"` ⇒ 12 · EAN ⇒ 1.
 * ⇒ Tra phía server **không còn kém lọc phía FE**, đó là điều kiện để bỏ hẳn chế độ nạp-trước.
 */
export function useSkuOptions() {
    const { t } = useTranslation('common')

    const loadPage = useCallback<PagedSearchLoader<SearchSelectOption>>(
        async ({ keyword, page, size, signal }) => {
            const res = await skuApi.search(
                { keyword: keyword || undefined, status: EntityStatus.ACTIVE },
                /*
                 * Sort theo `id` chứ không phải `skuCode`: `skuCode` là field **DTO-only** ⇒ sort
                 * trả HTTP 500 (CLAUDE.md mục sort). Hai field cùng giá trị nên kết quả tương đương,
                 * và thứ tự ổn định là điều kiện để phân trang cộng dồn không lặp/sót dòng.
                 */
                { page, size, sort: ['id,ASC'] },
                signal,
            )
            return { items: res.data.map(skuOptionOf), total: res.total }
        },
        [],
    )

    return {
        /**
         * Đổ thẳng vào `<SearchSelect {...selectProps} …>`. Gom thành một object để mọi ô chọn SKU
         * trong app dùng **cùng một** cách tra, cùng một kiểu nhãn và cùng một lời nhắc.
         */
        selectProps: {
            /* Rỗng là đúng: ở chế độ server, `SearchSelect` lấy dữ liệu qua `loadPage`. */
            options: [] as SearchSelectOption[],
            loadPage,
            searchPlaceholder: t('searchSelect.skuSearchPlaceholder'),
            emptyLabel: t('searchSelect.skuEmpty'),
        },
    }
}
