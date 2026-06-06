import { api } from './client'
import type {
  ResearchActiveTask,
  ResearchLibraryItem,
  ResearchResultPeek,
  ResearchStartRequest,
  ResearchStartResponse,
} from './types'

export function fetchActiveResearch() {
  return api.get<{ active: ResearchActiveTask[] }>('/api/research/active')
}

export function fetchResearchLibrary(params?: { search?: string; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs}` : ''
  return api.get<{ research: ResearchLibraryItem[]; total: number }>(
    `/api/research/library${suffix}`,
  )
}

export function startResearch(body: ResearchStartRequest) {
  return api.post<ResearchStartResponse>('/api/research/start', body)
}

export function cancelResearch(sessionId: string) {
  return api.post<{ cancelled: boolean }>(`/api/research/cancel/${sessionId}`)
}

export function peekResearchResult(sessionId: string) {
  return api.post<ResearchResultPeek>(`/api/research/result-peek/${sessionId}`)
}

export function deleteResearch(sessionId: string) {
  return api.delete<{ deleted: boolean }>(`/api/research/${sessionId}`)
}

export function researchReportUrl(sessionId: string) {
  return `/api/research/report/${sessionId}`
}

export function spinoffResearchChat(sessionId: string) {
  return api.post<{ session_id: string }>(`/api/research/spinoff/${sessionId}`)
}
