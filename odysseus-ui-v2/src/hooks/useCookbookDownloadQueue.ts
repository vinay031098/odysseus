import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  processDownloadQueue,
  selfHealDownloadFromOutput,
} from '@/lib/cookbookDownloadQueue'
import { saveCookbookState } from '@/api/cookbookServe'
import { cookbookServeKeys, useCookbookServeState, useCookbookTasksStatus } from '@/hooks/useCookbookServe'

/** Background processor: self-heal zombies + auto-dequeue when a host is idle. */
export function useCookbookDownloadQueue(enabled = true) {
  const stateQuery = useCookbookServeState(enabled)
  const tasksQuery = useCookbookTasksStatus(enabled)
  const queryClient = useQueryClient()
  const processingRef = useRef(false)
  const prevFinishedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !stateQuery.data) return

    const saved = stateQuery.data.tasks ?? []
    const live = tasksQuery.data?.tasks ?? []
    const liveById = new Map(live.map((t) => [t.session_id, t]))

    const tasks = [...saved]
    let changed = false
    const healedTasks = [...tasks]

    for (let i = 0; i < healedTasks.length; i++) {
      const task = healedTasks[i]
      if (task.type !== 'download') continue
      const output = liveById.get(task.sessionId)?.output_tail || task.output || ''
      const healed = selfHealDownloadFromOutput(task, output)
      if (healed) {
        healedTasks[i] = healed
        changed = true
      }
    }

    const finishedNow = new Set(
      healedTasks
        .filter(
          (t) =>
            t.type === 'download' &&
            ['done', 'stopped', 'error', 'crashed', 'failed'].includes(t.status),
        )
        .map((t) => t.sessionId),
    )

    const hostFreed = [...finishedNow].some((id) => {
      const wasRunning = !prevFinishedRef.current.has(id)
      const task = saved.find((t) => t.sessionId === id)
      return wasRunning && task?.status === 'running'
    })

    prevFinishedRef.current = finishedNow

    const hasQueued = healedTasks.some((t) => t.type === 'download' && t.status === 'queued')
    if (!hasQueued && !changed) return

    if (processingRef.current) return

    const run = async () => {
      processingRef.current = true
      try {
        if (changed) {
          await saveCookbookState({ ...stateQuery.data, tasks: healedTasks })
        }
        if (hasQueued && (hostFreed || changed)) {
          const current = stateQuery.data?.tasks ?? healedTasks
          const { tasks: nextTasks, started } = await processDownloadQueue(current)
          if (started.length || nextTasks !== current) {
            await saveCookbookState({ ...stateQuery.data, tasks: nextTasks })
          }
        }
        void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.state })
        void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.tasks })
      } finally {
        processingRef.current = false
      }
    }

    void run()
  }, [enabled, stateQuery.data, tasksQuery.data, queryClient])
}
