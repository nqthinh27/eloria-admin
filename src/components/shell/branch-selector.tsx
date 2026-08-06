import { useTranslation } from 'react-i18next'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useBranch } from '@/hooks/use-branch'
import { ALL_BRANCHES } from '@/contexts/branch-context'

/**
 * Bộ chọn chi nhánh trên top bar (theo mockup).
 *
 * SUPER_ADMIN chọn được "Tất cả chi nhánh" hoặc từng chi nhánh.
 * ADMIN/STAFF bị cố định theo chi nhánh được gán ⇒ render read-only, không phải dropdown.
 */
export function BranchSelector() {
    const { t } = useTranslation('menu')
    const { branches, loading, selectedBranchId, setSelectedBranchId, canSwitchBranch } =
        useBranch()

    if (loading) return <Skeleton className="h-9 w-44" />

    if (!canSwitchBranch) {
        const name = branches.find((b) => b.id === selectedBranchId)?.name
        if (!name) return null
        return (
            <div
                className="bg-muted text-muted-foreground hidden h-9 items-center rounded-md border px-3 text-sm sm:flex"
                title={t('shell.branchSelector')}>
                {name}
            </div>
        )
    }

    return (
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="h-9 w-44" aria-label={t('shell.branchSelector')}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL_BRANCHES}>{t('shell.allBranches')}</SelectItem>
                {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
