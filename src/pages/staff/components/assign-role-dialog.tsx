import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { hasRole } from '@/config/roles'
import { ERole } from '@/types/common'
import type { Staff } from '@/types/staff'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AssignRoleDialogProps = {
    staff: Staff | null
    onOpenChange: (open: boolean) => void
    onSubmit: (role: ERole) => Promise<void>
}

/** `AssignRoleReqDTO` là API riêng biệt với sửa hồ sơ — `UpdateStaffReqDTO` không có `role`. */
export function AssignRoleDialog({ staff, onOpenChange, onSubmit }: AssignRoleDialogProps) {
    const { t } = useTranslation(['staff', 'common'])
    const { user } = useAuth()
    const isSuperAdmin = hasRole(user?.role, ERole.SUPER_ADMIN)
    const [role, setRole] = useState<ERole>(ERole.STAFF)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (staff) setRole(staff.role)
    }, [staff])

    const handleSubmit = async () => {
        setLoading(true)
        try {
            await onSubmit(role)
            onOpenChange(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={staff !== null} onOpenChange={(next) => !loading && onOpenChange(next)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('staff.assignRole.title')}</DialogTitle>
                    <DialogDescription>
                        {t('staff.assignRole.description', { name: staff?.fullName ?? '' })}
                    </DialogDescription>
                </DialogHeader>

                <Select value={role} onValueChange={(v) => setRole(v as ERole)}>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ERole.STAFF}>STAFF</SelectItem>
                        <SelectItem value={ERole.ADMIN}>ADMIN</SelectItem>
                        {isSuperAdmin && <SelectItem value={ERole.SUPER_ADMIN}>SUPER_ADMIN</SelectItem>}
                    </SelectContent>
                </Select>

                <DialogFooter>
                    <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
                        {t('common:action.cancel')}
                    </Button>
                    <Button disabled={loading} onClick={handleSubmit}>
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        {t('staff.assignRole.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
