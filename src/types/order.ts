import type { SearchReq } from '@/types/common'

/**
 * Domain **Bán hàng & Đơn hàng** — **API thật**, đồng bộ từ `/v3/api-docs/api` khảo sát
 * **2026-08-18** (PLAN Phase 11). File này **thay thế hoàn toàn** bản đoán ở Phase 6:
 * bản cũ sai `IN_STORE` (thật là `POS`), sai 5 trạng thái (thật là **8**), thiếu toàn bộ
 * khối thanh toán (`paymentStatus`, `paidAmount`, `payments[]`, `staffId`).
 *
 * Ba mô hình nghiệp vụ **bắt buộc nắm trước khi sửa file này** (chi tiết ở CLAUDE.md và
 * `35.1.eloria-backend/docs/api/ban-hang-p6.md`):
 *
 * 1. **Tồn kho — KHÔNG giữ chỗ.** `POST /order` **trừ tồn ngay** ở trạng thái `PENDING`;
 *    `confirm`/`pack`/`ship` không đụng kho; `cancel` cộng trả tồn ở mọi giai đoạn.
 *    Thiếu hàng ⇒ `error.stock.insufficient` **ngay tại bước tạo đơn**.
 * 2. **Thanh toán — thu ĐÚNG 1 LẦN, 1 hình thức, toàn bộ tiền.** Body chỉ gửi `method`;
 *    `amount` bị backend bỏ qua hoàn toàn. Thu lần 2 ⇒ `error.order.alreadyPaid`.
 *    **Không có endpoint hoàn tiền** — hoàn tiền là hệ quả tự động của huỷ đơn.
 * 3. **Giá do server quyết.** Client **không gửi đơn giá**; backend lấy theo `product.price`.
 */

/* ------------------------------------------------------------------ *
 * Enum
 * ------------------------------------------------------------------ */

/**
 * `EOrderStatus` — **8 giá trị**, dùng thẳng theo quy ước backend (PLAN B7, user chốt 2026-08-15).
 *
 * ⚠️ **Không map ngầm về 5 trạng thái của mockup `04-don-hang.png`**, không tự gộp nhóm.
 *
 * Vòng đời hợp lệ:
 * ```
 * PENDING ─confirm→ CONFIRMED ─pack→ PACKED ─ship→ SHIPPING ─complete→ COMPLETED
 *    └────────────────┴──────── cancel ────┴──────────┘ → CANCELLED
 * ```
 * `SHIPPED` và `REJECTED` có trong enum backend nhưng **không endpoint nào đặt được** —
 * chỉ có thể xuất hiện ở dữ liệu cũ, FE vẫn phải hiển thị được nhãn.
 */
export const EOrderStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    PACKED: 'PACKED',
    SHIPPING: 'SHIPPING',
    SHIPPED: 'SHIPPED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    REJECTED: 'REJECTED',
} as const
export type EOrderStatus = (typeof EOrderStatus)[keyof typeof EOrderStatus]

/**
 * Kênh bán. Mockup `04` gọi `POS` là "Tại quầy".
 *
 * ✅ **Set được từ 2026-08-18** (backend fix BE5): `CreateOrderReqDTO` đã có field `channel`,
 * `OrderServiceImpl` lấy theo request thay vì hard-code. **Bỏ trống ⇒ mặc định `ONLINE`**
 * (tương thích ngược với đơn cũ) — đã đo đủ 4 case.
 *
 * ⇒ Màn POS gửi `channel: 'POS'`; tab "Tại quầy" của `04-don-hang` nay có dữ liệu thật.
 */
export const EOrderChannel = {
    ONLINE: 'ONLINE',
    POS: 'POS',
    OTHER: 'OTHER',
} as const
export type EOrderChannel = (typeof EOrderChannel)[keyof typeof EOrderChannel]

/** `PURCHASE` = đơn bán. `REFUND` mới chỉ là enum — **chưa có endpoint đổi/trả** (Phase 13). */
export const EOrderType = {
    PURCHASE: 'PURCHASE',
    REFUND: 'REFUND',
} as const
export type EOrderType = (typeof EOrderType)[keyof typeof EOrderType]

/**
 * Trạng thái thanh toán.
 *
 * - Ở **`OrderResDTO.paymentStatus`**: đủ 3 giá trị, vòng đời `UNPAID → PAID → REFUNDED`
 *   (**không còn `PARTIAL`** — đã bỏ cùng mô hình thu 1 lần).
 * - Ở **`OrderPaymentResDTO.status`** (từng dòng thanh toán): thực tế **chỉ dùng `PAID | REFUNDED`**
 *   dù api-docs khai đủ 3 (dùng chung enum). ⚠️ **Đừng dựng UI cho `UNPAID` ở cấp dòng payment** —
 *   dòng payment chỉ tồn tại khi đã thu.
 */
