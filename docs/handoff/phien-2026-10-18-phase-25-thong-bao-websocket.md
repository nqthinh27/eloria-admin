# Bàn giao phiên 2026-10-18 — Phase 25: chuông thông báo · WebSocket · QR realtime · mã đơn mới

> **Nhánh:** `develop` · **chưa commit** (toàn bộ ở working tree — user/PO chưa yêu cầu commit)
> **Cổng kiểm tra:** `npm run lint` 0 lỗi (5 warning shadcn có sẵn) · `npm run build` ✅ (tsc -b + vite)
> **Đã kiểm chứng bằng gì:** **API/WS thật** trên backend local `localhost:8080` (Phase 18a–c đã đóng, 38/38 kịch bản phía backend) +
> **UI thật** qua trình duyệt trong app (đăng nhập `superadmin` và `staffone` — tài khoản seed dev). Chi tiết từng mục ở "Kiểm chứng" bên dưới.
> **Contract nguồn:** `35.1.eloria-backend/docs/api/fe-handoff-phase18-admin.md` (thay bản `…18ab…`).
> **Review:** đã tự rà 6 góc, **chưa sửa** — danh sách findings ở `fe-admin-p18-review.md` (thư mục ghi chú chung ngoài repo: `C:/Users/ADMIN/AppData/Roaming/Claude/side-session-notes/local_c8080e54-b41d-421a-93be-cff0628c85aa/`) (4 MEDIUM · 9 LOW, tóm tắt ở mục "Việc còn lại").

## Phần 1 — Lớp realtime (WebSocket STOMP)

### File mới / đổi
| File | Đổi gì |
|---|---|
| `package.json` · `package-lock.json` | + `@stomp/stompjs ^7.5.0` (PO duyệt trong plan; nối WS thuần, không `sockjs-client`) |
| `src/lib/realtime-client.ts` (mới) | Singleton `realtime` — **nơi duy nhất được mở WebSocket**. CONNECT kèm `Authorization: Bearer`, heartbeat 10s/10s, `reconnectDelay: 0` + backoff tự quản 1→2→5→10→20→30s (±10% jitter), mỗi lần thử một `Client` mới, refresh token trước khi nối lại, `resync` sau nối lại / tab hiện lại sau >30s. Export thuần: `reconnectDelayMs`, `buildBrokerUrl` |
| `src/lib/jwt.ts` (mới) | `readJwtExpiry`, `isTokenExpiringSoon` (đọc `exp`, không xác thực chữ ký) |
| `src/lib/api-client.ts` | + `renewAccessToken()` — dùng chung single-flight `/refresh`; `401/403` ⇒ `notifySessionExpired`, lỗi mạng ⇒ `unreachable` (thử lại, không đá ra) |
| `src/hooks/use-realtime.ts` (mới) | `useRealtime(destination, handler)` · `useRealtimeResync(cb)` |
| `src/contexts/RealtimeProvider.tsx` (mới) · `src/App.tsx` | Mở khi `status === 'authenticated'`, `stop()` khi logout/hết phiên |
| `vite.config.ts` | `ws: true` cho proxy `/v1.0` ở cả `server` lẫn `preview` |
| `CONVENTIONS.md` mục 4 | Luật: chỉ `realtime-client` mở WebSocket; nhận tin qua hook; resync bằng REST |

### Quyết định kỹ thuật đáng nhớ
1. **Mỗi lần nối lại tạo `Client` mới** thay vì để stompjs tự reconnect — vì `reconnectDelay: 0` giữ state `ACTIVE` không có socket, `activate()` bị bỏ qua; cách này cũng cho chèn bước refresh token vào giữa. Giá: tự quản generation/timer (xem M1 ở review).
2. **Backoff chỉ reset sau khi kết nối sống ≥10s** (`STABLE_AFTER_MS`) — nếu reset ngay lúc `onConnect`, một SUBSCRIBE bị server từ chối (ERROR + đóng socket) sẽ vòng nối–bị đuổi mỗi 1s mãi.
3. **Khung `ERROR` ⇒ `forceRefresh`** token ở lần thử sau (nghi token hỏng). Giá: ERROR do scope (không phải token) cũng gọi `/refresh` một lần mỗi vòng (L3 ở review).
4. **Token chỉ ở header `CONNECT`**, không lên URL; `localStorage` chỉ giữ tuỳ chọn âm thanh.
5. **`resync` chỉ phát khi đây là lần nối lại** (có thất bại trước đó hoặc đã từng nối) — lần nối đầu thành công ngay thì không, vì chuông đã tự gọi `unseen-count` lúc mount.

