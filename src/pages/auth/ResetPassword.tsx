import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api-error'
import { PASSWORD_PATTERN } from '@/lib/validation'

const buildSchema = (t: (key: string) => string) =>
    z
        .object({
            newPassword: z.string().regex(PASSWORD_PATTERN, t('auth.validation.passwordRule')),
            confirmPassword: z.string().min(1, t('auth.validation.passwordRequired')),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
            path: ['confirmPassword'],
            message: t('auth.validation.passwordMismatch'),
        })

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/**
 * Màn đặt lại mật khẩu.
 *
 * Link trong email có dạng `clientBaseUrl/reset-password?token=<resetToken>`;
 * token đọc từ query rồi gửi kèm `POST /v1.0/api/reset-password`.
 * Chưa có mockup ⇒ tái sử dụng layout màn đăng nhập (CONVENTIONS mục 6.2).
 */
export default function ResetPassword() {
    const { t } = useTranslation('auth')
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [done, setDone] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const schema = useMemo(() => buildSchema(t), [t])
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { newPassword: '', confirmPassword: '' },
    })

    const onSubmit = async (values: FormValues) => {
        if (!token) return
        setFormError(null)
        try {
            await authApi.resetPassword({ token, newPassword: values.newPassword })
            setDone(true)
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : null)
        }
    }

    // Vào thẳng URL mà thiếu token ⇒ không render form.
    if (!token) {
        return (
            <div className="text-center">
                <Alert variant="destructive" className="text-left">
                    <AlertDescription>{t('auth.reset.missingToken')}</AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="mt-6 h-11 w-full">
                    <Link to="/forgot-password">{t('auth.forgot.title')}</Link>
                </Button>
            </div>
        )
    }

    if (done) {
        return (
            <div className="text-center">
                <span className="bg-success-muted text-success mx-auto flex size-12 items-center justify-center rounded-full">
                    <CircleCheck className="size-6" />
                </span>
                <h1 className="mt-5 text-2xl font-bold tracking-tight">
                    {t('auth.reset.successTitle')}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    {t('auth.reset.successMessage')}
                </p>
                <Button asChild className="mt-6 h-11 w-full">
                    <Link to="/login">{t('auth.reset.goToLogin')}</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{t('auth.reset.title')}</h1>
                <p className="text-muted-foreground mt-1.5 text-sm">{t('auth.reset.subtitle')}</p>
            </header>

            {formError && (
                <Alert variant="destructive" className="mb-5">
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('auth.reset.newPassword')}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="password"
                                        autoComplete="new-password"
                                        autoFocus
                                        className="h-11"
                                        placeholder={t('auth.reset.newPasswordPlaceholder')}
                                    />
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
                                <FormLabel>{t('auth.reset.confirmPassword')}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="password"
                                        autoComplete="new-password"
                                        className="h-11"
                                        placeholder={t('auth.reset.confirmPasswordPlaceholder')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="h-11 w-full"
                        disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting
                            ? t('auth.reset.submitting')
                            : t('auth.reset.submit')}
                    </Button>
                </form>
            </Form>
        </>
    )
}
