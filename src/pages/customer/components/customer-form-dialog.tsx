import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { z } from 'zod'

import { customerApi } from '@/api/customer'
import { PHONE_PATTERN } from '@/lib/validation'
import { setFormErrorFromApi } from '@/lib/form-error'
import { useBranch } from '@/hooks/use-branch'
import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { ERole, EGender } from '@/types/common'
import type { Customer, CreateCustomerReq, CustomerDuplicate, UpdateCustomerReq } from '@/types/customer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Chờ gõ xong SĐT rồi mới tra trùng, tránh gọi API mỗi lần gõ 1 ký tự. */
const DUPLICATE_CHECK_DEBOUNCE_MS = 400

const buildSchema = (t: (key: string) => string, isEdit: boolean, requireBranch: boolean) =>
    z.object({
        fullName: z
            .string()
            .trim()
            .min(1, t('customer.form.validation.fullNameRequired'))
            .max(100, t('customer.form.validation.fullNameMaxLength')),
        // `UpdateCustomerReqDTO` không có `phoneNumber` ⇒ lúc sửa field này chỉ để hiển thị.
        phoneNumber: isEdit
            ? z.string().optional()
            : z.string().regex(PHONE_PATTERN, t('customer.form.validation.phoneInvalid')),
        email: z
            .string()
            .trim()
            .email(t('customer.form.validation.emailInvalid'))
            .optional()
            .or(z.literal('')),
        dob: z.string().optional(),
        gender: z.nativeEnum(EGender).optional(),
        /*
         * SUPER_ADMIN bắt buộc truyền `branchId` khi tạo, nếu không backend trả `error.branch.required`.
         * Chưa chọn gì thì giá trị là `undefined` (không phải chuỗi rỗng) ⇒ phải đặt `error` cho
         * chính schema, không chỉ `.min(1)`: thiếu nó, zod v4 báo lỗi kiểu mặc định bằng tiếng Anh
         * ("Invalid input: expected string, received undefined") lọt ra UI.
         */
        branchId:
            requireBranch && !isEdit
                ? z
                      .string({ error: () => t('customer.form.validation.branchRequired') })
                      .min(1, t('customer.form.validation.branchRequired'))
                : z.string().optional(),
    })

type CustomerFormValues = z.infer<ReturnType<typeof buildSchema>>

type CustomerFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới, có giá trị = sửa hồ sơ. */
    customer: Customer | null
    onCreate: (payload: CreateCustomerReq) => Promise<void>
    onUpdate: (id: string, payload: UpdateCustomerReq) => Promise<void>
}

/**
 * Dialog thêm/sửa khách hàng.
 *
 * Mockup `10-khach-hang.png` chỉ vẽ nút "Thêm khách hàng", không vẽ form ⇒ dựng theo pattern form
 * chuẩn của `07-nhan-vien` (CONVENTIONS mục 6.2).
 *
 * Hai ràng buộc lấy từ API thật, không suy đoán:
 * - `UpdateCustomerReqDTO` **không có** `phoneNumber`/`branchId` (mapper backend `@Mapping(ignore)`)
 *   ⇒ khi sửa, 2 field này hiển thị nhưng bị khoá.
 * - `GET /customer/duplicates` là `[ADMIN]` ⇒ chỉ ADMIN+ mới tra trùng được; STAFF gọi sẽ 403 nên
 *   bỏ qua hẳn bước này thay vì hiện lỗi.
 */
