import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { administrativeAddressApi } from '@/api/administrative-address'
import type { AdministrativeAddress } from '@/types/administrative-address'
import type { Branch, BranchPayload } from '@/types/branch'
import { setFormErrorFromApi } from '@/lib/form-error'
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ClearableSelect } from '@/components/clearable-select'
import { SelectItem } from '@/components/ui/select'

const buildSchema = (t: (key: string) => string) =>
    z.object({
        name: z.string().trim().min(1, t('staff.branch.form.validation.nameRequired')),
        /*
         * Mã chi nhánh — tuỳ chọn, tối đa 6 ký tự chữ + số (backend `@Size(max=6)` +
         * `^[A-Za-z0-9]*$`; là prefix mã đơn `{CN}-{yyMMdd}-{seq4}`). Ô nhập tự viết hoa khi gõ, nhưng
         * mã cũ chữ thường nạp từ backend vẫn hợp lệ (không buộc đổi mã mới sửa được chi nhánh).
         * Bỏ trống ⇒ backend tự suy từ tên.
         */
        code: z
            .string()
            .trim()
            .max(6, t('staff.branch.form.validation.codeLength'))
            .regex(/^[A-Za-z0-9]*$/, t('staff.branch.form.validation.codePattern'))
            .optional(),
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
            code: '',
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
            code: branch?.code ?? '',
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
            code: values.code || undefined,
            phoneNumber: values.phoneNumber || undefined,
            address: values.address || undefined,
            provinceCode: values.provinceCode,
            wardCode: values.wardCode,
            openingTime: values.openingTime || undefined,
            closingTime: values.closingTime || undefined,
        }

        try {
            if (isEdit) {
                await onUpdate(branch.id, payload)
            } else {
                await onCreate(payload)
            }
            onOpenChange(false)
        } catch (error) {
            // Trùng tên ⇒ dưới ô tên; tỉnh/phường sai ⇒ dưới ô tương ứng; lỗi khác chỉ toast.
            setFormErrorFromApi(form, error)
        }
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
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('staff.branch.form.code')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            value={field.value ?? ''}
                                            maxLength={12}
                                            autoCapitalize="characters"
                                            placeholder={t('staff.branch.form.codePlaceholder')}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormDescription>{t('staff.branch.form.codeHint')}</FormDescription>
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
                                        <FormControl>
                                            <ClearableSelect
                                                value={field.value}
                                                onValueChange={(v) => {
                                                    field.onChange(v)
                                                    form.setValue('wardCode', undefined)
                                                }}
                                                onClear={() => {
                                                    field.onChange(undefined)
                                                    form.setValue('wardCode', undefined)
                                                }}
                                                placeholder={t('staff.branch.form.provincePlaceholder')}>
                                                {provinces.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </ClearableSelect>
                                        </FormControl>
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
                                        <FormControl>
                                            <ClearableSelect
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                onClear={() => field.onChange(undefined)}
                                                placeholder={t('staff.branch.form.wardPlaceholder')}
                                                disabled={!selectedProvince || wardsLoading}>
                                                {wards.map((w) => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {w.name}
                                                    </SelectItem>
                                                ))}
                                            </ClearableSelect>
                                        </FormControl>
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
