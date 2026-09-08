export default {
    promotion: {
        pageTitle: 'Promotions',
        pageDescription: 'Manage promotion campaigns and discount codes',


        /* ---------------- Campaign lifecycle ---------------- */
        status: {
            DRAFT: 'Draft',
            SCHEDULED: 'Scheduled',
            RUNNING: 'Running',
            PAUSED: 'Paused',
            ENDED: 'Ended',
        },

        /* ---------------- Type & scope ---------------- */
        type: {
            label: 'Type',
            PERCENT: 'Percentage',
            FIXED: 'Fixed amount',
        },
        target: {
            label: 'Applies to',
            ALL: 'All products',
            PRODUCT: 'Product',
            CATEGORY: 'Category',
            BRAND: 'Brand',
            SKU: 'SKU',
        },
        channel: {
            label: 'Channel',
            ONLINE: 'Online',
            POS: 'In store',
            OTHER: 'Other',
        },
        /** Derived from `code` + `customerId` — see `types/promotion.ts`. */
        kind: {
            label: 'Kind',
            auto: 'Automatic',
            coupon: 'Public code',
            personal: 'Personal code',
        },

        /* ---------------- List table ---------------- */
        list: {
            searchPlaceholder: 'Search campaign name or code...',
            allStatuses: 'All statuses',
            allChannels: 'All channels',
            resultLabel: 'campaigns',
            empty: 'No promotion campaigns yet',
            addButton: 'New promotion',
            generateCoupon: 'Generate codes',
            exportCoupon: 'Export codes (CSV)',
            column: {
                code: 'Code',
                name: 'Campaign',
                type: 'Type',
                value: 'Discount',
                channel: 'Channel',
                period: 'Period',
                usage: 'Used',
                status: 'Status',
                actions: 'Actions',
            },
            noCode: 'Automatic',
            noPeriod: 'No limit',
            usageUnlimited: '{{used}}',
            usageLimited: '{{used}} / {{limit}}',
            actionView: 'Details',
            actionEdit: 'Edit',
            actionChangeStatus: 'Change status',
            branchAll: 'All branches',
        },

        detail: {
            createdDate: 'Created',
            lastModifiedDate: 'Last updated',
        },

        /* ---------------- Create / edit form ---------------- */
        form: {
            createTitle: 'New promotion',
            createDescription: 'The campaign is created as a draft and must be activated before it applies.',
            editTitle: 'Edit promotion',
            editDescription: 'Update the promotion campaign details.',
            name: 'Campaign name',
            namePlaceholder: 'e.g. Weekend flash sale',
            code: 'Promotion code',
            codePlaceholder: 'Leave blank for an automatic promotion',
            codeHint: 'Blank ⇒ applies automatically. With a code ⇒ the customer must enter it at checkout.',
            type: 'Discount type',
            value: 'Discount value',
            valuePercentPlaceholder: 'e.g. 10 (10% off)',
            valueFixedPlaceholder: 'e.g. 50,000',
            target: 'Applies to',
            targetId: 'Target',
            targetIdPlaceholder: 'Select a target',
            channel: 'Channel',
            branch: 'Branch',
            branchAll: 'All branches',
            minAmount: 'Minimum order value (₫)',
            minAmountPlaceholder: 'Leave blank if not required',
            maxDiscount: 'Maximum discount (₫)',
            maxDiscountPlaceholder: 'Leave blank for no cap',
            maxDiscountHint: 'Only applies to percentage discounts.',
            usageLimit: 'Total usage limit',
            usageLimitPlaceholder: 'Leave blank for unlimited',
            perCustomerLimit: 'Usage per customer',
            perCustomerLimitPlaceholder: 'Leave blank for unlimited',
            startDate: 'Starts',
            endDate: 'Ends',
            dateHint: 'Leave blank ⇒ starts immediately with no end date.',
            sectionBasic: 'Campaign details',
            sectionScope: 'Scope',
            sectionLimit: 'Limits & schedule',
            submitCreate: 'Create campaign',
            submitEdit: 'Save changes',
            cancel: 'Cancel',
        },

        /* ---------------- Bulk code generation ---------------- */
        coupon: {
            title: 'Generate discount codes',
            description: 'Each code is its own campaign and becomes active as soon as it is generated.',
            count: 'Number of codes',
            countHint: 'Up to 5,000 codes per batch.',
            codePrefix: 'Code prefix',
            codePrefixPlaceholder: 'e.g. TET2026',
            codePrefixHint: 'The system appends 8 random characters after the prefix.',
            usageLimitPerCode: 'Uses per code',
            usageLimitPerCodeHint: 'Leave blank for unlimited uses per code.',
            submit: 'Generate',
            resultTitle: 'Generated {{count}} codes',
            resultDescription: 'The codes just created. Use "Export codes (CSV)" on the list to download them all.',
            copyAll: 'Copy all',
            copied: 'Code list copied',
            close: 'Close',
        },

        /* ---------------- Status transition ---------------- */
        statusDialog: {
            title: 'Change campaign status',
            description: 'Campaign "{{name}}" is currently {{current}}. Choose a new status:',
            endedWarning: 'Ending a campaign cannot be undone.',
            noTransition: 'This campaign has ended and cannot change status.',
            submit: 'Confirm',
            cancel: 'Cancel',
        },

        /* ---------------- Toasts ---------------- */
        toast: {
            created: 'Promotion created successfully',
            updated: 'Promotion updated successfully',
            statusUpdated: 'Promotion status updated successfully',
            couponGenerated: 'Discount codes generated successfully',
            exported: 'Code list exported successfully',
            exportEmpty: 'There are no discount codes to export',
        },

        /* ---------------- Client-side validation (mirrors backend rules) ---------------- */
        validation: {
            nameRequired: 'Please enter a campaign name',
            valueRequired: 'Please enter a discount value',
            valuePercentRange: 'Percentage must be between 0 and 100',
            valueFixedMin: 'The discount amount must be greater than 0',
            targetIdRequired: 'Please select a target',
            dateOrder: 'The end date must be after the start date',
            countRange: 'The number of codes must be between 1 and 5,000',
            positiveNumber: 'The value must be 0 or greater',
        },
    },
}
