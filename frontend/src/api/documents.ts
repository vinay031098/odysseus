import { api } from './client'

export type DocumentSummary = {
  id: string
  session_id: string | null
  session_name: string | null
  title: string
  language: string
  preview: string
  version_count: number
  created_at: string | null
  updated_at: string | null
}

export type Document = {
  id: string
  session_id: string | null
  title: string
  language: string | null
  current_content: string
  version_count: number
  is_active: boolean
  archived: boolean
  created_at: string | null
  updated_at: string | null
}

export type LibraryResponse = {
  documents: DocumentSummary[]
  total: number
  languages: Record<string, number>
  session_count: number
}

export type DocumentCreatePayload = {
  title?: string
  content?: string
  language?: string | null
  session_id?: string | null
}

export type LibraryQuery = {
  search?: string
  language?: string
  sort?: 'recent' | 'oldest' | 'edits' | 'alpha'
  offset?: number
  limit?: number
  archived?: boolean
}

export async function fetchLibrary(params: LibraryQuery = {}): Promise<LibraryResponse> {
  const qs = new URLSearchParams()
  if (params.search) qs.set('search', params.search)
  if (params.language) qs.set('language', params.language)
  if (params.sort) qs.set('sort', params.sort)
  if (params.offset != null) qs.set('offset', String(params.offset))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.archived) qs.set('archived', 'true')
  const suffix = qs.toString() ? `?${qs}` : ''
  return api.get<LibraryResponse>(`/api/documents/library${suffix}`)
}

export async function fetchDocument(id: string): Promise<Document> {
  return api.get<Document>(`/api/document/${encodeURIComponent(id)}`)
}

export async function createDocument(payload: DocumentCreatePayload): Promise<Document> {
  return api.post<Document>('/api/document', {
    title: payload.title ?? 'Untitled',
    content: payload.content ?? '',
    language: payload.language ?? null,
    session_id: payload.session_id ?? null,
  })
}

export async function deleteDocument(id: string): Promise<{ status: string; id: string }> {
  return api.delete(`/api/document/${encodeURIComponent(id)}`)
}

export async function archiveDocument(
  id: string,
  archived: boolean,
): Promise<{ ok: boolean; id: string; archived: boolean }> {
  return api.post(
    `/api/document/${encodeURIComponent(id)}/archive?archived=${archived ? 'true' : 'false'}`,
  )
}

export async function importPdf(file: File, sessionId?: string): Promise<Document> {
  const form = new FormData()
  form.append('file', file)
  if (sessionId) form.append('session_id', sessionId)
  return api.postForm<Document>('/api/documents/import-pdf', form)
}

export function documentRenderPdfUrl(id: string): string {
  return `/api/document/${encodeURIComponent(id)}/render-pdf`
}

export type DocumentVersion = {
  id: string
  version_number: number
  content: string
  summary: string | null
  source: string
  created_at: string | null
}

export type DocumentUpdatePayload = {
  content: string
  summary?: string
}

export type DocumentPatchPayload = {
  title?: string
  language?: string | null
  session_id?: string | null
}

export async function fetchSessionDocuments(sessionId: string): Promise<Document[]> {
  return api.get<Document[]>(`/api/documents/${encodeURIComponent(sessionId)}`)
}

export async function updateDocument(id: string, payload: DocumentUpdatePayload): Promise<Document> {
  return api.put<Document>(`/api/document/${encodeURIComponent(id)}`, payload)
}

export async function patchDocument(id: string, payload: DocumentPatchPayload): Promise<Document> {
  return api.patch<Document>(`/api/document/${encodeURIComponent(id)}`, payload)
}

export async function fetchDocumentVersions(id: string): Promise<DocumentVersion[]> {
  return api.get<DocumentVersion[]>(`/api/document/${encodeURIComponent(id)}/versions`)
}

export async function restoreDocumentVersion(id: string, versionNumber: number): Promise<Document> {
  return api.post<Document>(
    `/api/document/${encodeURIComponent(id)}/restore/${versionNumber}`,
  )
}

export type DocumentTidyResult = {
  fixed_titles: number
  deleted: number
  message: string
}

export type DocumentAiTidyResult = {
  deleted: number
  reviewed: number
  remaining?: number
  message: string
}

export async function tidyDocuments(): Promise<DocumentTidyResult> {
  return api.post<DocumentTidyResult>('/api/documents/tidy')
}

export async function aiTidyDocuments(): Promise<DocumentAiTidyResult> {
  return api.post<DocumentAiTidyResult>('/api/documents/ai-tidy')
}

export async function exportDocumentsZip(ids: string[]): Promise<Blob> {
  const res = await fetch('/api/documents/export-zip', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail =
      body && typeof body === 'object' && 'detail' in body
        ? String((body as { detail?: string }).detail)
        : 'Export failed'
    throw new Error(detail)
  }
  return res.blob()
}
