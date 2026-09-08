import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Copy, Loader2 } from 'lucide-react'
import { z } from 'zod'

import { setFormErrorFromApi } from '@/lib/form-error'
import { toastSuccess } from '@/lib/toast'
import { EOrderChannel } from '@/types/order'
import { EPromotionTarget, EPromotionType, type CouponGenerateReq } from '@/types/promotion'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/money-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Backend chặn `count` ≤ 5000. */
const MAX_COUPON_COUNT = 5000

const buildSchema = (t: (key: string) => string) =>
    z
        .object({
            name: z.string().trim().min(1, t('promotion.validation.nameRequired')).max(150),
            count: z.string().trim().min(1, t('promotion.validation.countRange')),
            codePrefix: z.string().trim().max(20).optional(),
            type: z.enum([EPromotionType.PERCENT, EPromotionType.FIXED]),
            value: z.string().trim().min(1, t('promotion.validation.valueRequired')),
            channel: z.enum([EOrderChannel.ONLINE, EOrderChannel.POS, EOrderChannel.OTHER]),
            minAmount: z.string().trim().optional(),
            usageLimitPerCode: z.string().trim().optional(),
        })
        .superRefine((values, ctx) => {
            const count = Number(values.count)
            if (!Number.isInteger(count) || count < 1 || count > MAX_COUPON_COUNT) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['count'],
                    message: t('promotion.validation.countRange'),
                })
            }

            const numeric = Number(values.value)
            if (Number.isNaN(numeric)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['value'],
                    message: t('promotion.validation.valueRequired'),
                })
            } else if (values.type === EPromotionType.PERCENT) {
                if (numeric <= 0 || numeric > 100) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['value'],
                        message: t('promotion.validation.valuePercentRange'),
                    })
                }
            } else if (numeric <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['value'],
                    message: t('promotion.validation.valueFixedMin'),
                })
            }
        })

type CouponFormValues = z.infer<ReturnType<typeof buildSchema>>

/** Ô trống ⇒ `null` ("không giới hạn"); `0` vẫn là giá trị hợp lệ nên không dùng falsy check. */
function parseOptionalNumber(raw: string | undefined): number | null {
    if (raw === undefined || raw.trim() === '') return null
    const parsed = Number(raw)
    return Number.isNaN(parsed) ? null : parsed
}

/**
 * Dialog sinh mã giảm giá hàng loạt (`POST /coupon/generate`).
 *
 * ⚠️ Mã sinh ra **có hiệu lực ngay** (`status = RUNNING`), khác KM thường luôn bắt đầu ở `DRAFT` —
 * nên phần mô tả của dialog nói rõ điều này trước khi người dùng bấm.
 *
 * Phạm vi để cứng `ALL`: backend nhận `target`/`targetId` nhưng chưa có bộ chọn đối tượng dùng
 * chung (xem ghi chú ở `promotion-form-dialog.tsx`) — sinh coupon toàn bộ sản phẩm là ca dùng
 * phổ biến và không cần tra id thủ công.
 */
