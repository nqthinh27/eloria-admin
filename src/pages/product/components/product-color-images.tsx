import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { productApi } from '@/api/product'
import { ApiError } from '@/lib/api-error'
import { apiImageUrl } from '@/lib/image-spec'
import { cn } from '@/lib/utils'
import { toastSuccess } from '@/lib/toast'
import type { ProductColorImage } from '@/types/product'
import { MediaView } from '@/components/image/media-view'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type ProductColorImagesProps = {
    productId: string
    /**
     * Ảnh đã upload, **đã lọc slot rỗng**. Tab Ảnh suy slot = vị trí + 1 (xem `handleUpload` ở
     * `product-detail-modal.tsx`: chỉ cho xoá ảnh cuối nên không có lỗ hổng) ⇒ ảnh của slot `n` là `images[n - 1]`.
     */
    images: string[]
    canWrite: boolean
    /**
     * Tăng mỗi khi tab Ảnh đổi số slot đang có (xoá ảnh): backend tự gỡ phần tử trỏ tới slot vừa xoá khỏi map
     * nên phải nạp lại khối này, nếu không sẽ lưu đè bằng map cũ.
     */
    reloadToken: number
}

/** Nháp chọn ảnh của từng màu: mã màu → slot (1–10), `null` = chưa gắn. */
type Draft = Record<string, number | null>

function toDraft(rows: ProductColorImage[]): Draft {
    return Object.fromEntries(rows.map((row) => [row.colorCode, row.slot]))
}

/**
 * Khối "Ảnh đại diện theo màu" ở tab Ảnh của `ProductDetailModal`.
 *
 * Mỗi màu có SKU chọn một trong các ảnh đã upload; storefront dùng map này để nhảy gallery tới ảnh của màu
 * khách chọn. `PUT` **thay toàn bộ** map nên luôn gửi đủ mọi màu đã gắn, không gửi từng màu.
 * Chỉ `SUPER_ADMIN` (`canWrite`) sửa được; role khác vẫn xem nhưng các lựa chọn bị khoá.
 */
export function ProductColorImages({ productId, images, canWrite, reloadToken }: ProductColorImagesProps) {
    const { t } = useTranslation('product')

    const [rows, setRows] = useState<ProductColorImage[] | null>(null)
    const [draft, setDraft] = useState<Draft>({})
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState(false)
    const [saving, setSaving] = useState(false)
    /** Tăng để nạp lại sau khi lưu bị từ chối hoặc bấm "Tải lại". */
    const [retryToken, setRetryToken] = useState(0)

    const load = useCallback(
        async (signal: AbortSignal) => {
            setLoading(true)
            setFailed(false)
            try {
                const result = await productApi.getColorImages(productId, signal)
                if (signal.aborted) return
                setRows(result)
                setDraft(toDraft(result))
            } catch {
                if (signal.aborted) return
                setFailed(true)
            } finally {
                if (!signal.aborted) setLoading(false)
            }
        },
        [productId],
    )

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load, reloadToken, retryToken])

    const dirty = rows !== null && rows.some((row) => (draft[row.colorCode] ?? null) !== row.slot)

    const handleSave = async () => {
        if (!rows || saving) return
        const map: Record<string, number> = {}
        for (const row of rows) {
            const slot = draft[row.colorCode]
            if (slot != null) map[row.colorCode] = slot
        }
        setSaving(true)
        try {
            const result = await productApi.updateColorImages(productId, { map })
            setRows(result)
            setDraft(toDraft(result))
            toastSuccess('product.toast.colorImagesSaved', { ns: 'product' })
        } catch (error) {
            // api-client đã toast lỗi. Map bị từ chối vì dữ liệu đã lệch (ảnh/màu vừa bị xoá) ⇒ nạp lại cho khớp.
            if (error instanceof ApiError && error.subKey === 'error.product.colorImageInvalid') {
                setRetryToken((n) => n + 1)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <section className="space-y-3 rounded-md border p-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold">{t('product.colorImages.title')}</h3>
                <p className="text-muted-foreground text-xs">{t('product.colorImages.hint')}</p>
            </div>

            {loading && !rows ? (
                <Skeleton className="h-24 w-full" />
            ) : failed ? (
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                    {t('product.colorImages.loadFailed')}
                    <Button size="sm" variant="outline" onClick={() => setRetryToken((n) => n + 1)}>
                        {t('product.colorImages.retry')}
                    </Button>
                </div>
            ) : !rows || rows.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">{t('product.colorImages.noSku')}</p>
            ) : images.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                    {t('product.colorImages.noImages')}
                </p>
            ) : (
                <>
                    <div className="space-y-4">
                        {rows.map((row) => {
                            const selected = draft[row.colorCode] ?? null
                            return (
                                <div key={row.colorCode} className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        {row.hexCode && (
                                            <span
                                                className="size-4 shrink-0 rounded-full border"
                                                style={{ backgroundColor: row.hexCode }}
                                            />
                                        )}
                                        <span className="font-medium">{row.colorName}</span>
                                        <span className="text-muted-foreground font-mono text-xs">{row.colorCode}</span>
                                        {selected !== null && !images[selected - 1] && (
                                            <span className="text-destructive text-xs">
                                                {t('product.colorImages.missingImage', { slot: selected })}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        role="radiogroup"
                                        aria-label={t('product.colorImages.choose', { color: row.colorName })}
                                        className="flex flex-wrap gap-2">
                                        <ColorImageOption
                                            checked={selected === null}
                                            disabled={!canWrite || saving}
                                            label={t('product.colorImages.none')}
                                            onSelect={() => setDraft((prev) => ({ ...prev, [row.colorCode]: null }))}>
                                            <span className="text-muted-foreground flex h-full items-center justify-center px-1 text-center text-[11px] leading-tight">
                                                {t('product.colorImages.none')}
                                            </span>
                                        </ColorImageOption>
                                        {images.map((url, index) => {
                                            const slot = index + 1
                                            return (
                                                <ColorImageOption
                                                    key={slot}
                                                    checked={selected === slot}
                                                    disabled={!canWrite || saving}
                                                    label={t('product.colorImages.optionLabel', { slot })}
                                                    onSelect={() =>
                                                        setDraft((prev) => ({ ...prev, [row.colorCode]: slot }))
                                                    }>
                                                    <MediaView
                                                        src={apiImageUrl(url)}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                    <span className="bg-background/80 absolute right-0.5 bottom-0.5 rounded px-1 text-[10px] leading-4 font-medium">
                                                        {slot}
                                                    </span>
                                                </ColorImageOption>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {canWrite && (
                        <div className="flex justify-end">
                            <Button size="sm" disabled={!dirty || saving} onClick={() => void handleSave()}>
                                {saving && <Loader2 className="size-4 animate-spin" />}
                                {saving ? t('product.colorImages.saving') : t('product.colorImages.save')}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}

type ColorImageOptionProps = {
    checked: boolean
    disabled: boolean
    label: string
    onSelect: () => void
    children: React.ReactNode
}

/** Một ô chọn trong nhóm radio: thumbnail 2:3 (cùng tỉ lệ lưới ảnh), viền nhấn khi được chọn. */
function ColorImageOption({ checked, disabled, label, onSelect, children }: ColorImageOptionProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                'bg-muted relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-md border-2 outline-none',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-60',
                checked ? 'border-primary' : 'border-transparent',
            )}>
            {children}
        </button>
    )
}
