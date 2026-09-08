import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { setFormErrorFromApi } from '@/lib/form-error'
import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { ERole } from '@/types/common'
import { EOrderChannel } from '@/types/order'
import type { Branch } from '@/types/branch'
import {
    EPromotionTarget,
    EPromotionType,
    type CreatePromotionReq,
    type Promotion,
} from '@/types/promotion'
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
import { DateInput } from '@/components/date-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Radix Select không nhận `value=""` ⇒ dùng sentinel cho "toàn chuỗi". */
const ALL_BRANCHES = '__all__'

/**
 * Schema khớp ràng buộc backend (`khuyen-mai-p9.md`):
 * `PERCENT` ⇒ `value` ∈ (0, 100] · `FIXED` ⇒ `value` > 0 · `target !== ALL` ⇒ bắt buộc `targetId`.
 *
 * Các ô số để **chuỗi** rồi tự parse: ô trống nghĩa là "không giới hạn" (gửi `null`), khác hẳn `0`.
 * ⚠️ Vì vậy chỗ nào đọc ô số cũng phải so `trim() === ''`, **không** dùng falsy check — `0` là
 * giá trị hợp lệ (cùng bài học với `costPrice` ở Phase 12).
 */
const buildSchema = (t: (key: string) => string) =>
    z
        .object({
            name: z.string().trim().min(1, t('promotion.validation.nameRequired')).max(150),
            code: z.string().trim().max(50).optional(),
            type: z.enum([EPromotionType.PERCENT, EPromotionType.FIXED]),
            value: z.string().trim().min(1, t('promotion.validation.valueRequired')),
            target: z.enum([
                EPromotionTarget.ALL,
                EPromotionTarget.PRODUCT,
                EPromotionTarget.CATEGORY,
                EPromotionTarget.BRAND,
                EPromotionTarget.SKU,
            ]),
            targetId: z.string().trim().optional(),
            channel: z.enum([EOrderChannel.ONLINE, EOrderChannel.POS, EOrderChannel.OTHER]),
            branchId: z.string().optional(),
            minAmount: z.string().trim().optional(),
            maxDiscount: z.string().trim().optional(),
            usageLimit: z.string().trim().optional(),
            perCustomerLimit: z.string().trim().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        })
        .superRefine((values, ctx) => {
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

            /* `targetId` chỉ bắt buộc khi phạm vi không phải ALL — backend cũng chặn như vậy. */
            if (values.target !== EPromotionTarget.ALL && !values.targetId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['targetId'],
                    message: t('promotion.validation.targetIdRequired'),
                })
            }

            if (values.startDate && values.endDate && values.endDate < values.startDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['endDate'],
                    message: t('promotion.validation.dateOrder'),
                })
            }
        })

type PromotionFormValues = z.infer<ReturnType<typeof buildSchema>>

/** Ô số rỗng ⇒ `null` ("không giới hạn"). `0` là giá trị hợp lệ nên **không** dùng falsy check. */
function parseOptionalNumber(raw: string | undefined): number | null {
    if (raw === undefined || raw.trim() === '') return null
    const parsed = Number(raw)
    return Number.isNaN(parsed) ? null : parsed
}

