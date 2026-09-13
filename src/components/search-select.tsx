import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { usePagedSearch, type PagedSearchLoader } from '@/hooks/use-paged-search'
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
    /**
     * **Chế độ tìm phía server** (CONVENTIONS mục 5.7). Truyền vào khi danh sách lớn tới mức
     * **không nạp hết về client được** — component sẽ nạp **10 phần tử mỗi lượt** và nối thêm khi
     * người dùng cuộn tới đáy, thay vì lọc trên `options`.
     *
     * Bỏ trống ⇒ giữ nguyên chế độ cũ: lọc phía FE trên `options` đã nạp sẵn.
     *
     * ⚠️ Nhãn của mục **đang chọn** được nhớ lại trong `labelCache` vì sau khi đổi từ khoá, mục đó
     * có thể không còn nằm trong trang kết quả hiện tại — không nhớ thì nút hiển thị trống.
     */
    loadPage?: PagedSearchLoader<SearchSelectOption>
    /** Gợi ý trong ô tìm. Mặc định "Tìm kiếm…" — đặt lại khi cần nói rõ tìm được theo gì. */
    searchPlaceholder?: string
    /** Câu hiện khi không có kết quả. Mặc định "Không tìm thấy kết quả". */
    emptyLabel?: string
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
 * Combobox có ô tìm kiếm — hiện thực hoá CONVENTIONS mục 5.7.
 *
 * Dựng bằng `Popover` + `Input` (đều đã có trong repo) thay vì `cmdk`/shadcn `Command` —
 * tránh thêm dependency mới (CONVENTIONS mục 8).
 *
 * **Hai chế độ lấy dữ liệu**, chọn bằng cách có truyền `loadPage` hay không:
 * - **Lọc phía FE** (mặc định) — cho danh mục nhỏ đã nạp hết về client (thương hiệu, màu, size…).
 *   Ô tìm chỉ hiện khi số lựa chọn vượt `searchThreshold` (mặc định 8).
 * - **Tra phía server** (`loadPage`) — cho danh mục không nạp hết được: **10 mục mỗi lượt**, cuộn
 *   tới đáy mới nạp tiếp. Chỉ gọi API **khi dropdown được mở**, nên nhiều ô đóng không tốn request.
 *
 * Cả hai chế độ đều hỗ trợ chọn 1 (`value: string`) và chọn nhiều (`multiple`, `value: string[]`).
 */
export function SearchSelect({
    options,
    placeholder,
    triggerLabel,
    disabled,
    className,
    searchThreshold = 8,
    loadPage,
    searchPlaceholder,
    emptyLabel,
    ...rest
}: SearchSelectProps) {
    const { t } = useTranslation('common')
    const [open, setOpen] = useState(false)
    const [keyword, setKeyword] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const serverMode = loadPage !== undefined

    /*
     * Chế độ server: nạp 10 mục mỗi lượt, nối thêm khi cuộn tới đáy (CONVENTIONS mục 5.7).
     * `enabled: open` để đóng dropdown là ngừng gọi API; `minChars: 0` để mở ra đã có gợi ý sẵn.
     */
    const server = usePagedSearch<SearchSelectOption>({
        keyword,
        loadPage: loadPage ?? (async () => ({ items: [], total: 0 })),
        enabled: serverMode && open,
        minChars: 0,
    })

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

    /* Chế độ server luôn cần ô tìm — không lọc được phía FE vì chưa nạp hết danh sách. */
    const showSearch = serverMode || options.length > searchThreshold

    const filtered = useMemo(() => {
        if (serverMode) return server.items
        const kw = normalize(keyword.trim())
        if (!kw) return options
        return options.filter(
            (o) => normalize(o.label).includes(kw) || normalize(o.hint ?? '').includes(kw),
        )
    }, [serverMode, server.items, options, keyword])

    /**
     * Nhớ nhãn của mọi mục đã từng thấy.
     *
     * Ở chế độ server, danh sách hiện tại chỉ là trang kết quả của từ khoá đang gõ ⇒ mục **đang
     * chọn** thường không nằm trong đó, nút bấm sẽ hiện trống. Cache này giữ lại nhãn để nút luôn
     * nói đúng thứ người dùng đã chọn.
     */
    const labelCacheRef = useRef(new Map<string, SearchSelectOption>())
    for (const option of filtered) labelCacheRef.current.set(option.value, option)
    for (const option of options) labelCacheRef.current.set(option.value, option)

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
                const only = labelCacheRef.current.get((rest as MultipleProps).value[0])
                return only?.label ?? t('searchSelect.selectedCount', { count })
            }
            return t('searchSelect.selectedCount', { count })
        }
        const selectedValue = (rest as SingleProps).value
        const selected = selectedValue ? labelCacheRef.current.get(selectedValue) : undefined
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
                            placeholder={searchPlaceholder ?? t('searchSelect.searchPlaceholder')}
                            aria-label={searchPlaceholder ?? t('searchSelect.searchPlaceholder')}
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

                {/*
                  Luôn giới hạn chiều cao + cuộn trong panel (CONVENTIONS mục 5.7) — danh sách dài
                  không được kéo dài trang. `onScroll` chỉ có tác dụng ở chế độ server.
                */}
                <div
                    className="max-h-64 overflow-y-auto p-1"
                    role="listbox"
                    onScroll={serverMode ? server.onScroll : undefined}>
                    {serverMode && server.loading ? (
                        <p className="text-muted-foreground flex items-center justify-center gap-2 p-3 text-sm">
                            <Loader2 className="size-4 animate-spin" />
                            {t('searchSelect.loadingMore')}
                        </p>
                    ) : filtered.length === 0 ? (
                        <p className="text-muted-foreground p-3 text-center text-sm">
                            {emptyLabel ?? t('searchSelect.empty')}
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

                    {/* Chân danh sách của chế độ server: nói rõ còn hàng để cuộn, không im lặng hết. */}
                    {serverMode && !server.loading && (server.loadingMore || server.hasMore) && (
                        <p className="text-muted-foreground flex items-center justify-center gap-2 px-2 py-2 text-xs">
                            {server.loadingMore && <Loader2 className="size-3 animate-spin" />}
                            {server.loadingMore
                                ? t('searchSelect.loadingMore')
                                : t('searchSelect.scrollForMore')}
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
