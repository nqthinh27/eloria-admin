import { apiBaseUrl } from '@/config/app'
import { joinUrl, normalizeImagePath } from '@/lib/url-path'

/**
 * Hợp đồng khung ảnh — nửa **admin** của `35.3.eloria-client/docs/image-spec.md` (PLAN Phase 22).
 *
 * ⚠️ Số liệu ở đây **chép từ §2–§3 của tài liệu đó**, không tự chế. Muốn đổi số ⇒ sửa tài liệu trước,
 * rồi sửa đồng thời `35.3.eloria-client/src/lib/image-frames.ts` (§6 của tài liệu).
 */

export type ImageSize = { w: number; h: number }

export type ImageSpecKey =
    | 'PRODUCT'
    | 'CATEGORY_TILE'
    | 'HOME_HERO'
    | 'BANNER_WIDE'
    | 'POST_COVER'
    | 'OG_IMAGE'
    | 'LOGO_SQUARE'

export type ImageFormat = 'jpg' | 'png' | 'webp'

export type ImageSpec = {
    /** Rộng ÷ cao của khung desktop — dùng thẳng cho `aspect-ratio`. */
    ratio: number
    /** Nhãn hiển thị cho người nhập ("4:5") — số lẻ giữ nguyên dấu phẩy kiểu Việt. */
    ratioLabel: string
    recommended: ImageSize
    /** Nhỏ hơn mức này ⇒ **chặn** (ảnh vỡ khi phóng to). */
    min: ImageSize
    maxBytes: number
    /** Định dạng **khuyến nghị**; định dạng backend nhận nhưng ngoài danh sách này chỉ bị cảnh báo mềm. */
    formats: readonly ImageFormat[]
    /** `contain` = logo, ảnh nằm trọn trong khung; còn lại `object-cover`. */
    fit: 'cover' | 'contain'
    /** Vùng an toàn trên ảnh kích thước `recommended`, nằm chính giữa (§3). */
    safeZone?: ImageSize
    /** Tỉ lệ khung mobile mà storefront dựng (§3) — chỉ spec full-bleed mới có. */
    mobile?: { ratio: number; ratioLabel: string }
}

const KB = 1024
const MB = 1024 * KB

/** Trần backend cho mọi luồng ảnh trừ ảnh sản phẩm (`FileServiceImpl`: 2MB). */
const MAX_BYTES = 2 * MB
/** Trần ảnh sản phẩm (2026-10-29): `max-file-size` 15MB + kiểm riêng ở `FileServiceImpl`. */
export const PRODUCT_MAX_BYTES = 15 * MB

export const IMAGE_SPEC: Record<ImageSpecKey, ImageSpec> = {
    PRODUCT: {
        ratio: 4 / 5,
        ratioLabel: '4:5',
        recommended: { w: 1600, h: 2000 },
        min: { w: 1000, h: 1250 },
        maxBytes: PRODUCT_MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
    },
    CATEGORY_TILE: {
        ratio: 4 / 5,
        ratioLabel: '4:5',
        recommended: { w: 800, h: 1000 },
        min: { w: 480, h: 600 },
        maxBytes: MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
    },
    HOME_HERO: {
        ratio: 21 / 10,
        ratioLabel: '21:10',
        recommended: { w: 2520, h: 1200 },
        min: { w: 1890, h: 900 },
        maxBytes: MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
        safeZone: { w: 960, h: 1200 },
        mobile: { ratio: 4 / 5, ratioLabel: '4:5' },
    },
    BANNER_WIDE: {
        ratio: 9 / 2,
        ratioLabel: '9:2',
        recommended: { w: 2520, h: 560 },
        min: { w: 1800, h: 400 },
        maxBytes: MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
        safeZone: { w: 1000, h: 560 },
        mobile: { ratio: 16 / 9, ratioLabel: '16:9' },
    },
    POST_COVER: {
        ratio: 16 / 9,
        ratioLabel: '16:9',
        recommended: { w: 1920, h: 1080 },
        min: { w: 1280, h: 720 },
        maxBytes: MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
    },
    OG_IMAGE: {
        ratio: 1.91,
        ratioLabel: '1,91:1',
        recommended: { w: 1200, h: 630 },
        min: { w: 600, h: 315 },
        maxBytes: MAX_BYTES,
        formats: ['jpg', 'png'],
        fit: 'cover',
        safeZone: { w: 630, h: 630 },
    },
    LOGO_SQUARE: {
        ratio: 1,
        ratioLabel: '1:1',
        recommended: { w: 512, h: 512 },
        min: { w: 256, h: 256 },
        maxBytes: MAX_BYTES,
        formats: ['png'],
        fit: 'contain',
        // Logo nằm trong 448×448, chừa lề 6,25 % mỗi bên (§3).
        safeZone: { w: 448, h: 448 },
    },
}

