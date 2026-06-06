import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import type { ImportProgress } from '@/lib/documentImport'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ImportProgressPanelProps = {
  progress: ImportProgress | null
  onDismiss: () => void
}

export function ImportProgressPanel({ progress, onDismiss }: ImportProgressPanelProps) {
  if (!progress) return null

  const { items, current, total, imported, failed, running } = progress
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const done = !running

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-border bg-panel shadow-lg"
      role="status"
      aria-live="polite"
      aria-label="Import progress"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-sm font-medium">
          {running ? 'Importing files…' : 'Import complete'}
        </p>
        {done ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDismiss}
            aria-label="Dismiss import progress"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        )}
      </div>

      <div className="space-y-2 px-3 py-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {current} / {total} files
          </span>
          <span>
            {imported} imported{failed > 0 ? `, ${failed} failed` : ''}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              failed > 0 && done ? 'bg-amber-500' : 'bg-primary',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
          {items.map((item) => (
            <li key={item.name} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0" aria-hidden>
                {item.status === 'importing' ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : item.status === 'done' ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : item.status === 'failed' ? (
                  <XCircle className="h-3 w-3 text-destructive" />
                ) : (
                  <span className="inline-block h-3 w-3 rounded-full border border-border" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate" title={item.error ?? item.name}>
                {item.name}
                {item.error ? (
                  <span className="block truncate text-destructive">{item.error}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
