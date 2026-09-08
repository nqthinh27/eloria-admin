import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { PASSWORD_PATTERN, PHONE_PATTERN } from '@/lib/validation'
import { setFormErrorFromApi } from '@/lib/form-error'
import { useBranch } from '@/hooks/use-branch'
import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { ERole, EGender } from '@/types/common'
import type { Staff, CreateStaffReq, UpdateStaffReq } from '@/types/staff'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/date-input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const buildSchema = (t: (key: string) => string, isEdit: boolean) =>
    z.object({
        username: isEdit
            ? z.string().optional()
            : z
                  .string()
                  .trim()
                  .min(6, t('staff.form.validation.usernameLength'))
                  .max(50, t('staff.form.validation.usernameLength')),
        password: isEdit
            ? z.string().optional()
            : z.string().regex(PASSWORD_PATTERN, t('staff.form.validation.passwordRule')),
        fullName: z.string().trim().min(1, t('staff.form.validation.fullNameRequired')),
        email: z.string().trim().email(t('staff.form.validation.emailInvalid')),
        phoneNumber: z.string().regex(PHONE_PATTERN, t('staff.form.validation.phoneInvalid')),
        role: isEdit ? z.nativeEnum(ERole).optional() : z.nativeEnum(ERole),
        branchId: z.string().optional(),
        dob: z.string().optional(),
        gender: z.nativeEnum(EGender).optional(),
        description: z.string().optional(),
    })

type StaffFormValues = z.infer<ReturnType<typeof buildSchema>>

type StaffFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới, có giá trị = sửa hồ sơ (không đổi được username/password/role ở đây). */
    staff: Staff | null
    onCreate: (payload: CreateStaffReq) => Promise<void>
    onUpdate: (id: string, payload: UpdateStaffReq) => Promise<void>
}

/**
 * Dialog thêm/sửa nhân viên theo `07-nhan-vien.png`.
 *
 * `UpdateStaffReqDTO` không có `username`/`password`/`role` (xác nhận từ api-docs 2026-08-08)
 * ⇒ 3 field này bị khoá/ẩn khi sửa; đổi role phải qua dialog "Gán vai trò" riêng.
 */
export function StaffFormDialog({
    open,
    onOpenChange,
    staff,
    onCreate,
    onUpdate,
}: StaffFormDialogProps) {
    const { t } = useTranslation(['staff', 'common'])
    const { user } = useAuth()
    const { branches } = useBranch()
    const isEdit = staff !== null
    const isSuperAdmin = hasRole(user?.role, ERole.SUPER_ADMIN)

    const schema = useMemo(() => buildSchema(t, isEdit), [t, isEdit])

    const form = useForm<StaffFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            username: '',
            password: '',
            fullName: '',
            email: '',
            phoneNumber: '',
            role: ERole.STAFF,
            branchId: undefined,
            dob: '',
            gender: undefined,
            description: '',
        },
    })

    useEffect(() => {
        if (!open) return
        form.reset({
            username: staff?.username ?? '',
            password: '',
            fullName: staff?.fullName ?? '',
            email: staff?.email ?? '',
            phoneNumber: staff?.phoneNumber ?? '',
            role: staff?.role ?? ERole.STAFF,
            branchId: staff?.branchId ?? user?.branchId ?? undefined,
            dob: staff?.dob?.slice(0, 10) ?? '',
            gender: staff?.gender ?? undefined,
            description: staff?.description ?? '',
        })
    }, [open, staff, user?.branchId, form])

    const onSubmit = async (values: StaffFormValues) => {
        const dob = values.dob ? new Date(values.dob).toISOString() : undefined

        try {
            if (isEdit) {
                await onUpdate(staff.id, {
                    fullName: values.fullName,
                    email: values.email,
                    phoneNumber: values.phoneNumber,
                    branchId: isSuperAdmin ? values.branchId : undefined,
                    dob,
                    gender: values.gender,
                    description: values.description || undefined,
                })
            } else {
                await onCreate({
                    username: values.username!,
                    password: values.password!,
                    fullName: values.fullName,
                    email: values.email,
                    phoneNumber: values.phoneNumber,
                    role: values.role!,
                    branchId: values.branchId,
                    dob,
                    gender: values.gender,
                    description: values.description || undefined,
                })
            }
            onOpenChange(false)
        } catch (error) {
            setFormErrorFromApi(form, error, {}, isEdit ? 'fullName' : 'username')
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('staff.form.editTitle') : t('staff.form.addTitle')}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        {!isEdit && (
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('staff.form.username')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t('staff.form.usernamePlaceholder')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {!isEdit && (
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('staff.form.password')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                placeholder={t('staff.form.passwordPlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('staff.form.fullName')} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t('staff.form.fullNamePlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('staff.form.email')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder={t('staff.form.emailPlaceholder')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t('staff.form.phoneNumber')} <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder={t('staff.form.phoneNumberPlaceholder')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {!isEdit && (
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t('staff.form.role')} <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder={t('staff.form.rolePlaceholder')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={ERole.STAFF}>STAFF</SelectItem>
                                                    <SelectItem value={ERole.ADMIN}>ADMIN</SelectItem>
                                                    {isSuperAdmin && (
                                                        <SelectItem value={ERole.SUPER_ADMIN}>
                                                            SUPER_ADMIN
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="branchId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('staff.form.branch')}</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={!isSuperAdmin}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('staff.form.branchPlaceholder')} />
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
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="dob"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('staff.form.dob')}</FormLabel>
                                        <FormControl>
                                            <DateInput value={field.value ?? ""} onChange={field.onChange} />
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
                                        <FormLabel>{t('staff.form.gender')}</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('staff.form.genderPlaceholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={EGender.MALE}>{t('gender.MALE')}</SelectItem>
                                                <SelectItem value={EGender.FEMALE}>{t('gender.FEMALE')}</SelectItem>
                                                <SelectItem value={EGender.OTHER}>{t('gender.OTHER')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('staff.form.description')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder={t('staff.form.descriptionPlaceholder')}
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
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting
                                    ? t('staff.form.submitting')
                                    : isEdit
                                      ? t('staff.form.submitUpdate')
                                      : t('staff.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
