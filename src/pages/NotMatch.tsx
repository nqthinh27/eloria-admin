import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@/components/ui/button"

export default function NotMatch() {
    const { t } = useTranslation()

    return (
        <div className="flex flex-grow items-center justify-center py-16">
            <div className="space-y-4 text-center">
                <p className="text-7xl font-semibold text-primary">404</p>
                <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('notFound.description')}
                </p>
                <Link to="/" className={buttonVariants()}>{t('notFound.backHome')}</Link>
            </div>
        </div>
    )
}
