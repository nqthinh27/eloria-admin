export default {
    pageTitle: 'Online store settings',
    pageDescription: 'Loyalty point rules shared across the chain — Super Admin only',
    loadError: 'Could not load the settings.',
    loyalty: {
        title: 'Loyalty points',
        description: 'Earning and redemption rules for the whole chain (POS, storefront).',
        earn: { label: 'Goods amount per 1 point', hint: 'Positive integer, default 50,000đ.' },
        redeem: { label: 'Discount value of 1 point', hint: 'Positive integer, default 1,000đ.' },
        maxPercent: {
            label: 'Max % of goods amount payable with points',
            hint: 'Integer 0–100, default 50. Applied to the amount after promotions; 0 = points cannot be used.',
        },
        errorPositive: 'Enter an integer greater than 0.',
        errorPercent: 'Enter an integer from 0 to 100.',
        example: '{{amount}} of goods earns +{{points}} points; {{points}} points = {{value}} discount.',
        note: 'Rule changes only apply to orders placed after saving — points already earned and past orders are not recalculated.',
    },
    toast: {
        loyaltySaved: 'Loyalty rules updated',
    },
}
