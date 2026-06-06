import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as tasksApi from '@/api/tasks'
import type { TaskCreatePayload } from '@/api/workspace-types'

export const tasksQueryKey = ['tasks'] as const

export function taskRunsKey(taskId: string) {
  return ['tasks', taskId, 'runs'] as const
}

export function useTasks() {
  return useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => tasksApi.fetchTasks(),
  })
}

export function useTaskRuns(taskId: string | null) {
  return useQuery({
    queryKey: taskRunsKey(taskId ?? ''),
    queryFn: () => tasksApi.fetchTaskRuns(taskId!),
    enabled: Boolean(taskId),
  })
}

export function useTaskMutations() {
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: tasksQueryKey })

  const create = useMutation({
    mutationFn: (payload: TaskCreatePayload) => tasksApi.createTask(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Task created')
    },
    onError: () => toast.error('Could not create task'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      invalidate()
      toast.success('Task deleted')
    },
    onError: () => toast.error('Could not delete task'),
  })

  const pause = useMutation({
    mutationFn: (id: string) => tasksApi.pauseTask(id),
    onSuccess: () => {
      invalidate()
      toast.success('Task paused')
    },
    onError: () => toast.error('Could not pause task'),
  })

  const resume = useMutation({
    mutationFn: (id: string) => tasksApi.resumeTask(id),
    onSuccess: () => {
      invalidate()
      toast.success('Task resumed')
    },
    onError: () => toast.error('Could not resume task'),
  })

  const run = useMutation({
    mutationFn: (id: string) => tasksApi.runTask(id),
    onSuccess: () => toast.success('Task triggered'),
    onError: () => toast.error('Could not run task'),
  })

  return { create, remove, pause, resume, run }
}
