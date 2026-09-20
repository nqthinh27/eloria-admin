import { Routes, Route } from 'react-router-dom'

import { AppLayout } from './components/app-layout'
import { AuthLayout } from './components/auth-layout'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/route-guards'
import { ERole } from './types/common'
import Dashboard from './pages/Dashboard'
import Forbidden from './pages/Forbidden'
import NotMatch from './pages/NotMatch'
import StaffListPage from './pages/staff/StaffListPage'
import BranchListPage from './pages/staff/BranchListPage'
import AuditLogPage from './pages/staff/AuditLogPage'
import CustomerListPage from './pages/customer/CustomerListPage'
import ProductListPage from './pages/product/ProductListPage'
import CategoryListPage from './pages/product/CategoryListPage'
import InventoryPage from './pages/inventory/InventoryPage'
import PosPage from './pages/pos/PosPage'
import ShiftListPage from './pages/shift/ShiftListPage'
import OrderListPage from './pages/orders/OrderListPage'
import PromotionListPage from './pages/promotion/PromotionListPage'
import ReturnListPage from './pages/returns/ReturnListPage'
import BankAccountPage from './pages/bank-account/BankAccountPage'
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
                        <Route path="pos" element={<PosPage />} />
                        {/*
                          `[STAFF]` — backend cho STAFF tra **ca của chính mình** (data-scope tự
                          lọc); các nút duyệt/từ chối/chốt hộ mới gate `[ADMIN]` bên trong màn.
                        */}
                        <Route path="shifts" element={<ShiftListPage />} />
                        <Route path="orders" element={<OrderListPage />} />
                        {/*
                          `[STAFF]` — backend cho STAFF xem **mọi phiếu của chi nhánh mình**
                          (khác Ca làm việc); duyệt/từ chối/quyết toán/nhận kho gate `[ADMIN]`
                          bên trong màn.
                        */}
                        <Route path="returns" element={<ReturnListPage />} />
                        <Route path="customers" element={<CustomerListPage />} />
                        <Route path="products" element={<ProductListPage />} />
                        <Route path="categories" element={<CategoryListPage />} />
                        <Route path="inventory" element={<InventoryPage />} />
                    </Route>

                    <Route element={<RoleRoute minRole={ERole.ADMIN} />}>
                        <Route path="staff" element={<StaffListPage />} />
                        <Route path="branch" element={<BranchListPage />} />
                        <Route path="audit-log" element={<AuditLogPage />} />
                        <Route path="promotions" element={<PromotionListPage />} />
                    </Route>

                    {/* `[SUPER_ADMIN]` — mọi API ghi của /bank-account/*; ADMIN/STAFF gõ URL ⇒ 403. */}
                    <Route element={<RoleRoute minRole={ERole.SUPER_ADMIN} />}>
                        <Route path="bank-accounts" element={<BankAccountPage />} />
                    </Route>

                    <Route path="403" element={<Forbidden />} />
                    <Route path="*" element={<NotMatch />} />
                </Route>
            </Route>
        </Routes>
    )
}