export const EPaymentStatus = {
    UNPAID: 'UNPAID',
    PAID: 'PAID',
    REFUNDED: 'REFUNDED',
} as const
export type EPaymentStatus = (typeof EPaymentStatus)[keyof typeof EPaymentStatus]

/** Hình thức thanh toán. ⚠️ **Chuyển khoản dùng `QR`** — backend không có giá trị `TRANSFER`. */
export const EPaymentMethod = {
    CASH: 'CASH',
    CARD: 'CARD',
    QR: 'QR',
    VOUCHER: 'VOUCHER',
    POINT: 'POINT',
    STORE_CREDIT: 'STORE_CREDIT',
    COD: 'COD',
} as const
export type EPaymentMethod = (typeof EPaymentMethod)[keyof typeof EPaymentMethod]

/* ------------------------------------------------------------------ *
 * Response DTO
 * ------------------------------------------------------------------ */

/** `OrderDetailResDTO` — 1 dòng hàng trong đơn. */
export type OrderLine = {
    id: string
    /** **MÃ SKU** (`SP001-BK-AO-L`), không phải UUID — xem CLAUDE.md breaking 2026-08-11. */
    skuId: string
    skuCode: string
    productName: string
    /** Nhãn size, ví dụ `L` / `30`. */
    size: string | null
    color: string | null
    quantity: number
    /** Đơn giá do **server** chốt lúc tạo đơn (dòng quà tặng = 0). */
    unitAmount: number
    discountAmount: number | null
    lineTotal: number
    isGift: boolean
}

/**
 * `OrderPaymentResDTO` — 1 dòng thanh toán.
 *
 * ⚠️ Mỗi đơn có **tối đa 2 dòng** (DB unique `(order_id, status)`): 1 dòng `PAID` và — nếu đã
 * huỷ đơn đã thu — 1 dòng `REFUNDED`. Không còn danh sách thu nhiều lần.
 *
 * `createdBy` = **username người thu tiền**. Lưu ý `OrderResDTO` **không có** `createdBy`
 * (breaking 2026-08-14) — hai DTO khác nhau, đừng nhầm.
 */
export type OrderPayment = {
    id: string
    method: EPaymentMethod
    amount: number
    /** Thực tế chỉ `PAID | REFUNDED` — xem ghi chú ở `EPaymentStatus`. */
    status: EPaymentStatus
    /** Backend tự ghi `"Hoàn tiền hủy đơn"` cho dòng hoàn. */
    description: string | null
    createdDate: string
    createdBy: string | null
}

/**
 * `OrderResDTO`.
 *
 * ⚠️ **`lines` và `payments` trả `null` ở `POST /order/search`**, chỉ được populate ở
 * `GET /order/{id}` — đã đo thật, giống hệt `categories` ở `product/search`. Mọi chỗ đọc từ
 * danh sách phải phòng null ⇒ **không dựng được cột "Số SP" ở bảng** nếu không muốn N+1 request
 * (xem ghi chú ở `OrderListPage`).
 *
 * ⚠️ **Không có `createdBy`** (breaking 2026-08-14) — người bán xem `staffId`.
 */
