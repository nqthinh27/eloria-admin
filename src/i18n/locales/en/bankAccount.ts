export default {
    bankAccount: {
        pageTitle: 'Bank accounts',
        pageDescription: 'Receiving accounts for bank transfers — used to generate VietQR codes when collecting order payments',

        noDefaultBanner: {
            title: 'No default account',
            description:
                'POS and the Orders screen cannot generate payment QR codes until you set an active account as the default.',
        },

        list: {
            addButton: 'Add account',
            searchPlaceholder: 'Search by bank, account number, account holder…',
            allStatuses: 'All statuses',
            resultLabel: 'accounts',
            empty: 'No bank accounts yet',
            statusActive: 'Active',
            statusInactive: 'Disabled',
            defaultBadge: 'Default',
            noneDefault: '—',
            column: {
                bank: 'Bank',
                bin: 'BIN',
                accountNumber: 'Account number',
                accountName: 'Account holder',
                isDefault: 'Default',
                status: 'Status',
                createdDate: 'Created',
                actions: 'Actions',
            },
            actionEdit: 'Edit',
            actionSetDefault: 'Set as default',
            actionDisable: 'Disable account',
            actionEnable: 'Enable account',
            actionDelete: 'Delete',
        },

        form: {
            addTitle: 'Add bank account',
            editTitle: 'Edit bank account',
            bankBin: 'Bank BIN (Napas)',
            bankBinPlaceholder: 'e.g. 970436',
            bankBinHint: '6 digits per Napas standard, e.g. Vietcombank = 970436',
            bankName: 'Bank name',
            bankNamePlaceholder: 'e.g. Vietcombank',
            accountNumber: 'Account number',
            accountNumberPlaceholder: 'Enter the receiving account number',
            accountName: 'Account holder name',
            accountNamePlaceholder: 'e.g. ELORIA COMPANY',
            accountNameHint: 'Automatically converted to UPPERCASE without diacritics',
            isDefault: 'Set as default account (used to generate QR)',
            submitCreate: 'Add account',
            submitUpdate: 'Save changes',
            submitting: 'Processing…',
            validation: {
                bankBinInvalid: 'BIN must be exactly 6 digits',
                bankNameRequired: 'Please enter the bank name',
                bankNameTooLong: 'Bank name is at most 100 characters',
                accountNumberRequired: 'Please enter the account number',
                accountNumberTooLong: 'Account number is at most 30 characters',
                accountNameRequired: 'Please enter the account holder name',
                accountNameTooLong: 'Account holder name is at most 150 characters',
            },
        },

        setDefaultConfirm: {
            title: 'Set as default account?',
            description:
                'From now on, order payment QR codes will send money to {{bank}} – {{number}}. The current default account (if any) will lose its default flag.',
            submit: 'Set as default',
        },
        disableConfirm: {
            title: 'Disable this bank account?',
            description: 'Account {{bank}} – {{number}} can no longer be used to receive payments.',
            submit: 'Disable account',
        },
        enableConfirm: {
            title: 'Enable this bank account again?',
            description: 'Account {{bank}} – {{number}} will be enabled (it is not made default automatically).',
            submit: 'Enable account',
        },
        deleteConfirm: {
            title: 'Delete this bank account?',
            description: 'Account {{bank}} – {{number}} will be deleted. This cannot be undone.',
            submit: 'Delete account',
        },
        loseDefaultWarning:
            'This is the DEFAULT account. After this action the system will have no default account — POS cannot generate payment QR codes until you set one again.',

        toast: {
            created: 'Bank account added',
            updated: 'Bank account updated',
            defaultSet: 'Default account updated',
            statusUpdated: 'Account status updated',
            deleted: 'Bank account deleted',
        },
    },
}
