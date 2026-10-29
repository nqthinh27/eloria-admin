import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Placeholder } from '@tiptap/extensions'
import {
    Bold,
    Heading2,
    Heading3,
    Heading4,
    ImageIcon,
    Italic,
    Link2,
    Link2Off,
    List,
    ListOrdered,
    Loader2,
    Minus,
    Pilcrow,
    Quote,
    Redo2,
    Undo2,
} from 'lucide-react'

import { postApi } from '@/api/cms'
import { cn } from '@/lib/utils'
import { toastWarning } from '@/lib/toast'
import { isAllowedHref, toDisplayHtml, toStoredHtml } from '@/lib/cms-html'
import { LARGE_IMAGE_MAX_BYTES, resolveImageSrc } from '@/lib/image-spec'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Ảnh trong nội dung bài viết: 15MB/ảnh (2026-10-29). */
const MAX_IMAGE_BYTES = LARGE_IMAGE_MAX_BYTES
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

type RichTextEditorProps = {
    /** HTML **dạng lưu** (ảnh là `/post/<file>`). */
    value: string
    /** Trả HTML dạng lưu; rỗng ⇒ `''`. */
    onChange: (html: string) => void
    disabled?: boolean
}

/**
 * HTML dạng lưu. Rỗng (`<p></p>`) ⇒ `''`. TipTap luôn chèn thêm một đoạn trống sau khối cuối là ảnh/hr
 * (để còn chỗ gõ tiếp) — cắt các `<p></p>` thừa ở cuối, không thì mỗi lần lưu bài lệch khỏi bản backend.
 */
const emit = (editor: Editor) =>
    editor.isEmpty ? '' : toStoredHtml(editor.getHTML()).replace(/(?:<p>(?:<br\s*\/?>)?<\/p>\s*)+$/i, '')

/**
 * Trình soạn thảo rich text (TipTap) — **cấu hình đúng bộ thẻ whitelist của backend**
 * (`RichTextSanitizer`): h2–h4 · p · ul/ol/li · a · strong/em · blockquote · img · hr · br.
 * Thẻ ngoài bộ (code, strike, underline, bảng…) tắt hẳn và không có nút ⇒ WYSIWYG không lệch.
 *
 * Ảnh: **chỉ qua nút "Chèn ảnh"** (upload `content-image`, `alt` bắt buộc, ghi `width`/`height`);
 * dán/kéo-thả file hoặc HTML chứa `<img>` bị chặn — backend vốn bỏ `src` ngoài và `data:`.
 */
