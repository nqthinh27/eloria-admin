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
    },
}
