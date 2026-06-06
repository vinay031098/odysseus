import { ChevronLeft } from 'lucide-react'
import type { TaskRun } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TaskRunHistoryProps = {
  taskName: string
  runs: TaskRun[]
  isLoading?: boolean
  onBack: () => void
}

export function TaskRunHistory({ taskName, runs, isLoading, onBack }: TaskRunHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <h3 className="text-sm font-semibold">{taskName} — Run history</h3>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading runs…</p>
      ) : runs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No runs yet.</p>
      ) : (
        <ul className="space-y-2">
          {runs.map((run) => (
            <TaskRunItem key={run.id} run={run} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TaskRunItem({ run }: { run: TaskRun }) {
  const snippet = run.result || run.error || '—'
  const statusClass =
    run.status === 'success'
      ? 'border-success/30'
      : run.status === 'error'
        ? 'border-destructive/40'
        : 'border-border'

  return (
    <li className={cn('rounded-lg border bg-panel p-3', statusClass)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="font-medium uppercase text-foreground">{run.status}</span>
        {run.model ? (
          <span>{run.model.split('/').pop()}</span>
        ) : null}
        {run.started_at ? (
          <span title={new Date(run.started_at).toLocaleString()}>
            {new Date(run.started_at).toLocaleString()}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm">{snippet}</p>
    </li>
  )
}