export function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
    const { t } = useTranslation('post')
    const [linkOpen, setLinkOpen] = useState(false)
    const [imageOpen, setImageOpen] = useState(false)

    // Callback đọc qua ref để `useEditor` không phải dựng lại mỗi lần render.
    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])
    const blockedToastRef = useRef(() => toastWarning('post.editor.pasteBlocked', { ns: 'post' }))

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3, 4] },
                code: false,
                codeBlock: false,
                strike: false,
                underline: false,
                link: {
                    openOnClick: false,
                    autolink: false,
                    linkOnPaste: false,
                    HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
                    isAllowedUri: (url) => isAllowedHref(url),
                },
            }),
            Image.configure({ allowBase64: false }),
            Placeholder.configure({ placeholder: t('post.editor.placeholder') }),
        ],
        content: toDisplayHtml(value),
        editable: !disabled,
        editorProps: {
            attributes: { 'aria-label': t('post.editor.label'), role: 'textbox' },
            transformPastedHTML: (html) => html.replace(/<img\b[^>]*>/gi, ''),
            handlePaste: (_view, event) => {
                if ((event.clipboardData?.files.length ?? 0) > 0) {
                    blockedToastRef.current()
                    return true
                }
                return false
            },
            handleDrop: (_view, event) => {
                if ((event.dataTransfer?.files.length ?? 0) > 0) {
                    blockedToastRef.current()
                    return true
                }
                return false
            },
        },
        onUpdate: ({ editor: ed }) => onChangeRef.current(emit(ed)),
    })

    // Form `reset()` (mở bài khác / nạp xong chi tiết) đẩy giá trị mới vào editor.
    useEffect(() => {
        if (!editor) return
        if (emit(editor) !== value) {
            editor.commands.setContent(toDisplayHtml(value), { emitUpdate: false })
        }
    }, [editor, value])

    useEffect(() => {
        editor?.setEditable(!disabled)
    }, [editor, disabled])

    const state = useEditorState({
        editor,
        selector: ({ editor: ed }) =>
            ed
                ? {
                      p: ed.isActive('paragraph'),
                      h2: ed.isActive('heading', { level: 2 }),
                      h3: ed.isActive('heading', { level: 3 }),
                      h4: ed.isActive('heading', { level: 4 }),
                      bold: ed.isActive('bold'),
                      italic: ed.isActive('italic'),
                      ul: ed.isActive('bulletList'),
                      ol: ed.isActive('orderedList'),
                      quote: ed.isActive('blockquote'),
                      link: ed.isActive('link'),
                      canUndo: ed.can().undo(),
                      canRedo: ed.can().redo(),
                  }
                : null,
    })

    if (!editor || !state) return null

    const tool = (label: string, icon: ReactNode, onClick: () => void, active = false, off = false) => (
        <Button
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled || off}
            // `mousedown` giữ vùng chọn của editor — không để nút cướp focus.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}>
            {icon}
        </Button>
    )

    return (
        <div className={cn('rounded-md border', disabled && 'opacity-70')}>
            <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b p-1">
                {tool(t('post.editor.paragraph'), <Pilcrow className="size-4" />, () => editor.chain().focus().setParagraph().run(), state.p)}
                {tool(t('post.editor.heading2'), <Heading2 className="size-4" />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), state.h2)}
                {tool(t('post.editor.heading3'), <Heading3 className="size-4" />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), state.h3)}
                {tool(t('post.editor.heading4'), <Heading4 className="size-4" />, () => editor.chain().focus().toggleHeading({ level: 4 }).run(), state.h4)}
                <span className="bg-border mx-1 h-5 w-px" />
                {tool(t('post.editor.bold'), <Bold className="size-4" />, () => editor.chain().focus().toggleBold().run(), state.bold)}
                {tool(t('post.editor.italic'), <Italic className="size-4" />, () => editor.chain().focus().toggleItalic().run(), state.italic)}
                <span className="bg-border mx-1 h-5 w-px" />
                {tool(t('post.editor.bulletList'), <List className="size-4" />, () => editor.chain().focus().toggleBulletList().run(), state.ul)}
                {tool(t('post.editor.orderedList'), <ListOrdered className="size-4" />, () => editor.chain().focus().toggleOrderedList().run(), state.ol)}
                {tool(t('post.editor.blockquote'), <Quote className="size-4" />, () => editor.chain().focus().toggleBlockquote().run(), state.quote)}
                <span className="bg-border mx-1 h-5 w-px" />
                {tool(t('post.editor.link'), <Link2 className="size-4" />, () => setLinkOpen(true), state.link)}
                {tool(t('post.editor.unlink'), <Link2Off className="size-4" />, () => editor.chain().focus().unsetLink().run(), false, !state.link)}
                {tool(t('post.editor.image'), <ImageIcon className="size-4" />, () => setImageOpen(true))}
                {tool(t('post.editor.hr'), <Minus className="size-4" />, () => editor.chain().focus().setHorizontalRule().run())}
                <span className="bg-border mx-1 h-5 w-px" />
                {tool(t('post.editor.undo'), <Undo2 className="size-4" />, () => editor.chain().focus().undo().run(), false, !state.canUndo)}
                {tool(t('post.editor.redo'), <Redo2 className="size-4" />, () => editor.chain().focus().redo().run(), false, !state.canRedo)}
            </div>
            <EditorContent editor={editor} className="cms-prose max-h-[50vh] min-h-56 overflow-y-auto px-4 py-3" />
            <p className="text-muted-foreground border-t px-3 py-1.5 text-xs">{t('post.editor.whitelistNote')}</p>

            <LinkDialog
                open={linkOpen}
                onOpenChange={setLinkOpen}
                initial={(editor.getAttributes('link').href as string | undefined) ?? ''}
                onApply={(href) => {
                    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
                }}
            />
            <ImageDialog
                open={imageOpen}
                onOpenChange={setImageOpen}
                onInserted={(attrs) => editor.chain().focus().setImage(attrs).run()}
            />
        </div>
    )
}

