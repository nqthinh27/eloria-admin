import { use } from 'react'

import { CartContext, type CartContextValue } from '@/contexts/cart-context'

export function useCart(): CartContextValue {
    const context = use(CartContext)
    if (context === null) {
        throw new Error('useCart phải được dùng bên trong <CartProvider>')
    }
    return context
}
