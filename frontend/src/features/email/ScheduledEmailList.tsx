import { X } from 'lucide-react'
import type { ScheduledEmail } from '@/api/email-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ScheduledEmailListProps = {
  items: ScheduledEmail[]
  isLoading?: boolean
  onCancel: (id: string, subject: string) => void
  isCancelling?: boolean
}

function formatSendAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ScheduledEmailList({
  items,
  isLoading,
  onCancel,
  isCancelling,
}: ScheduledEmailListProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        Loading scheduled sends…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        No scheduled emails.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-y-auto">
      {items.map((item) => {
        const subject = item.subject || '(no subject)'
        const failed = item.status === 'failed'
        return (
          <li key={item.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{subject}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase',
                      failed
                        ? 'border-destructive text-destructive'
                        : 'border-border text-muted',
                    )}
                  >
                    {failed ? 'Failed' : 'Pending'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  To: {item.to || '(no recipient)'} · Sends {formatSendAt(item.send_at)}
                </p>
                {item.error && (
                  <p className="mt-1 text-xs text-destructive">{item.error}</p>
                )}
              </div>
              {item.status === 'pending' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  title="Cancel scheduled send"
                  disabled={isCancelling}
                  onClick={() => onCancel(item.id, subject)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
