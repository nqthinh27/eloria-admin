import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

/**
 * ⚠️ **Chặn `wheel`/`touchmove` nổi bọt ra `document`** (sửa 2026-10-29) — KHÔNG bỏ.
 *
 * Popover mặc định `modal={false}` và render qua Portal ra `body`, tức **nằm ngoài cây DOM** của
 * `Dialog`/`Sheet` đang mở. Dialog modal khoá cuộn bằng `react-remove-scroll`: nó nghe `wheel`/
 * `touchmove` ở `document` và `preventDefault()` mọi sự kiện không thuộc nội dung Dialog ⇒ lăn
 * chuột trên danh sách của Popover (vd `SearchSelect` trong modal sản phẩm) **không cuộn**, dù vẫn
 * kéo được thanh cuộn. Dừng nổi bọt ngay tại panel để listener đó không nhận được sự kiện; ngoài
 * Dialog thì không có listener nào nên vô hại.
 *
 * Không dùng `modal` cho Popover vì sẽ khoá focus/pointer cả trang (ảnh hưởng popover gợi ý,
 * chuông thông báo…); không portal vào trong Dialog vì panel bị `overflow`/`transform` của Dialog cắt.
 */
function stopScrollLockPropagation(event: React.SyntheticEvent) {
  event.stopPropagation()
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  onWheel,
  onTouchMove,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        onWheel={(event) => {
          onWheel?.(event)
          stopScrollLockPropagation(event)
        }}
        onTouchMove={(event) => {
          onTouchMove?.(event)
          stopScrollLockPropagation(event)
        }}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
