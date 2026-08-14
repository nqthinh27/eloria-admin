export default {
    inventory: {
        pageTitle: 'Kho hàng & Tồn kho',
        pageDescription: 'Quản lý nhập/xuất kho, kiểm kê, điều chỉnh tồn',

        tab: {
            stock: 'Tồn kho',
            ledger: 'Phiếu kho',
            count: 'Kiểm kê',
        },

        action: {
            createLedger: 'Tạo phiếu kho',
        },

        /* ---------------- Tab Tồn kho ---------------- */
        stock: {
            searchPlaceholder: 'Tìm SKU, tên sản phẩm…',
            allBranches: 'Tất cả chi nhánh',
            resultLabel: 'SKU',
            empty: 'Chưa có dữ liệu tồn kho',
            emptyHint: 'Tồn kho chỉ xuất hiện sau khi có phiếu nhập được duyệt.',
            lowStockOnly: 'Chỉ hiện tồn thấp',
            column: {
                sku: 'SKU',
                product: 'SẢN PHẨM',
                size: 'SIZE',
                color: 'MÀU',
                total: 'TỒN THỰC',
                // `reserved` (ĐANG GIỮ) đã gỡ 2026-08-14 — backend bỏ cơ chế giữ chỗ.
                available: 'KHẢ DỤNG',
                minStock: 'TỒN TỐI THIỂU',
                branch: 'CHI NHÁNH',
                status: 'TRẠNG THÁI',
            },
            status: {
                normal: 'Bình thường',
                low: 'Cảnh báo',
                outOfStock: 'Hết hàng',
            },
            alert: {
                outOfStock: '{{count}} SKU — Hết hàng',
                outOfStockHint: 'cần bổ sung gấp',
                lowStock: '{{count}} SKU — Tồn dưới mức tối thiểu',
                lowStockHint: 'cần bổ sung sớm',
            },
            /** Ghi chú cột không có nguồn dữ liệu — xem báo cáo Phase 10. */
            minStockUnset: 'Chưa đặt',
        },

        /* ---------------- Tab Phiếu kho ---------------- */
        ledger: {
            searchPlaceholder: 'Tìm mã phiếu, tên phiếu…',
            allTypes: 'Tất cả loại phiếu',
            allStatuses: 'Tất cả trạng thái',
            resultLabel: 'phiếu',
            empty: 'Chưa có phiếu kho nào',
            emptyHint: 'Tạo phiếu nhập để bắt đầu ghi nhận tồn kho.',
            column: {
                code: 'MÃ PHIẾU',
                name: 'TÊN PHIẾU',
                type: 'LOẠI',
                branch: 'CHI NHÁNH',
                status: 'TRẠNG THÁI',
                createdBy: 'NGƯỜI TẠO',
                createdDate: 'NGÀY TẠO',
                actions: 'THAO TÁC',
            },
            type: {
                IN: 'Nhập kho',
                OUT: 'Xuất kho',
                TRANSFER: 'Chuyển kho',
            },
            status: {
                DRAFT: 'Nháp',
                WAITING_APPROVAL: 'Chờ duyệt',
                ACCEPTED: 'Đã duyệt',
                REJECTED: 'Từ chối',
            },
            action: {
                view: 'Xem chi tiết',
                submit: 'Gửi duyệt',
                approve: 'Duyệt phiếu',
                reject: 'Từ chối',
            },
            /** Lý do khoá nút duyệt — backend chặn tự duyệt phiếu mình tạo. */
            cannotApproveOwnHint: 'Không thể tự duyệt phiếu do chính mình tạo',
        },

        /* ---------------- Dialog chi tiết phiếu ---------------- */
        detail: {
            title: 'Chi tiết phiếu kho {{code}}',
            type: 'Loại phiếu',
            status: 'Trạng thái',
            branch: 'Chi nhánh',
            toBranch: 'Chi nhánh đích',
            receiveFrom: 'Nguồn nhập',
            sendTo: 'Nơi xuất / Lý do',
            createdBy: 'Người tạo',
            createdDate: 'Thời gian tạo',
            description: 'Ghi chú',
            noDescription: 'Không có ghi chú',
            lines: 'Danh sách hàng',
            totalQuantity: 'Tổng số lượng',
            lineColumn: {
                sku: 'SKU',
                product: 'Sản phẩm',
                variant: 'Màu / Size',
                quantity: 'Số lượng',
            },
        },

        /* ---------------- Dialog tạo phiếu ---------------- */
        form: {
            title: 'Tạo phiếu kho',
            type: 'Loại phiếu',
            typeHint: 'Nhập kho cộng tồn, Xuất kho trừ tồn, Chuyển kho trừ nguồn và cộng đích.',
            name: 'Tên phiếu',
            namePlaceholder: 'Bỏ trống để hệ thống tự sinh',
            branch: 'Chi nhánh',
            branchPlaceholder: 'Chọn chi nhánh',
            toBranch: 'Chi nhánh đích',
            toBranchPlaceholder: 'Chọn chi nhánh nhận hàng',
            receiveFrom: 'Nguồn nhập / Nhà cung cấp',
            receiveFromPlaceholder: 'VD: NCC Việt Tiến',
            sendTo: 'Nơi xuất / Lý do',
            sendToPlaceholder: 'VD: Xuất trả nhà cung cấp',
            description: 'Ghi chú',
            descriptionPlaceholder: 'Nhập ghi chú (không bắt buộc)',
            lines: 'Danh sách hàng',
            addLine: 'Thêm dòng',
            removeLine: 'Xoá dòng',
            skuPlaceholder: 'Chọn SKU',
            skuTruncated:
                'Danh sách chỉ hiển thị {{loaded}}/{{total}} SKU — SKU ngoài danh sách này không tìm được bằng ô tìm kiếm. Hãy báo quản trị nếu thiếu SKU cần dùng.',
            quantity: 'Số lượng',
            noLines: 'Chưa có dòng hàng nào',
            submit: 'Tạo phiếu',
            submitting: 'Đang tạo…',
            draftHint: 'Phiếu được tạo ở trạng thái Nháp, chưa tác động tới tồn kho.',
            validation: {
                typeRequired: 'Vui lòng chọn loại phiếu',
                branchRequired: 'Vui lòng chọn chi nhánh',
                toBranchRequired: 'Phiếu chuyển kho cần chọn chi nhánh đích',
                toBranchSame: 'Chi nhánh đích phải khác chi nhánh nguồn',
                linesRequired: 'Phiếu phải có ít nhất 1 dòng hàng',
                skuRequired: 'Vui lòng chọn SKU',
                quantityMin: 'Số lượng phải lớn hơn 0',
                skuDuplicated: 'SKU này đã có trong phiếu',
            },
        },

        /* ---------------- Dialog từ chối ---------------- */
        reject: {
            title: 'Từ chối phiếu {{code}}',
            reason: 'Lý do từ chối',
            reasonPlaceholder: 'Nhập lý do từ chối phiếu',
            reasonHint: 'Lý do sẽ được lưu vào ghi chú của phiếu.',
            submit: 'Từ chối phiếu',
        },

        /* ---------------- Tab Kiểm kê ---------------- */
        count: {
            title: 'Kiểm kê kho',
            description: 'Nhập số đếm thực tế, hệ thống tự so với tồn và sinh phiếu điều chỉnh',
            start: 'Tạo phiên kiểm kê',
            branch: 'Chi nhánh kiểm kê',
            searchPlaceholder: 'Tìm SKU, tên sản phẩm…',
            noteLabel: 'Ghi chú',
            notePlaceholder: 'Nhập ghi chú cho phiên kiểm kê (không bắt buộc)',
            column: {
                sku: 'SKU',
                product: 'SẢN PHẨM',
                variant: 'MÀU / SIZE',
                systemQuantity: 'TỒN HỆ THỐNG',
                countedQuantity: 'SỐ ĐẾM',
                variance: 'CHÊNH LỆCH',
            },
            empty: 'Chưa có dữ liệu tồn để kiểm kê',
            emptyHint: 'Cần có tồn kho trước khi kiểm kê.',
            countedPlaceholder: 'Nhập số',
            notCounted: 'Chưa đếm',
            summary: '{{counted}}/{{total}} SKU đã đếm · {{diff}} dòng chênh lệch',
            filterScopeHint:
                'Đang lọc: hiển thị {{shown}}/{{total}} dòng. Số liệu trên và nút gửi tính trên toàn bộ {{total}} dòng, kể cả dòng đang bị ẩn.',
            truncatedTitle:
                'Chỉ nạp được {{loaded}}/{{total}} dòng tồn — phiên kiểm kê này không phủ hết kho',
            truncatedHint:
                'Phần còn lại sẽ không được đếm. Hãy lọc theo chi nhánh để chia nhỏ, hoặc báo quản trị nâng giới hạn.',
            submit: 'Tạo phiếu điều chỉnh',
            submitting: 'Đang xử lý…',
            submitHint:
                'Hệ thống tạo phiếu điều chỉnh ở trạng thái Nháp, phải gửi duyệt và được duyệt mới ghi tồn.',
            confirmTitle: 'Xác nhận kiểm kê',
            confirmDescription:
                'Sẽ tạo phiếu điều chỉnh cho {{count}} dòng chênh lệch. Bạn có chắc chắn?',
            noDiff: 'Không có dòng nào chênh lệch so với tồn hệ thống',
        },

        toast: {
            ledgerCreated: 'Đã tạo phiếu kho',
            ledgerSubmitted: 'Đã gửi duyệt phiếu kho',
            ledgerApproved: 'Đã duyệt phiếu — tồn kho đã được cập nhật',
            ledgerRejected: 'Đã từ chối phiếu kho',
            stockCountCreated: 'Đã tạo {{count}} phiếu điều chỉnh từ kết quả kiểm kê',
        },

        confirm: {
            submitTitle: 'Gửi duyệt phiếu kho',
            submitDescription:
                'Phiếu {{code}} sẽ chuyển sang trạng thái Chờ duyệt và không sửa được nữa.',
            approveTitle: 'Duyệt phiếu kho',
            approveDescription:
                'Phiếu {{code}} sẽ được duyệt và ghi tồn kho thật. Thao tác này không hoàn tác được.',
        },
    },
}
