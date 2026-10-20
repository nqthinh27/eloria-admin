import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { z } from 'zod'

import { authApi } from '@/api/auth'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api-error'
import { toastError, toastSuccess } from '@/lib/toast'
import { PASSWORD_PATTERN } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const buildSchema = (t: (key: string) => string) =>
    z
        .object({
            currentPassword: z.string().min(1, t('auth.validation.currentPasswordRequired')),
            newPassword: z.string().regex(PASSWORD_PATTERN, t('auth.validation.passwordRule')),
            confirmPassword: z.string().min(1, t('auth.validation.passwordRequired')),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
            path: ['confirmPassword'],
            message: t('auth.validation.passwordMismatch'),
        })
        .refine((v) => v.newPassword !== v.currentPassword, {
            path: ['newPassword'],
            message: t('auth.validation.newPasswordSame'),
        })

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/** Subkey backend khi mật khẩu hiện tại sai (`PASSWORD_INCORRECT`) — hiện ngay tại ô, không đóng modal. */
const PASSWORD_INCORRECT_SUBKEY = 'error.password.incorrect'

type ChangePasswordDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Đổi mật khẩu. Thành công ⇒ toast + `logout()`: backend (19a) thu hồi MỌI token theo
 * `last_changed_password`, kể cả token đang dùng, nên không cố giữ phiên — về `/login` đăng nhập OTP lại.
 */
export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
    const { t } = useTranslation(['auth', 'common'])
    const { logout } = useAuth()
    const [showPassword, setShowPassword] = useState(false)

    const schema = useMemo(() => buildSchema((key) => t(key)), [t])
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    })

    useEffect(() => {
        if (!open) {
            form.reset()
            setShowPassword(false)
        }
    }, [open, form])

    const onSubmit = async (values: FormValues) => {
        try {
            await authApi.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            })
        } catch (error) {
            if (error instanceof ApiError && error.subKey === PASSWORD_INCORRECT_SUBKEY) {
                form.setError('currentPassword', { type: 'server', message: error.message })
            } else {
                toastError(error)
            }
            return
        }
        toastSuccess('auth.account.changePassword.success', { ns: 'auth' })
        onOpenChange(false)
        await logout()
    }

    const submitting = form.formState.isSubmitting
    const inputType = showPassword ? 'text' : 'password'

    /** Nút hiện/ẩn dùng chung cho cả 3 ô — một trạng thái, đổi cùng lúc. */
    const toggle = (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
            aria-label={
                showPassword
                    ? t('auth.account.changePassword.hide')
                    : t('auth.account.changePassword.show')
            }
            onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('auth.account.changePassword.title')}</DialogTitle>
                    <DialogDescription>{t('auth.account.changePassword.description')}</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.account.changePassword.currentPassword')} <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                type={inputType}
                                                autoComplete="current-password"
                                                className="pr-10"
                                            />
                                            {toggle}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.account.changePassword.newPassword')} <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input {...field} type={inputType} autoComplete="new-password" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.account.changePassword.confirmPassword')} <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input {...field} type={inputType} autoComplete="new-password" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={submitting}
                                onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="size-4 animate-spin" />}
                                {submitting
                                    ? t('auth.account.changePassword.submitting')
                                    : t('auth.account.changePassword.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
