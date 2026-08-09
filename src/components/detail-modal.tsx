import { useEffect, useState, type ReactNode } from 'react'
import { useForm, type FieldValues, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Mô tả 1 field trong modal chi tiết — dùng chung cho MỌI entity trong hệ thống
 * (Nhân viên, và về sau Sản phẩm/Khách hàng/Chi nhánh… nếu áp dụng cùng pattern).
 *
 * Chế độ xem: render `formatValue(value)` (mặc định `String(value)`).
 * Chế độ sửa: render đúng `type` tương ứng; field có `editable: false` vẫn hiện input/select
 * nhưng bị khoá (disabled) — không ẩn hẳn, để người dùng biết field này tồn tại nhưng
 * không đổi được qua form (ví dụ `username`, `role` của nhân viên — CONVENTIONS: chỉ sửa được
 * qua API riêng, không phải qua form hồ sơ).
 *
 * `readOnly: true` ⇒ field CHỈ ĐỌC HẲN, không thuộc form (ví dụ trạng thái hoạt động/khoá) —
 * bắt buộc phải có `formatValue`, và ở chế độ sửa vẫn hiển thị y hệt chế độ xem (không có input).
 * Dùng cờ `readOnly` tường minh thay vì suy luận qua `name` optional — TypeScript không narrow
 * tốt discriminated union khi type có generic parameter (`TValues`) lồng qua callback `.map()`.
 */
export type DetailField<TValues extends FieldValues> = {
    /** Bỏ trống khi `readOnly: true`. */
    name?: Path<TValues>
    label: string
    editable?: boolean
    type?: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea'
    options?: { value: string; label: string }[]
    /** Định dạng giá trị ở chế độ xem, ví dụ badge vai trò, ngày tháng. Mặc định `String(value)`. */
    formatValue?: (value: unknown) => ReactNode
    /** Chiếm 2 cột trong lưới 2 cột — mặc định field chiếm 1 cột. */
    fullWidth?: boolean
    /** `true` ⇒ field chỉ đọc hẳn, không thuộc form, luôn hiển thị qua `formatValue` (bắt buộc). */
    readOnly?: boolean
}

type DetailModalProps<TValues extends FieldValues> = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    fields: DetailField<TValues>[]
    values: TValues
    onSave: (values: TValues) => Promise<void>
    /**
     * `false` ⇒ modal chỉ xem, ẩn hẳn nút "Sửa". Dùng khi role hiện tại không gọi được API cập nhật
     * (ví dụ STAFF ở màn Khách hàng — `PUT /customer/{id}` là `[ADMIN]`): để nút "Sửa" sẽ dẫn tới
     * form khoá toàn bộ field và một nút "Lưu" chắc chắn 403. Mặc định `true` — giữ nguyên hành vi
     * các màn đã dùng từ Phase 7.
     */
    canEdit?: boolean
}

/**
 * Modal chi tiết dùng chung: xem thông tin dạng text, bấm "Sửa" chuyển field sang input/dropdown
 * ngay tại chỗ (inline edit) thay vì mở form riêng — pattern chốt cho TOÀN HỆ THỐNG, áp dụng đầu
 * tiên ở màn Nhân viên.
 *
 * Field không `editable` vẫn hiện input/select nhưng bị khoá, không ẩn khỏi modal khi đang sửa.
 */
export function DetailModal<TValues extends FieldValues>({
    open,
    onOpenChange,
    title,
    fields,
    values,
    onSave,
    canEdit = true,
}: DetailModalProps<TValues>) {
    const { t } = useTranslation('common')
    const [isEditing, setIsEditing] = useState(false)

    const form = useForm<TValues>({ values })

    useEffect(() => {
        if (!open) setIsEditing(false)
    }, [open])

    const handleCancelEdit = () => {
        form.reset(values)
        setIsEditing(false)
    }

    const onSubmit = async (submitted: TValues) => {
        try {
            await onSave(submitted)
            setIsEditing(false)
        } catch {
            // api-client đã toast lỗi; giữ nguyên chế độ sửa để người dùng thử lại.
        }
    }

    const isSubmitting = form.formState.isSubmitting

    const handleClose = (next: boolean) => {
        if (isSubmitting) return
        if (!next) setIsEditing(false)
        onOpenChange(next)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {fields.map((field, index) => {
                                if (field.readOnly) {
                                    if (!field.formatValue) {
                                        throw new Error(
                                            `DetailModal: field "${field.label}" có readOnly=true nhưng thiếu formatValue`,
                                        )
                                    }
                                    return (
                                        <div
                                            key={`readonly-${index}`}
                                            className={field.fullWidth ? 'sm:col-span-2' : undefined}>
                                            <p className="text-muted-foreground text-xs">{field.label}</p>
                                            <div className="mt-1 text-sm">{field.formatValue(undefined)}</div>
                                        </div>
                                    )
                                }

                                if (!field.name) {
                                    throw new Error(
                                        `DetailModal: field "${field.label}" thiếu "name" nhưng không đánh dấu readOnly`,
                                    )
                                }
                                const name = field.name

                                return (
                                    <div
                                        key={name}
                                        className={field.fullWidth ? 'sm:col-span-2' : undefined}>
                                        {isEditing ? (
                                            <FormField
                                                control={form.control}
                                                name={name}
                                                render={({ field: rhfField }) => (
                                                    <FormItem>
                                                        <FormLabel>{field.label}</FormLabel>
                                                        <FormControl>
                                                            {field.type === 'select' ? (
                                                                <Select
                                                                    value={rhfField.value ?? ''}
                                                                    onValueChange={rhfField.onChange}
                                                                    disabled={!field.editable}>
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {field.options?.map((opt) => (
                                                                            <SelectItem
                                                                                key={opt.value}
                                                                                value={opt.value}>
                                                                                {opt.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <Input
                                                                    {...rhfField}
                                                                    value={rhfField.value ?? ''}
                                                                    type={field.type ?? 'text'}
                                                                    disabled={!field.editable}
                                                                />
                                                            )}
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        ) : (
                                            <div>
                                                <p className="text-muted-foreground text-xs">{field.label}</p>
                                                <div className="mt-1 text-sm">
                                                    {field.formatValue
                                                        ? field.formatValue(values[name])
                                                        : String(values[name] ?? '—') || '—'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <DialogFooter>
                            {isEditing ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        onClick={handleCancelEdit}>
                                        {t('action.cancel')}
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                        {t('action.save')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}>
                                        {t('action.close')}
                                    </Button>
                                    {canEdit && (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            // Nút "Lưu" (type="submit") sẽ render đúng vị trí nút này vừa đứng
                                            // (cùng góc phải DialogFooter) — nếu chuyển isEditing đồng bộ ngay
                                            // trong onClick, mouseup của cú click thật có thể rơi trúng nút
                                            // "Lưu" vừa xuất hiện tại đó và submit "ma" ngay lập tức. Đẩy sang
                                            // tick kế tiếp để việc re-render xảy ra sau khi click đã xử lý xong.
                                            setTimeout(() => setIsEditing(true), 0)
                                        }}>
                                        <Pencil className="size-4" />
                                        {t('action.edit')}
                                    </Button>
                                    )}
                                </>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
