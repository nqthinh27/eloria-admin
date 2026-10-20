import { forwardRef, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

/** Radix `SelectItem` không nhận `value=""` ⇒ sentinel NỘI BỘ của component, không lộ ra caller. */
const NONE_VALUE = '__none__'

type ClearableSelectProps = {
    value: string | undefined
    onValueChange: (value: string) => void
    /**
     * Có truyền ⇒ ô là **không bắt buộc**: danh sách có thêm mục "-Không chọn-" (in nghiêng, mờ) ở
     * đầu; chọn nó gọi `onClear` để về rỗng/placeholder. Bỏ trống ⇒ ô bắt buộc, y hệt `Select`
     * thường. Caller quyết định "rỗng" là gì (`undefined`, `''`…) để khớp kiểu giá trị của form.
     */
    onClear?: () => void
    placeholder?: string
    disabled?: boolean
    /** Class của `SelectTrigger` (mặc định `w-full`). */
    className?: string
    children: ReactNode
} & Omit<ComponentProps<typeof SelectTrigger>, 'value' | 'onChange' | 'children' | 'className'>

/**
 * `Select` cho dropdown **không bắt buộc** (nhãn không có `*`): thay vì thêm icon ✕ vào ô, danh sách
 * có mục "-Không chọn-" đại diện cho `null`/`""`. Props thừa (`id`, `aria-invalid`… do `FormControl`
 * bơm xuống) chuyển thẳng vào trigger.
 */
export const ClearableSelect = forwardRef<HTMLButtonElement, ClearableSelectProps>(
    function ClearableSelect(
        { value, onValueChange, onClear, placeholder, disabled, className, children, ...triggerProps },
        ref,
    ) {
        const { t } = useTranslation('common')

        return (
            <Select
                value={value ?? ''}
                onValueChange={(next) => (next === NONE_VALUE ? onClear?.() : onValueChange(next))}
                disabled={disabled}>
                <SelectTrigger ref={ref} className={cn('w-full', className)} {...triggerProps}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {onClear && (
                        <SelectItem value={NONE_VALUE} className="text-muted-foreground italic">
                            {t('action.noSelection')}
                        </SelectItem>
                    )}
                    {children}
                </SelectContent>
            </Select>
        )
    },
)
