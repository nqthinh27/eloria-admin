export default {
    customer: {
        pageTitle: 'Quản lý khách hàng',
        pageDescription: 'CRM – tổng hợp khách hàng online và tại quầy',

        list: {
            searchPlaceholder: 'Tìm tên, số điện thoại…',
            allBranches: 'Tất cả chi nhánh',
            allStatuses: 'Tất cả trạng thái',
            resultLabel: 'khách hàng',
            addButton: 'Thêm khách hàng',
            column: {
                customer: 'KHÁCH HÀNG',
                contact: 'LIÊN HỆ',
                branch: 'CHI NHÁNH',
                membershipPoint: 'ĐIỂM TÍCH LUỸ',
                status: 'TRẠNG THÁI',
                createdDate: 'NGÀY TẠO',
                actions: 'THAO TÁC',
            },
            noBranch: 'Chưa gán chi nhánh',
            noEmail: 'Chưa có email',
            statusActive: 'Hoạt động',
            statusInactive: 'Ngừng hoạt động',
            actionEdit: 'Sửa hồ sơ',
            empty: 'Chưa có khách hàng nào',
        },

        form: {
            addTitle: 'Thêm khách hàng',
            editTitle: 'Sửa hồ sơ khách hàng',
            fullName: 'Họ và tên',
            fullNamePlaceholder: 'Nhập họ và tên',
            phoneNumber: 'Số điện thoại',
            phoneNumberPlaceholder: 'Nhập số điện thoại',
            email: 'Email',
            emailPlaceholder: 'Bỏ trống để hệ thống tự sinh',
            dob: 'Ngày sinh',
            gender: 'Giới tính',
            genderPlaceholder: 'Chọn giới tính',
            branch: 'Chi nhánh đăng ký',
            branchPlaceholder: 'Chọn chi nhánh (không bắt buộc)',
            /** Phase 3b: khách dùng chung toàn chuỗi, chi nhánh chỉ để đánh dấu nơi tạo. */
            branchHint:
                'Chỉ để đánh dấu khách được tạo ở chi nhánh nào. Khách dùng chung toàn hệ thống, mọi chi nhánh đều tra cứu và bán được.',
            submitCreate: 'Thêm khách hàng',
            submitUpdate: 'Lưu thay đổi',
            submitting: 'Đang lưu…',
            phoneLockedHint: 'Số điện thoại và chi nhánh không sửa được sau khi tạo',
            validation: {
                fullNameRequired: 'Vui lòng nhập họ và tên',
                fullNameMaxLength: 'Họ và tên tối đa 100 ký tự',
                phoneInvalid: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0',
                emailInvalid: 'Email không hợp lệ',
            },
        },

        detail: {
            title: 'Chi tiết khách hàng',
            genderMale: 'Nam',
            genderFemale: 'Nữ',
            genderOther: 'Khác',
            notUpdated: 'Chưa cập nhật',
        },

        /**
         * Cảnh báo trùng hồ sơ theo SĐT — `GET /customer/duplicates` (`[ADMIN]`).
         *
         * ⚠️ Phase 3b: đã **bỏ** `notViewableTitle`/`notViewableDescription` — khách là toàn cục
         * nên trùng SĐT thì luôn xem được hồ sơ, không còn ca "hồ sơ ở chi nhánh khác".
         * `{{branch}}` trong `foundDescription` nay là **chi nhánh đăng ký**.
         */
        duplicate: {
            checking: 'Đang kiểm tra trùng số điện thoại…',
            foundTitle: 'Số điện thoại đã có hồ sơ',
            foundDescription: 'Đã tồn tại khách hàng "{{name}}" ({{branch}}) dùng số điện thoại này.',
        },

        toast: {
            created: 'Thêm khách hàng thành công',
            updated: 'Cập nhật khách hàng thành công',
            exportComingSoon: 'Chức năng xuất dữ liệu sẽ có khi backend hỗ trợ',
        },
    },
}
