import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Check, Store } from 'lucide-react'

import { shiftApi } from '@/api/shift'
import { hasRole } from '@/config/roles'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuth } from '@/hooks/use-auth'
import { useBranch } from '@/hooks/use-branch'
import { ERole } from '@/types/common'
import type { WorkShift } from '@/types/shift'
import { MoneyInput } from '@/components/money-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

/**
 * Màn **"Mở ca bán hàng"** theo `02-pos-mo-ca.png` (PLAN Phase 15).
 *
 * Đây là **cửa vào màn POS**: chưa mở ca thì thay toàn bộ khu bán hàng bằng thẻ này, đúng bố cục
 * mockup (thẻ trắng canh giữa, icon cửa hàng, ô tiền đầu ca + ghi chú, nút "Mở ca").
 *
 * ⚠️ **Bộ chọn chi nhánh chỉ hiện với SUPER_ADMIN** — mockup không vẽ ô này vì frame mockup là
 * tài khoản SA đã có sẵn thanh chọn chi nhánh trên top bar (thanh đó là demo, không implement —
 * CONVENTIONS mục 6.4). Backend **bắt buộc** SUPER_ADMIN chọn chi nhánh (`error.branch.required`)
 * và **bỏ qua trong im lặng** `branchId` của STAFF/ADMIN ⇒ bày ô này cho role thấp hơn là đánh
 * lừa người dùng.
 */
export function OpenShiftCard({ onOpened }: { onOpened: (shift: WorkShift) => void }) {
    const { t } = useTranslation(['order', 'common'])
    const { user } = useAuth()
    const { branches } = useBranch()

    /** Chỉ SUPER_ADMIN chọn được chi nhánh mở ca — xem ghi chú đầu file. */
    const mustPickBranch = hasRole(user?.role, ERole.SUPER_ADMIN)

    const [openingCash, setOpeningCash] = useState('')
    const [description, setDescription] = useState('')
    const [branchId, setBranchId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    /*
     * **Tiền đầu ca bắt buộc, nhưng `0` là hợp lệ** (két rỗng đầu ngày là chuyện bình thường,
     * backend chỉ chặn số âm). Vì vậy phải so `trim() === ''` chứ **không** dùng falsy check —
     * `!openingCash` sẽ nuốt mất số 0 hợp lệ (đúng bẫy đã ghi ở CLAUDE.md mục `costPrice`).
     */
    const cashMissing = openingCash.trim() === ''
    const canSubmit = !cashMissing && (!mustPickBranch || branchId !== null)

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return
        setSubmitting(true)
        try {
            const shift = await shiftApi.open({
                openingCash: Number(openingCash),
                /* STAFF/ADMIN không gửi `branchId`: backend ép về chi nhánh của họ. */
                branchId: mustPickBranch ? (branchId ?? undefined) : undefined,
                description: description.trim() || undefined,
            })
            toastSuccess('order.shift.toast.requested', { ns: 'order' })
            onOpened(shift)
        } catch (error) {
            /* api-client đã toast; giữ nguyên số đã nhập để người dùng sửa rồi thử lại. */
            toastError(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center py-6">
            <Card className="w-full max-w-md p-8">
                <div className="flex flex-col items-center gap-2 text-center">
                    <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
                        <Store className="size-7" />
                    </span>
                    <h2 className="mt-2 text-xl font-semibold">{t('order.shift.open.title')}</h2>
                    <p className="text-muted-foreground text-sm">
                        {t('order.shift.open.subtitle')}
                    </p>
                </div>

                <form
                    className="mt-6 flex flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void handleSubmit()
                    }}
                >
                    {mustPickBranch && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="shift-branch">{t('order.shift.open.branch')}</Label>
                            <Select value={branchId ?? undefined} onValueChange={setBranchId}>
                                <SelectTrigger id="shift-branch" className="bg-card w-full">
                                    <Building2 className="text-muted-foreground size-4 shrink-0" />
                                    <SelectValue placeholder={t('order.pos.branchPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-muted-foreground text-xs">
                                {t('order.shift.open.branchHint')}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="shift-opening-cash">
                            {t('order.shift.open.openingCash')}
                        </Label>
                        <MoneyInput
                            id="shift-opening-cash"
                            value={openingCash}
                            onChange={setOpeningCash}
                            placeholder={t('order.shift.open.openingCashPlaceholder')}
                            disabled={submitting}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="shift-description">{t('order.shift.open.note')}</Label>
                        <Input
                            id="shift-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder={t('order.shift.open.notePlaceholder')}
                            maxLength={500}
                            disabled={submitting}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
                        <Check className="size-4" />
                        {submitting ? t('common:action.submitting') : t('order.shift.open.submit')}
                    </Button>
                </form>
            </Card>
        </div>
    )
}
