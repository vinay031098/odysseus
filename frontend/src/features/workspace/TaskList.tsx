import { History, Play, Pause, Trash2, Zap, Copy } from 'lucide-react'
import { webhookUrl } from '@/api/tasks'
import type { ScheduledTask } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { groupTasksByStatus } from '@/lib/workspace/taskHelpers'
import { toast } from 'sonner'

type TaskListProps = {
  tasks: ScheduledTask[]
  onPause: (id: string) => void
  onResume: (id: string) => void
  onRun: (id: string) => void
  onDelete: (id: string) => void
  onViewHistory: (id: string) => void
}

export function TaskList({
  tasks,
  onPause,
  onResume,
  onRun,
  onDelete,
  onViewHistory,
}: TaskListProps) {
  const groups = groupTasksByStatus(tasks)

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-muted">
        No scheduled tasks yet. Create one below.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([status, items]) => (
        <section key={status}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {status}
          </h3>
          <ul className="space-y-2">
            {items.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPause={onPause}
                onResume={onResume}
                onRun={onRun}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

type TaskItemProps = {
  task: ScheduledTask
  onPause: (id: string) => void
  onResume: (id: string) => void
  onRun: (id: string) => void
  onDelete: (id: string) => void
  onViewHistory: (id: string) => void
}

function TaskItem({
  task,
  onPause,
  onResume,
  onRun,
  onDelete,
  onViewHistory,
}: TaskItemProps) {
  const isActive = task.status === 'active'
  const isPaused = task.status === 'paused'
  const isWebhook = task.trigger_type === 'webhook'

  const copyWebhook = async () => {
    if (!task.webhook_token) return
    await navigator.clipboard.writeText(webhookUrl(task.id, task.webhook_token))
    toast.success('Webhook URL copied')
  }

  return (
    <li
      className={cn(
        'rounded-lg border border-border bg-panel p-4',
        task.is_builtin && 'border-primary/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-medium">{task.name}</h4>
            {task.is_builtin ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">
                Built-in
              </span>
            ) : null}
            {isWebhook ? (
              <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] uppercase text-muted">
                Webhook
              </span>
            ) : null}
          </div>
          {task.prompt ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{task.prompt}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {task.schedule ? <span>Schedule: {task.schedule}</span> : null}
            {task.scheduled_time ? <span>At {task.scheduled_time}</span> : null}
            {task.next_run ? (
              <span>Next: {new Date(task.next_run).toLocaleString()}</span>
            ) : null}
            {task.run_count != null && task.run_count > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                onClick={() => onViewHistory(task.id)}
              >
                <History className="h-3 w-3" />
                {task.run_count} runs
              </button>
            ) : null}
          </div>
          {isWebhook && task.webhook_token ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              onClick={() => void copyWebhook()}
            >
              <Copy className="h-3 w-3" />
              Copy webhook URL
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="View run history"
            onClick={() => onViewHistory(task.id)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRun(task.id)}>
            <Zap className="h-4 w-4" />
          </Button>
          {isActive ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPause(task.id)}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : null}
          {isPaused ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onResume(task.id)}>
              <Play className="h-4 w-4" />
            </Button>
          ) : null}
          {!task.is_builtin ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}
