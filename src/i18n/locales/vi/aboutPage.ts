export default {
    pageTitle: 'Về chúng tôi',
    pageDescription: 'Nội dung trang "Về chúng tôi" trên web bán hàng — sửa trực tiếp, lưu là áp dụng.',
    loading: 'Đang tải nội dung…',
    loadFailed: 'Không tải được nội dung trang. Vui lòng thử lại.',
    retry: 'Thử lại',
    lastSaved: 'Lưu lần cuối {{time}}',

    images: {
        title: 'Ảnh đầu trang',
        description:
            'Tối đa 5 ảnh xếp hàng ngang, to dần về giữa. Web chỉ hiện số ảnh LẺ (1, 3 hoặc 5): ô trống được bỏ qua, nếu đang có số chẵn thì bỏ ảnh cuối.',
        slot: 'Ảnh {{n}}',
        caption: 'Lưu ngay khi chọn ảnh.',
        moveLeft: 'Đổi chỗ với ảnh bên trái',
        moveRight: 'Đổi chỗ với ảnh bên phải',
        count: 'Đang có {{filled}} ảnh — web hiện {{shown}} ảnh.',
        countEven: 'Đang có {{filled}} ảnh (số chẵn) — web chỉ hiện {{shown}} ảnh, bỏ ảnh cuối. Thêm hoặc gỡ 1 ảnh để hiện đủ.',
        countNone: 'Chưa có ảnh — web ẩn dải ảnh đầu trang.',
        preview: 'Xem trước bố cục trên web',
        center: 'Ảnh giữa (to nhất)',
    },

    content: {
        title: 'Nội dung',
        description:
            'Tiêu đề lớn, dòng giới thiệu ngắn và phần nội dung bên dưới dải ảnh. Dùng căn giữa, nút liên kết và bảng không viền (ảnh | chữ) để dàn trang.',
        heading: 'Tiêu đề trang',
        headingPlaceholder: 'vd: Về chúng tôi',
        subtitle: 'Dòng giới thiệu ngắn',
        subtitlePlaceholder: 'vd: éloria — More than just clothes',
        body: 'Nội dung',
    },

    submit: 'Lưu nội dung',
    submitting: 'Đang lưu…',
    unsaved: 'Có thay đổi chưa lưu',

    validation: {
        noAngleBrackets: 'Không được chứa ký tự < hoặc >',
        titleRequired: 'Vui lòng nhập tiêu đề trang',
        titleMaxLength: 'Tiêu đề tối đa 150 ký tự',
        subtitleMaxLength: 'Dòng giới thiệu tối đa 255 ký tự',
        contentMaxLength: 'Nội dung quá dài (tối đa 200.000 ký tự)',
        metaTitleMaxLength: 'Tiêu đề SEO tối đa 150 ký tự',
        metaDescriptionMaxLength: 'Mô tả SEO tối đa 300 ký tự',
    },

    toast: {
        saved: 'Đã lưu trang Về chúng tôi',
        imageSaved: 'Đã cập nhật ảnh đầu trang',
        imageRemoved: 'Đã gỡ ảnh',
    },
}
