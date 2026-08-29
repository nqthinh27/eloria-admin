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
        missingCost: {
            title: 'Gross profit is not accurate',
            description:
                '{{count}} sold items belong to SKUs with no cost price, so COGS is understated and gross profit is higher than reality. Add cost prices on the Products screen to fix the figures.',
        },

        /* ---------------- Dashboard ---------------- */
        dashboard: {
            revenue: 'Revenue',
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
            unavailable: {
                newCustomers: 'New customers',
                pendingApproval: 'Pending approval',
                stockStatus: 'Stock status',
                totalSku: 'Active SKUs',
                availableStock: 'Available stock',
                outOfStock: 'Out-of-stock SKUs',
                slowMoving: 'Slow moving > 60 days',
                tooltip: 'The backend has no API for this figure yet',
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
