import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import type { Color, Size } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type GenerateSkuDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    colors: Color[]
    /** Đã lọc theo `sizeGroup` của sản phẩm ở màn gọi. */
    sizes: Size[]
    /** Cảnh báo khi sản phẩm chưa chọn nhóm size ⇒ không biết lấy size nào. */
    missingSizeGroup: boolean
    onSubmit: (colorIds: string[], sizeIds: string[]) => Promise<void>
}

/**
 * Dialog chọn màu × size để sinh ma trận SKU (`POST /product/{id}/generate-sku`).
 *
 * API **idempotent**: ô đã có SKU thì bỏ qua, nên không cần tự loại các cặp đã tồn tại ở FE —
 * bấm lại với cùng lựa chọn không tạo bản ghi trùng.
 */
export function GenerateSkuDialog({
    open,
    onOpenChange,
    colors,
    sizes,
    missingSizeGroup,
    onSubmit,
}: GenerateSkuDialogProps) {
    const { t } = useTranslation(['product', 'common'])
    const [colorIds, setColorIds] = useState<string[]>([])
    const [sizeIds, setSizeIds] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setColorIds([])
        setSizeIds([])
        setSubmitting(false)
    }, [open])

    const toggle = (list: string[], id: string) =>
        list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

    const handleSubmit = async () => {
        if (!colorIds.length || !sizeIds.length) return
        setSubmitting(true)
        try {
            await onSubmit(colorIds, sizeIds)
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi; giữ dialog để người dùng thử lại.
        } finally {
            setSubmitting(false)
        }
    }

    const pairCount = colorIds.length * sizeIds.length

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('product.sku.generateTitle')}</DialogTitle>
                </DialogHeader>

                <p className="text-muted-foreground text-sm">{t('product.sku.generateDescription')}</p>

                {missingSizeGroup ? (
                    <p className="text-destructive text-sm">{t('product.sku.sizeGroupRequired')}</p>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="mb-2 text-sm font-medium">{t('product.sku.colors')}</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {colors.map((c) => (
                                    <label
                                        key={c.id}
                                        className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={colorIds.includes(c.id)}
                                            onCheckedChange={() =>
                                                setColorIds((prev) => toggle(prev, c.id))
                                            }
                                        />
                                        {c.hexCode && (
                                            <span
                                                className="size-4 shrink-0 rounded-full border"
                                                style={{ backgroundColor: c.hexCode }}
                                            />
                                        )}
                                        <span className="truncate">{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium">{t('product.sku.sizes')}</p>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {sizes.map((s) => (
                                    <label
                                        key={s.id}
                                        className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={sizeIds.includes(s.id)}
                                            onCheckedChange={() =>
                                                setSizeIds((prev) => toggle(prev, s.id))
                                            }
                                        />
                                        <span className="truncate">{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {pairCount > 0 && (
                            <p className="text-muted-foreground text-sm">
                                {colorIds.length} × {sizeIds.length} = <strong>{pairCount}</strong>{' '}
                                {t('product.sku.resultLabel')}
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button
                        type="button"
                        disabled={submitting || missingSizeGroup || !colorIds.length || !sizeIds.length}
                        onClick={handleSubmit}>
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {submitting ? t('product.sku.submitting') : t('product.sku.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
