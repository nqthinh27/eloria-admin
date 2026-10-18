import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { authApi } from '@/api/auth'
import { useAuth } from '@/hooks/use-auth'
import { useCountdown } from '@/hooks/use-countdown'
import { ApiError, ApiErrorKind } from '@/lib/api-error'
import { toastSuccess } from '@/lib/toast'
import type { ZaloLinkInfo, ZaloStatusRes } from '@/types/auth'
import { ZaloLinkInstructions } from '@/components/zalo/zalo-link-instructions'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

/** Độ dài OTP — khớp `Login.tsx` / backend `app.mfa.otp-length`. */
const OTP_LENGTH = 6
const POLL_INTERVAL_MS = 3000

const buildSchema = (t: (key: string, options?: Record<string, unknown>) => string, needOtp: boolean) =>
    z.object({
        currentPassword: z.string().min(1, t('auth.validation.currentPasswordRequired')),
        otp: needOtp
            ? z
                  .string()
                  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), t('auth.validation.otpInvalid', { length: OTP_LENGTH }))
            : z.string(),
    })

type FormValues = z.infer<ReturnType<typeof buildSchema>>

type ZaloRelinkDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Đổi Zalo nhận OTP (backend Q3): bước 1 xác thực lại bằng **mật khẩu + OTP gửi về Zalo hiện tại**
 * (tài khoản chưa liên kết ⇒ chỉ cần mật khẩu), bước 2 hiện QR + mã `/otp CODE` rồi poll
 * `GET /account/zalo/status` mỗi 3s — **chỉ khi modal mở và mã còn hạn**.
 */