export type Order = {
    id: string
    /** Mã đơn hiển thị cho người dùng, ví dụ `HK-20260815-013254-0007`. */
    orderCode: string
    /** Vòng đời đơn — **khác** `status` (0/1 của bản ghi). */
    status: EOrderStatus
    type: EOrderType
    paymentStatus: EPaymentStatus
    /** Hình thức dự kiến khi tạo đơn; hình thức thực thu nằm ở `payments[]`. */
    paymentMethod: EPaymentMethod | null
    subtotal: number
    totalAmount: number
    discountAmount: number | null
    shippingFee: number | null
    channel: EOrderChannel
    customerName: string | null
    customerPhone: string | null
    shippingAddress: string | null
    /** Ghi chú nội bộ. Backend cũng lưu **lý do huỷ** vào chính field này. */
    description: string | null
    customerId: string | null
    /** Nhân viên tạo đơn (thay cho `createdBy` đã bị xoá). */
    staffId: string | null
    /** Đã có field nhưng **chưa có API ca làm việc** (Phase 15) ⇒ luôn `null`. */
    shiftId: string | null
    branchId: string | null
    branchName: string | null
    completedDate: string | null
    createdDate: string
    lastModifiedDate: string | null
    /**
     * ⚠️ Số **thực thu**: `= totalAmount` khi đã trả, **về `0` sau khi hoàn tiền**.
     * **Đừng dùng `paidAmount > 0` để suy ra "đơn từng được thanh toán"** — đọc `payments[]`
     * hoặc `paymentStatus === 'REFUNDED'`.
     */
    paidAmount: number | null
    /** `null` ở `search`, có ở `GET /order/{id}`. */
    lines: OrderLine[] | null
    /** `null` ở `search`, có ở `GET /order/{id}`. Tối đa 2 phần tử. */
    payments: OrderPayment[] | null

    /*
     * ---- Truy vết khuyến mại (backend bổ sung 2026-09-08 theo yêu cầu của FE) ----
     *
     * ⚠️ **CHỈ có ở API chi tiết** (`GET /order/{id}`, `GET /order/{id}/invoice`, và response của
     * create/update). `POST /order/search` trả **`null`** cho cả 3 — backend cố ý không join
     * `promotion_log` ở danh sách để tránh N+1. ⇒ **Không dựng cột KM ở bảng Đơn hàng.**
     */

    /** Id chương trình KM đã áp; `null` khi đơn không có KM (hoặc đang ở API danh sách). */
    promotionId: string | null
    /** Tên chương trình — dùng in lên hoá đơn, vd "Flash Sale cuối tuần". */
    promotionName: string | null
    /** Mã khách đã nhập; `null` khi KM là loại **tự động** (khách không nhập gì). */
    promotionCode: string | null
}

/** `CartPreviewLineResDTO` — 1 dòng trong kết quả tính tiền giỏ. */
export type CartPreviewLine = {
    skuId: string
    skuCode: string
    productName: string
    colorName: string | null
    sizeLabel: string | null
    unitPrice: number
    quantity: number
    /** Giảm giá **riêng dòng này**, đã được backend clamp trong `[0, unitPrice × quantity]`. */
    discountAmount: number | null
    /** `unitPrice × quantity − discountAmount(dòng)`. */
    lineTotal: number
    isGift: boolean
    /** Tồn hiện tại của SKU tại chi nhánh (luôn `= total`, không còn trừ `reserved`). */
    available: number
    /**
     * ⚠️ Chỉ mang tính **cảnh báo sớm** — preview **không giữ chỗ**. Tồn có thể bị đơn khác lấy
     * mất giữa lúc preview và lúc bấm đặt đơn ⇒ vẫn phải xử lý `error.stock.insufficient`
     * ở bước tạo đơn.
     */
    insufficient: boolean
}

/** `CartPreviewResDTO` — backend tính tiền, **không ghi DB, không giữ tồn**. */
export type CartPreview = {
    /** Tiền **gốc**, chưa trừ gì (xem quy ước giảm giá 2 tầng ở CLAUDE.md). */
    subtotal: number
    /**
     * Tổng giảm **đã gộp** giảm-tay (2 tầng) **và** `promotionDiscount`.
     * ⚠️ **Đừng cộng thêm `promotionDiscount`** — backend đã gộp sẵn, cộng nữa là trừ hai lần.
     */
    discountAmount: number
    shippingFee: number
    totalAmount: number
    lines: CartPreviewLine[]

    /* ---- Khuyến mại tự động / coupon (backend Phase 9) ---- */

    /** Phần giảm do **engine KM** (tách riêng để hiện dòng "Khuyến mại" trên giỏ). */
    promotionDiscount: number | null
    promotionId: string | null
    promotionName: string | null
    /** `null` khi KM được áp là loại tự động (không phải coupon nhập tay). */
    promotionCode: string | null
}

/**
 * `InvoiceResDTO` — dữ liệu hoá đơn **dạng JSON để FE tự in** (backend không sinh PDF).
 *
 * ⚠️ **Chỉ có khối chi nhánh** (`branchName`/`branchPhone`/`branchAddress`). Backend **không trả**
 * tên hệ thống, logo, hotline chung hay chân trang đổi trả/website — javadoc của DTO ghi rõ
 * *"letterhead/logo/QR ngân hàng do frontend tự gắn"*. FE lấy các thứ đó từ
 * `storeConfig` (`src/config/app.ts`).
 *
 * ✅ **Đủ dữ liệu để in bằng MỘT lời gọi duy nhất** (backend bổ sung `staffName` 2026-08-21):
 * không phải ghép thêm `/account/me` hay `GET /order/{id}` nữa.
 *
 * `lines[].discountAmount` có sẵn để hoá đơn tách được chiết khấu từng sản phẩm.
 */
