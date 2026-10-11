import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2, Store } from 'lucide-react'

import { systemConfigApi } from '@/api/system-config'
import { useBranch } from '@/hooks/use-branch'
import { toastSuccess } from '@/lib/toast'
import { EntityStatus } from '@/types/common'
import { SYSTEM_CONFIG_KEY } from '@/types/system-config'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchSelect } from '@/components/search-select'
import { ConfirmDialog } from '@/components/confirm-dialog'

/**
 * Màn "Cài đặt cửa hàng online" — **chỉ SUPER_ADMIN** (Phase 24 mục 1).
 *
 * R1 chỉ có **một** ô: `store.branch_id` — chi nhánh mà storefront dùng để báo còn/hết hàng. Phí ship,
 * ngưỡng freeship, `loyalty.*` để Phase 21 (R3) vì R1 chưa có checkout.
 *
 * Backend không validate giá trị (nhận cả UUID không tồn tại) và **không cho gửi rỗng** ⇒ màn này
 * chỉ cho chọn chi nhánh có thật, và không có cách "bỏ chọn" sau khi đã đặt.
 */
export default function StoreSettingsPage() {
    const { t } = useTranslation(['storeSettings', 'common'])
    const { branches, loading: branchesLoading, refresh: loadBranches } = useBranch()

    /** Giá trị đang lưu trên server. `null` = chưa nạp xong. */
    const [saved, setSaved] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [selected, setSelected] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const load = useCallback(async (signal?: AbortSignal) => {
        setLoading(true)
        setError(false)
        try {
            const items = await systemConfigApi.list(signal)
            const value =
                items.find((item) => item.key === SYSTEM_CONFIG_KEY.STORE_BRANCH_ID)?.value ?? ''
            setSaved(value)
            setSelected(value)
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
        void loadBranches(controller.signal)
        return () => controller.abort()
    }, [load, loadBranches])

    const savedBranch = useMemo(
        () => (saved ? branches.find((b) => b.id === saved) : undefined),
        [branches, saved],
    )

    const options = useMemo(
        () =>
            branches
                // Chi nhánh ngừng hoạt động không nên làm điểm bán online — trừ khi đang là giá trị đã lưu.
                .filter((b) => b.status === EntityStatus.ACTIVE || b.id === saved)
                .map((b) => ({ value: b.id, label: b.name, hint: b.code ?? undefined })),
        [branches, saved],
    )

    const isEmpty = saved === ''
    const dirty = saved !== null && selected !== '' && selected !== saved
    const selectedName = branches.find((b) => b.id === selected)?.name ?? ''

    const save = async () => {
        setSaving(true)
        try {
            await systemConfigApi.update([{ key: SYSTEM_CONFIG_KEY.STORE_BRANCH_ID, value: selected }])
            toastSuccess('toast.saved', { ns: 'storeSettings' })
            await load()
        } finally {
            setSaving(false)
        }
    }

    const onSaveClick = () => {
        // Lần đầu đặt (đang rỗng) thì không có gì để "đổi" ⇒ lưu luôn; đổi chi nhánh ⇒ hỏi lại.
        if (isEmpty) void save().catch(() => undefined)
        else setConfirmOpen(true)
    }

    return (
        <div>
            <PageHeader title={t('pageTitle')} description={t('pageDescription')} />

            {isEmpty && !loading && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>{t('emptyWarning.title')}</AlertTitle>
                    <AlertDescription>{t('emptyWarning.description')}</AlertDescription>
                </Alert>
            )}

            {!isEmpty && !loading && !branchesLoading && saved && !savedBranch && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>{t('unknownBranch.title')}</AlertTitle>
                    <AlertDescription>{t('unknownBranch.description')}</AlertDescription>
                </Alert>
            )}

            {savedBranch && savedBranch.status !== EntityStatus.ACTIVE && (
                <Alert className="mb-4">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>{t('inactiveBranch.title')}</AlertTitle>
                    <AlertDescription>{t('inactiveBranch.description')}</AlertDescription>
                </Alert>
            )}

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Store className="size-4" />
                        {t('branch.title')}
                    </CardTitle>
                    <CardDescription>{t('branch.description')}</CardDescription>
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
                            <SearchSelect
                                value={selected || undefined}
                                onChange={setSelected}
                                options={options}
                                placeholder={t('branch.placeholder')}
                                disabled={saving || branchesLoading}
                            />
                            <p className="text-muted-foreground text-xs">{t('branch.cannotClear')}</p>
                            <p className="text-muted-foreground text-xs">{t('branch.propagation')}</p>
                            <div className="flex justify-end">
                                <Button type="button" disabled={!dirty || saving} onClick={onSaveClick}>
                                    {saving && <Loader2 className="size-4 animate-spin" />}
                                    {saving ? t('common:action.submitting') : t('common:action.save')}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t('confirm.title')}
                description={t('confirm.description', { name: selectedName })}
                auditLogged
                confirmLabel={t('common:action.confirm')}
                onConfirm={save}
            />
        </div>
    )
}
