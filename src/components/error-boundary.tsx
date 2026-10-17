import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Chặn lỗi **render** của một cụm UI phụ (vd quả chuông) để không kéo trắng cả ứng dụng. Chỉ hiện
 * `fallback`; lỗi được log ở dev để không nuốt mất dấu vết.
 */
export class ErrorBoundary extends Component<
    { fallback: ReactNode; children: ReactNode },
    { failed: boolean }
> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack)
    }

    render() {
        return this.state.failed ? this.props.fallback : this.props.children
    }
}
