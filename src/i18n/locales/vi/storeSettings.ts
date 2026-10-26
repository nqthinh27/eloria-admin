export default {
    pageTitle: 'Cài đặt cửa hàng online',
    pageDescription: 'Luật điểm thưởng dùng chung cho cả chuỗi — chỉ Super Admin',
    loadError: 'Không tải được cấu hình.',
    loyalty: {
        title: 'Điểm thưởng',
        description: 'Luật tích điểm và dùng điểm áp dụng cho toàn bộ chuỗi (POS, web bán hàng).',
        earn: { label: 'Số tiền hàng để được 1 điểm', hint: 'Số nguyên dương, mặc định 50.000đ.' },
        redeem: { label: 'Giá trị giảm của 1 điểm', hint: 'Số nguyên dương, mặc định 1.000đ.' },
        maxPercent: {
            label: 'Trần % tiền hàng được trừ bằng điểm',
            hint: 'Số nguyên từ 0 đến 100, mặc định 50. Tính trên tiền hàng sau khuyến mại; 0 = không cho dùng điểm.',
        },
        errorPositive: 'Nhập số nguyên lớn hơn 0.',
        errorPercent: 'Nhập số nguyên từ 0 đến 100.',
        example: '{{amount}} tiền hàng được +{{points}} điểm; {{points}} điểm = {{value}} giảm giá.',
        note: 'Đổi luật chỉ áp dụng cho đơn phát sinh sau khi lưu — điểm đã tích và đơn cũ không bị tính lại.',
    },
    toast: {
        loyaltySaved: 'Đã cập nhật luật điểm thưởng',
    },
}
