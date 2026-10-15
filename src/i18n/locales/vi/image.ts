/**
 * Namespace `image` — chuẩn ảnh CMS (PLAN Phase 22). **Không nhúng số vào chuỗi dịch**: mọi con số
 * (tỉ lệ, px, dung lượng, giây) nội suy từ `IMAGE_SPEC` / `COVER_ROTATE_MS` để đổi spec không phải
 * sửa bản dịch.
 */
export default {
    hint: {
        line: 'Tỉ lệ {{ratio}} · khuyến nghị {{rw}} × {{rh}} px · tối thiểu {{mw}} × {{mh}} px · {{formats}} ≤ {{size}}',
        why: 'Vì sao?',
        whyTitle: 'Ảnh này hiện ở đâu trên web khách?',
    },

    /** Giải thích ảnh nằm trong khung nào bên storefront (popover "Vì sao?"). */
    why: {
        PRODUCT:
            'Ảnh sản phẩm luôn nằm trong khung dọc {{ratio}} ở mọi trang (trang chủ, danh sách, chi tiết). Ảnh lệch tỉ lệ sẽ bị cắt để lấp đầy khung.',
        CATEGORY_TILE:
            'Ô danh mục ở lưới "Shop by category" của Trang chủ là khung dọc {{ratio}}. Ảnh lệch tỉ lệ sẽ bị cắt để lấp đầy khung.',
        HOME_HERO:
            'Ảnh hero chạy tràn ngang đầu Trang chủ (tỉ lệ {{ratio}}). Trên điện thoại khung đổi sang {{mobileRatio}} và chỉ còn thấy khoảng {{visible}} % bề ngang ảnh.',
        BANNER_WIDE:
            'Dải ảnh chạy tràn ngang (tỉ lệ {{ratio}}). Trên điện thoại khung đổi sang {{mobileRatio}} và chỉ còn thấy khoảng {{visible}} % bề ngang ảnh — chủ thể phải nằm giữa.',
        POST_COVER: 'Ảnh bìa bài viết hiển thị trong khung {{ratio}} ở trang bài viết và thẻ bài viết.',
        OG_IMAGE:
            'Ảnh chia sẻ lên mạng xã hội (tỉ lệ {{ratio}}). Một số nền tảng cắt về hình vuông nên chủ thể phải nằm giữa.',
        LOGO_SQUARE:
            'Logo hiển thị trong khung vuông {{ratio}}, giữ nguyên cả ảnh (không cắt). Nên dùng nền trong suốt.',
    },

    issue: {
        format: 'Định dạng không được hỗ trợ — chỉ nhận JPG, PNG, GIF hoặc WebP.',
        formatSoft: 'Nên dùng {{formats}} cho ô này; định dạng hiện tại vẫn lưu được.',
        tooLarge: 'Ảnh nặng {{size}}, vượt mức tối đa {{max}}.',
        belowMin:
            'Ảnh {{w}} × {{h}} px nhỏ hơn mức tối thiểu {{minW}} × {{minH}} px — sẽ bị vỡ khi phóng to.',
        ratioSides:
            'Ảnh {{w}} × {{h}} px lệch tỉ lệ {{ratio}}: sẽ bị cắt khoảng {{percent}} % bề ngang (cắt đều hai bên).',
        ratioTopBottom:
            'Ảnh {{w}} × {{h}} px lệch tỉ lệ {{ratio}}: sẽ bị cắt khoảng {{percent}} % chiều cao (cắt đều trên và dưới).',
    },

    /** Dùng khi chọn file từ máy (ô upload nhiều slot của Sản phẩm). */
    file: {
        blocked: '"{{name}}": {{reason}}',
        warned: '"{{name}}": {{reason}}',
    },

    field: {
        clear: 'Xoá ảnh',
        uploaded: 'Đã lưu ảnh.',
        removed: 'Đã gỡ ảnh.',
        appliesNow: 'Ảnh được lưu ngay khi tải lên hoặc gỡ — không phụ thuộc nút Lưu / Huỷ.',
        replace: 'Đổi ảnh',
        pending: 'Sẽ tải lên khi lưu: {{name}}',
        upload: 'Tải ảnh lên',
        uploading: 'Đang tải lên…',
        measuring: 'Đang kiểm tra ảnh…',
        size: 'Kích thước ảnh: {{w}} × {{h}} px',
        previewButton: 'Xem đúng khung',
        previewTitle: 'Xem trước đúng khung trên web khách',
    },

    /** Dialog xem ảnh toàn màn hình — dùng chung cho grid/bảng/detail/form (CONVENTIONS mục 5). */
    viewer: {
        previous: 'Ảnh trước',
        next: 'Ảnh sau',
        close: 'Đóng',
        openHint: 'Bấm để xem toàn màn hình',
        counter: '{{current}} / {{total}}',
    },

    frame: {
        desktop: 'Máy tính (từ {{px}} px)',
        mobile: 'Điện thoại ({{px}} px)',
        single: 'Khung hiển thị',
        empty: 'Chưa có ảnh',
        safe: {
            default:
                'Chủ thể và chữ phải nằm trong khung sáng — ngoài vùng này sẽ bị cắt trên điện thoại.',
            OG_IMAGE: 'Mạng xã hội có thể cắt về hình vuông — chủ thể phải nằm trong khung sáng ở giữa.',
            LOGO_SQUARE: 'Logo nên nằm trong khung sáng, chừa lề đều bốn phía.',
        },
    },

    hover: {
        primary: 'Ảnh 1 — mặc định',
        secondary: 'Ảnh 2 — khi rê chuột',
        empty: 'Chưa có ảnh',
        hint: 'Rê chuột vào ô để xem ảnh hover.',
        noHover: 'Không có ảnh hover — rê chuột vào ô sẽ không đổi ảnh.',
        noImages: 'Bỏ trống cả hai ⇒ web dùng ảnh mặc định của hệ thống.',
    },

    slides: {
        empty: 'Chưa có ảnh bìa — trang Sản phẩm sẽ không hiện dải ảnh cho danh mục này.',
        counter: 'Ảnh {{current}}/{{total}} · tự chuyển mỗi {{seconds}} giây, lặp lại vô tận',
        single: 'Chỉ có 1 ảnh — web hiển thị tĩnh, không chuyển ảnh.',
        pause: 'Tạm dừng',
        play: 'Chạy tiếp',
        reducedMotion: 'Máy đang bật giảm chuyển động — xem trước đứng yên ở ảnh đầu, giống web khách.',
        textOverlay:
            'Tiêu đề danh mục do web tự vẽ đè lên nửa trái ảnh — tránh ảnh có sẵn chữ hoặc vùng quá sáng ở nửa trái.',
        gapNote: 'Các ô trống được bỏ qua — ảnh còn lại chạy liền mạch đúng thứ tự.',
        previewTitle: 'Xem trước dải ảnh bìa',
    },
}
