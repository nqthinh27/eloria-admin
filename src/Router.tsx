import { Routes, Route } from 'react-router-dom'

import { AppLayout } from './components/app-layout'
import { AuthLayout } from './components/auth-layout'
import { ProtectedRoute, PublicOnlyRoute } from './components/route-guards'
import Dashboard from './pages/Dashboard'
import Forbidden from './pages/Forbidden'
import NotMatch from './pages/NotMatch'
import Placeholder from './pages/Placeholder'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

/**
 * Route của các module nghiệp vụ hiện là trang giữ chỗ — đủ để điều hướng
 * và menu của Phase 3 chạy đầy đủ. Phase 4 bọc guard theo `minRole`,
 * các phase sau thay dần bằng màn thật.
 */
export default function Router() {
    return (
        <Routes>
            {/* Nhóm màn xác thực — đã đăng nhập thì bị đẩy về trang chủ */}
            <Route element={<PublicOnlyRoute />}>
                <Route element={<AuthLayout />}>
                    <Route path="login" element={<Login />} />
                    <Route path="forgot-password" element={<ForgotPassword />} />
                    <Route path="reset-password" element={<ResetPassword />} />
                </Route>
            </Route>

            {/* Nhóm màn cần đăng nhập */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="" element={<Dashboard />} />

                    <Route path="pos" element={<Placeholder titleKey="menu.pos" phase={11} />} />
                    <Route
                        path="orders"
                        element={<Placeholder titleKey="menu.orders" phase={12} />}
                    />
                    <Route
                        path="returns"
                        element={<Placeholder titleKey="menu.returns" phase={13} />}
                    />
                    <Route
                        path="staff"
                        element={<Placeholder titleKey="menu.staff" phase={7} />}
                    />
                    <Route
                        path="customers"
                        element={<Placeholder titleKey="menu.customers" phase={8} />}
                    />
                    <Route
                        path="products"
                        element={<Placeholder titleKey="menu.products" phase={9} />}
                    />
                    <Route
                        path="categories"
                        element={<Placeholder titleKey="menu.categories" phase={9} />}
                    />
                    <Route
                        path="inventory"
                        element={<Placeholder titleKey="menu.inventory" phase={10} />}
                    />
                    <Route
                        path="promotions"
                        element={<Placeholder titleKey="menu.promotions" phase={14} />}
                    />

                    <Route path="403" element={<Forbidden />} />
                    <Route path="*" element={<NotMatch />} />
                </Route>
            </Route>
        </Routes>
    )
}
