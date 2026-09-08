import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import { warehouseLedgerApi } from '@/api/inventory'
import { skuApi } from '@/api/product'
import { toastSuccess } from '@/lib/toast'
import type { Branch } from '@/types/branch'
import type { Sku } from '@/types/product'
import {
    EWarehouseLedgerType,
    type CreateWarehouseLedgerReq,
    type EWarehouseLedgerType as LedgerType,
} from '@/types/inventory'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchSelect } from '@/components/search-select'

/**
 * Trần số SKU nạp cho dropdown chọn hàng.
 *
 * ⚠️ **Backend cap `size` cứng ở 200 và IM LẶNG** — gửi `size=1000` vẫn chỉ trả 200 dòng, không
 * lỗi, không dấu hiệu gì (đo thật 2026-08-11: 201/300/500/1000 đều trả đúng 200). Nâng hằng số này
 * lên cao hơn 200 là **vô nghĩa**, chỉ tạo ảo giác đã nạp đủ.
 *
 * `SearchSelect` lại lọc **phía client**, nên SKU ngoài 200 dòng đầu **gõ tìm kiếm cũng không ra**.
 * Backend đã có 264 SKU (> 200) ⇒ tình huống này **đang xảy ra thật ngay lúc này**, vì vậy phải
 * hiện cảnh báo (xem `skuTruncated`). Cách sửa triệt để là **tìm kiếm phía server** —
 * `SkuSearchReqDTO` đã có sẵn `keyword`; cần `SearchSelect` hỗ trợ async search, ngoài phạm vi bản vá này.
 */
const MAX_SKUS = 200

type LineDraft = {
    /** Khoá React ổn định — SKU có thể chưa chọn nên không dùng `skuId` làm key. */
    key: string
    skuId: string
    quantity: string
}

let lineSeq = 0
function newLine(): LineDraft {
    lineSeq += 1
    return { key: `line-${lineSeq}`, skuId: '', quantity: '1' }
}

/**
 * Dialog tạo phiếu kho (`POST /warehouse-ledger`). Phiếu luôn sinh ra ở `DRAFT` — chưa tác động tồn.
 *
 * ⚠️ Mockup `14` mô tả "nhập theo **ma trận size × màu**", nhưng `WarehouseLedgerLineReqDTO` của
 * backend là **danh sách dòng phẳng** `{skuId, quantity}` — không có khái niệm ma trận. Dựng lưới
 * size×màu ở FE rồi tự phẳng hoá sẽ suy đoán quy tắc backend không có; ở đây dùng đúng shape API
 * (chọn SKU + số lượng), mỗi SKU đã mang sẵn màu/size trong tên. Xem báo cáo Phase 10.
 */
