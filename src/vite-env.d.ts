/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string
    readonly VITE_BASE_URL?: string
    readonly VITE_USE_HASH_ROUTE?: string
    readonly VITE_API_BASE_URL?: string
    readonly VITE_API_PROXY_TARGET?: string
    readonly VITE_USE_MOCK?: string

    /* Letterhead hoá đơn in — xem `storeConfig` ở src/config/app.ts. */
    readonly VITE_STORE_BRAND_MARK?: string
    readonly VITE_STORE_HOTLINE?: string
    readonly VITE_STORE_WEBSITE?: string
    readonly VITE_STORE_EMAIL?: string
    readonly VITE_STORE_RETURN_DAYS?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
