import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { administrativeAddressApi } from '@/api/administrative-address'
import type { AdministrativeAddress } from '@/types/administrative-address'
import type { Branch, BranchPayload } from '@/types/branch'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const buildSchema = (t: (key: string) => string) =>
    z.object({
        name: z.string().trim().min(1, t('staff.branch.form.validation.nameRequired')),
        phoneNumber: z.string().optional(),
        address: z.string().optional(),
        provinceCode: z.string().optional(),
        wardCode: z.string().optional(),
        openingTime: z.string().optional(),
        closingTime: z.string().optional(),
    })

type BranchFormValues = z.infer<ReturnType<typeof buildSchema>>

type BranchFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    branch: Branch | null
    onCreate: (payload: BranchPayload) => Promise<void>
    onUpdate: (id: string, payload: BranchPayload) => Promise<void>
}

/**
 * Dialog thêm/sửa chi nhánh. Mockup `08-chi-nhanh.png` chỉ có card grid + nút "Sửa", chưa có
 * ảnh form chi tiết ⇒ dựng form theo pattern chuẩn (CONVENTIONS mục 6.2), field lấy đúng
 * `CreateBranchReqDTO`/`UpdateBranchReqDTO` (chỉ `name` bắt buộc).
 */
export function BranchFormDialog({
    open,
    onOpenChange,
    branch,
    onCreate,
    onUpdate,
}: BranchFormDialogProps) {
    const { t } = useTranslation(['staff', 'common'])
    const isEdit = branch !== null

    const [provinces, setProvinces] = useState<AdministrativeAddress[]>([])
    const [wards, setWards] = useState<AdministrativeAddress[]>([])
    const [wardsLoading, setWardsLoading] = useState(false)

    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<BranchFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            phoneNumber: '',
            address: '',
            provinceCode: undefined,
            wardCode: undefined,
            openingTime: '',
            closingTime: '',
        },
    })

    const selectedProvince = form.watch('provinceCode')

    useEffect(() => {
        if (!open) return
        void (async () => {
            try {
                const result = await administrativeAddressApi.getProvinces()
                setProvinces(result.data)
            } catch {
                setProvinces([])
            }
        })()
    }, [open])

    useEffect(() => {
        if (!open) return
        form.reset({
            name: branch?.name ?? '',
            phoneNumber: branch?.phoneNumber ?? '',
            address: branch?.address ?? '',
            provinceCode: branch?.provinceCode ?? undefined,
            wardCode: branch?.wardCode ?? undefined,
            openingTime: branch?.openingTime ?? '',
            closingTime: branch?.closingTime ?? '',
        })
    }, [open, branch, form])

    useEffect(() => {
        if (!selectedProvince) {
            setWards([])
            return
        }
        let alive = true
        setWardsLoading(true)
        void (async () => {
            try {
                const result = await administrativeAddressApi.getWards(selectedProvince)
                if (alive) setWards(result.data)
            } catch {
                if (alive) setWards([])
            } finally {
                if (alive) setWardsLoading(false)
            }
        })()
        return () => {
            alive = false
        }
    }, [selectedProvince])

    const onSubmit = async (values: BranchFormValues) => {
        const payload: BranchPayload = {
            name: values.name,
            phoneNumber: values.phoneNumber || undefined,
            address: values.address || undefined,
            provinceCode: values.provinceCode,
            wardCode: values.wardCode,
            openingTime: values.openingTime || undefined,
            closingTime: values.closingTime || undefined,
        }

        if (isEdit) {
            await onUpdate(branch.id, payload)
        } else {
            await onCreate(payload)
        }
        onOpenChange(false)
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('staff.branch.form.editTitle') : t('staff.branch.form.addTitle')}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('staff.branch.form.name')} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder={t('staff.branch.form.namePlaceholder')} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('staff.branch.form.phoneNumber')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('staff.branch.form.phoneNumberPlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('staff.branch.form.address')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('staff.branch.form.addressPlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="provinceCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('staff.branch.form.province')}</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={(v) => {
                                                field.onChange(v)
                                                form.setValue('wardCode', undefined)
                                            }}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('staff.branch.form.provincePlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {provinces.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="wardCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('staff.branch.form.ward')}</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={!selectedProvince || wardsLoading}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={t('staff.branch.form.wardPlaceholder')}
                                                    />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {wards.map((w) => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {w.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="openingTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('staff.branch.form.openingTime')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="time" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="closingTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('staff.branch.form.closingTime')}</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="time" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => onOpenChange(false)}>
                                {t('common:action.cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                {isSubmitting
                                    ? t('staff.branch.form.submitting')
                                    : isEdit
                                      ? t('staff.branch.form.submitUpdate')
                                      : t('staff.branch.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