/** Ảnh cover danh mục tự chuyển mỗi 4 giây (handoff P13.1 — storefront chạy đúng nhịp này). */
export const COVER_ROTATE_MS = 4000
/** Số ô cover tối đa của một danh mục (`coverLink1..5`). */
export const COVER_SLOT_COUNT = 5

/** Định dạng backend nhận (`FileServiceImpl` kiểm nội dung thật — không SVG). */
export const BACKEND_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

const MIME_TO_FORMAT: Record<string, ImageFormat | undefined> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

/** Lệch tỉ lệ ≤ 2 % coi như đúng (§5). */
const RATIO_TOLERANCE = 0.02

export type ImageIssueCode = 'format' | 'formatSoft' | 'tooLarge' | 'belowMin' | 'ratio'

export type ImageIssue = {
    code: ImageIssueCode
    /** `true` ⇒ chặn gửi; `false` ⇒ chỉ cảnh báo. */
    blocking: boolean
    /** Tham số nội suy cho chuỗi i18n `image:issue.<code>` — **không** nhúng số vào chuỗi dịch. */
    params: Record<string, string | number>
}

/** Khoá i18n (namespace `image`) của một vấn đề ảnh — `ratio` tách đôi theo hướng cắt. */
export function issueKey(issue: ImageIssue): string {
    if (issue.code === 'ratio') {
        return issue.params.side === 'sides' ? 'issue.ratioSides' : 'issue.ratioTopBottom'
    }
    return `issue.${issue.code}`
}

export type ImageInspection = {
    /** `ok` = không vấn đề · `warn` = có cảnh báo nhưng gửi được · `blocked` = phải chọn ảnh khác. */
    status: 'ok' | 'warn' | 'blocked'
    issues: ImageIssue[]
    width: number
    height: number
}

export type ImageFacts = {
    width: number
    height: number
    /** Chỉ có khi ảnh đến từ file; ảnh nhập bằng link thì không biết dung lượng/định dạng. */
    bytes?: number
    mime?: string
}

export function formatBytes(bytes: number): string {
    if (bytes >= MB) return `${Number((bytes / MB).toFixed(1)).toLocaleString('vi-VN')} MB`
    return `${Math.round(bytes / KB)} KB`
}

/**
 * Chấm một ảnh theo bảng §5 của `image-spec.md`. Hàm thuần — không đụng DOM, test được.
 *
 * Thứ tự: sai định dạng / quá nặng / dưới min ⇒ **chặn**; lệch tỉ lệ > 2 % ⇒ **cảnh báo** kèm cắt bao
 * nhiêu, ở đâu (cắt hai bên khi ảnh rộng hơn khung, cắt trên-dưới khi ảnh cao hơn).
 */
export function evaluateImage(spec: ImageSpec, facts: ImageFacts): ImageInspection {
    const issues: ImageIssue[] = []
    const { width, height, bytes, mime } = facts

    if (mime) {
        if (!(BACKEND_IMAGE_MIME as readonly string[]).includes(mime)) {
            issues.push({ code: 'format', blocking: true, params: {} })
        } else {
            const format = MIME_TO_FORMAT[mime]
            if (format && !spec.formats.includes(format)) {
                issues.push({
                    code: 'formatSoft',
                    blocking: false,
                    params: { formats: spec.formats.map((f) => f.toUpperCase()).join(' · ') },
                })
            }
        }
    }

    if (bytes !== undefined && bytes > spec.maxBytes) {
        issues.push({
            code: 'tooLarge',
            blocking: true,
            params: { size: formatBytes(bytes), max: formatBytes(spec.maxBytes) },
        })
    }

    if (width < spec.min.w || height < spec.min.h) {
        issues.push({
            code: 'belowMin',
            // Chỉ khuyến nghị của FE (backend không kiểm kích thước) ⇒ cảnh báo, vẫn cho lưu.
            blocking: false,
            params: { w: width, h: height, minW: spec.min.w, minH: spec.min.h },
        })
    }

    const imageRatio = width / height
    if (Math.abs(imageRatio / spec.ratio - 1) > RATIO_TOLERANCE) {
        const wider = imageRatio > spec.ratio
        // Ảnh rộng hơn khung ⇒ mất hai bên; cao hơn khung ⇒ mất trên-dưới.
        const cut = wider ? 1 - spec.ratio / imageRatio : 1 - imageRatio / spec.ratio
        issues.push({
            code: 'ratio',
            blocking: false,
            params: {
                w: width,
                h: height,
                ratio: spec.ratioLabel,
                percent: Math.round(cut * 100),
                side: wider ? 'sides' : 'topBottom',
            },
        })
    }

    const status = issues.some((i) => i.blocking) ? 'blocked' : issues.length ? 'warn' : 'ok'
    return { status, issues, width, height }
}

