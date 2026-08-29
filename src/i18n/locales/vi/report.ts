export default {
    report: {


        /* ---------------- Đơn vị thống kê ---------------- */
        granularity: {
            label: 'Đơn vị thống kê',
            DAY: 'Theo ngày',
            MONTH: 'Theo tháng',
            YEAR: 'Theo năm',
            unit: {
                DAY: 'ngày',
                MONTH: 'tháng',
                YEAR: 'năm',
            },
        },

        /* ---------------- Bộ chọn kỳ ---------------- */
        range: {
            label: 'Kỳ báo cáo',
            today: 'Hôm nay',
            last7Days: '7 ngày qua',
            last30Days: '30 ngày qua',
            thisMonth: 'Tháng này',
            lastMonth: 'Tháng trước',
            custom: 'Tuỳ chọn',
            from: 'Từ ngày',
            to: 'Đến ngày',
            invalid: 'Khoảng ngày không hợp lệ',
            tooLong: 'Tối đa {{max}} {{unit}} cho đơn vị thống kê này',
        },

        /* ---------------- Dùng chung ---------------- */
        common: {
            allBranches: 'Tất cả chi nhánh',
            empty: 'Không có dữ liệu trong kỳ đã chọn',
            error: 'Không tải được báo cáo',
            retry: 'Thử lại',
            scopeBranch: 'Phạm vi: chi nhánh của bạn',
            scopeChain: 'Phạm vi: toàn chuỗi',
            scopeSelf: 'Phạm vi: đơn của bạn',
            notAvailable: '—',
        },


        /* ---------------- Cảnh báo giá vốn ---------------- */
        missingCost: {
            title: 'Lãi gộp chưa chính xác',
            description:
                'Có {{count}} sản phẩm đã bán thuộc SKU chưa nhập giá vốn ⇒ giá vốn (COGS) bị thiếu, lãi gộp đang cao hơn thực tế. Bổ sung giá vốn ở màn Sản phẩm để số liệu đúng.',
        },

        /* ---------------- Dashboard ---------------- */
        dashboard: {
            revenue: 'Doanh thu',
            revenueHint: 'Đã gồm phí giao hàng',
            completedOrders: 'Đơn hoàn thành',
            completedOrdersHint: 'Chỉ đơn ở trạng thái Hoàn thành',
            itemsSold: 'Sản phẩm đã bán',
            avgOrderValue: 'Giá trị đơn trung bình',
            grossProfit: 'Lãi gộp',
            netRevenue: 'Doanh thu thuần',
            discountTotal: 'Tổng giảm giá',
            shippingTotal: 'Tổng phí giao hàng',
            cogs: 'Giá vốn hàng bán',
            marginPercent: 'Biên lãi gộp',
            pipeline: 'Trạng thái đơn hàng',
            pipelineDescription: 'Đếm tất cả đơn trong kỳ, kể cả đơn chưa/không tính doanh thu',
            topProducts: 'Sản phẩm bán chạy',
            topProductsDescription: 'Tối đa 5 SKU theo số lượng bán',
            revenueChart: {
                DAY: 'Doanh thu theo ngày',
                MONTH: 'Doanh thu theo tháng',
                YEAR: 'Doanh thu theo năm',
            },
            column: {
                product: 'Sản phẩm',
                category: 'Danh mục',
                itemsSold: 'Số lượng bán',
                netRevenue: 'Doanh thu',
                share: 'Tỷ lệ tổng',
            },
            /* Không có trong `TopProductRow`; tra thêm cũng không được — xem top-products-card.tsx. */
            categoryUnavailable: 'Báo cáo không trả danh mục của sản phẩm',
            /* Thẻ mockup vẽ nhưng backend chưa có API — hiển thị "—" kèm giải thích. */
            unavailable: {
                newCustomers: 'Khách mới',
                pendingApproval: 'Hàng chờ duyệt',
                stockStatus: 'Tình trạng kho',
                totalSku: 'Tổng SKU đang bán',
                availableStock: 'Tồn khả dụng',
                outOfStock: 'SKU hết hàng',
                slowMoving: 'Chậm luân chuyển > 60 ngày',
                tooltip: 'Backend chưa có API cho số liệu này',
            },
        },

        /* ---------------- Đơn hàng gần đây ---------------- */
        recentOrders: {
            title: 'Đơn hàng gần đây',
            viewAll: 'Xem tất cả',
            guest: 'Khách vãng lai',
            column: {
                code: 'Mã đơn',
                customer: 'Khách hàng',
                channel: 'Kênh',
                branch: 'Chi nhánh',
                total: 'Tổng tiền',
                status: 'Trạng thái',
                time: 'Thời gian',
            },
        },




        /* ---------------- So sánh chi nhánh ---------------- */
        branch: {
            chartTitle: 'Doanh thu theo chi nhánh',
        },
    },
}
