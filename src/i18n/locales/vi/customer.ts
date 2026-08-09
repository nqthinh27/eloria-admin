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
            branch: 'Chi nhánh',
            branchPlaceholder: 'Chọn chi nhánh',
            submitCreate: 'Thêm khách hàng',
            submitUpdate: 'Lưu thay đổi',
            submitting: 'Đang lưu…',
            phoneLockedHint: 'Số điện thoại và chi nhánh không sửa được sau khi tạo',
            validation: {
                fullNameRequired: 'Vui lòng nhập họ và tên',
                fullNameMaxLength: 'Họ và tên tối đa 100 ký tự',
                phoneInvalid: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0',
                emailInvalid: 'Email không hợp lệ',
                branchRequired: 'Vui lòng chọn chi nhánh',
            },
        },

        detail: {
            title: 'Chi tiết khách hàng',
            genderMale: 'Nam',
            genderFemale: 'Nữ',
            genderOther: 'Khác',
            notUpdated: 'Chưa cập nhật',
        },

        /** Cảnh báo trùng hồ sơ theo SĐT — `GET /customer/duplicates` (`[ADMIN]`). */
        duplicate: {
            checking: 'Đang kiểm tra trùng số điện thoại…',
            foundTitle: 'Số điện thoại đã có hồ sơ',
            foundDescription: 'Đã tồn tại khách hàng "{{name}}" ({{branch}}) dùng số điện thoại này.',
            notViewableTitle: 'Số điện thoại đã được sử dụng',
            notViewableDescription:
                'Số điện thoại này đã có hồ sơ ở chi nhánh khác. Liên hệ quản trị viên để tra cứu hoặc gộp hồ sơ.',
            viewButton: 'Xem hồ sơ đã có',
        },

        toast: {
            created: 'Thêm khách hàng thành công',
            updated: 'Cập nhật khách hàng thành công',
            exportComingSoon: 'Chức năng xuất dữ liệu sẽ có khi backend hỗ trợ',
        },
    },
}
