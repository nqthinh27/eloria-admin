export default {
    app: {
        name: 'Eloria Admin',
        description: 'Cổng quản trị hệ thống nội bộ',
    },
    language: {
        vi: 'Tiếng Việt',
        en: 'English',
    },
    /** Lỗi ở tầng vận chuyển — backend không trả `subKey` cho các trường hợp này. */
    http: {
        unauthorized: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        forbidden: 'Bạn không có quyền thực hiện thao tác này.',
        notFound: 'Không tìm thấy dữ liệu yêu cầu.',
        serverError: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
        network: 'Không kết nối được máy chủ. Kiểm tra lại đường truyền.',
        timeout: 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.',
        unknown: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    },
    action: {
        retry: 'Thử lại',
        close: 'Đóng',
        cancel: 'Huỷ',
        confirm: 'Xác nhận',
        export: 'Xuất dữ liệu',
        exportExcel: 'Xuất Excel',
        exportPdf: 'Xuất PDF',
        edit: 'Sửa',
        save: 'Lưu',
        detail: 'Chi tiết',
        pickDate: 'Chọn ngày',
    },
    dataTable: {
        empty: 'Không có dữ liệu',
        error: 'Không tải được dữ liệu. Vui lòng thử lại.',
        searchPlaceholder: 'Tìm kiếm…',
        showingRange: 'Hiển thị {{from}}–{{to}} trong tổng số {{total}} {{unit}}',
        pageOf: 'Trang {{page}} / {{pageCount}}',
        prevPage: 'Trang trước',
        nextPage: 'Trang sau',
        /** Tải lại giữ nguyên page/sort/filter/scroll — CONVENTIONS mục 5.2. */
        refresh: 'Tải lại',
        /** Lớp phủ khi đang tải lại (dữ liệu cũ vẫn hiển thị bên dưới). */
        refreshing: 'Đang tải lại…',
        /** Toast báo tải lại xong — người dùng cần biết bảng đã là dữ liệu mới. */
        refreshed: 'Tải lại dữ liệu thành công',
        columns: 'Hiển thị cột',
    },
    searchSelect: {
        searchPlaceholder: 'Tìm kiếm…',
        empty: 'Không tìm thấy kết quả',
        clearSearch: 'Xoá từ khoá',
        selectedCount: 'Đã chọn {{count}}',
        removeItem: 'Bỏ chọn {{name}}',
    },
    confirmDialog: {
        auditNotice: 'Hành động này sẽ được lưu vào nhật ký (audit log).',
    },
}
