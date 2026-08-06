import { ShieldOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'

export default function Forbidden() {
    const { t } = useTranslation('menu')

    return (
        <div className="flex flex-grow items-center justify-center py-16">
            <div className="max-w-md space-y-4 text-center">
                <span className="bg-destructive-muted text-destructive mx-auto flex size-14 items-center justify-center rounded-full">
                    <ShieldOff className="size-7" />
                </span>
                <p className="text-5xl font-semibold">403</p>
                <h1 className="text-2xl font-semibold">{t('error.forbiddenTitle')}</h1>
                <p className="text-muted-foreground text-sm">{t('error.forbiddenMessage')}</p>
                <Link to="/" className={buttonVariants()}>
                    {t('error.backToHome')}
                </Link>
            </div>
        </div>
    )
}
