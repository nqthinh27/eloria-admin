import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gift, Loader2 } from 'lucide-react'

import { systemConfigApi } from '@/api/system-config'
import { resetPointRulesCache } from '@/hooks/use-point-rules'
import { formatVnd } from '@/lib/format'
import { toastSuccess } from '@/lib/toast'
import { SYSTEM_CONFIG_KEY } from '@/types/system-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { MoneyInput } from '@/components/money-input'

/** Giá trị mặc định PO chốt (Phase 16) — chỉ để điền khi server chưa trả khoá. */
const DEFAULTS = { earn: '50000', redeem: '1000', percent: '50' }

type Form = typeof DEFAULTS

const isPositiveInt = (v: string) => /^\d+$/.test(v) && Number(v) > 0
const isPercent = (v: string) => /^\d+$/.test(v) && Number(v) <= 100

/**
 * Thẻ **Điểm thưởng** — 3 khoá `loyalty.*` (Phase 21b). Nút Lưu riêng, độc lập thẻ chi nhánh.
 * Backend validate lại (400 `error.systemConfig.valueInvalid`); đổi luật chỉ áp cho đơn phát sinh sau.
 */
export function LoyaltyCard() {
    const { t } = useTranslation(['storeSettings', 'common'])
    const [saved, setSaved] = useState<Form | null>(null)
    const [form, setForm] = useState<Form>(DEFAULTS)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(false)
        try {
            const items = await systemConfigApi.list(signal)
            const get = (key: string, fallback: string) =>
                items.find((item) => item.key === key)?.value ?? fallback
            const next: Form = {
                earn: get(SYSTEM_CONFIG_KEY.LOYALTY_EARN_AMOUNT_PER_POINT, DEFAULTS.earn),
                redeem: get(SYSTEM_CONFIG_KEY.LOYALTY_REDEEM_RATE, DEFAULTS.redeem),
                percent: get(SYSTEM_CONFIG_KEY.LOYALTY_MAX_REDEEM_PERCENT, DEFAULTS.percent),
            }
            setSaved(next)
            setForm(next)
        } catch {
            if (signal?.aborted) return
            // api-client đã toast lỗi.
            setError(true)
        } finally {
            if (!signal?.aborted) setLoading(false)
        }
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])

    const earnInvalid = !isPositiveInt(form.earn)
    const redeemInvalid = !isPositiveInt(form.redeem)
    const percentInvalid = !isPercent(form.percent)
    const invalid = earnInvalid || redeemInvalid || percentInvalid
    const dirty =
        saved !== null &&
        (form.earn !== saved.earn || form.redeem !== saved.redeem || form.percent !== saved.percent)

    const save = async () => {
        setSaving(true)
        try {
            await systemConfigApi.update([
                { key: SYSTEM_CONFIG_KEY.LOYALTY_EARN_AMOUNT_PER_POINT, value: form.earn },
                { key: SYSTEM_CONFIG_KEY.LOYALTY_REDEEM_RATE, value: form.redeem },
                { key: SYSTEM_CONFIG_KEY.LOYALTY_MAX_REDEEM_PERCENT, value: form.percent },
            ])
            resetPointRulesCache()
            toastSuccess('toast.loyaltySaved', { ns: 'storeSettings' })
            await load()
        } catch {
            // api-client đã toast lỗi (vd 400 error.systemConfig.valueInvalid) — giữ form để sửa.
        } finally {
            setSaving(false)
        }
    }

    // Ví dụ minh hoạ động: 4 × earn tiền hàng ⇒ +4 điểm (chỉ khi hai ô tiền hợp lệ).
    const example =
        !earnInvalid && !redeemInvalid
            ? t('loyalty.example', {
                  amount: formatVnd(Number(form.earn) * 4),
                  points: 4,
                  value: formatVnd(Number(form.redeem) * 4),
              })
            : null

    const hint = (invalid: boolean, error: string, text: string) => (
        <p className={invalid ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>
            {invalid ? error : text}
        </p>
    )

    return (
        <Card className="mt-4 max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Gift className="size-4" />
                    {t('loyalty.title')}
                </CardTitle>
                <CardDescription>{t('loyalty.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <Skeleton className="h-9 w-full" />
                ) : error ? (
                    <div className="flex items-center gap-3">
                        <p className="text-destructive text-sm">{t('loadError')}</p>
                        <Button variant="outline" size="sm" onClick={() => void load()}>
                            {t('common:action.retry')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                            <Label htmlFor="loyalty-earn">{t('loyalty.earn.label')}</Label>
                            <MoneyInput
                                id="loyalty-earn"
                                value={form.earn}
                                onChange={(v) => setForm((f) => ({ ...f, earn: v }))}
                                disabled={saving}
                                aria-invalid={earnInvalid}
                            />
                            {hint(earnInvalid, t('loyalty.errorPositive'), t('loyalty.earn.hint'))}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="loyalty-redeem">{t('loyalty.redeem.label')}</Label>
                            <MoneyInput
                                id="loyalty-redeem"
                                value={form.redeem}
                                onChange={(v) => setForm((f) => ({ ...f, redeem: v }))}
                                disabled={saving}
                                aria-invalid={redeemInvalid}
                            />
                            {hint(redeemInvalid, t('loyalty.errorPositive'), t('loyalty.redeem.hint'))}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="loyalty-percent">{t('loyalty.maxPercent.label')}</Label>
                            <MoneyInput
                                id="loyalty-percent"
                                value={form.percent}
                                onChange={(v) => setForm((f) => ({ ...f, percent: v }))}
                                disabled={saving}
                                suffix="%"
                                aria-invalid={percentInvalid}
                            />
                            {hint(percentInvalid, t('loyalty.errorPercent'), t('loyalty.maxPercent.hint'))}
                        </div>
                        {example && (
                            <p className="bg-muted/50 text-foreground rounded-lg px-3 py-2 text-sm">{example}</p>
                        )}
                        <p className="text-muted-foreground text-xs">{t('loyalty.note')}</p>
                        <div className="flex justify-end">
                            <Button type="button" disabled={!dirty || invalid || saving} onClick={() => void save()}>
                                {saving && <Loader2 className="size-4 animate-spin" />}
                                {saving ? t('common:action.submitting') : t('common:action.save')}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
