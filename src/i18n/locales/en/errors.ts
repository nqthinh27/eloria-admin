/** Bản EN của `vi/errors.ts` — hai file phải luôn có cùng bộ key. */
export default {
    error: {
        authenticate: 'Authentication failed. Please sign in again.',
        login: {
            fail: 'Incorrect username or password.',
        },
        password: {
            incorrect: 'Incorrect password.',
        },
        token: {
            invalid: 'Your session is invalid. Please sign in again.',
            forbidden: 'This account is not allowed to perform this action.',
        },
        forbidden: 'You do not have permission to access this feature.',
        activateCode: {
            invalid: 'The activation code is invalid or has expired.',
        },

        user: {
            notExisted: 'The account does not exist.',
            notAvailable: 'The account is unavailable.',
            inactive: 'The account has not been activated.',
            locked: 'The account has been locked.',
            cannotModifySelf: 'You cannot perform this action on your own account.',
            emptyTiktokId: 'No TikTok information available.',
            emptyYoutubeId: 'No YouTube information available.',
        },
        username: {
            existed: 'This username is already taken.',
            invalid: 'The username is invalid.',
        },
        email: {
            existed: 'This email is already in use.',
            notExisted: 'This email does not exist in the system.',
        },
        phone: {
            existed: 'This phone number is already in use.',
        },
        role: {
            notAllowed: 'You are not allowed to assign this role.',
        },
        staff: {
            referenced: 'This employee is referenced elsewhere and cannot be deleted.',
        },

        branch: {
            notExisted: 'The branch does not exist.',
            nameExisted: 'A branch with this name already exists.',
            required: 'Please select a branch.',
            inactive: 'This branch is inactive.',
            hasStaff: 'This branch still has employees and cannot be deleted.',
            hasActiveStaff: 'This branch still has active employees and cannot be deactivated.',
        },

        // Product domain (Phase 9) — keys taken from the backend source, not invented.
        category: {
            notExisted: 'Category does not exist.',
            codeExisted: 'Category code already exists.',
            hasChildren: 'This category still has child categories and cannot be deleted.',
            parentInvalid:
                'Invalid parent category (it cannot be the category itself or one of its descendants).',
        },
        brand: {
            notExisted: 'Brand does not exist.',
            codeExisted: 'Brand code already exists.',
            hasProducts: 'This brand still has products referencing it and cannot be deleted.',
        },
        color: {
            notExisted: 'Color does not exist.',
            codeExisted: 'Color code already exists.',
        },
        size: {
            notExisted: 'Size does not exist.',
            codeExisted: 'Size code already exists.',
        },
        product: {
            notExisted: 'Product does not exist.',
            codeExisted: 'Product code already exists.',
        },
        sku: {
            notExisted: 'SKU does not exist.',
            notActive: 'This SKU is not available for sale.',
            codeTooLong: 'The generated SKU code exceeds 50 characters. Shorten the product/color/size codes.',
            noEan: 'This SKU has no valid barcode (EAN) to print.',
        },

        // Warehouse & stock domain (Phase 10) — keys taken from `Constants.SUBKEY`.
        warehouseLedger: {
            notExisted: 'Warehouse slip does not exist.',
            invalidStatus: 'This action is not allowed for the current slip status.',
            lineRequired: 'The slip must have at least one line.',
            transferBranchRequired: 'A transfer slip requires a destination branch.',
            transferSameBranch: 'Source and destination branches must be different.',
            cannotApproveOwn: 'You cannot approve a slip you created yourself.',
        },
        // Work shift domain (Phase 15).
        workShift: {
            alreadyOpen: 'You already have a pending or open shift. Handle it first.',
            notOpen: 'You have no open shift (a shift must be approved before selling).',
            notFound: 'Shift not found.',
            invalidStatus: 'This action is not valid for the current shift status.',
            branchForbidden: 'You do not have permission for this shift.',
        },
        stock: {
            insufficient: 'Not enough available stock to issue/transfer.',
            countNoDiff: 'The stock count shows no difference from system stock.',
        },

        // Sales & orders domain (Phase 11) — keys taken from `docs/api/ban-hang-p6.md`.
        order: {
            notExisted: 'Order does not exist.',
            invalidStatus: 'This action is not valid for the current order status.',
            lineRequired: 'The order must have at least one line item.',
            notEditable: 'Orders can only be edited while still pending.',
            alreadyClosed: 'This order is already completed or cancelled.',
            /** Single-payment model (2026-08-15): a PAID order cannot be charged again. */
            alreadyPaid: 'This order has already been paid.',
            /**
             * ⚠️ The backend no longer emits this key as of 2026-08-15 (single-payment model —
             * the server always charges exactly `totalAmount`). Kept for old data/logs.
             */
            paymentExceedsTotal: 'The amount collected exceeds the outstanding balance.',
        },
        /**
         * Two concurrent actions on the same order (e.g. pack vs cancel, or two payments).
         * The backend uses optimistic locking — the later action is rejected to avoid overwrites.
         */
        concurrentModification:
            'This order was just updated by someone else. Please reload and try again.',

        address: {
            provinceInvalid: 'Invalid province/city.',
            wardInvalid: 'Invalid ward.',
        },

        image: {
            notAvailable: 'The image could not be loaded.',
        },

        input: {
            invalid: 'The submitted data is invalid.',
        },
        /** Backend rejects report ranges longer than MAX_*_BUCKETS (day 31 · month 24 · year 10). */
        report: {
            rangeTooLong: 'The report period is too long for the selected granularity. Please narrow the date range.',
        },
        /** Promotions (backend Phase 9). `invalidStatus` = illegal lifecycle transition. */
        promotion: {
            notExisted: 'Promotion not found.',
            codeExisted: 'This promotion code already exists.',
            codeInvalid: 'This discount code is invalid or does not apply to this order.',
            invalidValue: 'Invalid discount value. Percentage must be between 0 and 100; fixed amount must be greater than 0.',
            targetRequired: 'Please select a target for the chosen scope.',
            invalidDate: 'The promotion date range is invalid.',
            invalidStatus: 'This status transition is not allowed from the current status.',
            branchForbidden: 'You can only create or edit promotions for your own branch.',
        },
        validation: 'Invalid data. Please review the fields you entered.',
        dataIntegrity: {
            violation: 'This record is in use elsewhere and the action cannot be completed.',
        },
        concurrencyFailure: 'This record was just changed by someone else. Please reload and try again.',
        other: 'Something went wrong. Please try again.',
    },
}
