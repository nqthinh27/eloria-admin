export default {
    auth: {
        brand: {
            headline1: 'Nền tảng quản trị',
            headline2: 'chuỗi thời trang',
            tagline:
                'Quản lý toàn bộ vận hành — từ bán hàng tại quầy đến kho, giá và khuyến mại — trong một giao diện thống nhất.',
            feature1: 'Quản lý bán hàng đa kênh',
            feature2: 'Kiểm soát kho hàng thời gian thực',
            feature3: 'CRM & phân hạng khách hàng',
            feature4: 'Báo cáo tổng hợp toàn chuỗi',
            copyright: 'ELORIA · Hệ thống quản trị nội bộ',
        },
        login: {
            title: 'Đăng nhập',
            subtitle: 'Cổng quản trị hệ thống nội bộ',
            username: 'Tên đăng nhập',
            usernamePlaceholder: 'Nhập tên đăng nhập',
            password: 'Mật khẩu',
            passwordPlaceholder: 'Nhập mật khẩu',
            forgotPassword: 'Quên mật khẩu?',
            submit: 'Đăng nhập',
            submitting: 'Đang đăng nhập…',
            notice: 'Phiên làm việc được mã hoá và ghi nhận vào nhật ký hệ thống',
        },
        forgot: {
            title: 'Quên mật khẩu',
            subtitle: 'Nhập email của tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.',
            email: 'Email',
            emailPlaceholder: 'Nhập email',
            submit: 'Gửi link đặt lại',
            submitting: 'Đang gửi…',
            backToLogin: 'Quay lại đăng nhập',
            sentTitle: 'Đã gửi yêu cầu',
            // Trung tính: backend luôn trả thành công dù email có tồn tại hay không.
            sentMessage:
                'Nếu email này thuộc về một tài khoản hợp lệ, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.',
        },
        reset: {
            title: 'Đặt lại mật khẩu',
            subtitle: 'Nhập mật khẩu mới cho tài khoản của bạn.',
            newPassword: 'Mật khẩu mới',
            newPasswordPlaceholder: 'Nhập mật khẩu mới',
            confirmPassword: 'Xác nhận mật khẩu',
            confirmPasswordPlaceholder: 'Nhập lại mật khẩu mới',
            submit: 'Đặt lại mật khẩu',
            submitting: 'Đang xử lý…',
            successTitle: 'Đổi mật khẩu thành công',
            successMessage: 'Bạn có thể đăng nhập bằng mật khẩu mới.',
            goToLogin: 'Đến trang đăng nhập',
            missingToken: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.',
        },
        validation: {
            usernameRequired: 'Vui lòng nhập tên đăng nhập',
            passwordRequired: 'Vui lòng nhập mật khẩu',
            emailRequired: 'Vui lòng nhập email',
            emailInvalid: 'Email không đúng định dạng',
            passwordRule:
                'Mật khẩu tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và ký tự đặc biệt',
            passwordMismatch: 'Mật khẩu xác nhận không khớp',
        },
        error: {
            notAdminAccount: 'Tài khoản này không có quyền truy cập trang quản trị.',
        },
        logout: 'Đăng xuất',
        loading: 'Đang tải phiên làm việc…',
    },
}
