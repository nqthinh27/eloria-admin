import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import type {
    BankAccount,
    CreateBankAccountReq,
    UpdateBankAccountReq,
} from '@/types/bank-account'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

/** Ràng buộc lấy từ `CreateBankAccountReqDTO`: BIN đúng 6 chữ số; tên ≤100; số TK ≤30; chủ TK ≤150. */
const buildSchema = (t: (key: string) => string) =>
    z.object({
        bankBin: z
            .string()
            .trim()
            .regex(/^\d{6}$/, t('bankAccount.form.validation.bankBinInvalid')),
        bankName: z
            .string()
            .trim()
            .min(1, t('bankAccount.form.validation.bankNameRequired'))
            .max(100, t('bankAccount.form.validation.bankNameTooLong')),
        accountNumber: z
            .string()
            .trim()
            .min(1, t('bankAccount.form.validation.accountNumberRequired'))
            .max(30, t('bankAccount.form.validation.accountNumberTooLong')),
        accountName: z
            .string()
            .trim()
            .min(1, t('bankAccount.form.validation.accountNameRequired'))
            .max(150, t('bankAccount.form.validation.accountNameTooLong')),
        isDefault: z.boolean(),
    })

type BankAccountFormValues = z.infer<ReturnType<typeof buildSchema>>

type BankAccountFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** `null` = thêm mới. */
    account: BankAccount | null
    onCreate: (payload: CreateBankAccountReq) => Promise<void>
    onUpdate: (id: string, payload: UpdateBankAccountReq) => Promise<void>
}

/**
 * Dialog thêm/sửa tài khoản ngân hàng. Cờ "mặc định" **chỉ có ở form Thêm** — `PUT` không đổi được
 * cờ này (phải qua `set-default` ở menu dòng).
 */
export function BankAccountFormDialog({
    open,
    onOpenChange,
    account,
    onCreate,
    onUpdate,
}: BankAccountFormDialogProps) {
    const { t } = useTranslation(['bankAccount', 'common'])
    const isEdit = account !== null
    const schema = useMemo(() => buildSchema(t), [t])

    const form = useForm<BankAccountFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { bankBin: '', bankName: '', accountNumber: '', accountName: '', isDefault: false },
    })

    useEffect(() => {
        if (!open) return
        form.reset({
            bankBin: account?.bankBin ?? '',
            bankName: account?.bankName ?? '',
            accountNumber: account?.accountNumber ?? '',
            accountName: account?.accountName ?? '',
            isDefault: false,
        })
    }, [open, account, form])

    const onSubmit = async (values: BankAccountFormValues) => {
        try {
            const base = {
                bankBin: values.bankBin,
                bankName: values.bankName,
                accountNumber: values.accountNumber,
                accountName: values.accountName,
            }
            if (isEdit) await onUpdate(account.id, base)
            else await onCreate({ ...base, isDefault: values.isDefault })
            onOpenChange(false)
        } catch {
            // api-client đã toast lỗi (vd trùng BIN + số TK); giữ form mở để sửa lại.
        }
    }

    const isSubmitting = form.formState.isSubmitting

    return (
        <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? t('bankAccount.form.editTitle') : t('bankAccount.form.addTitle')}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <FormField
                            control={form.control}
                            name="bankBin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('bankAccount.form.bankBin')} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder={t('bankAccount.form.bankBinPlaceholder')}
                                        />
                                    </FormControl>
                                    <FormDescription>{t('bankAccount.form.bankBinHint')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('bankAccount.form.bankName')} <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('bankAccount.form.bankNamePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('bankAccount.form.accountNumber')}{' '}
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('bankAccount.form.accountNumberPlaceholder')}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('bankAccount.form.accountName')}{' '}
                                        <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={t('bankAccount.form.accountNamePlaceholder')}
                                        />
                                    </FormControl>
                                    <FormDescription>{t('bankAccount.form.accountNameHint')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isEdit && (
                            <FormField
                                control={form.control}
                                name="isDefault"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                            {t('bankAccount.form.isDefault')}
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                        )}

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
                                    ? t('bankAccount.form.submitting')
                                    : isEdit
                                      ? t('bankAccount.form.submitUpdate')
                                      : t('bankAccount.form.submitCreate')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
