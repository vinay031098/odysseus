import { api } from './client'
import type {
  MemoryAuditResponse,
  MemoryEntry,
  MemoryImportResponse,
  MemoryListResponse,
  MemorySearchResponse,
} from './workspace-types'

export async function fetchMemories(): Promise<MemoryEntry[]> {
  const data = await api.get<MemoryListResponse>('/api/memory')
  return data.memory ?? []
}

export async function searchMemories(query: string): Promise<MemoryEntry[]> {
  const form = new FormData()
  form.set('query', query)
  const data = await api.postForm<MemorySearchResponse>('/api/memory/search', form)
  return data.memories ?? []
}

export async function addMemory(text: string, category = 'fact'): Promise<void> {
  await api.post('/api/memory/add', { text, category, source: 'user' })
}

export async function updateMemory(id: string, text: string, category?: string): Promise<void> {
  const form = new FormData()
  form.set('text', text)
  if (category) form.set('category', category)
  await api.put(`/api/memory/${encodeURIComponent(id)}`, form)
}

export async function deleteMemory(id: string): Promise<void> {
  await api.delete(`/api/memory/${encodeURIComponent(id)}`)
}

export async function auditMemories(): Promise<MemoryAuditResponse> {
  return api.post<MemoryAuditResponse>('/api/memory/audit')
}

export async function extractMemories(sessionId: string): Promise<{ suggestions: string[] }> {
  const form = new FormData()
  form.set('session', sessionId)
  return api.postForm<{ suggestions: string[] }>('/api/memory/extract', form)
}

export async function importMemories(file: File, sessionId?: string): Promise<MemoryImportResponse> {
  const form = new FormData()
  form.set('file', file)
  if (sessionId) form.set('session', sessionId)
  return api.postForm<MemoryImportResponse>('/api/memory/import', form)
}

export function exportMemoriesJson(entries: MemoryEntry[]): void {
  if (!entries.length) return
  const data = JSON.stringify(entries, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'memories.json'
  a.click()
  URL.revokeObjectURL(url)
}
