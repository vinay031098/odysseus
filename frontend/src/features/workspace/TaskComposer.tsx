import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Link2 } from 'lucide-react'
import {
  fetchTaskMetaActions,
  fetchTaskMetaEvents,
  webhookUrl,
} from '@/api/tasks'
import type { ScheduledTask } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type TriggerType = 'schedule' | 'event' | 'webhook'
type TaskType = 'llm' | 'research' | 'action'

const TASK_PRESETS: Array<{
  label: string
  desc: string
  taskType: TaskType
  triggerType: TriggerType
}> = [
  { label: 'Prompt on schedule', desc: 'Run a prompt daily, weekly, etc.', taskType: 'llm', triggerType: 'schedule' },
  { label: 'Prompt on event', desc: 'Trigger every N sessions or messages', taskType: 'llm', triggerType: 'event' },
  { label: 'Research on schedule', desc: 'Run deep research on a topic', taskType: 'research', triggerType: 'schedule' },
  { label: 'Research on event', desc: 'Run deep research after app events', taskType: 'research', triggerType: 'event' },
  { label: 'Action on schedule', desc: 'Run tidy/cleanup on a timer', taskType: 'action', triggerType: 'schedule' },
  { label: 'Action on event', desc: 'Run tidy/cleanup every N sessions or messages', taskType: 'action', triggerType: 'event' },
  { label: 'Webhook triggered', desc: 'Trigger via external HTTP call', taskType: 'llm', triggerType: 'webhook' },
]

type TaskComposerProps = {
  onSubmit: (data: {
    name: string
    prompt?: string
    action?: string
    scheduled_time?: string
    task_type: TaskType
    trigger_type: TriggerType
    trigger_event?: string
    trigger_count?: number
    schedule?: string
  }) => void
  isSubmitting?: boolean
  createdTask?: ScheduledTask | null
  onDismissCreated?: () => void
}

export function TaskComposer({
  onSubmit,
  isSubmitting,
  createdTask,
  onDismissCreated,
}: TaskComposerProps) {
  const [showPresets, setShowPresets] = useState(true)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [time, setTime] = useState('09:00')
  const [taskType, setTaskType] = useState<TaskType>('llm')
  const [triggerType, setTriggerType] = useState<TriggerType>('schedule')
  const [triggerEvent, setTriggerEvent] = useState('')
  const [triggerCount, setTriggerCount] = useState(5)
  const [action, setAction] = useState('')

  const eventsQuery = useQuery({
    queryKey: ['tasks', 'meta', 'events'],
    queryFn: fetchTaskMetaEvents,
    enabled: triggerType === 'event',
  })
  const actionsQuery = useQuery({
    queryKey: ['tasks', 'meta', 'actions'],
    queryFn: fetchTaskMetaActions,
    enabled: taskType === 'action',
  })

  useEffect(() => {
    const events = eventsQuery.data ?? []
    if (events.length && !triggerEvent) setTriggerEvent(events[0].name)
  }, [eventsQuery.data, triggerEvent])

  useEffect(() => {
    const actions = actionsQuery.data ?? []
    if (actions.length && !action) setAction(actions[0].name)
  }, [actionsQuery.data, action])

  const applyPreset = (preset: (typeof TASK_PRESETS)[number]) => {
    setTaskType(preset.taskType)
    setTriggerType(preset.triggerType)
    setShowPresets(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if ((taskType === 'llm' || taskType === 'research') && !prompt.trim()) return
    if (taskType === 'action' && !action) return
    if (triggerType === 'event' && !triggerEvent) return

    onSubmit({
      name: name.trim(),
      prompt: taskType === 'action' ? undefined : prompt.trim(),
      action: taskType === 'action' ? action : undefined,
      scheduled_time: triggerType === 'schedule' ? time : undefined,
      task_type: taskType,
      trigger_type: triggerType,
      trigger_event: triggerType === 'event' ? triggerEvent : undefined,
      trigger_count: triggerType === 'event' ? triggerCount : undefined,
      schedule: triggerType === 'schedule' ? 'daily' : undefined,
    })
    setName('')
    setPrompt('')
    setShowPresets(true)
  }

  const webhook =
    createdTask?.trigger_type === 'webhook' &&
    createdTask.webhook_token &&
    webhookUrl(createdTask.id, createdTask.webhook_token)

  const copyWebhook = async () => {
    if (!webhook) return
    await navigator.clipboard.writeText(webhook)
    toast.success('Webhook URL copied')
  }

  return (
    <div className="space-y-3">
      {webhook ? (
        <div className="rounded-lg border border-primary/30 bg-panel p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4" />
            Webhook URL
          </div>
          <div className="flex gap-2">
            <Input readOnly value={webhook} className="text-xs" />
            <Button type="button" variant="secondary" size="icon" onClick={() => void copyWebhook()}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {onDismissCreated ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDismissCreated}>
              Dismiss
            </Button>
          ) : null}
        </div>
      ) : null}

      {showPresets ? (
        <div className="rounded-lg border border-border bg-panel p-4 space-y-2">
          <h3 className="text-sm font-semibold">Add task</h3>
          <p className="text-xs text-muted">Pick a preset or configure manually below.</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {TASK_PRESETS.map((p) => (
              <li key={p.label}>
                <button
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-background"
                >
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-[11px] text-muted">{p.desc}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowPresets(false)}>
            Custom task…
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-panel p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">New task</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPresets(true)}>
              Presets
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['llm', 'research', 'action'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={taskType === t ? 'default' : 'secondary'}
                onClick={() => setTaskType(t)}
              >
                {t === 'llm' ? 'Prompt' : t === 'research' ? 'Research' : 'Action'}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['schedule', 'event', 'webhook'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={triggerType === t ? 'default' : 'secondary'}
                onClick={() => setTriggerType(t)}
              >
                {t === 'schedule' ? 'Scheduled' : t === 'event' ? 'Event' : 'Webhook'}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-name">Name</Label>
              <Input
                id="task-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning summary"
                required
              />
            </div>
            {triggerType === 'schedule' ? (
              <div className="space-y-2">
                <Label htmlFor="task-time">Time</Label>
                <Input
                  id="task-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            ) : triggerType === 'event' ? (
              <div className="space-y-2">
                <Label htmlFor="task-trigger-count">Every N occurrences</Label>
                <Input
                  id="task-trigger-count"
                  type="number"
                  min={1}
                  max={1000}
                  value={triggerCount}
                  onChange={(e) => setTriggerCount(parseInt(e.target.value, 10) || 5)}
                />
              </div>
            ) : null}
          </div>

          {triggerType === 'event' ? (
            <div className="space-y-2">
              <Label htmlFor="task-event">Event</Label>
              <select
                id="task-event"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {(eventsQuery.data ?? []).map((ev) => (
                  <option key={ev.name} value={ev.name}>
                    {ev.name} — {ev.description}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {taskType === 'action' ? (
            <div className="space-y-2">
              <Label htmlFor="task-action">Action</Label>
              <select
                id="task-action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {(actionsQuery.data ?? []).map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} — {a.description}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="task-prompt">
                {taskType === 'research' ? 'Research question' : 'Prompt'}
              </Label>
              <textarea
                id="task-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  taskType === 'research'
                    ? 'What should be researched?'
                    : 'What should the LLM do when triggered?'
                }
                required
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !name.trim()}>
            Create task
          </Button>
        </form>
      )}
    </div>
  )
}
