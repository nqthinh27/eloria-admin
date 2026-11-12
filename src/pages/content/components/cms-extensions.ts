// `@tiptap/react` re-export toàn bộ `@tiptap/core` — không cần khai thêm dependency.
import { Extension } from '@tiptap/react'

/**
 * Định dạng mở rộng của trình soạn thảo CMS (backend P15.2 — `RichTextSanitizer`): **chỉ ghi `class`
 * cố định, không bao giờ `style`** (backend xoá mọi `style`). Mỗi giá trị ở đây phải khớp regex whitelist
 * của backend, nếu không sẽ bị bỏ khi lưu và WYSIWYG lệch với web:
 *
 * - Căn lề `align-left|center|right|justify` trên đoạn văn, tiêu đề, ảnh. Trái là mặc định ⇒ không ghi class.
 * - Cỡ ảnh `img-sm` (nhỏ, hợp icon) · `img-md` (một nửa khung); không class = rộng hết khung.
 * - Liên kết dạng nút `cms-button`.
 * - Bảng có viền `cms-table-bordered`; mặc định bảng **không viền** (dùng để dàn ảnh + chữ nhiều cột).
 */

export const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'] as const
export type TextAlign = (typeof TEXT_ALIGNS)[number]

export const IMAGE_SIZES = ['sm', 'md', 'full'] as const
export type ImageSize = (typeof IMAGE_SIZES)[number]

const ALIGN_TYPES = ['paragraph', 'heading', 'image'] as const

/** Lấy token khớp `prefix` trong thuộc tính `class` (vd `align-center` ⇒ `center`). */
function classToken(element: HTMLElement, prefix: string, allowed: readonly string[]): string | null {
    for (const token of element.classList) {
        if (token.startsWith(prefix)) {
            const value = token.slice(prefix.length)
            if (allowed.includes(value)) return value
        }
    }
    return null
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        cmsFormat: {
            /** Căn lề khối đang chọn (đoạn văn/tiêu đề/ảnh). `left` = bỏ class (mặc định). */
            setTextAlign: (align: TextAlign) => ReturnType
            /** Cỡ ảnh đang chọn. `full` = bỏ class (mặc định). */
            setImageSize: (size: ImageSize) => ReturnType
            /** Bật/tắt kiểu nút cho liên kết đang chọn. */
            setLinkButton: (button: boolean) => ReturnType
            /** Bật/tắt viền cho bảng chứa con trỏ. */
            setTableBordered: (bordered: boolean) => ReturnType
        }
    }
}

export const CmsFormat = Extension.create({
    name: 'cmsFormat',

    addGlobalAttributes() {
        return [
            {
                types: [...ALIGN_TYPES],
                attributes: {
                    textAlign: {
                        default: null,
                        parseHTML: (element) => {
                            const value = classToken(element, 'align-', TEXT_ALIGNS)
                            return value === 'left' ? null : value
                        },
                        renderHTML: (attrs) => (attrs.textAlign ? { class: `align-${attrs.textAlign}` } : {}),
                    },
                },
            },
            {
                types: ['image'],
                attributes: {
                    size: {
                        default: null,
                        parseHTML: (element) => classToken(element, 'img-', ['sm', 'md']),
                        renderHTML: (attrs) => (attrs.size ? { class: `img-${attrs.size}` } : {}),
                    },
                },
            },
            {
                types: ['link'],
                attributes: {
                    button: {
                        default: false,
                        parseHTML: (element) => element.classList.contains('cms-button'),
                        renderHTML: (attrs) => (attrs.button ? { class: 'cms-button' } : {}),
                    },
                },
            },
            {
                types: ['table'],
                attributes: {
                    bordered: {
                        default: false,
                        parseHTML: (element) => element.classList.contains('cms-table-bordered'),
                        renderHTML: (attrs) => (attrs.bordered ? { class: 'cms-table-bordered' } : {}),
                    },
                },
            },
        ]
    },

    addCommands() {
        return {
            setTextAlign:
                (align) =>
                ({ commands }) => {
                    const value = align === 'left' ? null : align
                    // `some` (không phải `every`): vùng chọn chỉ cần chứa một loại khối là đủ.
                    return ALIGN_TYPES.map((type) => commands.updateAttributes(type, { textAlign: value })).some(Boolean)
                },
            setImageSize:
                (size) =>
                ({ commands }) =>
                    commands.updateAttributes('image', { size: size === 'full' ? null : size }),
            setLinkButton:
                (button) =>
                ({ chain }) =>
                    chain().extendMarkRange('link').updateAttributes('link', { button }).run(),
            setTableBordered:
                (bordered) =>
                ({ commands }) =>
                    commands.updateAttributes('table', { bordered }),
        }
    },
})
