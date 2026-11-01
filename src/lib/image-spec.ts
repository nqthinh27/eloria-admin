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
    /** Nhãn hiển thị cho người nhập ("2:3") — số lẻ giữ nguyên dấu phẩy kiểu Việt. */
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

/**
 * Trần ảnh lớn (2026-10-29): ảnh sản phẩm · banner · danh mục (`image1/2`, `cover1..5`) · ảnh bìa và
 * ảnh nội dung bài viết — `max-file-size` 15MB + kiểm riêng ở `FileServiceImpl`.
 */
export const LARGE_IMAGE_MAX_BYTES = 15 * MB
/** Trần ảnh nhỏ (giữ nguyên 2MB): logo thương hiệu, avatar; OG image chưa có luồng upload nên theo trần này. */
export const SMALL_IMAGE_MAX_BYTES = 2 * MB

export const IMAGE_SPEC: Record<ImageSpecKey, ImageSpec> = {
    // 2:3 từ 2026-10-31 (PO chốt thẻ sản phẩm/danh mục dọc 2:3 — IMG-4 của `image-spec.md`).
    PRODUCT: {
        ratio: 2 / 3,
        ratioLabel: '2:3',
        recommended: { w: 1600, h: 2400 },
        min: { w: 1000, h: 1500 },
        maxBytes: LARGE_IMAGE_MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
    },
    CATEGORY_TILE: {
        ratio: 2 / 3,
        ratioLabel: '2:3',
        recommended: { w: 800, h: 1200 },
        min: { w: 480, h: 720 },
        maxBytes: LARGE_IMAGE_MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
    },
    HOME_HERO: {
        ratio: 21 / 10,
        ratioLabel: '21:10',
        recommended: { w: 2520, h: 1200 },
        min: { w: 1890, h: 900 },
        maxBytes: LARGE_IMAGE_MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
        // Mobile cao `100svh` (2026-10-31) — tính theo màn hẹp nhất 9:19,5 ⇒ còn ~22 % bề ngang (§3).
        safeZone: { w: 560, h: 1200 },
        mobile: { ratio: 9 / 19.5, ratioLabel: '9:19,5' },
    },
    BANNER_WIDE: {
        ratio: 9 / 2,
        ratioLabel: '9:2',
        recommended: { w: 2520, h: 560 },
        min: { w: 1800, h: 400 },
        maxBytes: LARGE_IMAGE_MAX_BYTES,
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
        maxBytes: LARGE_IMAGE_MAX_BYTES,
        formats: ['jpg', 'webp'],
        fit: 'cover',
    },
    OG_IMAGE: {
        ratio: 1.91,
        ratioLabel: '1,91:1',
        recommended: { w: 1200, h: 630 },
        min: { w: 600, h: 315 },
        maxBytes: SMALL_IMAGE_MAX_BYTES,
        formats: ['jpg', 'png'],
        fit: 'cover',
        safeZone: { w: 630, h: 630 },
    },
    LOGO_SQUARE: {
        ratio: 1,
        ratioLabel: '1:1',
        recommended: { w: 512, h: 512 },
        min: { w: 256, h: 256 },
        maxBytes: SMALL_IMAGE_MAX_BYTES,
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

/**
 * Video (handoff BE `fe-handoff-media-video.md`, 2026-10-31): **chỉ** ảnh sản phẩm · banner · danh mục
 * (`image1/2`, `cover1..5`) nhận thêm mp4/webm/mov, trần 15MB như ảnh, lưu chung cột URL ảnh.
 * Avatar · logo thương hiệu · bài viết vẫn chỉ ảnh.
 */
export const BACKEND_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'] as const

/** `accept` của ô chỉ nhận ảnh. */
export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp'
/** `accept` của ô nhận cả ảnh lẫn video (sản phẩm · banner · danh mục). */
export const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov`

const VIDEO_EXT = /\.(mp4|webm|mov)$/i

/**
 * Backend không có field loại media — **quy tắc duy nhất**: đuôi `.mp4/.webm/.mov` là video. Đuôi được tìm,
 * theo thứ tự, ở:
 * 1. fragment đúng dạng `#.mp4` — dấu do `mediaPreviewSrc` gắn vào blob URL của file chờ gửi (blob không có đuôi);
 * 2. phần đường dẫn, **đã bỏ `?query`/`#fragment`** (`/product/x.mp4`, `https://cdn/x.mp4?v=2`);
 * 3. tham số `imageUrl` của URL `/image?imageUrl=%2Fproduct%2Fx.mp4` (`resolveImageSrc`/`apiImageUrl`).
 */
export function isVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false
    const hashAt = url.indexOf('#')
    if (hashAt >= 0 && /^\.(mp4|webm|mov)$/i.test(url.slice(hashAt + 1))) return true
    const beforeHash = hashAt >= 0 ? url.slice(0, hashAt) : url
    const queryAt = beforeHash.indexOf('?')
    if (VIDEO_EXT.test(queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash)) return true
    if (queryAt < 0) return false
    const inner = new URLSearchParams(beforeHash.slice(queryAt + 1)).get('imageUrl')
    return inner !== null && VIDEO_EXT.test(inner.split(/[?#]/)[0])
}

/**
 * `src` xem trước cho file chờ gửi: blob URL (`URL.createObjectURL`) + `#.mp4`/`#.webm`/`#.mov` khi là
 * video, để `isVideoUrl` — và mọi khung dùng nó (`MediaView`, lightbox, hover-swap, slideshow) — nhận
 * đúng mà không phải truyền cờ riêng. `<video>` bỏ qua fragment lạ. **Thu hồi bằng blob URL gốc**, không
 * bằng giá trị trả về.
 */
export function mediaPreviewSrc(objectUrl: string, file: File): string {
    if (!isVideoFile(file)) return objectUrl
    const ext =
        VIDEO_EXT.exec(file.name)?.[1].toLowerCase() ??
        (file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4')
    return `${objectUrl}#.${ext}`
}

/** File chọn từ máy là video? Theo MIME, MIME trống (một số máy với `.mov`) thì theo đuôi tên file. */
export function isVideoFile(file: File): boolean {
    return file.type ? file.type.startsWith('video/') : VIDEO_EXT.test(file.name)
}

const MIME_TO_FORMAT: Record<string, ImageFormat | undefined> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

/** Lệch tỉ lệ ≤ 2 % coi như đúng (§5). */
const RATIO_TOLERANCE = 0.02

export type ImageIssueCode =
    | 'format'
    | 'formatMedia'
    | 'formatSoft'
    | 'tooLarge'
    | 'belowMin'
    | 'ratio'
    | 'videoUnplayable'

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
 * Kiểm file trước khi gửi — như `inspectImageFile`, thêm nhánh video khi ô cho phép (`allowVideo`).
 *
 * Video: chặn khi sai định dạng / quá `spec.maxBytes`; kích thước đọc từ `videoWidth/videoHeight` rồi
 * chấm min + tỉ lệ **chỉ cảnh báo** như ảnh. Trình duyệt không đọc được video (thường `.mov` HEVC của
 * iPhone trên Chrome) ⇒ **cảnh báo mềm** (`videoUnplayable`), vẫn cho lưu — backend không kiểm codec.
 */
export async function inspectMediaFile(
    file: File,
    spec: ImageSpec,
    { allowVideo = false }: { allowVideo?: boolean } = {},
): Promise<ImageInspection> {
    if (!isVideoFile(file)) {
        const result = await inspectImageFile(file, spec)
        // Ô nhận cả video ⇒ thông báo sai định dạng phải nhắc cả video.
        if (!allowVideo) return result
        return { ...result, issues: result.issues.map((i) => (i.code === 'format' ? { ...i, code: 'formatMedia' } : i)) }
    }
    const blocked = (code: ImageIssueCode): ImageInspection => ({
        status: 'blocked',
        issues: [{ code, blocking: true, params: {} }],
        width: 0,
        height: 0,
    })
    if (!allowVideo) return blocked('format')
    const knownMime = file.type ? (BACKEND_VIDEO_MIME as readonly string[]).includes(file.type) : true
    if (!knownMime || !VIDEO_EXT.test(file.name)) return blocked('formatMedia')
    // Quá cỡ ⇒ chặn luôn, khỏi giải mã cả file chỉ để đo.
    if (file.size > spec.maxBytes) {
        return {
            status: 'blocked',
            issues: [
                {
                    code: 'tooLarge',
                    blocking: true,
                    params: { size: formatBytes(file.size), max: formatBytes(spec.maxBytes) },
                },
            ],
            width: 0,
            height: 0,
        }
    }

    const url = URL.createObjectURL(file)
    const size = await measureVideoUrl(url)
    URL.revokeObjectURL(url)
    if (size) return evaluateImage(spec, { ...size, bytes: file.size })
    // Không đọc được kích thước ⇒ bỏ phần kiểm kích thước/tỉ lệ, chỉ cảnh báo có thể không phát.
    return {
        status: 'warn',
        issues: [{ code: 'videoUnplayable', blocking: false, params: {} }],
        width: 0,
        height: 0,
    }
}

/** Đọc `videoWidth/videoHeight` (chỉ tải metadata). Không đọc được trong 10 giây ⇒ `null`. */
export function measureVideoUrl(
    src: string,
    signal?: AbortSignal,
): Promise<{ width: number; height: number } | null> {
    // Đã huỷ trước khi gọi ⇒ không tải metadata (listener `abort` bên dưới chỉ bắt lần huỷ về sau).
    if (signal?.aborted) return Promise.resolve(null)
    return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true
        const timer = window.setTimeout(() => done(null), 10_000)
        function done(result: { width: number; height: number } | null) {
            window.clearTimeout(timer)
            video.onloadedmetadata = null
            video.onerror = null
            signal?.removeEventListener('abort', onAbort)
            video.removeAttribute('src')
            video.load()
            resolve(result)
        }
        function onAbort() {
            done(null)
        }
        video.onloadedmetadata = () =>
            done(video.videoWidth > 0 ? { width: video.videoWidth, height: video.videoHeight } : null)
        video.onerror = () => done(null)
        signal?.addEventListener('abort', onAbort)
        video.src = src
    })
}

/** Đo theo link — tự chọn ảnh/video theo đuôi (`isVideoUrl`). */
export function measureMediaUrl(
    src: string,
    signal?: AbortSignal,
): Promise<{ width: number; height: number } | null> {
    return isVideoUrl(src) ? measureVideoUrl(src, signal) : measureImageUrl(src, signal)
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
