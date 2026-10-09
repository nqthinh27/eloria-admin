import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { EntityStatus } from '@/types/common'
import type { Category } from '@/types/product'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { SearchSelect } from '@/components/search-select'

type SetDefaultCategoryDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    categories: Category[]
    /** Gọi khi xác nhận; ném lỗi thì dialog giữ nguyên để thử lại. */
    onConfirm: (category: Category) => Promise<void>
}

/**
 * Chọn nhanh một danh mục làm mặc định từ banner cảnh báo "chưa có danh mục mặc định" — khỏi phải
 * mở form sửa của một danh mục cụ thể rồi bật công tắc. Chỉ liệt kê danh mục **đang hoạt động** vì web
 * bỏ qua danh mục INACTIVE.
 */
export function SetDefaultCategoryDialog({
    open,
    onOpenChange,
    categories,
    onConfirm,
}: SetDefaultCategoryDialogProps) {
    const { t } = useTranslation(['product', 'common'])
    const [selectedId, setSelectedId] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) setSelectedId('')
    }, [open])

    const options = useMemo(
        () =>
            categories
                .filter((c) => c.status === EntityStatus.ACTIVE)
                .map((c) => ({ value: c.id, label: c.name, hint: c.code })),
        [categories],
    )

    const handleConfirm = async () => {
        const category = categories.find((c) => c.id === selectedId)
        if (!category) return
        setSaving(true)
        try {
            await onConfirm(category)
            onOpenChange(false)
        } catch {
            // `saveCategory` đã toast lỗi; giữ dialog mở để chọn lại.
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('category.setDefault.title')}</DialogTitle>
                    <DialogDescription>{t('category.setDefault.description')}</DialogDescription>
                </DialogHeader>

                <SearchSelect
                    value={selectedId}
                    onChange={setSelectedId}
                    placeholder={t('category.setDefault.placeholder')}
                    options={options}
                />

                <DialogFooter>
                    <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button disabled={saving || !selectedId} onClick={() => void handleConfirm()}>
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {t('category.setDefault.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