## Phần 2 — Chuông thông báo + deep-link

### File mới / đổi
| File | Đổi gì |
|---|---|
| `src/types/notification.ts` (mới) | `NotificationRes`, `NotificationPage` (keyset), envelope WS, `ENotificationRefType`, `ENotificationType` (gồm `ORDER_PAID`, `PAYMENT_UNMATCHED`) |
| `src/api/notification.ts` (mới) | `list(cursor)` (keyset, **không** `page`), `unseenCount`, `markAllSeen`, `markRead` |
| `src/lib/notification-state.ts` (mới) | Reducer thuần: badge cap 100 ⇒ `99+`, dedupe theo `id`, gộp trang đầu giữ tin WS mới hơn, nối trang kế, `readMarked`/`removed`; `notificationTarget(refType→route)` |
| `src/hooks/use-notifications.ts` (mới) | Contract 7 bước; `select()` xử lý `400 notExisted` êm |
| `src/components/shell/notification-bell.tsx` (mới) · `notification-icon.tsx` (mới) · `app-topbar.tsx` | Chuông thật thay placeholder; popover cuộn vô hạn (`IntersectionObserver`), skeleton/rỗng/lỗi, icon theo `type`, nút bật/tắt âm |
| `src/lib/notification-sound.ts` (mới) | "Ting" hai nốt bằng Web Audio; chỉ phát sau cử chỉ đầu tiên (autoplay policy); bật/tắt lưu `localStorage` |
| `src/hooks/use-open-from-query.ts` (mới) | Deep-link `?open=`: chạy cả khi đang đứng sẵn ở trang; mặc định xoá param bằng `replace`; `consume:false` cho chỗ chỉ đọc |
| `OrderListPage` · `ReturnListPage` · `ShiftListPage` · `inventory/LedgerTab` · `StockTab` · `InventoryPage` | Dùng `useOpenFromQuery` (đơn/ca/phiếu kho: **GET kiểm tra xem được trước** rồi mới mở dialog; `ReturnListPage.openDetail` nhận `id`) |
| i18n `menu` + `errors` (VI/EN) | Chuỗi chuông, `error.notification.notExisted/cursorInvalid` |

### Quyết định kỹ thuật đáng nhớ
1. **Route đích dùng `/orders?open={id}` (không phải `/orders/{id}` như gợi ý contract)** — admin không có route chi tiết; PO đã xác nhận (contract mục 7). Giá: phải thêm `useOpenFromQuery` cho 5 trang list.
2. **`InventoryPage` đọc `tab` với `consume:false`** — `setSearchParams(fn)` của react-router không xếp hàng, hai hook cùng xoá param trong một commit sẽ ghi đè nhau (lỗi này đã gặp thật lúc đo, tab Tồn kho còn sót `sku`/`branch`). Tab đích (`LedgerTab`/`StockTab`) tự xoá param của mình.
3. **Hiển thị `title`/`content` nguyên văn** (React text, không HTML) — server đã render tiếng Việt; UI EN vẫn hiện nội dung VI.
4. **`select()` đợi `markRead` xong mới điều hướng**; `notExisted` ⇒ gỡ dòng + toast nhẹ, **không** điều hướng; refType không có đích (`PAYMENT_TRANSACTION`) ⇒ chỉ đánh dấu đã đọc, popover ở lại.
5. **Tin WS chèn vào danh sách chỉ khi danh sách đã tải** (`loaded`); chưa tải thì chỉ +1 badge (trang đầu khi mở sẽ có tin đó).

## Phần 3 — Sự kiện đơn realtime + QR + mã đơn + chi nhánh

