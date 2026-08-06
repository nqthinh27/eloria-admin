import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
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
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api-error'

/**
 * Schema nhận `t` để message validate đã được dịch sẵn — `FormMessage` của shadcn
 * render thẳng chuỗi lỗi nên không tự dịch được khoá i18n.
 */
const buildLoginSchema = (t: (key: string) => string) =>
    z.object({
        username: z.string().trim().min(1, t('auth.validation.usernameRequired')),
        password: z.string().min(1, t('auth.validation.passwordRequired')),
    })

type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>

export default function Login() {
    const { t } = useTranslation('auth')
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    /** Lỗi trả về từ API — hiển thị inline theo mockup, không dùng toast. */
    const [formError, setFormError] = useState<string | null>(null)

    const schema = useMemo(() => buildLoginSchema(t), [t])

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { username: '', password: '' },
    })

    const onSubmit = async (values: LoginFormValues) => {
        setFormError(null)
        try {
            await login(values.username, values.password)

            // Quay lại trang người dùng định vào trước khi bị chặn.
            const from = (location.state as { from?: string } | null)?.from
            navigate(from ?? '/', { replace: true })
        } catch (error) {
            setFormError(
                error instanceof ApiError ? error.message : t('auth.error.notAdminAccount'),
            )
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{t('auth.login.title')}</h1>
                <p className="text-muted-foreground mt-1.5 text-sm">{t('auth.login.subtitle')}</p>
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
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('auth.login.username')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                        <Input
                                            {...field}
                                            autoComplete="username"
                                            autoFocus
                                            className="h-11 pl-9"
                                            placeholder={t('auth.login.usernamePlaceholder')}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel>{t('auth.login.password')}</FormLabel>
                                    <Link
                                        to="/forgot-password"
                                        className="text-primary text-xs font-medium hover:underline">
                                        {t('auth.login.forgotPassword')}
                                    </Link>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                        <Input
                                            {...field}
                                            type="password"
                                            autoComplete="current-password"
                                            className="h-11 pl-9"
                                            placeholder={t('auth.login.passwordPlaceholder')}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                        {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
                    </Button>
                </form>
            </Form>

            <p className="text-muted-foreground mt-8 text-center text-xs">
                {t('auth.login.notice')}
            </p>
        </>
    )
}
