import { useTranslation } from 'react-i18next'
import { AlertTriangle, CircleX } from 'lucide-react'

import { cn } from '@/lib/utils'
import { issueKey, type ImageIssue } from '@/lib/image-spec'

/** Danh sách vấn đề của một ảnh: đỏ = chặn, vàng = cảnh báo mềm. */
export function ImageIssueList({ issues, className }: { issues: ImageIssue[]; className?: string }) {
    const { t } = useTranslation('image')
    if (issues.length === 0) return null

    return (
        <ul className={cn('space-y-1', className)}>
            {issues.map((issue) => (
                <li
                    key={issue.code}
                    className={cn(
                        'flex items-start gap-1.5 text-xs',
                        issue.blocking ? 'text-destructive' : 'text-foreground',
                    )}>
                    {issue.blocking ? (
                        <CircleX className="mt-0.5 size-3.5 shrink-0" />
                    ) : (
                        <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
                    )}
                    <span>{t(issueKey(issue), issue.params)}</span>
                </li>
            ))}
        </ul>
    )
}