### File mới / đổi
| File | Đổi gì |
|---|---|
| `src/types/order.ts` | + `OrderRealtimeData`, `OrderRealtimeType`; comment mã đơn mới |
| `src/lib/order-realtime.ts` (mới) | `orderTopic`, `isOrderEventFresh` (bỏ tin `version` nhỏ hơn), `isPaidEvent`, `isPaymentRaceError` (`alreadyPaid` hoặc 409) |
| `src/hooks/use-order-realtime.ts` (mới) | Nghe `/topic/admin/order/{id}` khi `orderId != null`, bỏ tin cũ theo `version`, `onResync` sau nối lại |
| `pages/orders/components/qr-payment-dialog.tsx` | Tin `PAID` ⇒ hiện "Đã nhận tiền" ⇒ `onPaid` sau ~1,2s; **nút xác nhận tay giữ nguyên** làm dự phòng; đang `confirming` thì bỏ qua tin WS; GET bù sau nối lại |
| `pages/orders/components/order-detail-dialog.tsx` | Nhận tin ⇒ `refreshQuietly` (bỏ qua tin trùng trạng thái đang hiện); thu tay thua cuộc đua webhook ⇒ tải lại, `PAID` = thành công |
| `pages/pos/PosPage.tsx` | `syncPaidOrder`/`handleQrPaid`; `alreadyPaid`/409 ⇒ đọc lại đơn |
| `src/api/order.ts` | `pay(id, payload, options?)` để tắt toast mặc định |
| `pages/staff/components/branch-form-dialog.tsx` · i18n `staff` | Ô **Mã chi nhánh** tuỳ chọn, tự viết hoa, zod ≤6 ký tự `A-Z0-9`, hint + lỗi VI/EN |
| `types/branch.ts` · `print-invoice.ts` · `docs/backend/don-hang.md` · `docs/backend/README.md` | Comment/ghi chú mã đơn mới `{CN}-{yyMMdd}-{seq4}`; FE **không parse** mã đơn (đã grep) |

### Quyết định kỹ thuật đáng nhớ
1. **Tin WS không bao giờ được áp dụng trực tiếp lên dữ liệu đơn** — handler luôn đọc lại REST (hoặc chỉ đóng/mở dialog). Nhờ vậy tin cũ/sai thứ tự không thể làm UI lùi trạng thái; `version` chỉ là tối ưu. Giá: thêm một GET mỗi tin. Lý do: `OrderResDTO` **không có `version`** nên không so được với bản REST (gửi backend).
2. **Webhook vs bấm tay đúng lúc**: `400 alreadyPaid` **và** `409 concurrentModification` ⇒ tải lại, `PAID` = thành công, chưa `PAID` mới báo lỗi (contract mục 10).
3. **Ô mã chi nhánh ép HOA và regex `^[A-Z0-9]*$`** (PLAN) — chặt hơn backend (`^[A-Za-z0-9]*$`). Giá: chi nhánh cũ mã chữ thường không sửa được nếu không đổi mã (L4 ở review).

### Giả định tôi tự quyết (đổi được nếu bạn muốn khác)
- **U1** (mở chứng từ): điều hướng tới trang list + mở dialog (đề xuất PLAN, PO xác nhận cho đơn).
- **U2** (âm thanh): **có âm thanh nhẹ** theo PO 2026-10-18 (khác đề xuất ban đầu "không ở v1"); không dùng Notification API.
- **U3** (dependency stomp): đã được PO duyệt (nêu ở tin giao việc).
- Khi tin WS nhắc đến một thông báo đã có trong danh sách: **không** +1 badge, **vẫn** phát âm (L2).
- `unseen-count` gọi ngay khi vào app song song với nối WS (contract ghi "connect → count"); StrictMode dev làm nó chạy 2 lần — production 1 lần.
- Dữ liệu test: ca/phiếu đổi trả/thông báo seed mình tạo đã dọn; **chưa dọn** đơn + giao dịch webhook (xem cuối file).

## Kiểm chứng

