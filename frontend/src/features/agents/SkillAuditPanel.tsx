import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SkillAuditStatus } from '@/api/types'
import { cn } from '@/lib/utils'

interface SkillAuditPanelProps {
  status: SkillAuditStatus | undefined
  onCancel: () => void
  onClose: () => void
  cancelling?: boolean
  className?: string
}

export function SkillAuditPanel({
  status,
  onCancel,
  onClose,
  cancelling,
  className,
}: SkillAuditPanelProps) {
  if (!status || status.status === 'none') return null

  const done = status.done ?? 0
  const total = status.total ?? 0
  const pct = total ? Math.round((done / total) * 100) : 0
  const running = status.status === 'running'
  const cancelled = status.status === 'cancelled'

  const counts: Record<string, number> = {}
  for (const r of status.results ?? []) {
    const key = r.result ?? 'unknown'
    counts[key] = (counts[key] ?? 0) + 1
  }
  const summary = Object.entries(counts)
    .map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`)
    .join(' · ')

  const head = running
    ? `Auditing ${done}/${total}${status.current ? ` — ${status.current}` : ''}`
    : cancelled
      ? `Audit cancelled — ${done}/${total}`
      : `Audit complete — ${total} skill${total === 1 ? '' : 's'}`

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-panel/80 p-3 text-xs',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-semibold">
          {running ? <Loader2 className="size-3 animate-spin text-primary" aria-hidden /> : null}
          <span>{head}</span>
        </span>
        {running ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={onCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {summary || status.teacher ? (
        <p className="mt-2 text-muted">
          {summary}
          {status.teacher ? `${summary ? ' · ' : ''}teacher: ${status.teacher}` : ''}
        </p>
      ) : null}

      {(status.log?.length ?? 0) > 0 ? (
        <div className="mt-2 max-h-28 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-muted">
          {(status.log ?? []).slice(-40).map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