export type Invoice = {
    branchName: string | null
    branchPhone: string | null
    branchAddress: string | null
    orderCode: string
    orderDate: string
    customerName: string | null
    customerPhone: string | null
    /**
     * Tên nhân viên bán — **field mới 2026-08-21**, backend bổ sung riêng cho hoá đơn.
     *
     * ⚠️ Chỉ có ở `InvoiceResDTO`. `OrderResDTO` vẫn chỉ có `staffId` (UUID, không kèm tên) ⇒
     * muốn hiện tên người bán ở màn khác thì **phải qua endpoint invoice**.
     */
    staffName: string | null
    shippingAddress: string | null
    note: string | null
    lines: OrderLine[] | null
    subtotal: number
    discountAmount: number | null
    shippingFee: number | null
    totalAmount: number
    paymentMethod: EPaymentMethod | null
    paymentStatus: EPaymentStatus
    paidAmount: number | null
    payments: OrderPayment[] | null

    /*
     * ---- Truy vết khuyến mại (backend bổ sung 2026-09-08) ----
     * Nhờ 3 field này hoá đơn nói được **giảm vì đâu**, thay vì chỉ một con số `discountAmount`.
     */
    promotionId: string | null
    promotionName: string | null
    /** `null` khi KM là loại tự động — hoá đơn chỉ hiện tên chương trình, không có mã. */
    promotionCode: string | null
}

/* ------------------------------------------------------------------ *
 * Request DTO
 * ------------------------------------------------------------------ */

/** `OrderLineReqDTO`. ⚠️ **Không gửi đơn giá** — server tự lấy từ `product.price`. */
export type OrderLineReq = {
    /** **MÃ SKU** (`SP001-BK-AO-L`). SKU phải `ACTIVE` (`error.sku.notActive`). */
    skuId: string
    quantity: number
    /** Dòng quà tặng ⇒ backend tính đơn giá 0. */
    isGift?: boolean
    /**
     * **Tầng 1** của mô hình giảm giá 2 tầng (backend 2026-08-21): giảm **số tiền tuyệt đối**
     * cho riêng dòng này.
     *
     * Backend tự clamp trong `[0, đơn giá × số lượng]`; dòng `isGift` bị ép về 0.
     * ⚠️ **Không có biến thể `%` ở cấp dòng** — FE tự quy đổi ra tiền trước khi gửi.
     */
    discountAmount?: number
}

/**
 * `CreateOrderReqDTO` — dùng chung cho `POST /order` **và** `PUT /order/{id}`
 * (api-docs khai cùng một schema cho cả hai).
 *
 * ### Giảm giá 2 tầng (backend đổi 2026-08-21)
 *
 * ```
 * lineTotal(dòng)        = đơn giá × SL − lines[].discountAmount
 * subtotal(header)       = Σ (đơn giá × SL)          ← TIỀN GỐC, CHƯA trừ gì
 * discountAmount(header) = Σ lines[].discountAmount + giảm-chung
 * totalAmount            = max(0, subtotal − discountAmount + shippingFee)
 * ```
 *
 * - **Tầng 1** — `lines[].discountAmount`: giảm tay từng dòng (số tiền).
 * - **Tầng 2** — `discountAmount` **hoặc** `discountPercent` (0–100) ở cấp đơn; gửi cả hai
 *   thì backend ưu tiên **phần trăm**, tính trên `subtotal` **gốc**.
 *
 * Backend **tự cộng hai tầng lại** thành một con số ở `discountAmount` của response và tự cap
 * ≤ `subtotal` ⇒ **FE không cộng lại**, cứ hiển thị thẳng con số backend trả về.
 *
 * ⚠️ `subtotal` trả về là **giá gốc**, không phải "tạm tính sau giảm dòng".
 * ⚠️ **Không ràng buộc ngưỡng chiết khấu** ở FE — B8 hoãn sang Phase 16 (user chốt 2026-08-15).
 */
