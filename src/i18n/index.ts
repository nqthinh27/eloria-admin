import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import viCommon from './locales/vi/common'
import viErrors from './locales/vi/errors'
import viAuth from './locales/vi/auth'
import viMenu from './locales/vi/menu'
import viStaff from './locales/vi/staff'
import viCustomer from './locales/vi/customer'
import viProduct from './locales/vi/product'
import viInventory from './locales/vi/inventory'
import enCommon from './locales/en/common'
import enErrors from './locales/en/errors'
import enAuth from './locales/en/auth'
import enMenu from './locales/en/menu'
import enStaff from './locales/en/staff'
import enCustomer from './locales/en/customer'
import enProduct from './locales/en/product'
import enInventory from './locales/en/inventory'

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi'

/** Khoá lưu ngôn ngữ người dùng đã chọn. */
export const LANGUAGE_STORAGE_KEY = 'eloria-lang'

const resources = {
    vi: {
        common: viCommon,
        errors: viErrors,
        auth: viAuth,
        menu: viMenu,
        staff: viStaff,
        customer: viCustomer,
        product: viProduct,
        inventory: viInventory,
    },
    en: {
        common: enCommon,
        errors: enErrors,
        auth: enAuth,
        menu: enMenu,
        staff: enStaff,
        customer: enCustomer,
        product: enProduct,
        inventory: enInventory,
    },
}

/*
 * Ràng buộc kiểu: bộ key của `en` phải trùng `vi`.
 * Thiếu hoặc thừa key ở một ngôn ngữ ⇒ `npm run build` fail ngay, không đợi phát hiện lúc chạy.
 *
 * Kiểm tra 2 chiều: `en extends vi` bắt key thiếu, `vi extends en` bắt key thừa.
 * Dùng biến `const` (không phải `type`) để không vướng `noUnusedLocals`.
 */
type SameKeys<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
export const LOCALES_IN_SYNC: SameKeys<typeof resources.vi, typeof resources.en> = true

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        ns: ['common', 'errors', 'auth', 'menu', 'staff', 'customer', 'product', 'inventory'],
        defaultNS: 'common',
        /*
         * CHỈ đọc lựa chọn đã lưu, KHÔNG dò `navigator.language`.
         *
         * Đây là công cụ nội bộ dùng ở Việt Nam, mặc định phải là `vi`. Nếu để i18next
         * dò ngôn ngữ trình duyệt, máy cài tiếng Anh sẽ mở app ra tiếng Anh ngay từ
         * màn đăng nhập — sai mặc định đã chốt. Sau khi đăng nhập, `langKey` của
         * người dùng mới được áp (xem AuthProvider).
         */
        detection: {
            order: ['localStorage'],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
            caches: ['localStorage'],
        },
        interpolation: {
            // React đã tự escape.
            escapeValue: false,
        },
    })

/**
 * Đổi ngôn ngữ hiện tại. Dùng ở bộ chuyển ngôn ngữ trên top bar (Phase 3)
 * và khi khôi phục `langKey` của người dùng sau đăng nhập (Phase 2).
 */
export function changeLanguage(lang: SupportedLanguage) {
    return i18n.changeLanguage(lang)
}

/** Ngôn ngữ đang dùng, luôn nằm trong `SUPPORTED_LANGUAGES`. */
export function getCurrentLanguage(): SupportedLanguage {
    const current = i18n.resolvedLanguage ?? i18n.language
    return SUPPORTED_LANGUAGES.includes(current as SupportedLanguage)
        ? (current as SupportedLanguage)
        : DEFAULT_LANGUAGE
}

export default i18n
