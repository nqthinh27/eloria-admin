import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Loader2, Lock, User } from 'lucide-react'
import { z } from 'zod'

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
import { useAuth } from '@/hooks/use-auth'
import { useCountdown } from '@/hooks/use-countdown'
import { ApiError, ApiErrorKind } from '@/lib/api-error'
import { toastErrorMessage, toastInfo, toastSuccess } from '@/lib/toast'
import { SendOtpStatus, type ZaloLinkInfo } from '@/types/auth'
import { ZaloLinkDialog } from './components/zalo-link-dialog'

/** Độ dài OTP (backend `app.mfa.otp-length`, mặc định 6). Backend đổi thì sửa một chỗ này. */
const OTP_LENGTH = 6
const OTP_PATTERN = new RegExp(`^\\d{${OTP_LENGTH}}$`)

/**
 * Schema nhận `t` để message validate đã được dịch sẵn — `FormMessage` của shadcn
 * render thẳng chuỗi lỗi nên không tự dịch được khoá i18n.
 */
const buildLoginSchema = (t: (key: string, options?: Record<string, unknown>) => string) =>
    z.object({
        username: z.string().trim().min(1, t('auth.validation.usernameRequired')),
        password: z.string().min(1, t('auth.validation.passwordRequired')),
        otp: z
            .string()
            .min(1, t('auth.validation.otpRequired'))
            .regex(OTP_PATTERN, t('auth.validation.otpInvalid', { length: OTP_LENGTH })),
    })

type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>

