import { BrowserRouter, HashRouter } from 'react-router-dom'

// Khởi tạo i18n trước khi bất kỳ component nào render — api-client dịch message lỗi qua đây.
import '@/i18n'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthProvider'
import Router from './Router'

const AppRouter = import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? HashRouter : BrowserRouter

export default function App() {
    return (
        <AppRouter>
            <AuthProvider>
                <Router />
            </AuthProvider>
            <Toaster position="top-right" richColors closeButton />
        </AppRouter>
    )
}
