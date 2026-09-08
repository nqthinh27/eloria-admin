export default {
    promotion: {
        pageTitle: 'Khuyến mại & Promotion',
        pageDescription: 'Quản lý chương trình khuyến mại, mã giảm giá',


        /* ---------------- Vòng đời chương trình ---------------- */
        status: {
            DRAFT: 'Nháp',
            SCHEDULED: 'Sắp chạy',
            RUNNING: 'Đang chạy',
            PAUSED: 'Tạm dừng',
            ENDED: 'Kết thúc',
        },

        /* ---------------- Loại & phạm vi ---------------- */
        type: {
            label: 'Loại',
            PERCENT: 'Giảm %',
            FIXED: 'Giảm tiền',
        },
        target: {
            label: 'Phạm vi áp dụng',
            ALL: 'Toàn bộ sản phẩm',
            PRODUCT: 'Sản phẩm',
            CATEGORY: 'Danh mục',
            BRAND: 'Thương hiệu',
            SKU: 'SKU',
        },
        channel: {
            label: 'Kênh',
            ONLINE: 'Online',
            POS: 'Tại quầy',
            OTHER: 'Khác',
        },
        /** Phân loại suy ra từ `code` + `customerId` — xem `types/promotion.ts`. */
        kind: {
            label: 'Hình thức',
            auto: 'Tự động',
            coupon: 'Mã công khai',
            personal: 'Mã cá nhân',
        },

        /* ---------------- Bảng danh sách ---------------- */
        list: {
            searchPlaceholder: 'Tìm tên chương trình, mã KM...',
            allStatuses: 'Tất cả trạng thái',
            allChannels: 'Tất cả kênh',
            resultLabel: 'chương trình',
            empty: 'Chưa có chương trình khuyến mại nào',
            addButton: 'Tạo khuyến mại',
            generateCoupon: 'Sinh mã hàng loạt',
            exportCoupon: 'Xuất mã (CSV)',
            column: {
                code: 'Mã KM',
                name: 'Tên chương trình',
                type: 'Loại',
                value: 'Giảm giá',
                channel: 'Kênh',
                period: 'Thời gian',
                usage: 'Đã dùng',
                status: 'Trạng thái',
                actions: 'Thao tác',
            },
            /** KM tự động không có mã — hiện nhãn thay vì ô trống. */
            noCode: 'Tự động',
            noPeriod: 'Không giới hạn',
            /** `usageCount / usageLimit`; không có trần thì chỉ hiện số đã dùng. */
            usageUnlimited: '{{used}}',
            usageLimited: '{{used}} / {{limit}}',
            actionView: 'Chi tiết',
            actionEdit: 'Sửa',
            actionChangeStatus: 'Chuyển trạng thái',
            branchAll: 'Toàn chuỗi',
        },

        detail: {
            createdDate: 'Ngày tạo',
            lastModifiedDate: 'Cập nhật lần cuối',
        },

        /* ---------------- Form tạo/sửa ---------------- */
        form: {
            createTitle: 'Tạo khuyến mại',
            createDescription: 'Chương trình được tạo ở trạng thái Nháp, cần kích hoạt để bắt đầu áp dụng.',
            editTitle: 'Sửa khuyến mại',
            editDescription: 'Cập nhật thông tin chương trình khuyến mại.',
            name: 'Tên chương trình',
            namePlaceholder: 'VD: Flash Sale cuối tuần',
            code: 'Mã khuyến mại',
            codePlaceholder: 'Để trống nếu là KM tự động',
            codeHint: 'Để trống ⇒ khuyến mại tự động áp dụng. Điền mã ⇒ khách phải nhập mã khi thanh toán.',
            type: 'Loại giảm giá',
            value: 'Mức giảm',
            valuePercentPlaceholder: 'VD: 10 (giảm 10%)',
            valueFixedPlaceholder: 'VD: 50.000',
            target: 'Phạm vi áp dụng',
            targetId: 'Đối tượng áp dụng',
            targetIdPlaceholder: 'Chọn đối tượng',
            channel: 'Kênh áp dụng',
            branch: 'Chi nhánh',
            branchAll: 'Toàn chuỗi',
            minAmount: 'Giá trị đơn tối thiểu (đ)',
            minAmountPlaceholder: 'Để trống nếu không yêu cầu',
            maxDiscount: 'Giảm tối đa (đ)',
            maxDiscountPlaceholder: 'Để trống nếu không giới hạn',
            maxDiscountHint: 'Chỉ áp dụng cho giảm theo %.',
            usageLimit: 'Tổng lượt dùng',
            usageLimitPlaceholder: 'Để trống nếu không giới hạn',
            perCustomerLimit: 'Lượt dùng / khách',
            perCustomerLimitPlaceholder: 'Để trống nếu không giới hạn',
            startDate: 'Bắt đầu',
            endDate: 'Kết thúc',
            dateHint: 'Để trống ⇒ áp dụng ngay và không có hạn kết thúc.',
            sectionBasic: 'Thông tin chương trình',
            sectionScope: 'Phạm vi áp dụng',
            sectionLimit: 'Giới hạn & thời gian',
            submitCreate: 'Tạo chương trình',
            submitEdit: 'Lưu thay đổi',
            cancel: 'Huỷ',
        },

        /* ---------------- Sinh mã hàng loạt ---------------- */
        coupon: {
            title: 'Sinh mã giảm giá hàng loạt',
            description: 'Mỗi mã là một chương trình riêng và có hiệu lực ngay sau khi sinh.',
            count: 'Số lượng mã',
            countHint: 'Tối đa 5.000 mã mỗi lần.',
            codePrefix: 'Tiền tố mã',
            codePrefixPlaceholder: 'VD: TET2026',
            codePrefixHint: 'Hệ thống nối thêm 8 ký tự ngẫu nhiên phía sau tiền tố.',
            usageLimitPerCode: 'Lượt dùng mỗi mã',
            usageLimitPerCodeHint: 'Để trống nếu mỗi mã dùng được không giới hạn lần.',
            submit: 'Sinh mã',
            resultTitle: 'Đã sinh {{count}} mã',
            resultDescription: 'Danh sách mã vừa tạo. Dùng nút "Xuất mã (CSV)" ở màn danh sách để tải toàn bộ.',
            copyAll: 'Sao chép tất cả',
            copied: 'Đã sao chép danh sách mã',
            close: 'Đóng',
        },

        /* ---------------- Chuyển trạng thái ---------------- */
        statusDialog: {
            title: 'Chuyển trạng thái chương trình',
            description: 'Chương trình "{{name}}" đang ở trạng thái {{current}}. Chọn trạng thái mới:',
            /** `ENDED` là trạng thái cuối — cảnh báo trước khi bấm. */
            endedWarning: 'Kết thúc chương trình là thao tác không thể hoàn tác.',
            noTransition: 'Chương trình đã kết thúc, không thể chuyển sang trạng thái khác.',
            submit: 'Xác nhận',
            cancel: 'Huỷ',
        },

        /* ---------------- Toast ---------------- */
        toast: {
            created: 'Tạo khuyến mại thành công',
            updated: 'Cập nhật khuyến mại thành công',
            statusUpdated: 'Cập nhật trạng thái khuyến mại thành công',
            couponGenerated: 'Sinh mã giảm giá thành công',
            exported: 'Xuất danh sách mã thành công',
            exportEmpty: 'Không có mã giảm giá nào để xuất',
        },

        /* ---------------- Validate phía FE (khớp ràng buộc backend) ---------------- */
        validation: {
            nameRequired: 'Vui lòng nhập tên chương trình',
            valueRequired: 'Vui lòng nhập mức giảm',
            valuePercentRange: 'Giảm theo % phải trong khoảng 0–100',
            valueFixedMin: 'Số tiền giảm phải lớn hơn 0',
            targetIdRequired: 'Vui lòng chọn đối tượng áp dụng',
            dateOrder: 'Ngày kết thúc phải sau ngày bắt đầu',
            countRange: 'Số lượng mã phải từ 1 đến 5.000',
            positiveNumber: 'Giá trị phải lớn hơn hoặc bằng 0',
        },
    },
}
