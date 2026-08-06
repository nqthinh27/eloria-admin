/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_NAME?: string
    readonly VITE_BASE_URL?: string
    readonly VITE_USE_HASH_ROUTE?: string
    readonly VITE_API_BASE_URL?: string
    readonly VITE_API_PROXY_TARGET?: string
    readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
