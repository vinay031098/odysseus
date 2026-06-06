import { useMemo, useState } from 'react'
import { TaskComposer } from '@/features/workspace/TaskComposer'
import { TaskList } from '@/features/workspace/TaskList'
import { TaskRunHistory } from '@/features/workspace/TaskRunHistory'
import { useTaskMutations, useTaskRuns, useTasks } from '@/hooks/useTasks'
import type { ScheduledTask } from '@/api/workspace-types'

export function TasksPage() {
  const { data: tasks = [], isLoading, isError } = useTasks()
  const { create, remove, pause, resume, run } = useTaskMutations()
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null)
  const [createdTask, setCreatedTask] = useState<ScheduledTask | null>(null)

  const historyTask = useMemo(
    () => tasks.find((t) => t.id === historyTaskId) ?? null,
    [tasks, historyTaskId],
  )
  const runsQuery = useTaskRuns(historyTaskId)

  if (isLoading) {
    return <Centered message="Loading tasks…" />
  }
  if (isError) {
    return <Centered message="Could not load tasks." error />
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-xl font-semibold">Tasks</h2>
        <p className="mt-1 text-sm text-muted">
          Scheduled LLM prompts, webhooks, and built-in housekeeping jobs.
        </p>
      </div>

      {historyTaskId && historyTask ? (
        <TaskRunHistory
          taskName={historyTask.name}
          runs={runsQuery.data?.runs ?? []}
          isLoading={runsQuery.isLoading}
          onBack={() => setHistoryTaskId(null)}
        />
      ) : (
        <>
          <TaskComposer
            onSubmit={(data) =>
              create.mutate(
                {
                  name: data.name,
                  prompt: data.prompt ?? '',
                  task_type: data.task_type,
                  action: data.action,
                  scheduled_time: data.scheduled_time,
                  trigger_type: data.trigger_type,
                  trigger_event: data.trigger_event,
                  trigger_count: data.trigger_count,
                  schedule: data.trigger_type === 'webhook' ? undefined : data.schedule ?? 'daily',
                },
                {
                  onSuccess: (task) => {
                    if (task.trigger_type === 'webhook') setCreatedTask(task)
                  },
                },
              )
            }
            isSubmitting={create.isPending}
            createdTask={createdTask}
            onDismissCreated={() => setCreatedTask(null)}
          />
          <TaskList
            tasks={tasks}
            onPause={(id) => pause.mutate(id)}
            onResume={(id) => resume.mutate(id)}
            onRun={(id) => run.mutate(id)}
            onDelete={(id) => remove.mutate(id)}
            onViewHistory={setHistoryTaskId}
          />
        </>
      )}
    </div>
  )
}

function Centered({ message, error }: { message: string; error?: boolean }) {
  return (
    <div className={`flex h-full items-center justify-center p-6 text-sm ${error ? 'text-destructive' : 'text-muted'}`}>
      {message}
    </div>
  )
}
