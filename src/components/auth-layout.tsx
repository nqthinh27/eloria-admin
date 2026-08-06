import { BarChart3, Boxes, Store, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { Shirt } from 'lucide-react'

/**
 * Layout riêng cho nhóm màn xác thực — theo `design/00-dang-nhap.png`:
 * panel brand nền tối bên trái + vùng form nền trắng bên phải.
 * Không dùng AppLayout (không sidebar, không top bar).
 *
 * Mockup chỉ có frame desktop. Dưới `lg` panel brand ẩn đi, form chiếm toàn màn
 * (CONVENTIONS mục 5: mobile chỉ cần không vỡ).
 */
export function AuthLayout() {
    const { t } = useTranslation('auth')

    const features = [
        { icon: Store, label: t('auth.brand.feature1') },
        { icon: Boxes, label: t('auth.brand.feature2') },
        { icon: Users, label: t('auth.brand.feature3') },
        { icon: BarChart3, label: t('auth.brand.feature4') },
    ]

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.4fr_1fr]">
            {/* Panel brand — chỉ hiện từ lg trở lên */}
            <aside className="bg-sidebar text-sidebar-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
                {/* Lưới mờ trang trí, khớp nền mockup */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />

                <div className="relative">
                    <div className="border-sidebar-border/60 bg-sidebar-accent/40 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5">
                        <Shirt className="size-5" />
                        <span className="font-semibold tracking-wide">ELORIA</span>
                    </div>

                    <h1 className="mt-14 text-4xl leading-tight font-bold text-white xl:text-5xl">
                        {t('auth.brand.headline1')}
                        <br />
                        <span className="text-primary-foreground/90 bg-clip-text">
                            <span className="text-[oklch(0.72_0.16_277)]">
                                {t('auth.brand.headline2')}
                            </span>
                        </span>
                    </h1>

                    <p className="text-sidebar-foreground/70 mt-6 max-w-md leading-relaxed">
                        {t('auth.brand.tagline')}
                    </p>
                </div>

                <ul className="relative space-y-5">
                    {features.map(({ icon: Icon, label }) => (
                        <li key={label} className="flex items-center gap-4">
                            <span className="bg-primary flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
                                <Icon className="size-5" />
                            </span>
                            <span className="text-sidebar-foreground/90 text-sm">{label}</span>
                        </li>
                    ))}
                </ul>

                <div className="border-sidebar-border/60 relative border-t pt-6">
                    <p className="text-sidebar-foreground/50 text-xs">
                        © {new Date().getFullYear()} {t('auth.brand.copyright')}
                    </p>
                </div>
            </aside>

            {/* Vùng form */}
            <main className="bg-card flex items-center justify-center px-6 py-12 sm:px-10">
                <div className="w-full max-w-sm">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
