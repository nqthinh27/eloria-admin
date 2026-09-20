export default {
    bankAccount: {
        pageTitle: 'Tài khoản ngân hàng',
        pageDescription: 'Tài khoản nhận tiền chuyển khoản — dùng để sinh mã VietQR khi thu tiền đơn hàng',

        /** Banner đầu trang khi không có tài khoản nào mang cờ mặc định (backend không chặn). */
        noDefaultBanner: {
            title: 'Chưa có tài khoản mặc định',
            description:
                'POS và màn Đơn hàng không tạo được mã QR thu tiền cho tới khi bạn đặt một tài khoản đang bật làm mặc định.',
        },

        list: {
            addButton: 'Thêm tài khoản',
            searchPlaceholder: 'Tìm theo ngân hàng, số tài khoản, chủ tài khoản…',
            allStatuses: 'Tất cả trạng thái',
            resultLabel: 'tài khoản',
            empty: 'Chưa có tài khoản ngân hàng nào',
            statusActive: 'Hoạt động',
            statusInactive: 'Đã tắt',
            defaultBadge: 'Mặc định',
            noneDefault: '—',
            column: {
                bank: 'Ngân hàng',
                bin: 'Mã BIN',
                accountNumber: 'Số tài khoản',
                accountName: 'Chủ tài khoản',
                isDefault: 'Mặc định',
                status: 'Trạng thái',
                createdDate: 'Ngày tạo',
                actions: 'Thao tác',
            },
            actionEdit: 'Sửa',
            actionSetDefault: 'Đặt làm mặc định',
            actionDisable: 'Tắt tài khoản',
            actionEnable: 'Bật tài khoản',
            actionDelete: 'Xoá',
        },

        form: {
            addTitle: 'Thêm tài khoản ngân hàng',
            editTitle: 'Sửa tài khoản ngân hàng',
            bankBin: 'Mã BIN ngân hàng (Napas)',
            bankBinPlaceholder: 'VD: 970436',
            bankBinHint: '6 chữ số theo chuẩn Napas, VD Vietcombank = 970436',
            bankName: 'Tên ngân hàng',
            bankNamePlaceholder: 'VD: Vietcombank',
            accountNumber: 'Số tài khoản',
            accountNumberPlaceholder: 'Nhập số tài khoản nhận tiền',
            accountName: 'Tên chủ tài khoản',
            accountNamePlaceholder: 'VD: CONG TY ELORIA',
            accountNameHint: 'Hệ thống tự chuyển thành chữ HOA không dấu',
            isDefault: 'Đặt làm tài khoản mặc định (dùng để sinh QR)',
            submitCreate: 'Thêm tài khoản',
            submitUpdate: 'Lưu thay đổi',
            submitting: 'Đang xử lý…',
            validation: {
                bankBinInvalid: 'Mã BIN phải gồm đúng 6 chữ số',
                bankNameRequired: 'Vui lòng nhập tên ngân hàng',
                bankNameTooLong: 'Tên ngân hàng tối đa 100 ký tự',
                accountNumberRequired: 'Vui lòng nhập số tài khoản',
                accountNumberTooLong: 'Số tài khoản tối đa 30 ký tự',
                accountNameRequired: 'Vui lòng nhập tên chủ tài khoản',
                accountNameTooLong: 'Tên chủ tài khoản tối đa 150 ký tự',
            },
        },

        setDefaultConfirm: {
            title: 'Đặt làm tài khoản mặc định?',
            description:
                'Mã QR thu tiền của các đơn hàng từ giờ sẽ chuyển tiền về tài khoản {{bank}} – {{number}}. Tài khoản mặc định hiện tại (nếu có) sẽ bị bỏ cờ mặc định.',
            submit: 'Đặt mặc định',
        },
        disableConfirm: {
            title: 'Tắt tài khoản ngân hàng?',
            description: 'Tài khoản {{bank}} – {{number}} sẽ không dùng được để nhận tiền.',
            submit: 'Tắt tài khoản',
        },
        enableConfirm: {
            title: 'Bật lại tài khoản ngân hàng?',
            description: 'Tài khoản {{bank}} – {{number}} sẽ được bật lại (chưa tự đặt làm mặc định).',
            submit: 'Bật tài khoản',
        },
        deleteConfirm: {
            title: 'Xoá tài khoản ngân hàng?',
            description: 'Tài khoản {{bank}} – {{number}} sẽ bị xoá. Thao tác này không hoàn tác được.',
            submit: 'Xoá tài khoản',
        },
        /** Cảnh báo thêm khi thao tác làm hệ thống mất tài khoản mặc định. */
        loseDefaultWarning:
            'Đây là tài khoản MẶC ĐỊNH. Sau thao tác này hệ thống sẽ không còn tài khoản mặc định — POS không tạo được QR thu tiền cho tới khi bạn đặt lại.',

        toast: {
            created: 'Thêm tài khoản ngân hàng thành công',
            updated: 'Cập nhật tài khoản ngân hàng thành công',
            defaultSet: 'Đã đặt làm tài khoản mặc định',
            statusUpdated: 'Cập nhật trạng thái tài khoản thành công',
            deleted: 'Xoá tài khoản ngân hàng thành công',
        },
    },
}