export function LedgerFormDialog({
    open,
    onOpenChange,
    branches,
    canChooseBranch,
    onCreated,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    branches: Branch[]
    /** Chỉ SUPER_ADMIN mới chọn được chi nhánh; role thấp hơn bị backend ép về chi nhánh mình. */
    canChooseBranch: boolean
    onCreated: () => Promise<void> | void
}) {
    const { t } = useTranslation(['inventory', 'common'])

    const [type, setType] = useState<LedgerType>(EWarehouseLedgerType.IN)
    const [name, setName] = useState('')
    const [branchId, setBranchId] = useState('')
    const [toBranchId, setToBranchId] = useState('')
    const [receiveFrom, setReceiveFrom] = useState('')
    const [sendTo, setSendTo] = useState('')
    const [description, setDescription] = useState('')
    const [lines, setLines] = useState<LineDraft[]>([newLine()])
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    const [skus, setSkus] = useState<Sku[]>([])
    /** Tổng SKU phía backend — lớn hơn số đã nạp ⇒ dropdown thiếu hàng, phải cảnh báo. */
    const [skuTotal, setSkuTotal] = useState(0)

    const reset = useCallback(() => {
        setType(EWarehouseLedgerType.IN)
        setName('')
        setBranchId('')
        setToBranchId('')
        setReceiveFrom('')
        setSendTo('')
        setDescription('')
        setLines([newLine()])
        setErrors({})
    }, [])

    useEffect(() => {
        if (!open) return
        reset()
        const controller = new AbortController()
        skuApi
            /*
             * ⚠️ Sort theo **`id`**, KHÔNG phải `skuCode`: từ 2026-08-11 `sku.id` chính là mã SKU
             * và `skuCode` trở thành field dẫn xuất **không sort được** — gửi `sort=skuCode,ASC`
             * bị backend trả `code:6 error.other` (đã đo thật). Kết quả sắp xếp tương đương vì
             * `id === skuCode`.
             */
            .search({}, { page: 1, size: MAX_SKUS, sort: ['id,ASC'] }, controller.signal)
            .then((res) => {
                setSkus(res.data)
                setSkuTotal(res.total)
            })
            .catch(() => {
                // api-client đã toast lỗi; dropdown để rỗng chứ không làm vỡ dialog.
            })
        return () => controller.abort()
    }, [open, reset])

    const isTransfer = type === EWarehouseLedgerType.TRANSFER

    function validate() {
        const next: Record<string, string> = {}

        if (canChooseBranch && !branchId) {
            next.branchId = t('inventory.form.validation.branchRequired')
        }
        if (isTransfer) {
            if (!toBranchId) {
                next.toBranchId = t('inventory.form.validation.toBranchRequired')
            } else if (toBranchId === branchId) {
                next.toBranchId = t('inventory.form.validation.toBranchSame')
            }
        }

        const filled = lines.filter((line) => line.skuId)
        if (filled.length === 0) {
            next.lines = t('inventory.form.validation.linesRequired')
        }

        const seen = new Set<string>()
        for (const line of lines) {
            if (!line.skuId) continue
            if (seen.has(line.skuId)) {
                next[`line-${line.key}`] = t('inventory.form.validation.skuDuplicated')
            }
            seen.add(line.skuId)

            const qty = Number(line.quantity)
            if (!Number.isFinite(qty) || qty < 1) {
                next[`line-${line.key}`] = t('inventory.form.validation.quantityMin')
            }
        }

        setErrors(next)
        return Object.keys(next).length === 0
    }

    async function handleSubmit() {
        if (!validate()) return

        const payload: CreateWarehouseLedgerReq = {
            type,
            name: name.trim() || undefined,
            branchId: canChooseBranch ? branchId : undefined,
            toBranchId: isTransfer ? toBranchId : undefined,
            // Backend bỏ qua `receiveFrom`/`sendTo` với TRANSFER (dùng `toBranchId`).
            receiveFrom:
                type === EWarehouseLedgerType.IN ? receiveFrom.trim() || undefined : undefined,
            sendTo: type === EWarehouseLedgerType.OUT ? sendTo.trim() || undefined : undefined,
            description: description.trim() || undefined,
            lines: lines
                .filter((line) => line.skuId)
                .map((line) => ({ skuId: line.skuId, quantity: Number(line.quantity) })),
        }

        setSubmitting(true)
        try {
            await warehouseLedgerApi.create(payload)
            toastSuccess('inventory.toast.ledgerCreated', { ns: 'inventory' })
            await onCreated()
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi; giữ dialog mở để người dùng sửa lại.
        } finally {
            setSubmitting(false)
        }
    }

    /** Nhãn gồm mã SKU + tên sản phẩm; màu/size đẩy sang `hint` để tìm kiếm vẫn khớp cả hai. */
    const skuOptions = skus.map((sku) => ({
        value: sku.id,
        label: `${sku.skuCode} — ${sku.productName ?? ''}`.trim(),
        hint: [sku.colorName, sku.sizeLabel].filter(Boolean).join(' · '),
    }))

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('inventory.form.title')}</DialogTitle>
                    <DialogDescription>{t('inventory.form.draftHint')}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="ledger-type">
                                {t('inventory.form.type')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={type}
                                onValueChange={(v) => setType(v as LedgerType)}>
                                <SelectTrigger id="ledger-type" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(EWarehouseLedgerType).map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {t(`inventory.ledger.type.${value}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-muted-foreground text-xs">
                                {t('inventory.form.typeHint')}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ledger-name">{t('inventory.form.name')}</Label>
                            <Input
                                id="ledger-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('inventory.form.namePlaceholder')}
                                maxLength={150}
                            />
                        </div>

                        {canChooseBranch && (
                            <div className="space-y-2">
                                <Label htmlFor="ledger-branch">
                                    {t('inventory.form.branch')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select value={branchId} onValueChange={setBranchId}>
                                    <SelectTrigger id="ledger-branch" className="w-full">
                                        <SelectValue
                                            placeholder={t('inventory.form.branchPlaceholder')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.branchId && (
                                    <p className="text-destructive text-xs">{errors.branchId}</p>
                                )}
                            </div>
                        )}

                        {isTransfer && (
                            <div className="space-y-2">
                                <Label htmlFor="ledger-to-branch">
                                    {t('inventory.form.toBranch')}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Select value={toBranchId} onValueChange={setToBranchId}>
                                    <SelectTrigger id="ledger-to-branch" className="w-full">
                                        <SelectValue
                                            placeholder={t('inventory.form.toBranchPlaceholder')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.toBranchId && (
                                    <p className="text-destructive text-xs">{errors.toBranchId}</p>
                                )}
                            </div>
                        )}

                        {type === EWarehouseLedgerType.IN && (
                            <div className="space-y-2">
                                <Label htmlFor="receive-from">
                                    {t('inventory.form.receiveFrom')}
                                </Label>
                                <Input
                                    id="receive-from"
                                    value={receiveFrom}
                                    onChange={(e) => setReceiveFrom(e.target.value)}
                                    placeholder={t('inventory.form.receiveFromPlaceholder')}
                                    maxLength={150}
                                />
                            </div>
                        )}

                        {type === EWarehouseLedgerType.OUT && (
                            <div className="space-y-2">
                                <Label htmlFor="send-to">{t('inventory.form.sendTo')}</Label>
                                <Input
                                    id="send-to"
                                    value={sendTo}
                                    onChange={(e) => setSendTo(e.target.value)}
                                    placeholder={t('inventory.form.sendToPlaceholder')}
                                    maxLength={150}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ledger-description">{t('inventory.form.description')}</Label>
                        <Textarea
                            id="ledger-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('inventory.form.descriptionPlaceholder')}
                            maxLength={255}
                            rows={2}
                        />
                    </div>

                    {/* Danh sách dòng hàng */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>
                                {t('inventory.form.lines')}{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setLines((prev) => [...prev, newLine()])}>
                                <Plus className="size-4" />
                                {t('inventory.form.addLine')}
                            </Button>
                        </div>

                        {errors.lines && <p className="text-destructive text-xs">{errors.lines}</p>}

                        {/*
                         * Dropdown chỉ chứa `MAX_SKUS` SKU đầu và `SearchSelect` lọc phía client ⇒
                         * SKU ngoài trần **gõ tìm cũng không ra**. Nói rõ thay vì để người dùng
                         * tưởng SKU đó không tồn tại.
                         */}
                        {skuTotal > skus.length && (
                            <p className="text-warning text-xs">
                                {t('inventory.form.skuTruncated', {
                                    loaded: skus.length,
                                    total: skuTotal,
                                })}
                            </p>
                        )}

                        <div className="space-y-2">
                            {lines.map((line) => (
                                <div key={line.key} className="space-y-1">
                                    <div className="flex items-start gap-2">
                                        <SearchSelect
                                            className="flex-1"
                                            value={line.skuId || undefined}
                                            onChange={(value) =>
                                                setLines((prev) =>
                                                    prev.map((item) =>
                                                        item.key === line.key
                                                            ? { ...item, skuId: value }
                                                            : item,
                                                    ),
                                                )
                                            }
                                            options={skuOptions}
                                            placeholder={t('inventory.form.skuPlaceholder')}
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            className="w-28"
                                            value={line.quantity}
                                            aria-label={t('inventory.form.quantity')}
                                            onChange={(e) =>
                                                setLines((prev) =>
                                                    prev.map((item) =>
                                                        item.key === line.key
                                                            ? { ...item, quantity: e.target.value }
                                                            : item,
                                                    ),
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t('inventory.form.removeLine')}
                                            disabled={lines.length === 1}
                                            onClick={() =>
                                                setLines((prev) =>
                                                    prev.filter((item) => item.key !== line.key),
                                                )
                                            }>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                    {errors[`line-${line.key}`] && (
                                        <p className="text-destructive text-xs">
                                            {errors[`line-${line.key}`]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        disabled={submitting}
                        onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button disabled={submitting} onClick={handleSubmit}>
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {submitting ? t('inventory.form.submitting') : t('inventory.form.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
