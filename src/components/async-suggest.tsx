import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { usePagedSearch, type PagedSearchLoader } from '@/hooks/use-paged-search'
import { Input } from '@/components/ui/input'

type Props<T> = {
    /** Id của ô nhập — để `<Label htmlFor>` bên ngoài trỏ đúng vào nó. */
    id?: string
    value: string
    onValueChange: (value: string) => void
    loadPage: PagedSearchLoader<T>
    getKey: (item: T) => string
    renderItem: (item: T) => ReactNode
    onPick: (item: T) => void
    placeholder?: string
    /** Nhãn cho trình đọc màn hình khi không có `<Label>` riêng. */
    ariaLabel?: string
    /** Số ký tự tối thiểu mới gọi API. `0` ⇒ mở ra là gợi ý luôn. */
    minChars?: number
    disabled?: boolean
    className?: string
    /** Icon trong ô nhập — mặc định kính lúp. */
    icon?: ReactNode
    /** Câu hiển thị khi tìm xong mà không có kết quả nào. */
    emptyLabel?: string
}

/**
 * Ô nhập **tự gợi ý, nạp từ server** — hiện thực hoá CONVENTIONS mục 5.7.
 *
 * Dùng cho các ô tra cứu mà người dùng gõ tự do rồi chọn một bản ghi (tra khách ở POS, tra đơn gốc
 * khi lập phiếu đổi/trả). Khác `SearchSelect` ở chỗ **không có trạng thái "đang chọn" hiển thị trên
 * control** — chọn xong là nơi gọi tự quyết định hiển thị cái gì.
 *
 * Ba luật của mục 5.7 được ép cứng ở đây, màn hình không đặt khác được:
 * 1. **Panel kết quả NỔI** (`absolute` + `z-50`) — không đẩy nội dung bên dưới xuống.
 * 2. **Giới hạn chiều cao** (`max-h-64`) và tự cuộn — danh sách dài không kéo trang dài ra.
 * 3. **Nạp 10 phần tử mỗi lượt + infinite scroll** — cuộn tới đáy mới nạp tiếp, nhờ vậy không bao
 *    giờ cắt kết quả trong im lặng như cách xin một trang `size` lớn.
 *
 * ⚠️ Cố ý **không dùng `Popover`**: Radix Popover kéo focus sang panel, người dùng đang gõ dở sẽ bị
 * cướp con trỏ mỗi lần kết quả về. Panel ở đây chỉ là `div` neo theo ô nhập nên gõ tiếp được liên tục.
 */
export function AsyncSuggest<T>({
    id,
    value,
    onValueChange,
    loadPage,
    getKey,
    renderItem,
    onPick,
    placeholder,
    ariaLabel,
    minChars = 1,
    disabled,
    className,
    icon,
    emptyLabel,
}: Props<T>) {
    const { t } = useTranslation('common')
    const listId = useId()
    const [focused, setFocused] = useState(false)

    const { items, loading, loadingMore, hasMore, searched, onScroll } = usePagedSearch<T>({
        keyword: value,
        loadPage,
        minChars,
        enabled: !disabled,
    })

    /*
     * Panel chỉ mở khi ô nhập **đang được focus** và đã tìm xong.
     *
     * ⚠️ Điều kiện focus là bắt buộc với `minChars = 0`: thiếu nó, ô vừa hiện ra là tự nạp gợi ý
     * rồi bung panel đè lên form, người dùng chưa làm gì đã thấy một khối che mất nội dung.
     * Điều kiện `!loading` để không nháy khung rỗng ngay lúc vừa gõ ký tự đầu.
     */
    const showPanel = focused && searched && !loading

    return (
        <div className={cn('relative', className)}>
            <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2">
                    {icon ?? <Search className="size-4" />}
                </span>
                <Input
                    id={id}
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    placeholder={placeholder}
                    aria-label={ariaLabel ?? placeholder}
                    aria-controls={listId}
                    aria-expanded={showPanel}
                    role="combobox"
                    disabled={disabled}
                    onFocus={() => setFocused(true)}
                    /*
                     * Nút trong panel đã chặn `mousedown` nên bấm chọn KHÔNG làm ô mất focus ⇒ đóng
                     * ngay ở `blur` là an toàn, không cần hẹn giờ chờ click như cách làm thường gặp.
                     */
                    onBlur={() => setFocused(false)}
                    className="pl-9"
                />
                {loading && (
                    <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
                )}
            </div>

            {showPanel && (
                /* `bg-popover`, KHÔNG `bg-background` — nền xám sẽ chìm vào trang (CONVENTIONS mục 5). */
                <div className="bg-popover absolute top-full right-0 left-0 z-50 mt-2 rounded-md border shadow-lg">
                    {items.length === 0 ? (
                        <p className="text-muted-foreground px-3 py-2 text-xs">
                            {emptyLabel ?? t('searchSelect.empty')}
                        </p>
                    ) : (
                        <ul
                            id={listId}
                            role="listbox"
                            className="max-h-64 divide-y overflow-y-auto"
                            onScroll={onScroll}>
                            {items.map((item) => (
                                <li key={getKey(item)} role="option" aria-selected={false}>
                                    <button
                                        type="button"
                                        className="hover:bg-accent focus-visible:bg-accent w-full px-3 py-2 text-left outline-none"
                                        /* Giữ focus ở ô nhập để `blur` không đóng panel trước `click`. */
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                            setFocused(false)
                                            onPick(item)
                                        }}>
                                        {renderItem(item)}
                                    </button>
                                </li>
                            ))}
                            {/* Chân danh sách: nói rõ còn hàng để cuộn, thay vì im lặng hết. */}
                            {(loadingMore || hasMore) && (
                                <li className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-2 text-xs">
                                    {loadingMore && <Loader2 className="size-3 animate-spin" />}
                                    {loadingMore
                                        ? t('searchSelect.loadingMore')
                                        : t('searchSelect.scrollForMore')}
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
