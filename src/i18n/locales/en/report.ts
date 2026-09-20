export default {
    report: {


        /* ---------------- Statistic granularity ---------------- */
        granularity: {
            label: 'Group by period',
            DAY: 'By day',
            MONTH: 'By month',
            YEAR: 'By year',
            unit: {
                DAY: 'days',
                MONTH: 'months',
                YEAR: 'years',
            },
        },

        /* ---------------- Range picker ---------------- */
        range: {
            label: 'Report period',
            today: 'Today',
            last7Days: 'Last 7 days',
            last30Days: 'Last 30 days',
            thisMonth: 'This month',
            lastMonth: 'Last month',
            custom: 'Custom',
            from: 'From',
            to: 'To',
            invalid: 'Invalid date range',
            tooLong: 'At most {{max}} {{unit}} for this granularity',
        },

        /* ---------------- Shared ---------------- */
        common: {
            allBranches: 'All branches',
            empty: 'No data for the selected period',
            error: 'Could not load the report',
            retry: 'Retry',
            scopeBranch: 'Scope: your branch',
            scopeChain: 'Scope: whole chain',
            scopeSelf: 'Scope: your own orders',
            notAvailable: '—',
        },


        /* ---------------- Cost warning ---------------- */
        /*
          Cảnh báo đơn PENDING treo giam tồn. Backend trừ tồn ngay khi tạo đơn và không có cơ chế
          tự huỷ ⇒ đơn bỏ quên giữ hàng vô thời hạn. Xem `lib/stale-order.ts` + PLAN Phase 16 mục ①.
        */
        stalePending: {
            title: 'Stale orders are holding stock',
            description:
                '{{count}} orders have been pending for more than {{days}} days. Stock was deducted when each order was created, so these items cannot be sold to anyone else. Cancel the orders that are no longer valid on the Orders page to return the items to inventory.',
            action: 'View orders',
        },

        missingCost: {
            title: 'Gross profit is not accurate',
            description:
                '{{count}} sold items belong to SKUs with no cost price, so COGS is understated and gross profit is higher than reality. Add cost prices on the Products screen to fix the figures.',
        },

        /* ---------------- Dashboard ---------------- */
        dashboard: {
            revenue: 'Revenue',
            afterReturns: 'After returns',
            refundTotal: 'Refunded',
            grossProfitBeforeReturns: 'Before returns',
            revenueHint: 'Shipping fees included',
            completedOrders: 'Completed orders',
            completedOrdersHint: 'Only orders in Completed status',
            itemsSold: 'Items sold',
            avgOrderValue: 'Average order value',
            grossProfit: 'Gross profit',
            netRevenue: 'Net revenue',
            discountTotal: 'Total discount',
            shippingTotal: 'Total shipping',
            cogs: 'Cost of goods sold',
            marginPercent: 'Gross margin',
            pipeline: 'Order pipeline',
            pipelineDescription: 'Counts every order in the period, including those not counted as revenue',
            topProducts: 'Best sellers',
            topProductsDescription: 'Up to 5 SKUs by quantity sold',
            revenueChart: {
                DAY: 'Revenue by day',
                MONTH: 'Revenue by month',
                YEAR: 'Revenue by year',
            },
            column: {
                product: 'Product',
                category: 'Category',
                itemsSold: 'Quantity sold',
                netRevenue: 'Revenue',
                share: 'Share of top',
            },
            /* Not in `TopProductRow`; cannot be looked up — see top-products-card.tsx. */
            categoryUnavailable: 'The report does not return the product category',
            /* Tiles drawn in the mockup with no backend API yet — rendered as "—". */
            stockStatus: {
                title: 'Stock status',
                description: 'Stock & pending approval: figures as of right now',
                totalSku: 'Active SKUs',
                availableStock: 'Available stock',
                outOfStock: 'Out-of-stock SKUs',
                slowMoving: 'Slow moving > 60 days',
                newCustomers: 'New customers',
                pendingApproval: 'Pending approval',
                snapshotHint: 'Figure as of right now, unaffected by the selected period. Follows the branch being viewed.',
                slowMovingHint:
                    'SKUs still in stock with no sale in the last 60 days (counted from today, not the selected period; never-sold SKUs count too). Chain-wide may read higher than reality since a SKU slow in one branch can sell well in another.',
                newCustomersHint:
                    'Customers registered within the selected period. Always chain-wide and unchanged by the branch filter (customers belong to no branch).',
                pendingApprovalHint:
                    'Counts warehouse tickets awaiting approval only (discount and return approvals are not included). Figure as of right now.',
            },
        },

        /* ---------------- Recent orders ---------------- */
        recentOrders: {
            title: 'Recent orders',
            viewAll: 'View all',
            guest: 'Walk-in customer',
            column: {
                code: 'Order code',
                customer: 'Customer',
                channel: 'Channel',
                branch: 'Branch',
                total: 'Total',
                status: 'Status',
                time: 'Time',
            },
        },




        /* ---------------- Branch comparison ---------------- */
        branch: {
            chartTitle: 'Revenue by branch',
        },
    },
}
