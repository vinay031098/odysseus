import { api } from './client'

export interface PersonalFile {
  name: string
  size?: number
  path?: string
}

export interface PersonalDocsList {
  files: PersonalFile[]
  directories: string[]
}

export function fetchPersonalDocs() {
  return api.get<PersonalDocsList>('/api/personal')
}

export function reloadPersonalIndex() {
  return api.post<{ ok: boolean; count: number }>('/api/personal/reload')
}

export function addPersonalDirectory(directory: string) {
  return api.post<{ success?: boolean; indexed_count?: number; detail?: string; message?: string }>(
    '/api/personal/add_directory',
    { directory },
  )
}

export function removePersonalDirectory(directory: string) {
  return api.delete<{ ok?: boolean; detail?: string }>(
    `/api/personal/remove_directory?directory=${encodeURIComponent(directory)}`,
  )
}

export function deletePersonalFile(filepath: string) {
  return api.delete<{ ok?: boolean; detail?: string }>(
    `/api/personal/file?filepath=${encodeURIComponent(filepath)}`,
  )
}

export async function uploadPersonalFiles(files: FileList | File[]) {
  const form = new FormData()
  for (const f of files) form.append('files', f)
  const res = await fetch('/api/personal/upload', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string }
    throw new Error(err.detail ?? `Upload failed (${res.status})`)
  }
  return res.json() as Promise<{
    success?: boolean
    uploaded?: string[]
    indexed_count?: number
    detail?: string
  }>
}
