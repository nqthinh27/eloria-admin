export default {
    order: {
        /* ================= POS screen (`03-pos-ban-hang.png`) ================= */
        pos: {
            pageTitle: 'Point of Sale',
            pageDescription: 'Create sales orders, scan barcodes and collect payment',

            searchPlaceholder: 'Scan barcode or search product name…',
            allCategories: 'All',

            /* ---- Branch picker in the page header (SUPER_ADMIN only) ---- */
            branch: 'Selling branch',
            branchPlaceholder: 'Select a branch…',
            /** Blocks product selection until the stock source is known — see `PosPage`. */
            branchGateTitle: 'Select a selling branch',
            branchGateHint:
                'Stock is tracked per branch. Pick a branch before adding products to the cart.',
            branchLocked: 'Selling at {{name}}',
            branchChangeWarning:
                'Switching branch clears the current cart because stock is tracked per branch.',

            column: {
                product: 'PRODUCT',
                sku: 'SKU',
                stock: 'STOCK',
                price: 'PRICE',
            },

            empty: 'No products found',
            emptyHint: 'Try a different keyword or category.',
            outOfStock: 'Out of stock',
            loadError: 'Could not load sellable items',
            loadErrorHint: 'Check your connection and try again.',
            /** Rows are fetched as you scroll — see `product-picker`. */
            loadingMore: 'Loading more…',
            /**
             * The backend cannot search by product name (`stock-item/search` `keyword` only matches
             * the SKU code) ⇒ the search box filters client-side over what has been loaded.
             */
            searchPartial:
                'Searching only what has been loaded. Scroll down to load more items, then search again.',

            /* ---- Cart (right column) ---- */
            cart: {
                customerPlaceholder: 'Assign customer (phone or name)',
                customerSearching: 'Searching…',
                customerNotFound: 'No matching customer found',
                customerCreate: 'Create customer',
                customerClear: 'Unassign customer',
                guest: 'Walk-in customer',

                empty: 'Cart is empty',
                emptyHint: 'Pick a product on the left to add it to the cart.',

                discountPlaceholder: 'Order discount',
                orderDiscountType: 'Order discount type',
                lineDiscountType: 'Item discount type',
                lineDiscountPlaceholder: 'Discount',
                lineDiscountTotal: 'Item discounts',
                orderDiscount: 'Order discount',
                subtotal: 'Subtotal',
                discount: 'Discount (applied by server)',
                shippingFee: 'Shipping fee',
                total: 'Total',

                checkout: 'Checkout',
                clear: 'Clear cart',
                clearConfirmTitle: 'Clear the whole cart?',
                clearConfirmDescription:
                    'Every product currently in the cart will be removed. This cannot be undone.',

                remove: 'Remove from cart',
                quantity: 'Quantity',
                /** Early warning from `cart/preview` — stock can still change before checkout. */
                insufficient: 'Only {{count}} left',
                gift: 'Gift',
            },

            /* ---- Checkout dialog ---- */
            checkout: {
                title: 'Checkout',
                description: 'Review delivery details and choose a payment method.',

                customerSection: 'Customer',
                customerName: 'Customer name',
                customerNamePlaceholder: 'Walk-in customer',
                customerPhone: 'Phone number',
                customerPhonePlaceholder: '0912345678',

                shippingSection: 'Delivery',
                shippingAddress: 'Delivery address',
                shippingAddressPlaceholder: 'Street, ward, province…',
                shippingAddressHint: 'Leave empty if the customer collects the order in store.',
                shippingFee: 'Shipping fee',

                paymentSection: 'Payment',
                paymentMethod: 'Payment method',
                /** Backend collects the full amount once ⇒ no amount input. */
                paymentHint: 'Collected once, for the full order value.',

                noteSection: 'Internal note',
                notePlaceholder: 'Note for the staff handling this order…',

                branch: 'Selling branch',
                branchPlaceholder: 'Select a branch',
                branchRequired: 'Please select a selling branch',

                summary: 'Total',
                submit: 'Confirm & create order',
                submitting: 'Creating order…',

                /** An assigned customer is display-only here — change them from the cart lookup. */
                customerLinked: 'Profile linked',
                /** A walk-in with both name and phone gets a profile created before the order. */
                guestProfileHint:
                    'Enter both the full name and phone number and a customer profile is created automatically for future lookups. Leave blank if the customer prefers not to be saved.',
                guestProfileCreated: 'Customer profile created',
            },

            /* ---- Receipt preview modal shown after the order is created ---- */
            success: {
                title: 'Order {{code}} created',
                /** POS orders auto-complete on payment — see `orderApi.pay`. */
                paid: 'Payment collected and the order is complete.',
                unpaid: 'Order not paid yet — confirm payment to unlock invoice printing.',
                /** Order created but payment failed — stock is already deducted, do not recreate. */
                paymentFailed:
                    'The order was created but payment failed. Try confirming again, or collect it from the Orders screen — do not create a new order.',
                /** `GET /order/{id}/invoice` failed — the order still exists, only the preview is missing. */
                previewUnavailable: 'Could not load the receipt preview.',
                confirmPayment: 'Confirm payment received',
                viewOrder: 'View order',
                printInvoice: 'Print invoice',
                printBlocked: 'Order is unpaid — collect payment before printing the invoice',
                newOrder: 'New order',
            },
        },

        /* ================= Order list (`04-don-hang.png`) ================= */
        list: {
            pageTitle: 'Orders',
            pageDescription: 'All online and in-store orders',

            searchPlaceholder: 'Search order code, customer…',
            allStatuses: 'All statuses',
            allPaymentStatuses: 'All payment statuses',
            allBranches: 'All branches',
            resultLabel: 'orders',

            empty: 'No orders yet',
            emptyHint: 'Create one from the Point of Sale screen to get started.',

            tab: {
                all: 'All',
                online: 'Online',
                pos: 'In store',
            },

            column: {
                code: 'ORDER',
                customer: 'CUSTOMER',
                channel: 'CHANNEL',
                branch: 'BRANCH',
                total: 'TOTAL',
                payment: 'PAYMENT',
                status: 'STATUS',
                createdDate: 'CREATED',
                actions: 'ACTIONS',
            },
        },

        /* ================= Detail dialog (`05-don-hang-chi-tiet.png`) ================= */
        detail: {
            title: 'Order {{code}}',

            customer: 'Customer',
            channel: 'Channel',
            branch: 'Branch',
            staff: 'Staff',
            createdDate: 'Created',
            status: 'Status',

            shippingAddress: 'Delivery address',

            lines: 'Items in this order',
            /** Variant line: "Size M · Color White · ×1". */
            lineVariant: 'Size {{size}} · Color {{color}} · ×{{quantity}}',
            lineVariantNoSize: 'Color {{color}} · ×{{quantity}}',
            lineVariantNoColor: 'Size {{size}} · ×{{quantity}}',
            lineVariantPlain: '×{{quantity}}',

            subtotal: 'Subtotal',
            discount: 'Discount',
            shippingFee: 'Shipping fee',
            total: 'Total',

            payment: 'Payment',
            paidAt: 'Paid ({{method}})',
            refundedAt: 'Refunded ({{method}})',
            paymentEmpty: 'Not collected yet',
            paidBy: 'Collected by {{name}}',

            note: 'Internal note',
            noteEmpty: 'No note',
            noteEdit: 'Edit note',
            notePlaceholder: 'Enter an internal note…',
            noteSave: 'Save note',

            close: 'Close',
            printInvoice: 'Print invoice',
            /** Printing is blocked until payment is collected — decided 2026-08-21. */
            printBlocked: 'Order is unpaid — collect payment before printing the invoice',
        },

        /* ================= Printed invoice (`printInvoice`) ================= */
        invoice: {
            /** Hard-coded per spec — does not vary by order type. */
            title: 'Sales invoice',
            hotline: 'Hotline',
            time: 'Time',
            orderCode: 'Order code',
            customer: 'Customer',
            phone: 'Phone',
            staff: 'Staff',
            /** Per-line discount (two-tier discount model). */
            lineDiscount: 'Discount',
            lineTotal: 'Line total',
            returnPolicy: 'Returns accepted within {{days}} days with tags and this invoice.',
            thanks: 'Thank you and see you again!',
        },

        /* ================= Bank transfer via QR ================= */
        qr: {
            show: 'Show QR code',
            title: 'Scan the QR code to transfer',
            description:
                'The amount and transfer reference are already embedded in the code. The customer scans it with their banking app.',
            amount: 'Amount to transfer',
            loading: 'Generating QR code…',
            /** No default receiving bank account configured on the backend. */
            unavailable: 'QR code unavailable',
            unavailableHint:
                'No receiving bank account has been configured. Contact an administrator to set one up.',
            retry: 'Try again',
            /** Staff reconcile against the banking app themselves — no webhook yet. */
            confirm: 'Confirm payment received',
            confirmHint:
                'Only press this once the money has landed in the account. It marks the order as paid.',
        },

        /* ================= Lifecycle actions ================= */
        action: {
            view: 'View details',
            print: 'Print invoice',

            confirm: 'Confirm order',
            pack: 'Pack',
            ship: 'Hand over to shipping',
            complete: 'Complete order',
            cancel: 'Cancel order',
            pay: 'Collect payment',

            confirmTitle: 'Confirm order {{code}}?',
            confirmDescription: 'The order moves to "Confirmed". Stock is unchanged.',

            packTitle: 'Pack order {{code}}?',
            packDescription: 'The order moves to "Packed". Stock is unchanged.',

            shipTitle: 'Hand order {{code}} to shipping?',
            shipDescription: 'The order moves to "Shipping".',

            completeTitle: 'Complete order {{code}}?',
            completeDescription:
                'The order moves to "Completed". Only fully paid orders can be completed.',

            cancelTitle: 'Cancel order {{code}}?',
            cancelDescription:
                'Every item is returned to stock. A paid order is automatically recorded as refunded. This cannot be undone.',
            cancelReason: 'Cancellation reason',
            cancelReasonPlaceholder: 'Why is this order cancelled…',

            payTitle: 'Collect payment for {{code}}',
            payDescription:
                'Collected once, for the full order value. No further payment can be added afterwards.',
            payAmount: 'Amount',
        },

        /* ================= Enum labels ================= */
        status: {
            PENDING: 'Pending',
            CONFIRMED: 'Confirmed',
            PACKED: 'Packed',
            SHIPPING: 'Shipping',
            SHIPPED: 'Shipped',
            COMPLETED: 'Completed',
            CANCELLED: 'Cancelled',
            REJECTED: 'Rejected',
        },

        channel: {
            ONLINE: 'Online',
            POS: 'In store',
            OTHER: 'Other',
        },

        paymentStatus: {
            UNPAID: 'Unpaid',
            PAID: 'Paid',
            REFUNDED: 'Refunded',
        },

        paymentMethod: {
            CASH: 'Cash',
            CARD: 'Card',
            /** Backend has no `TRANSFER` — bank transfer uses `QR`. */
            QR: 'Bank transfer / QR',
            VOUCHER: 'Voucher',
            POINT: 'Loyalty points',
            STORE_CREDIT: 'Store credit',
            COD: 'Cash on delivery',
        },

        /* ================= Notifications ================= */
        toast: {
            created: 'Order created',
            confirmed: 'Order confirmed',
            packed: 'Order packed',
            shipped: 'Order handed to shipping',
            completed: 'Order completed',
            cancelled: 'Order cancelled',
            paid: 'Payment recorded',
            noteSaved: 'Note saved',
            /** 409/500 during payment: the real state must be re-read from the server. */
            reloaded: 'This order changed elsewhere — reloaded the latest data.',
        },

        export: {
            exportComingSoon: 'Data export will be available once the backend supports it',
        },
    },
}
