import { Routes, Route } from 'react-router-dom'

import { AppLayout } from './components/app-layout'
import { AuthLayout } from './components/auth-layout'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/route-guards'
import { ERole } from './types/common'
import Dashboard from './pages/Dashboard'
import Forbidden from './pages/Forbidden'
import NotMatch from './pages/NotMatch'
import Placeholder from './pages/Placeholder'
import StaffListPage from './pages/staff/StaffListPage'
import BranchListPage from './pages/staff/BranchListPage'
import AuditLogPage from './pages/staff/AuditLogPage'
import CustomerListPage from './pages/customer/CustomerListPage'
import ProductListPage from './pages/product/ProductListPage'
import CategoryListPage from './pages/product/CategoryListPage'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

/**
 * Route của các module nghiệp vụ hiện là trang giữ chỗ — đủ để điều hướng
 * và menu của Phase 3 chạy đầy đủ. Mỗi route bọc `<RoleRoute minRole>` đúng bằng
 * `minRole` khai ở `config/menu.ts` (CONVENTIONS mục 6.4) — gõ thẳng URL không đủ
 * quyền cũng bị chặn, không chỉ ẩn khỏi menu. Các phase sau thay dần bằng màn thật.
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
                    {/* Dashboard là ADMIN+; STAFF không có 403 mà điều hướng thẳng sang /pos. */}
                    <Route element={<RoleRoute minRole={ERole.ADMIN} redirectTo="/pos" />}>
                        <Route path="" element={<Dashboard />} />
                    </Route>

                    <Route element={<RoleRoute minRole={ERole.STAFF} />}>
                        <Route
                            path="pos"
                            element={<Placeholder titleKey="menu.pos" phase={11} />}
                        />
                        <Route
                            path="orders"
                            element={<Placeholder titleKey="menu.orders" phase={12} />}
                        />
                        <Route
                            path="returns"
                            element={<Placeholder titleKey="menu.returns" phase={13} />}
                        />
                        <Route path="customers" element={<CustomerListPage />} />
                        <Route path="products" element={<ProductListPage />} />
                        <Route path="categories" element={<CategoryListPage />} />
                        <Route
                            path="inventory"
                            element={<Placeholder titleKey="menu.inventory" phase={10} />}
                        />
                    </Route>

                    <Route element={<RoleRoute minRole={ERole.ADMIN} />}>
                        <Route path="staff" element={<StaffListPage />} />
                        <Route path="branch" element={<BranchListPage />} />
                        <Route path="audit-log" element={<AuditLogPage />} />
                        <Route
                            path="promotions"
                            element={<Placeholder titleKey="menu.promotions" phase={14} />}
                        />
                    </Route>

                    <Route path="403" element={<Forbidden />} />
                    <Route path="*" element={<NotMatch />} />
                </Route>
            </Route>
        </Routes>
    )
}
