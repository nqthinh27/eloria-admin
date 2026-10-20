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
    /** Khối SEO dùng chung của form Sản phẩm / Danh mục — `components/seo-fields.tsx`. */
    seo: {
        title: 'SEO (tuỳ chọn)',
        subtitle: 'Tiêu đề và mô tả hiện trên Google và khi chia sẻ link trang này.',
        slug: 'Slug (đường dẫn trên web)',
        slugAfterCreate: 'Hệ thống tự tạo sau khi lưu.',
        metaTitle: 'Tiêu đề SEO',
        metaTitlePlaceholder: 'Mặc định lấy theo tên',
        metaDescription: 'Mô tả SEO',
        metaDescriptionPlaceholder: 'Mặc định lấy theo mô tả',
        emptyFallback: 'Để trống ⇒ web tự sinh từ tên/mô tả.',
        counter: '{{length}}/{{max}} · khuyến nghị ≤ {{recommended}}',
    },
    viewOnWeb: {
        button: 'Xem trên web',
        delay: 'Thay đổi hiện trên web sau tối đa 5–10 phút.',
        inactive: 'Đang ngừng hoạt động — web sẽ báo không tìm thấy trang này.',
    },
    /** Popup nhắc bản mới — `components/new-version-popup.tsx`. */
    newVersion: {
        title: 'Đã có phiên bản mới',
        message: 'Bản cập nhật vừa được triển khai. Hãy tải lại khi bạn đã lưu xong việc đang làm — hệ thống sẽ không tự tải lại.',
        reload: 'Tải lại',
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
        submitting: 'Đang xử lý…',
        select: 'Chọn',
        noSelection: '-Không chọn-',
        selected: 'Đã chọn',
        delete: 'Xoá',
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
        /** Cột số thứ tự do `DataTable` tự chèn — đánh theo trang hiện tại (CONVENTIONS mục 5.6). */
        index: 'STT',
        columns: 'Hiển thị cột',
    },
    searchSelect: {
        searchPlaceholder: 'Tìm kiếm…',
        empty: 'Không tìm thấy kết quả',
        clearSearch: 'Xoá từ khoá',
        selectedCount: 'Đã chọn {{count}}',
        removeItem: 'Bỏ chọn {{name}}',
        skuSearchPlaceholder: 'Tìm theo mã SKU hoặc tên sản phẩm…',
        skuEmpty: 'Không tìm thấy SKU phù hợp',
        loadingMore: 'Đang tải…',
        scrollForMore: 'Cuộn xuống để xem thêm',
    },
    /** Trang 404 — route không khớp. */
    notFound: {
        title: 'Không tìm thấy trang',
        description: 'Trang bạn truy cập không tồn tại hoặc đã bị di chuyển.',
        backHome: 'Về trang chủ',
    },
    /** Nhãn giới tính dùng chung cho nhân viên + khách hàng (enum `EGender`). */
    gender: {
        MALE: 'Nam',
        FEMALE: 'Nữ',
        OTHER: 'Khác',
    },
    validation: {
        required: 'Vui lòng nhập thông tin bắt buộc.',
    },
    confirmDialog: {
        auditNotice: 'Hành động này sẽ được lưu vào nhật ký (audit log).',
    },
}
