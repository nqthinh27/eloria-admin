export default {
    pageTitle: 'Online store settings',
    pageDescription: 'Settings shared by the storefront — Super Admin only',
    loadError: 'Could not load the settings.',
    branch: {
        title: 'Online selling branch',
        description:
            'The storefront shows in/out of stock based on this branch’s inventory. Not set ⇒ the storefront cannot compute stock.',
        placeholder: 'Select the online selling branch',
        cannotClear:
            'Once set, the value cannot be cleared — it can only be switched to another branch.',
        propagation: 'Changes appear on the storefront within 5–10 minutes (its data refresh cycle).',
    },
    emptyWarning: {
        title: 'No online selling branch selected',
        description:
            'The storefront will not show correct in/out-of-stock status until you pick a branch below.',
    },
    unknownBranch: {
        title: 'The configured branch does not exist',
        description:
            'The stored value matches no branch in the system. Please select a valid branch.',
    },
    inactiveBranch: {
        title: 'The online selling branch is inactive',
        description: 'Pick an active branch so the stock shown on the storefront can be trusted.',
    },
    confirm: {
        title: 'Change the online selling branch?',
        description:
            'Stock shown on the storefront will be computed from the new branch: {{name}}. Products may switch between in stock and out of stock.',
    },
    toast: {
        saved: 'Online selling branch updated',
    },
}
