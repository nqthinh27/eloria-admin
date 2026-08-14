export default {
    inventory: {
        pageTitle: 'Warehouse & Stock',
        pageDescription: 'Manage receipts/issues, stock counts and adjustments',

        tab: {
            stock: 'Stock',
            ledger: 'Slips',
            count: 'Stock count',
        },

        action: {
            createLedger: 'Create slip',
        },

        /* ---------------- Stock tab ---------------- */
        stock: {
            searchPlaceholder: 'Search SKU, product name…',
            allBranches: 'All branches',
            resultLabel: 'SKUs',
            empty: 'No stock data yet',
            emptyHint: 'Stock appears only after a goods receipt has been approved.',
            lowStockOnly: 'Low stock only',
            column: {
                sku: 'SKU',
                product: 'PRODUCT',
                size: 'SIZE',
                color: 'COLOR',
                total: 'ON HAND',
                // `reserved` (RESERVED) removed 2026-08-14 — backend dropped stock reservation.
                available: 'AVAILABLE',
                minStock: 'MIN STOCK',
                branch: 'BRANCH',
                status: 'STATUS',
            },
            status: {
                normal: 'Normal',
                low: 'Low stock',
                outOfStock: 'Out of stock',
            },
            alert: {
                outOfStock: '{{count}} SKUs — Out of stock',
                outOfStockHint: 'restock urgently',
                lowStock: '{{count}} SKUs — Below minimum',
                lowStockHint: 'restock soon',
            },
            minStockUnset: 'Not set',
        },

        /* ---------------- Slips tab ---------------- */
        ledger: {
            searchPlaceholder: 'Search slip code, name…',
            allTypes: 'All slip types',
            allStatuses: 'All statuses',
            resultLabel: 'slips',
            empty: 'No warehouse slips yet',
            emptyHint: 'Create a goods receipt to start tracking stock.',
            column: {
                code: 'CODE',
                name: 'NAME',
                type: 'TYPE',
                branch: 'BRANCH',
                status: 'STATUS',
                createdBy: 'CREATED BY',
                createdDate: 'CREATED',
                actions: 'ACTIONS',
            },
            type: {
                IN: 'Goods receipt',
                OUT: 'Goods issue',
                TRANSFER: 'Transfer',
            },
            status: {
                DRAFT: 'Draft',
                WAITING_APPROVAL: 'Awaiting approval',
                ACCEPTED: 'Approved',
                REJECTED: 'Rejected',
            },
            action: {
                view: 'View details',
                submit: 'Submit for approval',
                approve: 'Approve',
                reject: 'Reject',
            },
            cannotApproveOwnHint: 'You cannot approve a slip you created yourself',
        },

        /* ---------------- Slip detail dialog ---------------- */
        detail: {
            title: 'Warehouse slip {{code}}',
            type: 'Slip type',
            status: 'Status',
            branch: 'Branch',
            toBranch: 'Destination branch',
            receiveFrom: 'Received from',
            sendTo: 'Issued to / Reason',
            createdBy: 'Created by',
            createdDate: 'Created at',
            description: 'Note',
            noDescription: 'No note',
            lines: 'Items',
            totalQuantity: 'Total quantity',
            lineColumn: {
                sku: 'SKU',
                product: 'Product',
                variant: 'Color / Size',
                quantity: 'Quantity',
            },
        },

        /* ---------------- Create slip dialog ---------------- */
        form: {
            title: 'Create warehouse slip',
            type: 'Slip type',
            typeHint: 'Receipt adds stock, issue subtracts it, transfer moves it between branches.',
            name: 'Slip name',
            namePlaceholder: 'Leave blank to auto-generate',
            branch: 'Branch',
            branchPlaceholder: 'Select branch',
            toBranch: 'Destination branch',
            toBranchPlaceholder: 'Select receiving branch',
            receiveFrom: 'Source / Supplier',
            receiveFromPlaceholder: 'e.g. Viet Tien Supplier',
            sendTo: 'Destination / Reason',
            sendToPlaceholder: 'e.g. Return to supplier',
            description: 'Note',
            descriptionPlaceholder: 'Enter a note (optional)',
            lines: 'Items',
            addLine: 'Add line',
            removeLine: 'Remove line',
            skuPlaceholder: 'Select SKU',
            skuTruncated:
                'Only {{loaded}}/{{total}} SKUs are listed — SKUs beyond this list cannot be found via search. Tell an admin if the SKU you need is missing.',
            quantity: 'Quantity',
            noLines: 'No lines yet',
            submit: 'Create slip',
            submitting: 'Creating…',
            draftHint: 'The slip is created as a Draft and does not affect stock yet.',
            validation: {
                typeRequired: 'Please select a slip type',
                branchRequired: 'Please select a branch',
                toBranchRequired: 'A transfer slip requires a destination branch',
                toBranchSame: 'Destination branch must differ from the source branch',
                linesRequired: 'The slip must have at least one line',
                skuRequired: 'Please select a SKU',
                quantityMin: 'Quantity must be greater than 0',
                skuDuplicated: 'This SKU is already in the slip',
            },
        },

        /* ---------------- Reject dialog ---------------- */
        reject: {
            title: 'Reject slip {{code}}',
            reason: 'Rejection reason',
            reasonPlaceholder: 'Enter the reason for rejecting this slip',
            reasonHint: "The reason is saved into the slip's note.",
            submit: 'Reject slip',
        },

        /* ---------------- Stock count tab ---------------- */
        count: {
            title: 'Stock count',
            description:
                'Enter counted quantities; the system compares them with stock and creates adjustment slips',
            start: 'Start stock count',
            branch: 'Branch to count',
            searchPlaceholder: 'Search SKU, product name…',
            noteLabel: 'Note',
            notePlaceholder: 'Enter a note for this count (optional)',
            column: {
                sku: 'SKU',
                product: 'PRODUCT',
                variant: 'COLOR / SIZE',
                systemQuantity: 'SYSTEM QTY',
                countedQuantity: 'COUNTED',
                variance: 'VARIANCE',
            },
            empty: 'No stock available to count',
            emptyHint: 'You need stock on hand before running a count.',
            countedPlaceholder: 'Enter qty',
            notCounted: 'Not counted',
            summary: '{{counted}}/{{total}} SKUs counted · {{diff}} with variance',
            filterScopeHint:
                'Filtered: showing {{shown}}/{{total}} rows. The figures above and the submit button cover all {{total}} rows, including hidden ones.',
            truncatedTitle:
                'Only {{loaded}}/{{total}} stock rows loaded — this count does not cover the whole warehouse',
            truncatedHint:
                'The remaining rows will not be counted. Filter by branch to split the session, or ask an admin to raise the limit.',
            submit: 'Create adjustment slips',
            submitting: 'Processing…',
            submitHint:
                'Adjustment slips are created as Drafts; they must be submitted and approved to affect stock.',
            confirmTitle: 'Confirm stock count',
            confirmDescription:
                'Adjustment slips will be created for {{count}} lines with variance. Continue?',
            noDiff: 'No line differs from system stock',
        },

        toast: {
            ledgerCreated: 'Warehouse slip created',
            ledgerSubmitted: 'Slip submitted for approval',
            ledgerApproved: 'Slip approved — stock has been updated',
            ledgerRejected: 'Slip rejected',
            stockCountCreated: '{{count}} adjustment slips created from the stock count',
        },

        confirm: {
            submitTitle: 'Submit slip for approval',
            submitDescription:
                'Slip {{code}} will move to Awaiting approval and can no longer be edited.',
            approveTitle: 'Approve warehouse slip',
            approveDescription:
                'Slip {{code}} will be approved and stock will be updated for real. This cannot be undone.',
        },
    },
}