function LinkDialog({
    open,
    onOpenChange,
    initial,
    onApply,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial: string
    onApply: (href: string) => void
}) {
    const { t } = useTranslation(['post', 'common'])
    const [href, setHref] = useState('')
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (open) {
            setHref(initial)
            setTouched(false)
        }
    }, [open, initial])

    const valid = isAllowedHref(href.trim())

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('post:post.editor.linkDialog.title')}</DialogTitle>
                </DialogHeader>
                <form
                    className="space-y-3"
                    onSubmit={(event) => {
                        // Form này nằm trong portal của Dialog nhưng React vẫn nổi bọt submit lên form cha.
                        event.preventDefault()
                        event.stopPropagation()
                        setTouched(true)
                        if (!valid) return
                        onApply(href.trim())
                        onOpenChange(false)
                    }}>
                    <div className="space-y-1.5">
                        <Label htmlFor="cms-link-url">{t('post:post.editor.linkDialog.url')}</Label>
                        <Input
                            id="cms-link-url"
                            value={href}
                            autoFocus
                            placeholder={t('post:post.editor.linkDialog.placeholder')}
                            aria-invalid={touched && !valid}
                            onChange={(event) => setHref(event.target.value)}
                        />
                        {touched && !valid && (
                            <p className="text-destructive text-sm">{t('post:post.editor.linkDialog.invalid')}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common:action.cancel')}
                        </Button>
                        <Button type="submit">{t('post:post.editor.linkDialog.apply')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

type InsertedImage = { src: string; alt: string; width?: number; height?: number }

function ImageDialog({
    open,
    onOpenChange,
    onInserted,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onInserted: (image: InsertedImage) => void
}) {
    const { t } = useTranslation(['post', 'common'])
    const inputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [alt, setAlt] = useState('')
    const [fileError, setFileError] = useState<string | null>(null)
    const [altTouched, setAltTouched] = useState(false)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        if (open) {
            setFile(null)
            setAlt('')
            setFileError(null)
            setAltTouched(false)
            setUploading(false)
        }
    }, [open])

    const pick = (picked: File | undefined) => {
        if (!picked) return
        if (!ACCEPT.split(',').includes(picked.type)) {
            setFile(null)
            setFileError(t('post:post.editor.imageDialog.badType'))
            return
        }
        if (picked.size > MAX_IMAGE_BYTES) {
            setFile(null)
            setFileError(t('post:post.editor.imageDialog.tooLarge'))
            return
        }
        setFileError(null)
        setFile(picked)
    }

    const submit = async () => {
        setAltTouched(true)
        if (!file || !alt.trim()) return
        setUploading(true)
        try {
            // Đo kích thước **trước** upload để ghi width/height (tránh nhảy bố cục khi tải ảnh).
            let size: { width: number; height: number } | null = null
            try {
                const bitmap = await createImageBitmap(file)
                size = { width: bitmap.width, height: bitmap.height }
                bitmap.close()
            } catch {
                size = null
            }
            const { url } = await postApi.uploadContentImage(file)
            onInserted({ src: resolveImageSrc(url), alt: alt.trim(), ...size })
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi (quá 15MB, sai định dạng…); giữ dialog mở để thử lại.
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !uploading && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('post:post.editor.imageDialog.title')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>{t('post:post.editor.imageDialog.file')}</Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={uploading}
                                onClick={() => inputRef.current?.click()}>
                                <ImageIcon className="size-4" />
                                {t('post:post.editor.imageDialog.pick')}
                            </Button>
                            <span className="text-muted-foreground min-w-0 truncate text-sm">{file?.name}</span>
                        </div>
                        <input
                            ref={inputRef}
                            type="file"
                            accept={ACCEPT}
                            className="hidden"
                            onChange={(event) => {
                                pick(event.target.files?.[0])
                                event.target.value = ''
                            }}
                        />
                        {fileError && <p className="text-destructive text-sm">{fileError}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="cms-image-alt">{t('post:post.editor.imageDialog.alt')}</Label>
                        <Input
                            id="cms-image-alt"
                            value={alt}
                            disabled={uploading}
                            maxLength={200}
                            placeholder={t('post:post.editor.imageDialog.altPlaceholder')}
                            aria-invalid={altTouched && !alt.trim()}
                            onChange={(event) => setAlt(event.target.value)}
                        />
                        {altTouched && !alt.trim() && (
                            <p className="text-destructive text-sm">{t('post:post.editor.imageDialog.altRequired')}</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={uploading} onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button type="button" disabled={uploading || !file} onClick={() => void submit()}>
                        {uploading && <Loader2 className="size-4 animate-spin" />}
                        {uploading ? t('post:post.editor.imageDialog.uploading') : t('post:post.editor.imageDialog.insert')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
