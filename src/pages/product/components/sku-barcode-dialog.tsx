import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Printer } from 'lucide-react'

import { skuApi } from '@/api/product'
import type { Sku } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type SkuBarcodeDialogProps = {
    /** `null` = đóng. */
    sku: Sku | null
    onOpenChange: (open: boolean) => void
}

/**
 * Dialog xem mã vạch EAN-13 của một SKU — `GET /sku/{id}/barcode` trả **ảnh PNG** do backend sinh.
 *
 * Ảnh tải về dạng `Blob` rồi tạo object URL; URL này **phải được thu hồi** khi đóng dialog hoặc
 * khi đổi SKU, nếu không mỗi lần mở lại rò một ảnh trong bộ nhớ.
 */
export function SkuBarcodeDialog({ sku, onOpenChange }: SkuBarcodeDialogProps) {
    const { t } = useTranslation(['product', 'common'])
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [failed, setFailed] = useState(false)

    const skuId = sku?.id ?? null

    useEffect(() => {
        if (!skuId) return

        const controller = new AbortController()
        let objectUrl: string | null = null
        setLoading(true)
        setFailed(false)

        void (async () => {
            try {
                const blob = await skuApi.getBarcode(skuId, controller.signal)
                if (controller.signal.aborted) return
                objectUrl = URL.createObjectURL(blob)
                setImageUrl(objectUrl)
            } catch {
                if (!controller.signal.aborted) setFailed(true)
            } finally {
                if (!controller.signal.aborted) setLoading(false)
            }
        })()

        return () => {
            controller.abort()
            // Thu hồi object URL của lần mở này — tránh rò bộ nhớ khi mở/đóng nhiều lần.
            if (objectUrl) URL.revokeObjectURL(objectUrl)
            setImageUrl(null)
        }
    }, [skuId])

    /** In tem: mở cửa sổ chỉ chứa ảnh mã vạch rồi gọi hộp thoại in của trình duyệt. */
    const handlePrint = () => {
        if (!imageUrl || !sku) return
        const win = window.open('', '_blank', 'width=420,height=320')
        if (!win) return
        win.document.write(
            `<title>${sku.skuCode}</title>` +
                `<body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">` +
                `<img src="${imageUrl}" style="max-width:100%" onload="window.print();window.close()" />` +
                `</body>`,
        )
        win.document.close()
    }

    if (!sku) return null

    return (
        <Dialog open={sku !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('product.barcode.title')}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div>
                        <p className="text-muted-foreground text-xs">
                            {t('product.sku.column.skuCode')}
                        </p>
                        <p className="font-mono text-sm font-medium">{sku.skuCode}</p>
                    </div>

                    <div className="bg-card flex min-h-40 items-center justify-center rounded-md border p-4">
                        {loading ? (
                            <Loader2 className="text-muted-foreground size-6 animate-spin" />
                        ) : failed ? (
                            <p className="text-muted-foreground text-sm">
                                {t('product.barcode.loadFailed')}
                            </p>
                        ) : imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={`${t('product.barcode.title')} ${sku.skuCode}`}
                                className="max-w-full"
                            />
                        ) : null}
                    </div>

                    {sku.ean && (
                        <div>
                            <p className="text-muted-foreground text-xs">
                                {t('product.sku.column.ean')}
                            </p>
                            <p className="font-mono text-sm tracking-wider">{sku.ean}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common:action.close')}
                    </Button>
                    <Button type="button" disabled={!imageUrl} onClick={handlePrint}>
                        <Printer className="size-4" />
                        {t('product.barcode.print')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