/** `yyyy-MM-dd` từ input date ⇒ ISO UTC theo mốc đầu/cuối ngày giờ máy. */
function toIsoDate(raw: string | undefined, endOfDay = false): string | null {
    if (!raw) return null
    const date = new Date(`${raw}T${endOfDay ? '23:59:59' : '00:00:00'}`)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** ISO ⇒ `yyyy-MM-dd` cho input date (giờ địa phương, tránh lệch ngày do UTC). */
function toDateInput(iso: string | null): string {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const offset = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

type PromotionFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = tạo mới, có giá trị = sửa. */
    promotion: Promotion | null
    branches: Branch[]
    onCreate: (payload: CreatePromotionReq) => Promise<void>
    onUpdate: (id: string, payload: CreatePromotionReq) => Promise<void>
}

/**
 * Dialog tạo/sửa khuyến mại — mockup `16-khuyen-mai.png` chỉ vẽ nút "Tạo khuyến mại", không vẽ
 * form ⇒ dựng theo pattern form chuẩn của repo (CONVENTIONS mục 6.2).
 *
 * ⚠️ **Không có ô nhập `targetId` dạng chọn sẵn**: backend nhận id thô cho 4 phạm vi
 * (PRODUCT/CATEGORY/BRAND/SKU) nhưng **không có API tra cứu chung** — mỗi phạm vi một endpoint
 * khác nhau. Bản này để ô nhập id trực tiếp và mặc định phạm vi `ALL` (dùng được ngay);
 * bộ chọn theo từng phạm vi là việc của lần cải tiến sau, xem PLAN Phase 14 "phần chưa làm".
 */
export function PromotionFormDialog({
    open,
    onOpenChange,
    promotion,
    branches,
    onCreate,
    onUpdate,
}: PromotionFormDialogProps) {
    const { t } = useTranslation(['promotion', 'common'])
    const { user } = useAuth()
    const isEdit = promotion !== null

    /*
     * Chỉ SUPER_ADMIN chọn được chi nhánh: ADMIN bị backend **ép** về chi nhánh mình, truyền chi
     * nhánh khác trả `error.promotion.branchForbidden` ⇒ bày dropdown cho ADMIN là đánh lừa
     * người dùng (cùng lý do đã áp cho bộ lọc chi nhánh ở màn Báo cáo).
     */
    const canChooseBranch = hasRole(user?.role, ERole.SUPER_ADMIN)

    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<PromotionFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            code: '',
            type: EPromotionType.PERCENT,
            value: '',
            target: EPromotionTarget.ALL,
            targetId: '',
            channel: EOrderChannel.ONLINE,
            branchId: ALL_BRANCHES,
            minAmount: '',
            maxDiscount: '',
            usageLimit: '',
            perCustomerLimit: '',
            startDate: '',
            endDate: '',
        },
    })

    useEffect(() => {
        if (!open) return
        form.reset({
            name: promotion?.name ?? '',
            code: promotion?.code ?? '',
            type: promotion?.type ?? EPromotionType.PERCENT,
            value: promotion != null ? String(promotion.value) : '',
            target: promotion?.target ?? EPromotionTarget.ALL,
            targetId: promotion?.targetId ?? '',
            channel: promotion?.channel ?? EOrderChannel.ONLINE,
            branchId: promotion?.branchId ?? ALL_BRANCHES,
            minAmount: promotion?.minAmount != null ? String(promotion.minAmount) : '',
            maxDiscount: promotion?.maxDiscount != null ? String(promotion.maxDiscount) : '',
            usageLimit: promotion?.usageLimit != null ? String(promotion.usageLimit) : '',
            perCustomerLimit:
                promotion?.perCustomerLimit != null ? String(promotion.perCustomerLimit) : '',
            startDate: toDateInput(promotion?.startDate ?? null),
            endDate: toDateInput(promotion?.endDate ?? null),
        })
    }, [open, promotion, form])

    /* Đổi loại giảm ⇒ "giảm tối đa" chỉ còn nghĩa với PERCENT. */
    const selectedType = form.watch('type')
    const selectedTarget = form.watch('target')

    const onSubmit = async (values: PromotionFormValues) => {
        const payload: CreatePromotionReq = {
            name: values.name,
            /* Ô mã trống ⇒ KM tự động (`code: null`), không phải chuỗi rỗng. */
            code: values.code?.trim() ? values.code.trim() : null,
            type: values.type,
            value: Number(values.value),
            target: values.target,
            targetId: values.target === EPromotionTarget.ALL ? null : (values.targetId ?? null),
            channel: values.channel,
            branchId:
                !canChooseBranch || values.branchId === ALL_BRANCHES
                    ? null
                    : (values.branchId ?? null),
            minAmount: parseOptionalNumber(values.minAmount),
            /* Giảm tối đa vô nghĩa với FIXED — không gửi để tránh dữ liệu rác. */
            maxDiscount:
                values.type === EPromotionType.PERCENT
                    ? parseOptionalNumber(values.maxDiscount)
                    : null,
            usageLimit: parseOptionalNumber(values.usageLimit),
            perCustomerLimit: parseOptionalNumber(values.perCustomerLimit),
            startDate: toIsoDate(values.startDate),
            endDate: toIsoDate(values.endDate, true),
        }

        try {
            if (isEdit) {
                await onUpdate(promotion.id, payload)
            } else {
                await onCreate(payload)
            }
            onOpenChange(false)
        } catch (error) {
            setFormErrorFromApi(form, error, {}, 'name')
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('promotion.form.editTitle') : t('promotion.form.createTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? t('promotion.form.editDescription')
                            : t('promotion.form.createDescription')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                        {/* ---------------- Thông tin chương trình ---------------- */}
                        <section className="space-y-4">
                            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                {t('promotion.form.sectionBasic')}
                            </h3>

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

                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('promotion.form.code')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder={t('promotion.form.codePlaceholder')}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            {t('promotion.form.codeHint')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                                {/*
                                                  Ô đổi đơn vị theo loại giảm: `%` giữ Input thường
                                                  (có thể có phần lẻ, không cần ngăn cách hàng
                                                  nghìn), `đ` dùng MoneyInput (CONVENTIONS mục 5.5).
                                                */}
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
                        </section>

                        {/* ---------------- Phạm vi áp dụng ---------------- */}
                        <section className="space-y-4">
                            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                {t('promotion.form.sectionScope')}
                            </h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="target"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('promotion.form.target')}</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.values(EPromotionTarget).map(
                                                        (target) => (
                                                            <SelectItem key={target} value={target}>
                                                                {t(`promotion.target.${target}`)}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Phạm vi ALL không cần đối tượng ⇒ ẩn hẳn ô cho gọn. */}
                                {selectedTarget !== EPromotionTarget.ALL && (
                                    <FormField
                                        control={form.control}
                                        name="targetId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('promotion.form.targetId')}{' '}
                                                    <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder={t(
                                                            'promotion.form.targetIdPlaceholder',
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
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
                                                    {Object.values(EOrderChannel).map((channel) => (
                                                        <SelectItem key={channel} value={channel}>
                                                            {t(`promotion.channel.${channel}`)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {canChooseBranch && (
                                    <FormField
                                        control={form.control}
                                        name="branchId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('promotion.form.branch')}</FormLabel>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value={ALL_BRANCHES}>
                                                            {t('promotion.form.branchAll')}
                                                        </SelectItem>
                                                        {branches.map((branch) => (
                                                            <SelectItem
                                                                key={branch.id}
                                                                value={branch.id}>
                                                                {branch.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </section>

                        {/* ---------------- Giới hạn & thời gian ---------------- */}
                        <section className="space-y-4">
                            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                                {t('promotion.form.sectionLimit')}
                            </h3>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                                {/* Trần giảm chỉ có nghĩa với PERCENT — FIXED thì ẩn đi. */}
                                {selectedType === EPromotionType.PERCENT && (
                                    <FormField
                                        control={form.control}
                                        name="maxDiscount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('promotion.form.maxDiscount')}
                                                </FormLabel>
                                                <FormControl>
                                                    <MoneyInput
                                                        value={field.value ?? ''}
                                                        onChange={field.onChange}
                                                        placeholder={t(
                                                            'promotion.form.maxDiscountPlaceholder',
                                                        )}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            {/*
                              Chú thích của "Giảm tối đa" tách khỏi ô, đặt dưới cả hàng: để trong
                              `FormItem` thì ô bên phải cao hơn ô bên trái ⇒ hàng kế tiếp bị lệch.
                            */}
                            {selectedType === EPromotionType.PERCENT && (
                                <p className="text-muted-foreground text-xs">
                                    {t('promotion.form.maxDiscountHint')}
                                </p>
                            )}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="usageLimit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('promotion.form.usageLimit')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    inputMode="numeric"
                                                    placeholder={t(
                                                        'promotion.form.usageLimitPlaceholder',
                                                    )}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="perCustomerLimit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t('promotion.form.perCustomerLimit')}
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    inputMode="numeric"
                                                    placeholder={t(
                                                        'promotion.form.perCustomerLimitPlaceholder',
                                                    )}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('promotion.form.startDate')}</FormLabel>
                                            <FormControl>
                                                <DateInput
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('promotion.form.endDate')}</FormLabel>
                                            <FormControl>
                                                <DateInput
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <p className="text-muted-foreground text-xs">
                                {t('promotion.form.dateHint')}
                            </p>
                        </section>

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
                                {isEdit
                                    ? t('promotion.form.submitEdit')
                                    : t('promotion.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
