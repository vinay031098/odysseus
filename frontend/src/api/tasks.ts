import { api } from './client'
import type {
  ScheduledTask,
  TaskCreatePayload,
  TaskMetaAction,
  TaskMetaEvent,
  TaskRunsResponse,
  TasksListResponse,
} from './workspace-types'

export async function fetchTasks(status?: string): Promise<ScheduledTask[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await api.get<TasksListResponse>(`/api/tasks${qs}`)
  return data.tasks ?? []
}

export async function createTask(payload: TaskCreatePayload): Promise<ScheduledTask> {
  return api.post<ScheduledTask>('/api/tasks', {
    task_type: payload.task_type ?? 'llm',
    trigger_type: payload.trigger_type ?? 'schedule',
    schedule: payload.schedule ?? 'daily',
    scheduled_time: payload.scheduled_time ?? '09:00',
    ...payload,
  })
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/api/tasks/${encodeURIComponent(id)}`)
}

export async function pauseTask(id: string): Promise<void> {
  await api.post(`/api/tasks/${encodeURIComponent(id)}/pause`)
}

export async function resumeTask(id: string): Promise<void> {
  await api.post(`/api/tasks/${encodeURIComponent(id)}/resume`)
}

export async function runTask(id: string): Promise<void> {
  await api.post(`/api/tasks/${encodeURIComponent(id)}/run`)
}

export async function fetchTaskRuns(taskId: string, limit = 20): Promise<TaskRunsResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  return api.get<TaskRunsResponse>(
    `/api/tasks/${encodeURIComponent(taskId)}/runs?${params}`,
  )
}

export async function fetchTaskMetaEvents(): Promise<TaskMetaEvent[]> {
  const data = await api.get<{ events: TaskMetaEvent[] }>('/api/tasks/meta/events')
  return data.events ?? []
}

export async function fetchTaskMetaActions(): Promise<TaskMetaAction[]> {
  const data = await api.get<{ actions: TaskMetaAction[] }>('/api/tasks/meta/actions')
  return data.actions ?? []
}

export function webhookUrl(taskId: string, token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/api/tasks/${encodeURIComponent(taskId)}/webhook/${token}`
}