export type CreateOrderReq = {
    /** **Bắt buộc với SUPER_ADMIN** (thiếu ⇒ `error.branch.required`); STAFF/ADMIN bị ép về CN mình. */
    branchId?: string
    /** Khách vãng lai ⇒ bỏ trống và điền `customerName`/`customerPhone` thủ công. */
    customerId?: string
    customerName?: string
    customerPhone?: string
    shippingAddress?: string
    /** Ghi chú nội bộ lúc tạo đơn. */
    description?: string
    paymentMethod?: EPaymentMethod
    /**
     * Kênh bán. **Bỏ trống ⇒ backend mặc định `ONLINE`.** Màn POS phải gửi `'POS'`, nếu không
     * đơn bán tại quầy sẽ nằm nhầm tab "Online" ở `04-don-hang`.
     * `PUT /order/{id}` cũng nhận field này (chỉ áp dụng khi gửi non-null, đơn còn `PENDING`).
     */
    channel?: EOrderChannel
    discountAmount?: number
    discountPercent?: number
    shippingFee?: number
    /**
     * Mã giảm giá khách nhập. Bỏ trống ⇒ backend vẫn tự tìm KM **tự động** khớp giỏ.
     *
     * ⚠️ **Mã sai ⇒ `400 error.promotion.codeInvalid`** (backend bổ sung 2026-09-08) — trước đây
     * bị nuốt im lặng. Chỉ nổ khi **có gửi** mã mà mã không dùng được (không tồn tại / sai kênh /
     * sai chi nhánh / ngoài khung thời gian / chưa đủ `minAmount` / hết lượt).
     * Mã hợp lệ nhưng **thua** một KM khác ở best-one-wins thì **không** bị coi là sai.
     */
    couponCode?: string
    lines: OrderLineReq[]
}

/** `CartPreviewReqDTO` — cùng bộ field tính tiền của `CreateOrderReq`, bỏ phần thông tin khách. */
export type CartPreviewReq = {
    branchId?: string
    /** Kênh bán — ảnh hưởng KM nào được áp (KM khai `channel: POS` không áp cho đơn ONLINE). */
    channel?: EOrderChannel
    discountAmount?: number
    discountPercent?: number
    shippingFee?: number
    /**
     * Mã giảm giá khách nhập. Bỏ trống ⇒ backend vẫn tự tìm KM **tự động** khớp giỏ.
     *
     * ⚠️ **Mã sai ⇒ `400 error.promotion.codeInvalid`** (backend bổ sung 2026-09-08) — trước đây
     * bị nuốt im lặng. Chỉ nổ khi **có gửi** mã mà mã không dùng được (không tồn tại / sai kênh /
     * sai chi nhánh / ngoài khung thời gian / chưa đủ `minAmount` / hết lượt).
     * Mã hợp lệ nhưng **thua** một KM khác ở best-one-wins thì **không** bị coi là sai.
     */
    couponCode?: string
    lines: OrderLineReq[]
}

/**
 * `OrderPaymentReqDTO`.
 *
 * ⚠️ **Chỉ gửi `method`.** `amount` vẫn còn trong DTO nhưng backend **bỏ qua hoàn toàn**
 * (đo thật: gửi `amount: 1` trên đơn 1.300.000 vẫn ghi đủ 1.300.000, không báo lỗi)
 * ⇒ khai `method` thôi để không ai gửi nhầm.
 */
export type OrderPaymentReq = {
    method: EPaymentMethod
}

/** `CancelOrderReqDTO` — lý do được backend lưu vào `description` của đơn. */
export type CancelOrderReq = {
    reason?: string
}

/** `OrderNoteReqDTO`. ⚠️ Bị chặn trên đơn `CANCELLED`/`COMPLETED` (`error.order.alreadyClosed`). */
export type OrderNoteReq = {
    note: string
}

/**
 * `OrderSearchReqDTO`.
 *
 * ⚠️ Phân biệt **`orderStatus`** (vòng đời đơn, chuỗi) với **`status`** (0/1 của bản ghi,
 * kế thừa từ `SearchReq`) — cùng pattern `ledgerStatus` của phiếu kho.
 */
export type OrderSearchReq = SearchReq & {
    orderStatus?: EOrderStatus
    paymentStatus?: EPaymentStatus
    channel?: EOrderChannel
    /** Chỉ SUPER_ADMIN dùng được; STAFF/ADMIN bị backend ép về chi nhánh mình. */
    branchId?: string
    /** ISO-8601, ví dụ `2026-08-01T00:00:00Z`. */
    fromDate?: string
    toDate?: string
    /**
     * Lọc "các đơn đã dùng chương trình X" (backend bổ sung 2026-09-08, subquery `promotion_log`).
     * ⚠️ Kết quả trả về **vẫn không có** `promotionName`/`promotionCode` — chúng chỉ có ở API chi tiết.
     */
    promotionId?: string
}
