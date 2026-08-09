/**
 * Map `subKey` do backend trả về (dạng `a.b.c`) → thông báo hiển thị cho người dùng.
 *
 * Danh sách key trích trực tiếp từ source backend, không tự bịa.
 * Key không có ở đây ⇒ api-client tự fallback sang trường `message` của backend
 * (xem CONVENTIONS mục 3.2), nên thiếu key không làm vỡ màn hình.
 *
 * Thêm key mới phải thêm ở CẢ `vi` và `en`.
 */
export default {
    error: {
        // Xác thực / phiên đăng nhập
        authenticate: 'Xác thực thất bại. Vui lòng đăng nhập lại.',
        login: {
            fail: 'Tài khoản hoặc mật khẩu không đúng.',
        },
        password: {
            incorrect: 'Mật khẩu không đúng.',
        },
        token: {
            invalid: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
            forbidden: 'Tài khoản không có quyền thực hiện thao tác này.',
        },
        forbidden: 'Bạn không có quyền truy cập chức năng này.',
        activateCode: {
            invalid: 'Mã kích hoạt không hợp lệ hoặc đã hết hạn.',
        },

        // Tài khoản người dùng
        user: {
            notExisted: 'Tài khoản không tồn tại.',
            notAvailable: 'Tài khoản không khả dụng.',
            inactive: 'Tài khoản chưa được kích hoạt.',
            locked: 'Tài khoản đã bị khoá.',
            cannotModifySelf: 'Không thể thao tác trên chính tài khoản của bạn.',
            emptyTiktokId: 'Chưa có thông tin TikTok.',
            emptyYoutubeId: 'Chưa có thông tin YouTube.',
        },
        username: {
            existed: 'Tên đăng nhập đã tồn tại.',
            invalid: 'Tên đăng nhập không hợp lệ.',
        },
        email: {
            existed: 'Email đã được sử dụng.',
            notExisted: 'Email không tồn tại trong hệ thống.',
        },
        phone: {
            existed: 'Số điện thoại đã được sử dụng.',
        },
        role: {
            notAllowed: 'Bạn không được phép gán vai trò này.',
        },
        staff: {
            referenced: 'Nhân viên đang được tham chiếu, không thể xoá.',
        },

        // Chi nhánh
        branch: {
            notExisted: 'Chi nhánh không tồn tại.',
            nameExisted: 'Tên chi nhánh đã tồn tại.',
            required: 'Vui lòng chọn chi nhánh.',
            inactive: 'Chi nhánh đang ngừng hoạt động.',
            hasStaff: 'Chi nhánh vẫn còn nhân viên, không thể xoá.',
            hasActiveStaff: 'Chi nhánh vẫn còn nhân viên đang hoạt động, không thể ngừng hoạt động.',
        },

        // Domain sản phẩm (Phase 9) — key trích từ source backend, không tự bịa.
        category: {
            notExisted: 'Danh mục không tồn tại.',
            codeExisted: 'Mã danh mục đã tồn tại.',
            hasChildren: 'Danh mục vẫn còn danh mục con, không thể xoá.',
            parentInvalid: 'Danh mục cha không hợp lệ (không được chọn chính nó hoặc danh mục con của nó).',
        },
        brand: {
            notExisted: 'Thương hiệu không tồn tại.',
            codeExisted: 'Mã thương hiệu đã tồn tại.',
            hasProducts: 'Thương hiệu vẫn còn sản phẩm tham chiếu, không thể xoá.',
        },
        color: {
            notExisted: 'Màu không tồn tại.',
            codeExisted: 'Mã màu đã tồn tại.',
        },
        size: {
            notExisted: 'Size không tồn tại.',
            codeExisted: 'Mã size đã tồn tại.',
        },
        product: {
            notExisted: 'Sản phẩm không tồn tại.',
            codeExisted: 'Mã sản phẩm đã tồn tại.',
        },
        sku: {
            notExisted: 'SKU không tồn tại.',
        },

        // Địa chỉ hành chính
        address: {
            provinceInvalid: 'Tỉnh/Thành không hợp lệ.',
            wardInvalid: 'Phường/Xã không hợp lệ.',
        },

        // Ảnh
        image: {
            notAvailable: 'Không tải được ảnh.',
        },

        // Dữ liệu đầu vào / hệ thống
        input: {
            invalid: 'Dữ liệu nhập vào không hợp lệ.',
        },
        validation: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường đã nhập.',
        dataIntegrity: {
            violation: 'Dữ liệu đang được sử dụng ở nơi khác, không thể thực hiện thao tác.',
        },
        concurrencyFailure: 'Dữ liệu vừa được người khác thay đổi. Vui lòng tải lại và thử lại.',
        other: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    },
}
