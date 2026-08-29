import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type SearchSelectOption = {
    value: string
    label: string
    /** Chuỗi phụ hiển thị mờ bên phải (mã danh mục, mã SP…) — cũng được tính vào từ khoá tìm kiếm. */
    hint?: string
}

type CommonProps = {
    options: SearchSelectOption[]
    placeholder?: string
    /** Chữ trên nút khi chưa chọn gì. Mặc định dùng `placeholder`. */
    triggerLabel?: string
    disabled?: boolean
    className?: string
    /** Số lựa chọn tối thiểu để hiện ô tìm kiếm — dưới ngưỡng này thì ô search chỉ gây vướng. */
    searchThreshold?: number
}

type SingleProps = CommonProps & {
    multiple?: false
    value: string | undefined
    onChange: (value: string) => void
}

type MultipleProps = CommonProps & {
    multiple: true
    value: string[]
    onChange: (value: string[]) => void
}

type SearchSelectProps = SingleProps | MultipleProps

/** Bỏ dấu tiếng Việt để gõ "ao so mi" vẫn ra "Áo sơ mi". */
function normalize(text: string) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
}

/**
 * Dropdown có ô tìm kiếm, lọc **phía FE** trên danh sách đã nạp sẵn.
 *
 * Dựng bằng `Popover` + `Input` (đều đã có trong repo) thay vì `cmdk`/shadcn `Command` —
 * tránh thêm dependency mới (CONVENTIONS mục 8). Dùng cho danh sách vừa phải đã nạp hết về client
 * (danh mục, thương hiệu, màu, size…); danh sách lớn tới mức phải phân trang thì cần search
 * phía server, không dùng component này.
 *
 * Hỗ trợ 2 chế độ: chọn 1 (`value: string`) và chọn nhiều (`multiple`, `value: string[]`).
 * Ô tìm kiếm chỉ hiện khi số lựa chọn vượt `searchThreshold` (mặc định 8).
 */
export function SearchSelect({
    options,
    placeholder,
    triggerLabel,
    disabled,
    className,
    searchThreshold = 8,
    ...rest
}: SearchSelectProps) {
    const { t } = useTranslation('common')
    const [open, setOpen] = useState(false)
    const [keyword, setKeyword] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const isMultiple = rest.multiple === true
    const selectedValues = useMemo(
        () => (isMultiple ? (rest as MultipleProps).value : [(rest as SingleProps).value ?? '']),
        [isMultiple, rest],
    )

    useEffect(() => {
        if (!open) {
            setKeyword('')
            return
        }
        // Mở ra là gõ được ngay, không phải bấm thêm vào ô tìm kiếm.
        const id = setTimeout(() => inputRef.current?.focus(), 0)
        return () => clearTimeout(id)
    }, [open])

    const showSearch = options.length > searchThreshold

    const filtered = useMemo(() => {
        const kw = normalize(keyword.trim())
        if (!kw) return options
        return options.filter(
            (o) => normalize(o.label).includes(kw) || normalize(o.hint ?? '').includes(kw),
        )
    }, [options, keyword])

    const handleSelect = (value: string) => {
        if (isMultiple) {
            const current = (rest as MultipleProps).value
            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value]
            ;(rest as MultipleProps).onChange(next)
            return
        }
        ;(rest as SingleProps).onChange(value)
        setOpen(false)
    }

    const label = (() => {
        if (isMultiple) {
            const count = (rest as MultipleProps).value.length
            if (!count) return triggerLabel ?? placeholder
            if (count === 1) {
                const only = options.find((o) => o.value === (rest as MultipleProps).value[0])
                return only?.label ?? t('searchSelect.selectedCount', { count })
            }
            return t('searchSelect.selectedCount', { count })
        }
        const selected = options.find((o) => o.value === (rest as SingleProps).value)
        return selected?.label ?? triggerLabel ?? placeholder
    })()

    const hasSelection = isMultiple
        ? (rest as MultipleProps).value.length > 0
        : Boolean((rest as SingleProps).value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn('w-full justify-between font-normal', className)}>
                    <span className={cn('truncate', !hasSelection && 'text-muted-foreground')}>
                        {label}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            {/* Danh sách luôn xổ **xuống dưới** ô hiển thị, khớp `SelectContent` (user chốt 2026-08-30). */}
            <PopoverContent
                side="bottom"
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0">
                {showSearch && (
                    <div className="relative border-b">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            ref={inputRef}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder={t('searchSelect.searchPlaceholder')}
                            className="rounded-none border-0 pl-9 shadow-none focus-visible:ring-0"
                        />
                        {keyword && (
                            <button
                                type="button"
                                aria-label={t('searchSelect.clearSearch')}
                                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                onClick={() => {
                                    setKeyword('')
                                    inputRef.current?.focus()
                                }}>
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                )}

                <div className="max-h-64 overflow-y-auto p-1" role="listbox">
                    {filtered.length === 0 ? (
                        <p className="text-muted-foreground p-3 text-center text-sm">
                            {t('searchSelect.empty')}
                        </p>
                    ) : (
                        filtered.map((option) => {
                            const selected = selectedValues.includes(option.value)
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    className={cn(
                                        'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                                        selected && 'bg-accent/50',
                                    )}
                                    onClick={() => handleSelect(option.value)}>
                                    <Check
                                        className={cn(
                                            'size-4 shrink-0',
                                            selected ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                    {option.hint && (
                                        <span className="text-muted-foreground ml-auto shrink-0 font-mono text-xs">
                                            {option.hint}
                                        </span>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