export function ZaloRelinkDialog({ open, onOpenChange }: ZaloRelinkDialogProps) {
    const { t } = useTranslation(['auth', 'errors', 'common'])
    const { user, updateUser } = useAuth()
    const needOtp = user?.zaloLinked ?? false

    const [step, setStep] = useState<'verify' | 'link'>('verify')
    const [info, setInfo] = useState<ZaloLinkInfo | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [sendingOtp, setSendingOtp] = useState(false)
    const otpCd = useCountdown()
    const linkCd = useCountdown()
    /** `zaloLinkedAt` lúc bắt đầu — status có mốc MỚI HƠN mốc này nghĩa là đã đổi xong. */
    const baselineRef = useRef<string | null>(null)

    const schema = useMemo(() => buildSchema((key, options) => t(key, options), needOtp), [t, needOtp])
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { currentPassword: '', otp: '' },
    })

    /** Lỗi xác thực lại: một câu chung; chỉ lỗi hạ tầng/429 mới khác (không lộ gì về tài khoản). */
    const reauthMessage = useCallback(
        (e: unknown): string => {
            if (e instanceof ApiError) {
                if (e.status === 429) return t('errors:error.rateLimit.exceeded')
                if (
                    e.kind === ApiErrorKind.NETWORK ||
                    e.kind === ApiErrorKind.TIMEOUT ||
                    e.kind === ApiErrorKind.SERVER
                ) {
                    return e.message
                }
            }
            return t('errors:error.account.reauthFail')
        },
        [t],
    )

    const resetAll = useCallback(() => {
        setStep('verify')
        setInfo(null)
        setError(null)
        setNotice(null)
        otpCd.stop()
        linkCd.stop()
        baselineRef.current = null
        form.reset({ currentPassword: '', otp: '' })
    }, [form, otpCd, linkCd])

    useEffect(() => {
        if (!open) resetAll()
        // `resetAll` đổi identity theo form/countdown nhưng chỉ cần chạy khi đóng/mở.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    /* ---- Polling bước 2 ---- */
    const latest = useRef({ user, updateUser, onOpenChange })
    useEffect(() => {
        latest.current = { user, updateUser, onOpenChange }
    })
    const linkExpired = linkCd.remaining <= 0

    useEffect(() => {
        if (!open || step !== 'link' || linkExpired) return
        const controller = new AbortController()
        let timer = 0

        const isChanged = (status: ZaloStatusRes): boolean => {
            if (!status.zaloLinked || !status.zaloLinkedAt) return false
            const baseline = baselineRef.current
            return baseline === null || Date.parse(status.zaloLinkedAt) > Date.parse(baseline)
        }

        const poll = async () => {
            try {
                const status = await authApi.zaloStatus(controller.signal)
                if (controller.signal.aborted) return
                if (isChanged(status)) {
                    const { user: current, updateUser: update, onOpenChange: close } = latest.current
                    if (current) {
                        update({ ...current, zaloLinked: true, zaloLinkedAt: status.zaloLinkedAt })
                    }
                    toastSuccess('auth.account.relink.success', { ns: 'auth' })
                    close(false)
                    return
                }
            } catch {
                if (controller.signal.aborted) return
                // Lỗi thoáng qua của một lần poll: bỏ qua, lần sau thử lại.
            }
            timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS)
        }

        timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS)
        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [open, step, linkExpired])

    /* ---- Bước 1 ---- */
    const handleSendOtp = async () => {
        if (sendingOtp || otpCd.remaining > 0) return
        setSendingOtp(true)
        setError(null)
        try {
            const res = await authApi.relinkSendOtp()
            otpCd.start(res.resendAfterSeconds)
            setNotice(t('auth:auth.account.relink.otpSent', { seconds: res.otpTtlSeconds }))
            form.setFocus('otp')
        } catch (e) {
            setNotice(null)
            setError(reauthMessage(e))
        } finally {
            setSendingOtp(false)
        }
    }

    const onSubmit = async (values: FormValues) => {
        setError(null)
        try {
            const result = await authApi.relink({
                currentPassword: values.currentPassword,
                otp: needOtp ? values.otp : undefined,
            })
            baselineRef.current = user?.zaloLinkedAt ?? null
            setInfo(result)
            linkCd.start(result.linkTtlSeconds)
            setStep('link')
        } catch (e) {
            setError(reauthMessage(e))
            form.setValue('otp', '')
        }
    }

    const submitting = form.formState.isSubmitting

    const sendLabel = sendingOtp
        ? t('auth:auth.account.relink.sendingOtp')
        : otpCd.remaining > 0
          ? t('auth:auth.account.relink.resendIn', { seconds: otpCd.remaining })
          : t('auth:auth.account.relink.sendOtp')

    return (
        <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'verify'
                            ? t('auth:auth.account.relink.title')
                            : t('auth:auth.account.relink.step2Title')}
                    </DialogTitle>
                    {step === 'verify' && (
                        <DialogDescription>{t('auth:auth.account.relink.description')}</DialogDescription>
                    )}
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {step === 'verify' ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('auth:auth.account.relink.currentPassword')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="password" autoComplete="current-password" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {needOtp ? (
                                <FormField
                                    control={form.control}
                                    name="otp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('auth:auth.account.relink.otp')}</FormLabel>
                                            <div className="flex gap-2">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH),
                                                            )
                                                        }
                                                        inputMode="numeric"
                                                        autoComplete="one-time-code"
                                                        maxLength={OTP_LENGTH}
                                                        className="flex-1 font-mono tracking-widest"
                                                        placeholder={t('auth:auth.account.relink.otpPlaceholder')}
                                                    />
                                                </FormControl>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="shrink-0"
                                                    disabled={sendingOtp || otpCd.remaining > 0}
                                                    onClick={handleSendOtp}>
                                                    {sendingOtp && <Loader2 className="size-4 animate-spin" />}
                                                    {sendLabel}
                                                </Button>
                                            </div>
                                            {notice && (
                                                <p role="status" className="text-muted-foreground text-xs">
                                                    {notice}
                                                </p>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <p className="text-muted-foreground text-xs">
                                    {t('auth:auth.account.relink.notLinkedNote')}
                                </p>
                            )}

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
                                        ? t('auth:auth.account.relink.continuing')
                                        : t('auth:auth.account.relink.continue')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    info && (
                        <>
                            <ZaloLinkInstructions
                                info={info}
                                remaining={linkCd.remaining}
                                // Hết hạn ⇒ về bước 1 xác thực lại (mã cũ không dùng lại được).
                                onNewCode={resetAll}
                            />
                            {!linkExpired && (
                                <p className="text-muted-foreground flex items-center gap-2 text-xs" role="status">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    {t('auth:auth.account.relink.waiting')}
                                </p>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    {t('common:action.close')}
                                </Button>
                            </DialogFooter>
                        </>
                    )
                )}
            </DialogContent>
        </Dialog>
    )
}