export default function Login() {
    const { t } = useTranslation(['auth', 'errors'])
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const [sending, setSending] = useState(false)
    /** Đã từng gửi OTP trong phiên màn này ⇒ nhãn nút đổi thành "Gửi lại OTP". */
    const [hasSent, setHasSent] = useState(false)
    const [linkInfo, setLinkInfo] = useState<ZaloLinkInfo | null>(null)
    const [linkOpen, setLinkOpen] = useState(false)
    /*
     * Cooldown gửi OTP theo `resendAfterSeconds` của backend (tính theo username+IP). Cố ý KHÔNG reset
     * khi người dùng sửa username/mật khẩu — nếu reset, UI hứa gửi được trong lúc backend còn chặn.
     */
    const resendCd = useCountdown()
    const linkCd = useCountdown()

    const schema = useMemo(
        () => buildLoginSchema((key, options) => t(key, options)),
        // `t` đổi theo ngôn ngữ ⇒ dựng lại schema để message đúng ngôn ngữ.
        [t],
    )

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { username: '', password: '', otp: '' },
    })

    /**
     * Mọi lỗi đăng nhập hiện đúng MỘT câu chung (kể cả khi backend đang khoá tài khoản — không có
     * trạng thái "bị khoá"). Chỉ tách 2 loại không liên quan tài khoản: 429 (thao tác quá nhanh) và
     * lỗi hạ tầng (mạng/timeout/5xx) — những câu này không lộ gì về tài khoản.
     */
    const loginErrorMessage = useCallback(
        (error: unknown): string => {
            if (error instanceof ApiError) {
                if (error.status === 429) return t('errors:error.rateLimit.exceeded')
                if (
                    error.kind === ApiErrorKind.NETWORK ||
                    error.kind === ApiErrorKind.TIMEOUT ||
                    error.kind === ApiErrorKind.SERVER
                ) {
                    return error.message
                }
            }
            return t('errors:error.login.fail')
        },
        [t],
    )

    /** Gọi `send-otp` với username/mật khẩu hiện có trong form. */
    const requestOtp = useCallback(async () => {
        const { username, password } = form.getValues()
        setSending(true)
        try {
            const res = await authApi.sendLoginOtp({ username: username.trim(), password })
            resendCd.start(res.resendAfterSeconds)
            setHasSent(true)

            if (res.status === SendOtpStatus.ZALO_LINK_REQUIRED && res.linkCode) {
                setLinkInfo({
                    linkCode: res.linkCode,
                    linkTtlSeconds: res.linkTtlSeconds ?? 0,
                    botLink: res.botLink,
                })
                linkCd.start(res.linkTtlSeconds ?? 0)
                setLinkOpen(true)
                toastInfo('auth.login.linkRequiredSent', { ns: 'auth' })
            } else {
                // OTP_SENT (kể cả khi sai tài khoản — FE không suy luận): luôn một câu như nhau.
                setLinkOpen(false)
                // Toast TRUNG TÍNH — y hệt cho đúng/sai tài khoản (backend không phân biệt).
                if (res.otpTtlSeconds) {
                    toastSuccess('auth.login.otpSent', { ns: 'auth', seconds: res.otpTtlSeconds })
                } else {
                    toastSuccess('auth.login.otpSentNoTtl', { ns: 'auth' })
                }
                form.setFocus('otp')
            }
        } catch (error) {
            toastErrorMessage(loginErrorMessage(error))
        } finally {
            setSending(false)
        }
    }, [form, resendCd, linkCd, loginErrorMessage])

    const handleSendOtp = async () => {
        // Chỉ cần username + mật khẩu ở bước này; OTP chưa có.
        const valid = await form.trigger(['username', 'password'])
        if (!valid || sending || resendCd.remaining > 0) return
        await requestOtp()
    }

    const handleCloseLink = (received: boolean) => {
        setLinkOpen(false)
        if (received) window.setTimeout(() => form.setFocus('otp'), 100)
    }

    const onSubmit = async (values: LoginFormValues) => {
        try {
            await login(values.username, values.password, values.otp)

            // Quay lại trang người dùng định vào trước khi bị chặn.
            const from = (location.state as { from?: string } | null)?.from
            navigate(from ?? '/', { replace: true })
        } catch (error) {
            toastErrorMessage(loginErrorMessage(error))
            // OTP dùng 1 lần: xoá để nhập lại, giữ username/mật khẩu.
            form.setValue('otp', '')
            form.setFocus('otp')
        }
    }

    const isSubmitting = form.formState.isSubmitting

    const sendLabel = sending
        ? t('auth.login.sendingOtp')
        : resendCd.remaining > 0
          ? t('auth.login.resendIn', { seconds: resendCd.remaining })
          : hasSent
            ? t('auth.login.resend')
            : t('auth.login.sendOtp')

    return (
        <>
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{t('auth.login.title')}</h1>
                <p className="text-muted-foreground mt-1.5 text-sm">{t('auth.login.subtitle')}</p>
            </header>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('auth.login.username')} <span className="text-destructive">*</span></FormLabel>
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
                                    <FormLabel>{t('auth.login.password')} <span className="text-destructive">*</span></FormLabel>
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

                    <FormField
                        control={form.control}
                        name="otp"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('auth.login.otp')} <span className="text-destructive">*</span></FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <div className="relative flex-1">
                                            <KeyRound className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                            <Input
                                                {...field}
                                                // 1 ô gõ liền (chốt U1); dán "123 456" vẫn ra 123456.
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value
                                                            .replace(/\D/g, '')
                                                            .slice(0, OTP_LENGTH),
                                                    )
                                                }
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={OTP_LENGTH}
                                                className="h-11 pl-9 font-mono tracking-widest"
                                                placeholder={t('auth.login.otpPlaceholder')}
                                            />
                                        </div>
                                    </FormControl>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-11 shrink-0"
                                        disabled={sending || resendCd.remaining > 0}
                                        onClick={handleSendOtp}>
                                        {sending && <Loader2 className="size-4 animate-spin" />}
                                        {sendLabel}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                        {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
                    </Button>
                </form>
            </Form>

            <p className="text-muted-foreground mt-5 text-center text-xs">
                {t('auth.login.lockHint')}
            </p>

            <p className="text-muted-foreground mt-8 text-center text-xs">
                {t('auth.login.notice')}
            </p>

            <ZaloLinkDialog
                open={linkOpen}
                info={linkInfo}
                remaining={linkCd.remaining}
                newCodeBusy={sending}
                newCodeWait={resendCd.remaining}
                onNewCode={() => void requestOtp()}
                onClose={handleCloseLink}
            />
        </>
    )
}
