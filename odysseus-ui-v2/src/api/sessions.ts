import { api } from './client'
import type { ForkSessionResponse, PendingChat, Session, SessionCreateResponse } from './types'

export function fetchSessions() {
  return api.get<Session[]>('/api/sessions')
}

export function fetchArchivedSessions(params?: { search?: string; limit?: number }) {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.limit) q.set('limit', String(params.limit))
  const qs = q.toString()
  return api.get<{ sessions: Session[] }>(`/api/sessions/archived${qs ? `?${qs}` : ''}`)
}

export function createSession(pending: PendingChat, name?: string) {
  const fd = new FormData()
  const modelBase = pending.modelId.split('/').pop() || 'model'
  fd.append('name', name ?? `${modelBase} ${new Date().toLocaleTimeString()}`)
  fd.append('endpoint_url', pending.url)
  fd.append('model', pending.modelId)
  fd.append('skip_validation', 'true')
  if (pending.endpointId) fd.append('endpoint_id', pending.endpointId)
  return api.postForm<SessionCreateResponse>('/api/session', fd)
}

export function deleteSession(sessionId: string) {
  return api.delete<{ status: string }>(`/api/session/${sessionId}`)
}

export function renameSession(sessionId: string, name: string) {
  const fd = new FormData()
  fd.append('name', name)
  return api.patchForm<{ id: string; name: string }>(`/api/session/${sessionId}`, fd)
}

export function moveSessionToFolder(sessionId: string, folder: string) {
  const fd = new FormData()
  fd.append('folder', folder)
  return api.patchForm<{ id: string; folder?: string | null }>(`/api/session/${sessionId}`, fd)
}

export function archiveSession(sessionId: string) {
  return api.post<{ status: string }>(`/api/session/${sessionId}/archive`)
}

export function unarchiveSession(sessionId: string) {
  return api.post<{ status: string }>(`/api/session/${sessionId}/unarchive`)
}

export function setSessionImportant(sessionId: string, important: boolean) {
  const fd = new FormData()
  fd.append('important', String(important))
  return api.postForm<{ status: string; is_important: boolean }>(
    `/api/session/${sessionId}/important`,
    fd,
  )
}

export function updateSessionModel(
  sessionId: string,
  model: string,
  endpointUrl: string,
  endpointId: string,
) {
  const fd = new FormData()
  fd.append('model', model)
  fd.append('endpoint_url', endpointUrl)
  fd.append('endpoint_id', endpointId)
  return api.patchForm<{ id: string }>(`/api/session/${sessionId}`, fd)
}

export function truncateSession(sessionId: string, keepCount: number) {
  return api.post<{ status: string; kept: number }>(`/api/session/${sessionId}/truncate`, {
    keep_count: keepCount,
  })
}

export function deleteMessages(sessionId: string, msgIds: string[]) {
  return api.post<{ status: string; deleted: number }>(
    `/api/session/${sessionId}/delete-messages`,
    { msg_ids: msgIds },
  )
}

export function forkSession(sessionId: string, keepCount: number) {
  return api.post<ForkSessionResponse>(`/api/session/${sessionId}/fork`, {
    keep_count: keepCount,
  })
}
