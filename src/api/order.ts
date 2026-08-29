import { apiClient, search } from '@/lib/api-client'
import type { BaseListRes, SearchPagination } from '@/types/common'
import type {
    CancelOrderReq,
    CartPreview,
    CartPreviewReq,
    CreateOrderReq,
    Invoice,
    Order,
    OrderNoteReq,
    OrderPaymentReq,
    OrderSearchReq,
} from '@/types/order'

/**
 * Service domain **Bán hàng & Đơn hàng** — **API thật** (13 endpoint `/order/*`,
 * khảo sát api-docs + kiểm thử trên dữ liệu thật 2026-08-18, PLAN Phase 11).
 *
 * Không còn nhánh mock: lớp mock đoán từ Phase 6 (`src/mocks/order.ts`) đã được xoá.
 *
 * Phân quyền: **toàn bộ `[STAFF]`** — khác các domain khác, không có endpoint nào cần ADMIN.
 * Backend tự giới hạn phạm vi: STAFF/ADMIN chỉ thấy đơn chi nhánh mình, chỉ SUPER_ADMIN
 * lọc được theo `branchId` và **bắt buộc** truyền `branchId` khi tạo đơn.
 */
export const orderApi = {
    /**
     * `[STAFF] POST /order/cart/preview` — tính tiền giỏ.
     *
     * **Không ghi DB, không giữ tồn.** Trả kèm `available`/`insufficient` từng dòng để cảnh báo
     * sớm ⇒ màn POS không cần tự tra tồn. Nhưng tồn có thể đổi giữa preview và create ⇒
     * **vẫn phải xử lý `error.stock.insufficient` ở bước `create`**.
     */
    cartPreview(payload: CartPreviewReq, signal?: AbortSignal) {
        return apiClient.post<CartPreview>('/order/cart/preview', payload, { signal })
    },

    /**
     * `[STAFF] POST /order` — tạo đơn ở trạng thái `PENDING`.
     *
     * ⚠️ **Trừ tồn NGAY tại đây** (mô hình không giữ chỗ). Thiếu hàng ⇒ `error.stock.insufficient`
     * (HTTP 400), đơn không được tạo và tồn không bị hụt (backend rollback sạch).
     */
    create(payload: CreateOrderReq) {
        return apiClient.post<Order>('/order', payload)
    },

    /**
     * `[STAFF] POST /order/search`.
     * ⚠️ `lines` và `payments` trả **`null`** ở đây — muốn có phải gọi `getById`.
     */
    search(body: OrderSearchReq, pagination?: SearchPagination, signal?: AbortSignal) {
        return search<BaseListRes<Order>>('/order/search', body, pagination, { signal })
    },

    /** `[STAFF] GET /order/{id}` — bản duy nhất có `lines` + `payments` đầy đủ. */
    getById(id: string, signal?: AbortSignal) {
        return apiClient.get<Order>(`/order/${id}`, { signal })
    },

    /**
     * `[STAFF] PUT /order/{id}` — chỉ sửa được khi còn `PENDING` (`error.order.notEditable`).
     *
     * Backend hoàn tồn dòng cũ rồi trừ theo dòng mới trong cùng transaction, **và đối soát lại
     * `paymentStatus`**: tổng tiền tăng ⇒ về `UNPAID`; giảm xuống ≤ số đã thu ⇒ `PAID`.
     */
    update(id: string, payload: CreateOrderReq) {
        return apiClient.put<Order>(`/order/${id}`, payload)
    },

    /** `[STAFF] POST /order/{id}/confirm` — `PENDING → CONFIRMED`. Không đụng kho. */
    confirm(id: string) {
        return apiClient.post<Order>(`/order/${id}/confirm`)
    },

    /**
     * `[STAFF] POST /order/{id}/pack` — `CONFIRMED → PACKED`.
     * ⚠️ **Không trừ tồn lần hai** (tồn đã trừ từ lúc tạo đơn) — đã kiểm chứng.
     */
    pack(id: string) {
        return apiClient.post<Order>(`/order/${id}/pack`)
    },

    /** `[STAFF] POST /order/{id}/ship` — `PACKED → SHIPPING`. Không đụng kho. */
    ship(id: string) {
        return apiClient.post<Order>(`/order/${id}/ship`)
    },

    /**
     * `[STAFF] POST /order/{id}/complete` — `SHIPPING → COMPLETED`.
     *
     * ⚠️ Yêu cầu đơn **đang `SHIPPING`** và **đã thu đủ** (`paymentStatus === 'PAID'`); sai điều
     * kiện ⇒ `error.order.invalidStatus`.
     *
     * ⚠️ **Chỉ dùng cho đơn `ONLINE`/`OTHER`.** Đơn **`POS` tự `COMPLETED` ngay ở bước `pay()`**
     * (backend 2026-08-22) ⇒ gọi thêm `complete()` sẽ luôn lỗi. Xem ghi chú ở `pay()`.
     */
    complete(id: string) {
        return apiClient.post<Order>(`/order/${id}/complete`)
    },

    /**
     * `[STAFF] POST /order/{id}/cancel` — huỷ được ở **mọi trạng thái trước `COMPLETED`**.
     *
     * Backend **cộng trả tồn toàn bộ dòng hàng**, và nếu đơn đã thu thì **tự sinh dòng hoàn tiền**
     * rồi đặt `paymentStatus = REFUNDED` — FE **không có** nút "Hoàn tiền" riêng.
     * Lý do huỷ được lưu vào `description` của đơn.
     */
    cancel(id: string, payload?: CancelOrderReq) {
        return apiClient.post<Order>(`/order/${id}/cancel`, payload ?? {})
    },

    /**
     * `[STAFF] POST /order/{id}/payment` — ghi nhận thanh toán.
     *
     * ⚠️ **Thu đúng 1 lần, 1 hình thức, toàn bộ tiền** (đổi 2026-08-15): chỉ gửi `method`,
     * backend luôn thu đủ `totalAmount`. Thu lần 2 trên đơn đã `PAID` ⇒ `error.order.alreadyPaid`
     * (HTTP 400) ⇒ **FE phải disable nút thu khi `paymentStatus === 'PAID'`**, đừng để bấm rồi mới lỗi.
     * Hai lần thu đồng thời ⇒ `409 error.dataIntegrity.violation` (unique constraint) — xử lý
     * như `error.concurrentModification`: tải lại đơn.
     *
     * ⚠️ **Đơn `POS`: bước này tự đóng luôn đơn** (backend 2026-08-22) — bán tại quầy không có
     * khâu giao vận nên `payment` đặt thẳng `status = COMPLETED` + `completedDate`, bỏ qua
     * `confirm`/`pack`/`ship`. ⇒ **Không gọi `complete()` sau `pay()` với đơn POS**, sẽ nhận
     * `error.order.invalidStatus`. Đơn `ONLINE` không bị ảnh hưởng, vẫn đi hết vòng đời.
     */
    pay(id: string, payload: OrderPaymentReq) {
        return apiClient.post<Order>(`/order/${id}/payment`, payload)
    },

    /**
     * `[STAFF] POST /order/{id}/note` — ghi chú nội bộ.
     * ⚠️ Bị chặn trên đơn đã đóng (`error.order.alreadyClosed`) để không ghi đè mất lý do huỷ.
     */
    note(id: string, payload: OrderNoteReq) {
        return apiClient.post<Order>(`/order/${id}/note`, payload)
    },

    /** `[STAFF] GET /order/{id}/invoice` — dữ liệu hoá đơn **dạng JSON để FE tự in** (không phải PDF). */
    invoice(id: string, signal?: AbortSignal) {
        return apiClient.get<Invoice>(`/order/${id}/invoice`, { signal })
    },
}
