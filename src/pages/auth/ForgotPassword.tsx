import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
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

const buildSchema = (t: (key: string) => string) =>
    z.object({
        email: z
            .string()
            .trim()
            .min(1, t('auth.validation.emailRequired'))
            .email(t('auth.validation.emailInvalid')),
    })

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/**
 * Chưa có mockup riêng ⇒ tái sử dụng layout màn đăng nhập (CONVENTIONS mục 6.2).
 */
export default function ForgotPassword() {
    const { t } = useTranslation('auth')
    const [sent, setSent] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const schema = useMemo(() => buildSchema(t), [t])
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
    })

    const onSubmit = async (values: FormValues) => {
        setFormError(null)
        try {
            await authApi.forgotPassword({ email: values.email })
            setSent(true)
        } catch (error) {
            setFormError(error instanceof ApiError ? error.message : null)
        }
    }

    /*
     * Backend luôn trả thành công dù email có tồn tại hay không (chống dò tài khoản)
     * ⇒ thông báo phải trung tính, không xác nhận email có trong hệ thống.
     */
    if (sent) {
        return (
            <div className="text-center">
                <span className="bg-success-muted text-success mx-auto flex size-12 items-center justify-center rounded-full">
                    <MailCheck className="size-6" />
                </span>
                <h1 className="mt-5 text-2xl font-bold tracking-tight">
                    {t('auth.forgot.sentTitle')}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {t('auth.forgot.sentMessage')}
                </p>
                <Button asChild variant="outline" className="mt-6 h-11 w-full">
                    <Link to="/login">{t('auth.forgot.backToLogin')}</Link>
                </Button>
            </div>
        )
    }

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{t('auth.forgot.title')}</h1>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {t('auth.forgot.subtitle')}
                </p>
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
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('auth.forgot.email')}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        type="email"
                                        autoComplete="email"
                                        autoFocus
                                        className="h-11"
                                        placeholder={t('auth.forgot.emailPlaceholder')}
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
                            ? t('auth.forgot.submitting')
                            : t('auth.forgot.submit')}
                    </Button>
                </form>
            </Form>

            <Link
                to="/login"
                className="text-muted-foreground hover:text-foreground mt-8 flex items-center justify-center gap-1.5 text-sm transition-colors">
                <ArrowLeft className="size-4" />
                {t('auth.forgot.backToLogin')}
            </Link>
        </>
    )
}
