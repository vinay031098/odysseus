import { api } from './client'
import type { CompareHistoryItem, CompareStartResponse, CompareVoteResponse } from './types'

export interface CompareStartParams {
  prompt: string
  modelA: string
  modelB: string
  endpointA: string
  endpointB: string
  isBlind?: boolean
}

export function startComparison(params: CompareStartParams) {
  const form = new FormData()
  form.append('prompt', params.prompt)
  form.append('model_a', params.modelA)
  form.append('model_b', params.modelB)
  form.append('endpoint_a', params.endpointA)
  form.append('endpoint_b', params.endpointB)
  form.append('is_blind', params.isBlind !== false ? 'true' : 'false')
  return api.postForm<CompareStartResponse>('/api/compare/start', form)
}

export function voteComparison(compId: string, winner: 'left' | 'right' | 'tie') {
  const form = new FormData()
  form.append('winner', winner)
  return api.postForm<CompareVoteResponse>(`/api/compare/${compId}/vote`, form)
}

export function fetchCompareHistory() {
  return api.get<CompareHistoryItem[]>('/api/compare/history')
}

export function deleteComparison(compId: string) {
  return api.delete<{ status: string }>(`/api/compare/${compId}`)
}

export interface ProbeSelectedModel {
  endpoint_id: string
  model: string
  endpoint: string
}

export interface ProbeSelectedResult {
  model: string
  status: string
  error?: string
  endpoint_id?: string
}

export function probeSelectedModels(models: ProbeSelectedModel[]) {
  return api.post<{ results: ProbeSelectedResult[] }>('/api/probe-selected', { models })
}
