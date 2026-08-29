import type { RowData } from '@tanstack/react-table'

/**
 * Mở rộng `ColumnMeta` của TanStack cho nhu cầu riêng của repo (CONVENTIONS mục 5.2).
 *
 * ⚠️ File này **chỉ khai kiểu**, không có runtime code — nhưng vẫn phải được import ở đâu đó
 * (`data-table.tsx` import) thì `declare module` mới có hiệu lực trên toàn dự án.
 */
declare module '@tanstack/react-table' {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    // `TData`/`TValue` bắt buộc khai để khớp chữ ký gốc của TanStack, dù ở đây không dùng tới.
    interface ColumnMeta<TData extends RowData, TValue> {
        /**
         * Tên field **của DTO backend** dùng cho `SearchPagination.sort` (`"fullName,ASC"`).
         *
         * Chỉ cần khai khi `column.id` ở FE khác tên field backend. Không khai ⇒ dùng `column.id`.
         * ⚠️ Chỉ có tác dụng khi cột đó **thực sự sort được ở server**; cột không sort được phải
         * khai `enableSorting: false` (xem CONVENTIONS mục 5.2).
         */
        sortField?: string
        /** Nhãn hiển thị trong dropdown bật/tắt cột. Không khai ⇒ dùng `column.id`. */
        columnLabel?: string
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
}