**Đã đo thật (API/WS thật + UI thật, `superadmin`/`staffone`):**
- WS qua proxy Vite: tin tới ⇒ badge +1 và chèn đầu danh sách tức thời; mở chuông ⇒ badge 0.
- Cursor: 18 dòng, 2 trang, không trùng, tới "hết" (`hasMore=false`); `cursorInvalid`/`notExisted` đúng phản hồi contract.
- Badge `99+` (150 thông báo chưa xem chèn trực tiếp DB); badge 2 chữ số.
- Deep-link bấm từ chuông: `ORDER` · `WORK_SHIFT` · `WAREHOUSE_LEDGER` · `STOCK_ITEM` (lọc theo SKU + chi nhánh); `RETURN_REQUEST` nạp thẳng `/returns?open=<id>` (không bấm từ dòng chuông).
- Chứng từ ngoài phạm vi (STAFF + đơn online chưa gán chi nhánh ⇒ 403) và đơn không tồn tại (400) ⇒ toast, không dialog trống, không crash.
- Reconnect: rớt socket ⇒ nối lại ~1s; **tắt backend ~50s** ⇒ backoff 2→5→10→20→30s, nối lại ngay sau khi backend lên, có gọi lại `unseen-count`; logout đóng socket.
- Token: hết hạn ⇒ refresh rồi nối lại; token sai ⇒ server `ERROR` + đóng ⇒ refresh ⇒ nối lại; phiên không bị đá ra.
- 18c: webhook SEPAY `MATCHED` khi dialog QR đang mở ⇒ toast "Đã ghi nhận thanh toán", dialog đóng, đơn "Đã thanh toán"; admin `confirm` đơn ⇒ dialog chi tiết đổi "Đã xác nhận" ~2,5s; webhook sai số tiền ⇒ SUPER_ADMIN nhận `PAYMENT_UNMATCHED`; đơn mới mã `CNTT-261018-0001`.
- Logic thuần (reducer, dedupe, cursor, route, backoff, URL, JWT) kiểm bằng script esbuild+node dùng một lần — **không nằm trong repo**.

**CHƯA nhìn tận mắt / chưa đo:**
- Âm thanh trên trình duyệt thật; icon `ORDER_PAID`/`PAYMENT_UNMATCHED` trong chuông của SUPER_ADMIN (mới đọc payload API).
- Form chi nhánh trên UI; chi nhánh cũ mã dài/ký tự lạ bị `400` khi sửa.
- Đua bấm tay đúng lúc webhook (409); POS thật với đơn POS tự `COMPLETED`.
- nginx production (`proxy_read_timeout` 120s, kết nối >5 phút), `npm run preview` với proxy WS.
- Vai trò ADMIN (chỉ đo SUPER_ADMIN và STAFF); đổi chi nhánh/role giữa phiên.
- Kích thước bundle do stomp (chưa có baseline; bundle ~2,36 MB, 1 chunk).

## Việc còn lại / cần bạn chốt
| # | Việc | Mức độ |
|---|---|---|
| 1 | ✅ **Đã sửa 2026-10-18 (PO duyệt):** M1 (huỷ client dở dang trong `open()`) · M2 (POS tự nghe topic khi QR dialog không mở; QR dialog gọi `onPaid` cả khi đóng giữa lúc "Đã nhận tiền") · M3 (`?open=` kiểm UUID, `sku` có pattern riêng, `encodeURIComponent` trong `getById`) · M4 (`isNotificationRes`, `formatNotificationTime` try/catch, `ErrorBoundary` quanh chuông) · L2 (chỉ kêu khi tin thật sự mới) · L4 (regex mã chi nhánh không phân biệt hoa/thường) · L8 (`ApiError.toasted`, toast lỗi một lần) · L9 (comment `ELORIA` giữ đúng — PO chốt lại tiền tố). **Còn lại LOW:** L1, L3, L5, L6, L7 | — |
| 2 | Duyệt thêm test framework (Vitest) rồi lưu lại test cho `notification-state`, `order-realtime`, `jwt`, `reconnectDelayMs`, `useOpenFromQuery` (CONVENTIONS mục 8) | MEDIUM |
| 3 | Backend đã thêm `version` vào `OrderResDTO` (2026-10-18) ⇒ FE đã dùng để bỏ tin WS cũ; bản backend đang chạy lúc đo **chưa** trả field (FE xử lý khi `undefined`) — cần đo lại khi backend khởi động lại. `GET /order/{id}` không tồn tại trả 400 (chỉ ghi nhận) | LOW |
| 4 | ✅ Toast lỗi API hiện 2 lần — đã sửa (L8) | — |
| 5 | ✅ Comment `bank-account.ts`: PO chốt **nội dung CK có tiền tố `ELORIA`** (`ELORIA` + mã đơn bỏ gạch, ≤22 ký tự) — đã ghi lại cho đúng; FE vẫn không tự ghép | — |
| 6 | Kiểm 2 hạng mục chưa đo ở trên (nginx/preview, ADMIN, âm thanh, form chi nhánh) | LOW |

