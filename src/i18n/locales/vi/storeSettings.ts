export default {
    pageTitle: 'Cài đặt cửa hàng online',
    pageDescription: 'Cấu hình dùng chung cho web bán hàng — chỉ Super Admin',
    loadError: 'Không tải được cấu hình.',
    branch: {
        title: 'Chi nhánh bán online',
        description:
            'Web bán hàng báo còn/hết hàng theo tồn kho của chi nhánh này. Chưa chọn ⇒ web không tính được tồn kho.',
        placeholder: 'Chọn chi nhánh bán online',
        cannotClear:
            'Sau khi đã chọn, hệ thống không cho bỏ trống — chỉ đổi sang chi nhánh khác được.',
        propagation: 'Thay đổi hiện trên web sau tối đa 5–10 phút (chu kỳ làm mới dữ liệu của web).',
    },
    emptyWarning: {
        title: 'Chưa chọn chi nhánh bán online',
        description:
            'Web bán hàng sẽ không hiển thị đúng tình trạng còn/hết hàng cho tới khi bạn chọn chi nhánh bên dưới.',
    },
    unknownBranch: {
        title: 'Chi nhánh đã cấu hình không tồn tại',
        description:
            'Giá trị đang lưu không khớp chi nhánh nào trong hệ thống. Hãy chọn lại một chi nhánh hợp lệ.',
    },
    inactiveBranch: {
        title: 'Chi nhánh bán online đang ngừng hoạt động',
        description: 'Nên chọn một chi nhánh đang hoạt động để tồn kho hiển thị trên web đáng tin cậy.',
    },
    confirm: {
        title: 'Đổi chi nhánh bán online?',
        description:
            'Tồn kho hiển thị trên web sẽ tính theo chi nhánh mới: {{name}}. Sản phẩm có thể chuyển từ còn hàng sang hết hàng (hoặc ngược lại).',
    },
    toast: {
        saved: 'Đã cập nhật chi nhánh bán online',
    },
}