/** Đọc kích thước thật của file **trước khi gửi** (`createImageBitmap`, không cần thêm thư viện). */
export async function inspectImageFile(file: File, spec: ImageSpec): Promise<ImageInspection> {
    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file)
    } catch {
        // Không giải mã được ⇒ coi như sai định dạng (file hỏng / không phải ảnh).
        return {
            status: 'blocked',
            issues: [{ code: 'format', blocking: true, params: {} }],
            width: 0,
            height: 0,
        }
    }
    const { width, height } = bitmap
    bitmap.close()
    return evaluateImage(spec, { width, height, bytes: file.size, mime: file.type })
}

/**
 * Đo kích thước ảnh theo **link** (chế độ nhập URL). Không biết dung lượng/định dạng nên chỉ chấm
 * kích thước + tỉ lệ. Trả `null` khi ảnh không tải được.
 */
export function measureImageUrl(
    src: string,
    signal?: AbortSignal,
): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
        const img = new Image()
        const done = (result: { width: number; height: number } | null) => {
            img.onload = null
            img.onerror = null
            signal?.removeEventListener('abort', onAbort)
            resolve(result)
        }
        const onAbort = () => {
            img.src = ''
            done(null)
        }
        img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => done(null)
        signal?.addEventListener('abort', onAbort)
        img.src = src
    })
}

/**
 * Giá trị lưu trong DB → `src` hiển thị.
 *
 * - Link tuyệt đối (`http(s)://`, `//`, `data:`) và đường dẫn gốc (`/media/...` — tài nguyên tĩnh của
 *   storefront, như dữ liệu seed `category.image_link1`) dùng **nguyên văn**.
 * - Tên file tương đối (ảnh do backend lưu qua upload) đi qua `GET /image?imageUrl=` (`[ANONYMOUS]`),
 *   giống ảnh sản phẩm.
 *
 * ⚠️ Đường dẫn gốc chỉ xem trước được khi origin phục vụ nó cùng origin với admin; nếu không, ô ảnh sẽ
 * báo "không tải được" — đúng với thực tế là admin không nhìn thấy file đó.
 */
export function resolveImageSrc(value: string): string {
    // Ảnh upload danh mục/thương hiệu (BE31) · bài viết/banner (P15) trả `/category/<file>` · `/brand/<file>`
    // · `/post/<file>` · `/banner/<file>`, sản phẩm `/product/<file>`, avatar `/avatar/<file>` (đủ các thư mục
    // `FileService.FOLDER_*`) — dạng đường dẫn gốc nhưng backend lưu, phải đi qua `/image`;
    // chỉ `/media/**` (seed storefront) mới dùng nguyên văn. So mẫu trên dạng đã chuẩn hoá ⇒ `product/x`,
    // `//product//x` cũng nhận ra là ảnh backend (không nhầm `//product/...` thành URL protocol-relative).
    if (/^\/(category|brand|post|banner|product|avatar)\//.test(normalizeImagePath(value))) return apiImageUrl(value)
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('/')) return value
    return apiImageUrl(value)
}

/**
 * `GET /image?imageUrl=` (`[ANONYMOUS]`) cho một đường dẫn ảnh backend — **cách duy nhất** dựng URL ảnh
 * ở admin. Đường dẫn được chuẩn hoá (`lib/url-path.ts`) trước khi gửi, base nối bằng `joinUrl`.
 */
export function apiImageUrl(path: string): string {
    return `${joinUrl(apiBaseUrl, 'image')}?imageUrl=${encodeURIComponent(normalizeImagePath(path))}`
}