export function CustomerFormDialog({
    open,
    onOpenChange,
    customer,
    onCreate,
    onUpdate,
}: CustomerFormDialogProps) {
    const { t } = useTranslation(['customer', 'common'])
    const { user } = useAuth()
    const { branches } = useBranch()
    const isEdit = customer !== null
    const isSuperAdmin = hasRole(user?.role, ERole.SUPER_ADMIN)
    const canCheckDuplicate = hasRole(user?.role, ERole.ADMIN)

    const [duplicate, setDuplicate] = useState<CustomerDuplicate | null>(null)
    const [checkingDuplicate, setCheckingDuplicate] = useState(false)

    const schema = useMemo(
        () => buildSchema(t, isEdit, isSuperAdmin),
        [t, isEdit, isSuperAdmin],
    )

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            fullName: '',
            phoneNumber: '',
            email: '',
            dob: '',
            gender: undefined,
            branchId: undefined,
        },
    })

    useEffect(() => {
        if (!open) return
        setDuplicate(null)
        form.reset({
            fullName: customer?.fullName ?? '',
            phoneNumber: customer?.phoneNumber ?? '',
            email: customer?.email ?? '',
            dob: customer?.dob?.slice(0, 10) ?? '',
            gender: customer?.gender ?? undefined,
            branchId: customer?.branchId ?? user?.branchId ?? undefined,
        })
    }, [open, customer, user?.branchId, form])

    const phoneValue = form.watch('phoneNumber')
    const abortRef = useRef<AbortController | null>(null)

    /* Tra trùng SĐT khi thêm mới — PLAN Phase 8 ("cảnh báo trùng hồ sơ theo SĐT"). */
    useEffect(() => {
        abortRef.current?.abort()

        if (!open || isEdit || !canCheckDuplicate || !PHONE_PATTERN.test(phoneValue ?? '')) {
            setDuplicate(null)
            setCheckingDuplicate(false)
            return
        }

        const controller = new AbortController()
        abortRef.current = controller
        setCheckingDuplicate(true)

        const timer = setTimeout(async () => {
            try {
                const result = await customerApi.checkDuplicate(phoneValue!, controller.signal)
                if (!controller.signal.aborted) setDuplicate(result)
            } catch {
                // 403 (STAFF) hoặc huỷ request — không phải lỗi cần hiển thị, chỉ bỏ qua cảnh báo.
                if (!controller.signal.aborted) setDuplicate(null)
            } finally {
                if (!controller.signal.aborted) setCheckingDuplicate(false)
            }
        }, DUPLICATE_CHECK_DEBOUNCE_MS)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [phoneValue, open, isEdit, canCheckDuplicate])

    const onSubmit = async (values: CustomerFormValues) => {
        const dob = values.dob ? new Date(values.dob).toISOString() : undefined

        try {
            if (isEdit) {
                await onUpdate(customer.id, {
                    fullName: values.fullName,
                    email: values.email || undefined,
                    dob,
                    gender: values.gender,
                })
            } else {
                await onCreate({
                    fullName: values.fullName,
                    phoneNumber: values.phoneNumber!,
                    email: values.email || undefined,
                    dob,
                    gender: values.gender,
                    // STAFF/ADMIN bị backend ép về chi nhánh của mình, chỉ SUPER_ADMIN chọn được.
                    branchId: isSuperAdmin ? values.branchId : undefined,
                })
            }
            onOpenChange(false)
        } catch (error) {
            setFormErrorFromApi(
                form,
                error,
                { 'error.phone.existed': 'phoneNumber', 'error.branch.required': 'branchId' },
                'fullName',
            )
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('customer.form.editTitle') : t('customer.form.addTitle')}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('customer.form.fullName')}{' '}
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('customer.form.fullNamePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('customer.form.phoneNumber')}
                                            {!isEdit && <span className="text-destructive"> *</span>}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ''}
                                                type="tel"
                                                disabled={isEdit}
                                                placeholder={t('customer.form.phoneNumberPlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('customer.form.email')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                value={field.value ?? ''}
                                                placeholder={t('customer.form.emailPlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {checkingDuplicate && (
                            <p className="text-muted-foreground flex items-center gap-2 text-xs">
                                <Loader2 className="size-3 animate-spin" />
                                {t('customer.duplicate.checking')}
                            </p>
                        )}

                        {duplicate?.exists && (
                            <Alert variant="destructive">
                                <AlertTriangle className="size-4" />
                                <AlertTitle>
                                    {duplicate.viewable
                                        ? t('customer.duplicate.foundTitle')
                                        : t('customer.duplicate.notViewableTitle')}
                                </AlertTitle>
                                <AlertDescription>
                                    {duplicate.viewable && duplicate.customer
                                        ? t('customer.duplicate.foundDescription', {
                                              name: duplicate.customer.fullName,
                                              branch:
                                                  duplicate.customer.branchName ??
                                                  t('customer.list.noBranch'),
                                          })
                                        : t('customer.duplicate.notViewableDescription')}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="dob"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('customer.form.dob')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ''} type="date" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('customer.form.gender')}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('customer.form.genderPlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={EGender.MALE}>
                                                    {t('customer.detail.genderMale')}
                                                </SelectItem>
                                                <SelectItem value={EGender.FEMALE}>
                                                    {t('customer.detail.genderFemale')}
                                                </SelectItem>
                                                <SelectItem value={EGender.OTHER}>
                                                    {t('customer.detail.genderOther')}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="branchId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('customer.form.branch')}
                                        {!isEdit && isSuperAdmin && (
                                            <span className="text-destructive"> *</span>
                                        )}
                                    </FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        disabled={isEdit || !isSuperAdmin}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue
                                                    placeholder={t('customer.form.branchPlaceholder')}
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isEdit && (
                            <p className="text-muted-foreground text-xs">
                                {t('customer.form.phoneLockedHint')}
                            </p>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting
                                    ? t('customer.form.submitting')
                                    : isEdit
                                      ? t('customer.form.submitUpdate')
                                      : t('customer.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
