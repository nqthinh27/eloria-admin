export default {
    order: {
        /* ================= Màn POS (`03-pos-ban-hang.png`) ================= */
        pos: {
            pageTitle: 'Bán hàng tại quầy',
            pageDescription: 'Tạo đơn bán hàng, quét barcode và thu tiền',

            searchPlaceholder: 'Quét barcode hoặc tìm tên sản phẩm…',
            allCategories: 'Tất cả',

            /* ---- Bộ chọn chi nhánh trên đầu màn (chỉ SUPER_ADMIN) ---- */
            branch: 'Chi nhánh bán',
            branchPlaceholder: 'Chọn chi nhánh…',
            /** Chặn chọn hàng khi chưa biết bán ở kho nào — xem ghi chú ở `PosPage`. */
            branchGateTitle: 'Chọn chi nhánh bán hàng',
            branchGateHint:
                'Tồn kho và giá được tính theo từng chi nhánh. Chọn chi nhánh trước khi thêm sản phẩm vào giỏ.',
            branchLocked: 'Bán tại {{name}}',
            branchChangeWarning:
                'Đổi chi nhánh sẽ xoá giỏ hàng hiện tại vì tồn kho tính theo từng chi nhánh.',

            column: {
                product: 'TÊN SẢN PHẨM',
                sku: 'MÃ SP',
                stock: 'TỒN',
                price: 'GIÁ',
            },

            empty: 'Không tìm thấy sản phẩm',
            emptyHint: 'Thử đổi từ khoá hoặc chọn danh mục khác.',
            outOfStock: 'Hết hàng',
            loadError: 'Không tải được danh sách hàng bán',
            loadErrorHint: 'Kiểm tra kết nối rồi thử lại.',
            /** Cuộn tới đâu nạp tới đó — xem `product-picker`. */
            loadingMore: 'Đang tải thêm…',
            /**
             * Backend không tìm được theo tên sản phẩm (`keyword` của `stock-item/search` chỉ khớp
             * mã SKU) ⇒ ô tìm kiếm lọc phía client trên phần đã nạp.
             */
            searchPartial:
                'Chỉ đang tìm trong phần đã tải. Cuộn xuống để tải thêm hàng rồi tìm lại.',

            /* ---- Giỏ hàng (cột phải) ---- */
            cart: {
                customerPlaceholder: 'Gán khách hàng (SĐT hoặc tên)',
                customerSearching: 'Đang tìm…',
                customerNotFound: 'Không tìm thấy khách phù hợp',
                customerCreate: 'Tạo khách mới',
                customerClear: 'Bỏ gán khách',
                guest: 'Khách vãng lai',

                empty: 'Giỏ hàng trống',
                emptyHint: 'Chọn sản phẩm bên trái để thêm vào giỏ.',

                discountPlaceholder: 'Chiết khấu cả đơn',
                couponLabel: 'Mã giảm giá',
                couponPlaceholder: 'Nhập mã giảm giá',
                couponApply: 'Áp dụng',
                couponClear: 'Bỏ mã',
                couponInvalid: 'Mã không hợp lệ hoặc không áp dụng được cho đơn này',
                promotionDiscount: 'Khuyến mại',
                orderDiscountType: 'Kiểu chiết khấu cả đơn',
                lineDiscountType: 'Kiểu chiết khấu sản phẩm',
                lineDiscountPlaceholder: 'Chiết khấu',
                /** Tên đọc được cho ô nhập chiết khấu của từng dòng hàng (ô không có <Label>). */
                lineDiscountValue: 'Chiết khấu sản phẩm {{name}}',
                lineDiscountTotal: 'Chiết khấu sản phẩm',
                orderDiscount: 'Chiết khấu cả đơn',
                subtotal: 'Tạm tính',
                discount: 'Giảm giá (theo hệ thống)',
                shippingFee: 'Phí giao hàng',
                total: 'Tổng cộng',

                checkout: 'Thanh toán',
                clear: 'Xóa giỏ hàng',
                clearConfirmTitle: 'Xóa toàn bộ giỏ hàng?',
                clearConfirmDescription:
                    'Tất cả sản phẩm đang có trong giỏ sẽ bị gỡ. Thao tác này không thể hoàn tác.',

                remove: 'Gỡ khỏi giỏ',
                quantity: 'Số lượng',
                /** Cảnh báo sớm từ `cart/preview` — tồn vẫn có thể đổi trước lúc đặt đơn. */
                insufficient: 'Chỉ còn {{count}} sản phẩm',
                gift: 'Quà tặng',
            },

            /* ---- Dialog thanh toán ---- */
            checkout: {
                title: 'Thanh toán đơn hàng',
                description: 'Kiểm tra thông tin giao hàng và chọn hình thức thanh toán.',

                customerSection: 'Thông tin khách hàng',
                customerName: 'Tên khách hàng',
                customerNamePlaceholder: 'Khách vãng lai',
                customerPhone: 'Số điện thoại',
                customerPhonePlaceholder: '0912345678',

                shippingSection: 'Giao hàng',
                shippingAddress: 'Địa chỉ giao hàng',
                shippingAddressPlaceholder: 'Số nhà, đường, phường/xã, tỉnh/thành…',
                shippingAddressHint: 'Bỏ trống nếu khách nhận hàng trực tiếp tại quầy.',
                shippingFee: 'Phí giao hàng',

                paymentSection: 'Thanh toán',
                paymentMethod: 'Hình thức thanh toán',
                /** Backend thu 1 lần toàn bộ tiền ⇒ không có ô nhập số tiền. */
                paymentHint: 'Thu đúng một lần cho toàn bộ giá trị đơn hàng.',

                noteSection: 'Ghi chú nội bộ',
                notePlaceholder: 'Ghi chú cho nhân viên xử lý đơn…',

                branch: 'Chi nhánh bán',
                branchPlaceholder: 'Chọn chi nhánh',
                branchRequired: 'Vui lòng chọn chi nhánh bán hàng',

                summary: 'Tổng cộng',
                submit: 'Xác nhận & tạo đơn',
                submitting: 'Đang tạo đơn…',

                /** Khách đã gán hồ sơ — chỉ hiển thị, đổi khách thì quay lại ô gán ở giỏ hàng. */
                customerLinked: 'Đã gán hồ sơ',
                /** Khách vãng lai đủ tên + SĐT ⇒ tự lập hồ sơ trước khi tạo đơn. */
                guestProfileHint:
                    'Nhập đủ họ tên và số điện thoại thì hệ thống tự lập hồ sơ khách để lần sau tra cứu được. Bỏ trống nếu khách không muốn lưu thông tin.',
                guestProfileCreated: 'Đã lập hồ sơ khách hàng mới',
            },

            /* ---- Modal xem trước phiếu sau khi tạo đơn ---- */
            success: {
                title: 'Đã tạo đơn {{code}}',
                /** Đơn POS thu tiền xong là backend tự đóng đơn (COMPLETED) — xem `orderApi.pay`. */
                paid: 'Đã thu tiền và hoàn tất đơn hàng.',
                unpaid: 'Đơn chưa thu tiền — xác nhận thanh toán để in được hóa đơn.',
                /** Đơn đã tạo nhưng bước thu tiền lỗi — tồn đã trừ, không được tạo lại đơn. */
                paymentFailed:
                    'Đơn đã được tạo nhưng chưa thu được tiền. Thử xác nhận lại, hoặc vào màn Đơn hàng để thu — đừng tạo đơn mới.',
                /** Tải `GET /order/{id}/invoice` lỗi — đơn vẫn đã tạo, chỉ thiếu phần xem trước. */
                previewUnavailable: 'Không tải được nội dung phiếu để xem trước.',
                confirmPayment: 'Xác nhận đã thanh toán',
                viewOrder: 'Xem đơn hàng',
                printInvoice: 'In hóa đơn',
                printBlocked: 'Đơn chưa thanh toán — thu tiền xong mới in được hóa đơn',
                newOrder: 'Tạo đơn mới',
            },
        },

        /* ================= Màn danh sách đơn (`04-don-hang.png`) ================= */
        list: {
            pageTitle: 'Quản lý đơn hàng',
            pageDescription: 'Tất cả đơn hàng online và tại quầy',

            searchPlaceholder: 'Tìm mã đơn, khách hàng…',
            allStatuses: 'Tất cả trạng thái',
            allPaymentStatuses: 'Tất cả thanh toán',
            allBranches: 'Tất cả chi nhánh',
            resultLabel: 'đơn hàng',

            empty: 'Chưa có đơn hàng nào',
            emptyHint: 'Tạo đơn ở màn Bán hàng (POS) để bắt đầu.',

            /*
              Cảnh báo đơn PENDING treo lâu — backend trừ tồn ngay khi tạo đơn và không tự huỷ,
              nên đơn bỏ quên sẽ giam hàng. Xem `lib/stale-order.ts` + PLAN Phase 16 mục ①.
            */
            stale: {
                badge: 'Treo {{days}} ngày',
                tooltip:
                    'Đơn đã chờ {{days}} ngày và vẫn đang giữ tồn kho. Huỷ đơn để trả hàng về kho nếu khách không còn mua.',
                filter: 'Đơn treo quá {{days}} ngày',
                banner_one:
                    '{{count}} đơn trong trang này đã chờ quá {{days}} ngày và vẫn đang giữ tồn kho.',
                banner_other:
                    '{{count}} đơn trong trang này đã chờ quá {{days}} ngày và vẫn đang giữ tồn kho.',
            },

            tab: {
                all: 'Tất cả',
                online: 'Online',
                pos: 'Tại quầy',
            },

            column: {
                code: 'MÃ ĐƠN',
                customer: 'KHÁCH HÀNG',
                channel: 'KÊNH',
                branch: 'CHI NHÁNH',
                total: 'TỔNG TIỀN',
                payment: 'THANH TOÁN',
                status: 'TRẠNG THÁI',
                createdDate: 'THỜI GIAN',
                actions: 'THAO TÁC',
            },
        },

        /* ================= Dialog chi tiết (`05-don-hang-chi-tiet.png`) ================= */
        detail: {
            title: 'Chi tiết đơn hàng {{code}}',

            customer: 'Khách hàng',
            channel: 'Kênh bán',
            branch: 'Chi nhánh',
            staff: 'Nhân viên',
            createdDate: 'Thời gian',
            status: 'Trạng thái',

            shippingAddress: 'Địa chỉ giao hàng',

            lines: 'Sản phẩm trong đơn',
            /** Dòng mô tả biến thể: "Size M · Màu Trắng · ×1". */
            lineVariant: 'Size {{size}} · Màu {{color}} · ×{{quantity}}',
            lineVariantNoSize: 'Màu {{color}} · ×{{quantity}}',
            lineVariantNoColor: 'Size {{size}} · ×{{quantity}}',
            lineVariantPlain: '×{{quantity}}',

            subtotal: 'Tạm tính',
            discount: 'Giảm giá',
            shippingFee: 'Phí giao hàng',
            total: 'Tổng cộng',

            payment: 'Thanh toán',
            paidAt: 'Đã thanh toán ({{method}})',
            refundedAt: 'Đã hoàn tiền ({{method}})',
            paymentEmpty: 'Chưa thu tiền',
            paidBy: 'Thu bởi {{name}}',

            note: 'Ghi chú nội bộ',
            noteEmpty: 'Không có ghi chú',
            noteEdit: 'Sửa ghi chú',
            notePlaceholder: 'Nhập ghi chú nội bộ…',
            noteSave: 'Lưu ghi chú',

            close: 'Đóng',
            printInvoice: 'In hóa đơn',
            /** Chặn in khi chưa thu tiền — user chốt 2026-08-21. */
            printBlocked: 'Đơn chưa thanh toán — thu tiền xong mới in được hóa đơn',
        },

        /* ================= Hoá đơn in (`printInvoice`) ================= */
        invoice: {
            /** Fix cứng theo yêu cầu — không đổi theo loại đơn. */
            title: 'Hóa đơn mua hàng',
            hotline: 'Hotline',
            time: 'Thời gian',
            orderCode: 'Mã đơn',
            customer: 'Khách hàng',
            phone: 'SĐT',
            promotion: 'Khuyến mại',
            staff: 'Nhân viên',
            /** Chiết khấu riêng của một dòng hàng (mô hình giảm giá 2 tầng). */
            lineDiscount: 'Chiết khấu',
            lineTotal: 'Thành tiền',
            returnPolicy: 'Đổi trả trong {{days}} ngày, còn nguyên tem mác và hóa đơn.',
            thanks: 'Cảm ơn quý khách và hẹn gặp lại!',
        },

        /* ================= Thu tiền qua QR chuyển khoản ================= */
        qr: {
            show: 'Hiển thị mã QR',
            title: 'Quét mã QR để chuyển khoản',
            description:
                'Số tiền và nội dung chuyển khoản đã được nhúng sẵn trong mã. Khách quét bằng app ngân hàng.',
            amount: 'Số tiền cần chuyển',
            loading: 'Đang tạo mã QR…',
            /** Backend chưa cấu hình tài khoản nhận tiền mặc định. */
            unavailable: 'Chưa tạo được mã QR',
            unavailableHint:
                'Hệ thống chưa cấu hình tài khoản ngân hàng nhận tiền. Liên hệ quản trị viên để thiết lập.',
            retry: 'Thử lại',
            /** Nhân viên tự đối chiếu app ngân hàng rồi mới bấm — chưa có webhook tự động. */
            confirm: 'Xác nhận đã nhận tiền',
            confirmHint:
                'Chỉ bấm sau khi đã kiểm tra tiền về tài khoản. Thao tác này ghi nhận đơn đã thanh toán.',
        },

        /* ================= Hành động vòng đời ================= */
        action: {
            view: 'Xem chi tiết',
            print: 'In hóa đơn',

            confirm: 'Xác nhận đơn',
            pack: 'Đóng gói',
            ship: 'Bàn giao vận chuyển',
            complete: 'Hoàn tất đơn',
            cancel: 'Hủy đơn',
            pay: 'Thu tiền',

            confirmTitle: 'Xác nhận đơn {{code}}?',
            confirmDescription: 'Đơn chuyển sang trạng thái "Đã xác nhận". Tồn kho không thay đổi.',

            packTitle: 'Đóng gói đơn {{code}}?',
            packDescription: 'Đơn chuyển sang trạng thái "Đã đóng gói". Tồn kho không thay đổi.',

            shipTitle: 'Bàn giao vận chuyển đơn {{code}}?',
            shipDescription: 'Đơn chuyển sang trạng thái "Đang giao".',

            completeTitle: 'Hoàn tất đơn {{code}}?',
            completeDescription:
                'Đơn chuyển sang trạng thái "Hoàn thành". Chỉ hoàn tất được khi đơn đã thu đủ tiền.',

            cancelTitle: 'Hủy đơn {{code}}?',
            cancelDescription:
                'Toàn bộ hàng trong đơn sẽ được hoàn lại kho. Đơn đã thu tiền sẽ tự động được ghi nhận hoàn tiền. Thao tác này không thể hoàn tác.',
            cancelReason: 'Lý do hủy',
            cancelReasonPlaceholder: 'Nhập lý do hủy đơn…',

            payTitle: 'Thu tiền đơn {{code}}',
            payDescription:
                'Thu đúng một lần cho toàn bộ giá trị đơn hàng. Sau khi thu sẽ không thu thêm được.',
            payAmount: 'Số tiền thu',
        },

        /* ================= Nhãn enum ================= */
        status: {
            PENDING: 'Chờ xử lý',
            CONFIRMED: 'Đã xác nhận',
            PACKED: 'Đã đóng gói',
            SHIPPING: 'Đang giao',
            SHIPPED: 'Đã giao',
            COMPLETED: 'Hoàn thành',
            CANCELLED: 'Đã hủy',
            REJECTED: 'Từ chối',
        },

        channel: {
            ONLINE: 'Online',
            POS: 'Tại quầy',
            OTHER: 'Khác',
        },

        paymentStatus: {
            UNPAID: 'Chưa thanh toán',
            PAID: 'Đã thanh toán',
            REFUNDED: 'Đã hoàn tiền',
        },

        paymentMethod: {
            CASH: 'Tiền mặt',
            CARD: 'Thẻ',
            /** Backend không có `TRANSFER` — chuyển khoản dùng `QR`. */
            QR: 'Chuyển khoản / QR',
            VOUCHER: 'Phiếu quà tặng',
            POINT: 'Điểm thưởng',
            STORE_CREDIT: 'Công nợ cửa hàng',
            COD: 'Thu hộ khi giao (COD)',
        },

        /* ================= Thông báo ================= */
        toast: {
            created: 'Đã tạo đơn hàng',
            confirmed: 'Đã xác nhận đơn',
            packed: 'Đã chuyển sang đóng gói',
            shipped: 'Đã bàn giao vận chuyển',
            completed: 'Đã hoàn tất đơn',
            cancelled: 'Đã hủy đơn',
            paid: 'Đã ghi nhận thanh toán',
            noteSaved: 'Đã lưu ghi chú',
            /** 409/500 ở luồng thanh toán: trạng thái thật phải đọc lại từ server. */
            reloaded: 'Đơn vừa được cập nhật ở nơi khác — đã tải lại dữ liệu mới nhất.',
        },

        export: {
            exportComingSoon: 'Chức năng xuất dữ liệu sẽ có khi backend hỗ trợ',
        },
    },
}
