import { storeConfig } from '@/config/app'
import i18n from '@/i18n'
import { formatInvoiceDateTime, formatVnd } from '@/lib/format'
import { EPaymentStatus, type Invoice } from '@/types/order'

/** Chặn HTML injection từ dữ liệu (tên khách, ghi chú… do người dùng nhập). */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * In hoá đơn từ `GET /order/{id}/invoice`.
 *
 * Backend **chỉ trả JSON, không sinh PDF** ⇒ FE tự dựng HTML rồi gọi `window.print()` trong một
 * cửa sổ riêng. Dùng cửa sổ riêng thay vì `@media print` trên trang hiện tại để không phải gánh
 * toàn bộ CSS của app vào bản in, và để người bán in xong quay lại POS không mất giỏ hàng.
 *
 * ✅ **Một lời gọi API là đủ**: từ 2026-08-21 `InvoiceResDTO` trả cả `staffName`, nên hàm này
 * **chỉ nhận `invoice`** — không ghép thêm `/account/me` hay `GET /order/{id}`. Phần letterhead
 * (logo, hotline, website, chính sách đổi trả) vẫn lấy từ `storeConfig` vì backend cố ý không trả
 * (javadoc DTO: *"letterhead/logo/QR ngân hàng do frontend tự gắn"*).
 *
 * ### Bố cục (user chốt 2026-08-21) — **khung dọc, khổ giấy in nhiệt**
 *
 * ```
 *              é l o r i a            ← logo chữ, căn giữa (storeConfig.brandMark)
 *          CHI NHÁNH TRUNG TÂM        ← in đậm, IN HOA, căn giữa
 *        12 Nguyễn Trãi, Bến Thành    ← địa chỉ chi nhánh, căn giữa
 *          Hotline: 0865 698 683      ← in đậm, căn giữa
 *           HÓA ĐƠN MUA HÀNG          ← fix cứng, IN HOA in đậm, căn giữa
 *  ─────────────────────────────────
 *  Thời gian : 14:32:07 21/08/2026    ← từ đây căn TRÁI
 *  Mã đơn    : HK-20260821-143207-0007
 *  Khách hàng: Chị Lan
 *  SĐT       : 0901234567
 *  Nhân viên : Nguyễn Văn A
 *  ─────────────────────────────────
 *  … nội dung (bảng hàng + tổng tiền + thanh toán) …
 *  ─────────────────────────────────
 *  … chân trang: đổi trả, website, lời cảm ơn …
 * ```
 *
 * ### Cỡ chữ
 *
 * Nền `13px` (trước đây `11–12px`) và mọi thành phần được nâng theo — hoá đơn in nhiệt đọc ở
 * khoảng cách xa hơn màn hình, và bản cũ bị người dùng phản hồi là quá nhỏ. `@page` khai khổ
 * **80mm** (giấy in nhiệt phổ biến) với lề 0 để máy in POS không tự co nội dung.
 *
 * ### Chiết khấu từng sản phẩm
 *
 * Mỗi dòng hàng in thêm một dòng con **"CK: −20.000đ"** khi `line.discountAmount > 0` — dữ liệu
 * này có sẵn từ mô hình **giảm giá 2 tầng** của backend (2026-08-21). `lineTotal` backend trả về
 * **đã trừ** chiết khấu dòng, còn `discountAmount` ở header **đã gộp cả hai tầng** ⇒ hoá đơn chỉ
 * hiển thị, tuyệt đối **không tự cộng lại** (sẽ trừ hai lần).
 *
 * @returns `false` khi trình duyệt chặn popup — caller nên báo người dùng.
 */
