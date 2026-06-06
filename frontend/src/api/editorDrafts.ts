import { api } from './client'

export type EditorDraftSummary = {
  id: string
  name: string
  source_image_id: string | null
  width: number | null
  height: number | null
  thumbnail: string | null
  created_at: string | null
  updated_at: string | null
}

export type EditorDraftPayload = {
  imageDataUrl?: string
  maskDataUrl?: string
  [key: string]: unknown
}

export type EditorDraftDetail = EditorDraftSummary & {
  payload: EditorDraftPayload
}

export async function fetchEditorDrafts(): Promise<EditorDraftSummary[]> {
  const data = await api.get<{ drafts: EditorDraftSummary[] }>('/api/editor-drafts')
  return data.drafts ?? []
}

export async function fetchEditorDraft(id: string): Promise<EditorDraftDetail> {
  return api.get<EditorDraftDetail>(`/api/editor-drafts/${encodeURIComponent(id)}`)
}

export async function createEditorDraft(body: {
  name?: string
  source_image_id?: string | null
  width?: number
  height?: number
  payload: EditorDraftPayload
  thumbnail?: string
}): Promise<EditorDraftSummary> {
  return api.post('/api/editor-drafts', body)
}

export async function updateEditorDraft(
  id: string,
  body: {
    name?: string
    width?: number
    height?: number
    payload?: EditorDraftPayload
    thumbnail?: string
  },
): Promise<EditorDraftSummary> {
  return api.put(`/api/editor-drafts/${encodeURIComponent(id)}`, body)
}

export async function deleteEditorDraft(id: string): Promise<void> {
  await api.delete(`/api/editor-drafts/${encodeURIComponent(id)}`)
}