export function CouponGenerateDialog({
    open,
    onOpenChange,
    onGenerate,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onGenerate: (payload: CouponGenerateReq) => Promise<string[]>
}) {
    const { t } = useTranslation(['promotion', 'common'])
    /** Danh sách mã vừa sinh — hiện ngay trong dialog vì backend không có API xem lại theo lô. */
    const [generated, setGenerated] = useState<string[] | null>(null)

    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<CouponFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            count: '10',
            codePrefix: '',
            type: EPromotionType.PERCENT,
            value: '',
            channel: EOrderChannel.ONLINE,
            minAmount: '',
            usageLimitPerCode: '1',
        },
    })

    useEffect(() => {
        if (open) setGenerated(null)
    }, [open])

    const selectedType = form.watch('type')

    const onSubmit = async (values: CouponFormValues) => {
        const payload: CouponGenerateReq = {
            name: values.name,
            count: Number(values.count),
            codePrefix: values.codePrefix?.trim() ? values.codePrefix.trim() : null,
            type: values.type,
            value: Number(values.value),
            target: EPromotionTarget.ALL,
            targetId: null,
            channel: values.channel,
            minAmount: parseOptionalNumber(values.minAmount),
            usageLimitPerCode: parseOptionalNumber(values.usageLimitPerCode),
        }

        try {
            const codes = await onGenerate(payload)
            setGenerated(codes)
        } catch (error) {
            setFormErrorFromApi(form, error, {}, 'name')
        }
    }

    const handleCopy = async () => {
        if (!generated) return
        await navigator.clipboard.writeText(generated.join('\n'))
        toastSuccess('promotion.coupon.copied', { ns: 'promotion' })
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                {generated ? (
                    /* ---------- Bước 2: hiện danh sách mã vừa sinh ---------- */
                    <>
                        <DialogHeader>
                            <DialogTitle>
                                {t('promotion.coupon.resultTitle', { count: generated.length })}
                            </DialogTitle>
                            <DialogDescription>
                                {t('promotion.coupon.resultDescription')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="bg-muted max-h-64 overflow-y-auto rounded-md p-3">
                            <ul className="space-y-1">
                                {generated.map((code) => (
                                    <li key={code} className="font-mono text-xs">
                                        {code}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCopy}>
                                <Copy />
                                {t('promotion.coupon.copyAll')}
                            </Button>
                            <Button type="button" onClick={() => onOpenChange(false)}>
                                {t('promotion.coupon.close')}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    /* ---------- Bước 1: form cấu hình lô mã ---------- */
                    <>
                        <DialogHeader>
                            <DialogTitle>{t('promotion.coupon.title')}</DialogTitle>
                            <DialogDescription>
                                {t('promotion.coupon.description')}
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                noValidate>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t('promotion.form.name')}{' '}
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder={t('promotion.form.namePlaceholder')}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="count"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('promotion.coupon.count')}{' '}
                                                    <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} inputMode="numeric" />
                                                </FormControl>
                                                <FormDescription>
                                                    {t('promotion.coupon.countHint')}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="codePrefix"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('promotion.coupon.codePrefix')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder={t(
                                                            'promotion.coupon.codePrefixPlaceholder',
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    {t('promotion.coupon.codePrefixHint')}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('promotion.form.type')}</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value={EPromotionType.PERCENT}>
                                                            {t('promotion.type.PERCENT')}
                                                        </SelectItem>
                                                        <SelectItem value={EPromotionType.FIXED}>
                                                            {t('promotion.type.FIXED')}
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="value"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('promotion.form.value')}{' '}
                                                    <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    {selectedType === EPromotionType.PERCENT ? (
                                                        <div className="relative">
                                                            <Input
                                                                {...field}
                                                                inputMode="decimal"
                                                                className="pr-8"
                                                                placeholder={t(
                                                                    'promotion.form.valuePercentPlaceholder',
                                                                )}
                                                            />
                                                            <span
                                                                aria-hidden
                                                                className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                                                                %
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <MoneyInput
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            placeholder={t(
                                                                'promotion.form.valueFixedPlaceholder',
                                                            )}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="channel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('promotion.form.channel')}</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Object.values(EOrderChannel).map(
                                                            (channel) => (
                                                                <SelectItem
                                                                    key={channel}
                                                                    value={channel}>
                                                                    {t(
                                                                        `promotion.channel.${channel}`,
                                                                    )}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="usageLimitPerCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('promotion.coupon.usageLimitPerCode')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} inputMode="numeric" />
                                                </FormControl>
                                                <FormDescription>
                                                    {t('promotion.coupon.usageLimitPerCodeHint')}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="minAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('promotion.form.minAmount')}</FormLabel>
                                            <FormControl>
                                                <MoneyInput
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    placeholder={t(
                                                        'promotion.form.minAmountPlaceholder',
                                                    )}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        onClick={() => onOpenChange(false)}>
                                        {t('promotion.form.cancel')}
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="animate-spin" />}
                                        {t('promotion.coupon.submit')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