export function printInvoice(invoice: Invoice): boolean {
    const t = i18n.t
    const win = window.open('', '_blank', 'width=460,height=720')
    if (!win) return false

    const tr = (key: string, params?: Record<string, unknown>) =>
        t(key, { ns: 'order', ...params }) as string

    /* ---------------- Bảng hàng ---------------- */
    const lines = (invoice.lines ?? [])
        .map((line) => {
            const variant = [line.size, line.color].filter(Boolean).join(' · ')
            const discount = line.discountAmount ?? 0
            const gross = line.unitAmount * line.quantity

            return `
                <tr>
                    <td colspan="3" class="item-name">${escapeHtml(line.productName ?? '')}${
                        line.isGift ? ` <span class="tag">${escapeHtml(tr('order.pos.cart.gift'))}</span>` : ''
                    }</td>
                </tr>
                ${
                    variant
                        ? `<tr><td colspan="3" class="item-variant">${escapeHtml(variant)}</td></tr>`
                        : ''
                }
                <tr>
                    <td class="item-calc">${line.quantity} × ${formatVnd(line.unitAmount)}</td>
                    <td></td>
                    <td class="num">${formatVnd(gross)}</td>
                </tr>
                ${
                    /* Chiết khấu riêng dòng — chỉ in khi thực sự có, để hoá đơn không loãng. */
                    discount > 0
                        ? `<tr>
                               <td colspan="2" class="item-discount">${escapeHtml(
                                   tr('order.invoice.lineDiscount'),
                               )}</td>
                               <td class="num item-discount">−${formatVnd(discount)}</td>
                           </tr>
                           <tr>
                               <td colspan="2" class="item-linetotal">${escapeHtml(
                                   tr('order.invoice.lineTotal'),
                               )}</td>
                               <td class="num item-linetotal">${formatVnd(line.lineTotal)}</td>
                           </tr>`
                        : ''
                }`
        })
        .join('')

    /* Chỉ hiện dòng thu/hoàn thực sự có — mỗi đơn tối đa 1 `PAID` + 1 `REFUNDED`. */
    const payments = (invoice.payments ?? [])
        .map((payment) => {
            const method = tr(`order.paymentMethod.${payment.method}`)
            const label =
                payment.status === EPaymentStatus.REFUNDED
                    ? tr('order.detail.refundedAt', { method })
                    : tr('order.detail.paidAt', { method })
            return `<div class="row"><span>${escapeHtml(label)}</span><span>${formatVnd(
                payment.amount,
            )}</span></div>`
        })
        .join('')

    const optionalRow = (label: string, amount: number | null | undefined, negative = false) =>
        amount
            ? `<div class="row"><span>${escapeHtml(label)}</span><span>${
                  negative ? '−' : ''
              }${formatVnd(amount)}</span></div>`
            : ''

    /** Dòng thông tin căn trái, nhãn có bề rộng cố định để dấu `:` thẳng hàng. */
    const infoRow = (label: string, value: string | null | undefined) =>
        value
            ? `<div class="info"><span class="info-label">${escapeHtml(
                  label,
              )}</span><span class="info-value">${escapeHtml(value)}</span></div>`
            : ''

    /* Hotline chung của hệ thống; chưa cấu hình thì lùi về SĐT chi nhánh do backend trả. */
    const hotline = storeConfig.hotline || invoice.branchPhone

    win.document.write(`<!doctype html>
<html lang="${i18n.resolvedLanguage ?? 'vi'}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(invoice.orderCode)}</title>
<style>
    /* Khổ giấy in nhiệt 80mm — khai rõ để máy in POS không tự co nội dung. */
    @page { size: 80mm auto; margin: 0; }

    * { box-sizing: border-box; }

    body {
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        /* Nền 13px: bản cũ 11–12px bị phản hồi là quá nhỏ khi in nhiệt. */
        font-size: 13px;
        line-height: 1.45;
        margin: 0 auto;
        padding: 10px 12px;
        max-width: 80mm;
        color: #000;
    }

    /* ---- Đầu trang (căn giữa) ---- */
    .center { text-align: center; }

    /* Logo dạng chữ — khoảng trắng giữa các ký tự là một phần của wordmark, giữ nguyên. */
    .brand {
        font-size: 22px;
        font-weight: 300;
        letter-spacing: 0.06em;
        margin: 0 0 6px;
    }
    .branch {
        font-size: 15px;
        font-weight: 700;
        text-transform: uppercase;
        margin: 0 0 2px;
    }
    .branch-address { font-size: 12.5px; margin: 0 0 2px; }
    .hotline { font-size: 13px; font-weight: 700; margin: 0; }

    .doc-title {
        font-size: 17px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin: 10px 0 2px;
    }

    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }

    /* ---- Khối thông tin đơn (căn trái) ---- */
    .info { display: flex; gap: 6px; font-size: 13px; }
    /* Bề rộng cố định để dấu ":" của mọi dòng thẳng hàng nhau. */
    .info-label { flex: 0 0 82px; }
    .info-label::after { content: ":"; }
    .info-value { flex: 1; font-weight: 600; word-break: break-word; }

    /* ---- Bảng hàng ---- */
    table { width: 100%; border-collapse: collapse; }
    th {
        text-align: left;
        font-size: 12px;
        text-transform: uppercase;
        border-bottom: 1px solid #000;
        padding: 3px 0;
    }
    td { padding: 0; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }

    .item-name { font-size: 13.5px; font-weight: 600; padding-top: 6px; }
    .item-variant { font-size: 12px; }
    .item-calc { font-size: 12.5px; }
    /* Chiết khấu dòng + thành tiền dòng — thụt vào cho thấy phụ thuộc dòng hàng phía trên. */
    .item-discount { font-size: 12.5px; font-style: italic; padding-left: 8px; }
    .item-linetotal { font-size: 12.5px; font-weight: 600; padding-left: 8px; }
    .tag { font-size: 11px; font-weight: 400; }

    /* ---- Tổng tiền ---- */
    .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; font-size: 13px; }
    .total {
        font-weight: 700;
        font-size: 16px;
        border-top: 1px solid #000;
        margin-top: 5px;
        padding-top: 6px;
    }

    /* ---- Chân trang ---- */
    .footer { font-size: 12px; text-align: center; margin-top: 4px; }
    .footer p { margin: 2px 0; }
    .thanks { font-weight: 700; font-size: 13px; margin-top: 6px; }
</style>
</head>
<body>
    <!-- ============ Đầu trang: logo → chi nhánh → địa chỉ → hotline ============ -->
    <div class="center">
        <p class="brand">${escapeHtml(storeConfig.brandMark)}</p>
        ${invoice.branchName ? `<p class="branch">${escapeHtml(invoice.branchName)}</p>` : ''}
        ${
            invoice.branchAddress
                ? `<p class="branch-address">${escapeHtml(invoice.branchAddress)}</p>`
                : ''
        }
        ${
            hotline
                ? `<p class="hotline">${escapeHtml(tr('order.invoice.hotline'))}: ${escapeHtml(
                      hotline,
                  )}</p>`
                : ''
        }
        <!-- Tiêu đề fix cứng theo yêu cầu, không đổi theo loại đơn. -->
        <p class="doc-title">${escapeHtml(tr('order.invoice.title'))}</p>
    </div>

    <hr />

    <!-- ============ Thông tin đơn (căn trái) ============ -->
    ${infoRow(tr('order.invoice.time'), formatInvoiceDateTime(invoice.orderDate))}
    ${infoRow(tr('order.invoice.orderCode'), invoice.orderCode)}
    ${infoRow(
        tr('order.invoice.customer'),
        invoice.customerName || tr('order.pos.cart.guest'),
    )}
    ${infoRow(tr('order.invoice.phone'), invoice.customerPhone)}
    ${infoRow(tr('order.invoice.staff'), invoice.staffName)}
    ${infoRow(tr('order.detail.shippingAddress'), invoice.shippingAddress)}

    <hr />

    <!-- ============ Nội dung hoá đơn ============ -->
    <table>
        <thead>
            <tr>
                <th colspan="2">${escapeHtml(tr('order.pos.column.product'))}</th>
                <th class="num">${escapeHtml(tr('order.detail.total'))}</th>
            </tr>
        </thead>
        <tbody>${lines}</tbody>
    </table>

    <hr />

    <div class="row"><span>${escapeHtml(tr('order.detail.subtotal'))}</span><span>${formatVnd(
        invoice.subtotal,
    )}</span></div>
    ${
        /* Con số backend trả về ĐÃ gộp chiết khấu dòng + chiết khấu chung — không cộng lại. */
        optionalRow(tr('order.detail.discount'), invoice.discountAmount, true)
    }
    ${
        /*
         * Dòng diễn giải **khuyến mại nào** đã áp (backend bổ sung 3 field 2026-09-08).
         * ⚠️ **Không phải khoản trừ thêm** — số tiền đã nằm trong `discountAmount` ở trên; đây chỉ
         * trả lời câu hỏi "giảm vì đâu" mà trước đây hoá đơn không nói được.
         * KM tự động thì `promotionCode` là `null` ⇒ chỉ in tên chương trình.
         */
        invoice.promotionName
            ? `<div class="info"><span class="info-label">${escapeHtml(
                  tr('order.invoice.promotion'),
              )}</span><span class="info-value">${escapeHtml(
                  invoice.promotionCode
                      ? `${invoice.promotionName} (${invoice.promotionCode})`
                      : invoice.promotionName,
              )}</span></div>`
            : ''
    }
    ${optionalRow(tr('order.detail.shippingFee'), invoice.shippingFee)}
    <div class="row total"><span>${escapeHtml(tr('order.detail.total'))}</span><span>${formatVnd(
        invoice.totalAmount,
    )}</span></div>

    ${payments ? `<hr />${payments}` : ''}
    ${invoice.note ? `<hr /><div class="row"><span>${escapeHtml(invoice.note)}</span></div>` : ''}

    <!-- ============ Chân trang ============ -->
    <hr />
    <div class="footer">
        <p>${escapeHtml(tr('order.invoice.returnPolicy', { days: storeConfig.returnPolicyDays }))}</p>
        ${storeConfig.website ? `<p>${escapeHtml(storeConfig.website)}</p>` : ''}
        ${storeConfig.email ? `<p>${escapeHtml(storeConfig.email)}</p>` : ''}
        <p class="thanks">${escapeHtml(tr('order.invoice.thanks'))}</p>
    </div>
</body>
</html>`)
    win.document.close()
    win.focus()
    win.print()
    return true
}
