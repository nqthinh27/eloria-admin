import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'

import { cn } from '@/lib/utils'
import { toastWarning } from '@/lib/toast'
import {
    evaluateImage,
    IMAGE_SPEC,
    inspectImageFile,
    issueKey,
    measureImageUrl,
    resolveImageSrc,
    type ImageInspection,
    type ImageSpecKey,
} from '@/lib/image-spec'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ClickableImage } from './clickable-image'
import { ImageFramePreview } from './image-frame-preview'
import { ImageIssueList } from './image-issue-list'
import { ImageSpecHint } from './image-spec-hint'

type ImageUploadFieldProps = {
    spec: ImageSpecKey
    /** Nhãn hiển thị phía trên (đã dịch). */
    label: ReactNode
    /** Chú thích "ảnh này hiện ở đâu và khi nào" — bắt buộc hiện trên giao diện (PLAN Phase 23). */
    caption?: ReactNode
    /** Dòng cảnh báo phụ trong popover xem khung. */
    previewNote?: string
    /** Giá trị đang lưu trên backend (`imageLink1`, `logoUrl`…); `null` = trống. */
    savedLink: string | null
    /** File đã chọn nhưng chưa gửi (chế độ thêm mới — bản ghi chưa có id). */
    pendingFile?: File | null
    /** File đã qua kiểm tra. Cha quyết định gửi ngay (sửa) hay giữ chờ (thêm mới). */
    onSelectFile: (file: File) => void | Promise<void>
    /** Gỡ ảnh: sửa ⇒ `DELETE` slot; thêm mới ⇒ bỏ file đang chờ. */
    onRemove: () => void | Promise<void>
    /** Đang gọi API (upload/xoá) cho ô này. */
    busy?: boolean
    disabled?: boolean
}

/**
 * Ô ảnh **chỉ upload file** (backend P13.3 bỏ hẳn nhập link): chọn file → kiểm tra theo `IMAGE_SPEC`
 * (`inspectImageFile`: định dạng · ≤ `spec.maxBytes` · kích thước tối thiểu · tỉ lệ) → báo cha. File sai ⇒ chặn,
 * không request nào bay đi. Phần hint/khung xem trước/danh sách vấn đề dùng chung với ô ảnh sản phẩm.
 */
export function ImageUploadField({
    spec,
    label,
    caption,
    previewNote,
    savedLink,
    pendingFile = null,
    onSelectFile,
    onRemove,
    busy = false,
    disabled,
}: ImageUploadFieldProps) {
    const { t } = useTranslation('image')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [inspection, setInspection] = useState<ImageInspection | null>(null)
    const [measuring, setMeasuring] = useState(false)
    const [thumbFailed, setThumbFailed] = useState(false)

    /** Nguồn hiển thị: file đang chờ (blob) ưu tiên, không thì ảnh đã lưu. */
    // Tạo + thu hồi **trong cùng một effect** — tạo ở useMemo rồi revoke ở cleanup sẽ hỏng URL khi
    // StrictMode chạy effect hai lần ở dev (cleanup revoke, effect chạy lại không tạo URL mới).
    const [pendingUrl, setPendingUrl] = useState<string | null>(null)
    useEffect(() => {
        if (!pendingFile) {
            setPendingUrl(null)
            return
        }
        const url = URL.createObjectURL(pendingFile)
        setPendingUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [pendingFile])

    const src = pendingUrl ?? (savedLink ? resolveImageSrc(savedLink) : null)
    const hasImage = pendingFile !== null || Boolean(savedLink)

    // Ảnh đã lưu: đo kích thước từ link (không biết dung lượng/định dạng). File đang chờ đã được kiểm lúc chọn.
    useEffect(() => {
        setThumbFailed(false)
        if (pendingFile) return
        if (!savedLink) {
            setInspection(null)
            setMeasuring(false)
            return
        }
        const controller = new AbortController()
        setMeasuring(true)
        void measureImageUrl(resolveImageSrc(savedLink), controller.signal).then((size) => {
            if (controller.signal.aborted) return
            setMeasuring(false)
            setInspection(size ? evaluateImage(IMAGE_SPEC[spec], size) : null)
        })
        return () => controller.abort()
    }, [savedLink, pendingFile, spec])

    const handlePick = async (file: File | undefined) => {
        if (!file) return
        const result = await inspectImageFile(file, IMAGE_SPEC[spec])
        if (result.status === 'blocked') {
            // Không ghi đè `inspection`: nó đang mô tả ảnh hiện có, còn file bị từ chối chỉ báo qua toast.
            for (const issue of result.issues.filter((i) => i.blocking)) {
                toastWarning('file.blocked', {
                    ns: 'image',
                    name: file.name,
                    reason: t(issueKey(issue), issue.params),
                })
            }
            return
        }
        setInspection(result)
        await onSelectFile(file)
    }

    const frameSpec = IMAGE_SPEC[spec]

    return (
        <div className="space-y-1.5">
            <div className="text-sm leading-none font-medium">{label}</div>
            {caption && <p className="text-muted-foreground text-xs leading-relaxed">{caption}</p>}

            <div className="flex items-start gap-2">
                <div
                    className="bg-muted relative w-12 shrink-0 overflow-hidden rounded-md border"
                    style={{ aspectRatio: String(frameSpec.ratio > 2 ? 2 : frameSpec.ratio) }}>
                    {src && !thumbFailed ? (
                        <ClickableImage
                            src={src}
                            alt=""
                            onError={() => setThumbFailed(true)}
                            className={cn(
                                'absolute inset-0 size-full',
                                frameSpec.fit === 'cover' ? 'object-cover' : 'object-contain',
                            )}
                        />
                    ) : (
                        <ImageIcon className="text-muted-foreground absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2" />
                    )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0]
                                event.target.value = ''
                                void handlePick(file)
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled || busy}
                            onClick={() => fileInputRef.current?.click()}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                            {busy ? t('field.uploading') : hasImage ? t('field.replace') : t('field.upload')}
                        </Button>
                        {pendingFile && (
                            <span className="text-muted-foreground min-w-0 truncate text-xs">
                                {t('field.pending', { name: pendingFile.name })}
                            </span>
                        )}
                        {src && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="size-8 shrink-0"
                                        title={t('field.previewButton')}
                                        aria-label={t('field.previewButton')}>
                                        <Eye className="size-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-w-[90vw] space-y-2" align="end">
                                    <p className="text-sm font-medium">{t('field.previewTitle')}</p>
                                    <ImageFramePreview
                                        spec={spec}
                                        value={pendingUrl ?? savedLink ?? ''}
                                        extraNote={previewNote}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                        {hasImage && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0"
                                disabled={disabled || busy}
                                title={t('field.clear')}
                                aria-label={t('field.clear')}
                                onClick={() => void onRemove()}>
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>

                    {measuring && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Loader2 className="size-3 animate-spin" />
                            {t('field.measuring')}
                        </p>
                    )}
                    {!measuring && inspection && (
                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                                {t('field.size', { w: inspection.width, h: inspection.height })}
                            </p>
                            <ImageIssueList issues={inspection.issues} />
                        </div>
                    )}
                </div>
            </div>

            <ImageSpecHint spec={spec} />
        </div>
    )
}