## Dữ liệu test còn sót
- Đơn `f11b8651-6e6a-4acc-8d8f-8870867d7577` (`CNTT-261018-0001`, đã **CANCELLED/REFUNDED**) + 2 giao dịch webhook `fe-admin-e2e-*` (1 `MATCHED`, 1 `NO_ORDER` giá trị 1.234đ) + các thông báo kèm theo — tạo lúc đo 18c, chưa dọn vì xoá đơn không hoàn tồn kho; chờ PO chốt có dọn bằng SQL không.
- Đã dọn: 150 thông báo seed `event_id='seed-fe-admin'`, 5 ca `CA-CNTT-20261017-001…005`, phiếu đổi trả `TH-CNTT-20261017-001` + thông báo của chúng.

## Phụ lục — sửa sau review (2026-10-18, PO duyệt)

| File | Đổi gì |
|---|---|
| `lib/realtime-client.ts` | M1: `open()` huỷ `this.client` dở dang trước khi tạo client mới |
| `pages/orders/components/qr-payment-dialog.tsx` | M2: `paidFiredRef` + cleanup gọi `onPaid` khi đóng lúc đã `received`; dùng `Order.version` qua hook |
| `pages/pos/PosPage.tsx` | M2: `useOrderRealtime` khi đơn chưa `PAID` và QR dialog không mở; `syncPaidOrder` không báo hai lần |
| `hooks/use-open-from-query.ts` · `StockTab` · `InventoryPage` · `api/{order,return,shift,inventory}.ts` | M3: `UUID_PATTERN` mặc định, pattern riêng cho `sku`/`tab`, `encodeURIComponent(id)` |
| `lib/notification-state.ts` · `api/notification.ts` · `hooks/use-notifications.ts` · `lib/notification-time.ts` (mới) · `components/error-boundary.tsx` (mới) · `notification-bell.tsx` · `app-topbar.tsx` | M4 + L2: type-guard WS/REST, thời gian an toàn, ErrorBoundary + chuông dự phòng, chỉ kêu khi tin mới |
| `types/order.ts` · `lib/order-realtime.ts` · `hooks/use-order-realtime.ts` · `order-detail-dialog.tsx` | Dùng `Order.version`: tin `version` nhỏ hơn bản đang hiển thị bị bỏ |
| `lib/api-error.ts` · `lib/api-client.ts` | L8: cờ `toasted` |
| `branch-form-dialog.tsx` | L4: regex `^[A-Za-z0-9]*$` (vẫn tự HOA khi gõ) |

**Đã đo sau sửa (UI thật, SUPER_ADMIN):** `?open=..%2Faccount%2Fme` bị bỏ qua (không dialog, không request lạ, param bị xoá) · UUID hợp lệ vẫn mở dialog · UUID không tồn tại ⇒ **một** toast · lint/build pass · kiểm logic thuần (type-guard, `isOrderEventFresh` có `displayedVersion`, `UUID_PATTERN`).
**Chưa đo:** M1 (cần đúng cửa sổ thời gian khi đổi tab lúc `reconnecting`) · M2 trên POS thật · M4 với tin hỏng thật/ErrorBoundary kích hoạt · so `version` REST↔WS (backend đang chạy chưa trả `version`) · L2 bằng tai.
