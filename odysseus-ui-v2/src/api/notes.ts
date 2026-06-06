import { api } from './client'
import type {
  Note,
  NoteCreatePayload,
  NoteFireReminderPayload,
  NotesListResponse,
  NoteUpdatePayload,
} from './workspace-types'

export async function fetchNotes(archived = false): Promise<Note[]> {
  const qs = archived ? '?archived=true' : ''
  const data = await api.get<NotesListResponse>(`/api/notes${qs}`)
  return data.notes ?? []
}

export async function fetchNote(id: string): Promise<Note> {
  return api.get<Note>(`/api/notes/${encodeURIComponent(id)}`)
}

export async function createNote(payload: NoteCreatePayload): Promise<Note> {
  return api.post<Note>('/api/notes', {
    title: payload.title ?? '',
    content: payload.content ?? '',
    note_type: payload.note_type ?? 'note',
    label: payload.label,
    pinned: payload.pinned ?? false,
  })
}

export async function updateNote(id: string, payload: NoteUpdatePayload): Promise<Note> {
  return api.put<Note>(`/api/notes/${encodeURIComponent(id)}`, payload)
}

export async function deleteNote(id: string): Promise<void> {
  await api.delete(`/api/notes/${encodeURIComponent(id)}`)
}

export async function toggleNotePin(id: string): Promise<{ pinned: boolean }> {
  return api.post<{ pinned: boolean }>(`/api/notes/${encodeURIComponent(id)}/pin`)
}

export async function fireNoteReminder(payload: NoteFireReminderPayload): Promise<void> {
  await api.post('/api/notes/fire-reminder', payload)
}
