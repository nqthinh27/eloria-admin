import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, ImageIcon, Loader2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
    evaluateImage,
    IMAGE_SPEC,
    measureImageUrl,
    resolveImageSrc,
    type ImageInspection,
    type ImageSpecKey,
} from '@/lib/image-spec'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ImageFramePreview } from './image-frame-preview'
import { ImageIssueList } from './image-issue-list'
import { ImageSpecHint } from './image-spec-hint'

type ImageLinkFieldProps = {
    spec: ImageSpecKey
    value: string
    onChange: (value: string) => void
    /** Nhãn hiển thị phía trên ô nhập (đã dịch). */
    label: ReactNode
    /** Chú thích "ảnh này hiện ở đâu và khi nào" — bắt buộc hiện trên giao diện (PLAN Phase 23). */
    caption?: ReactNode
    /** Báo kết quả kiểm tra lên form cha để chặn lưu khi `blocked`. `null` = chưa có ảnh/đang đo. */
    onInspect?: (inspection: ImageInspection | null) => void
    /** Dòng cảnh báo phụ trong popover xem khung. */
    previewNote?: string
    disabled?: boolean
    maxLength?: number
}

/** Chờ người dùng gõ xong rồi mới tải ảnh để đo — tránh bắn request cho từng ký tự. */
const MEASURE_DEBOUNCE_MS = 500

/**
 * Ô ảnh dạng **đường dẫn** + kiểm tra theo `IMAGE_SPEC` (PLAN Phase 22/23).
 *
 * ⚠️ Là ô nhập **link**, không phải ô upload file: backend chỉ có endpoint upload cho ảnh sản phẩm và
 * avatar nhân viên; danh mục/thương hiệu chỉ nhận chuỗi link (xem `docs/backend/san-pham.md`). Vì chỉ
 * có link nên kiểm tra được **kích thước + tỉ lệ**, còn dung lượng/định dạng thì không (hiện ghi chú).
 * Khi backend mở endpoint upload (BE#, xem PLAN mục B) thì thay phần nhập bằng nút chọn file và dùng
 * `inspectImageFile` — phần hint/khung xem trước/hiển thị vấn đề giữ nguyên.
 */
export function ImageLinkField({
    spec,
    value,
    onChange,
    label,
    caption,
    onInspect,
    previewNote,
    disabled,
    maxLength = 500,
}: ImageLinkFieldProps) {
    const { t } = useTranslation('image')
    const trimmed = value.trim()

    const [inspection, setInspection] = useState<ImageInspection | null>(null)
    const [measuring, setMeasuring] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)
    const [thumbFailed, setThumbFailed] = useState(false)

    useEffect(() => {
        setThumbFailed(false)
        if (!trimmed) {
            setInspection(null)
            setLoadFailed(false)
            setMeasuring(false)
            onInspect?.(null)
            return
        }
        const controller = new AbortController()
        setMeasuring(true)
        const timer = window.setTimeout(() => {
            void measureImageUrl(resolveImageSrc(trimmed), controller.signal).then((size) => {
                if (controller.signal.aborted) return
                setMeasuring(false)
                if (!size) {
                    setInspection(null)
                    setLoadFailed(true)
                    onInspect?.(null)
                    return
                }
                setLoadFailed(false)
                const result = evaluateImage(IMAGE_SPEC[spec], size)
                setInspection(result)
                onInspect?.(result)
            })
        }, MEASURE_DEBOUNCE_MS)
        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
        // `onInspect` do form cha truyền vào có thể đổi identity mỗi lần render — chỉ đo lại khi link/spec đổi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmed, spec])

    return (
        <div className="space-y-1.5">
            <div className="text-sm leading-none font-medium">{label}</div>
            {caption && <p className="text-muted-foreground text-xs leading-relaxed">{caption}</p>}

            <div className="flex items-start gap-2">
                <div
                    className="bg-muted relative w-12 shrink-0 overflow-hidden rounded-md border"
                    style={{ aspectRatio: String(IMAGE_SPEC[spec].ratio > 2 ? 2 : IMAGE_SPEC[spec].ratio) }}>
                    {trimmed && !thumbFailed ? (
                        <img
                            src={resolveImageSrc(trimmed)}
                            alt=""
                            onError={() => setThumbFailed(true)}
                            className={cn(
                                'absolute inset-0 size-full',
                                IMAGE_SPEC[spec].fit === 'cover' ? 'object-cover' : 'object-contain',
                            )}
                        />
                    ) : (
                        <ImageIcon className="text-muted-foreground absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2" />
                    )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <Input
                            value={value}
                            maxLength={maxLength}
                            disabled={disabled}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder={t('field.placeholder')}
                        />
                        {trimmed && (
                            <>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="size-9 shrink-0"
                                            title={t('field.previewButton')}
                                            aria-label={t('field.previewButton')}>
                                            <Eye className="size-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-96 max-w-[90vw] space-y-2" align="end">
                                        <p className="text-sm font-medium">{t('field.previewTitle')}</p>
                                        <ImageFramePreview
                                            spec={spec}
                                            value={trimmed}
                                            extraNote={previewNote}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 shrink-0"
                                    disabled={disabled}
                                    title={t('field.clear')}
                                    aria-label={t('field.clear')}
                                    onClick={() => onChange('')}>
                                    <X className="size-4" />
                                </Button>
                            </>
                        )}
                    </div>

                    {measuring && (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Loader2 className="size-3 animate-spin" />
                            {t('field.measuring')}
                        </p>
                    )}
                    {!measuring && loadFailed && (
                        <p className="text-destructive text-xs">{t('field.loadFailed')}</p>
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
