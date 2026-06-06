import type { HistoryResponse, SearchResult, UploadResponse } from './types'

export function fetchHistory(sessionId: string) {
  return fetch(`/api/history/${sessionId}`, { credentials: 'include' }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Failed to load history')
    }
    return res.json() as Promise<HistoryResponse>
  })
}

export function postChatStream(form: FormData, signal?: AbortSignal) {
  return fetch('/api/chat_stream', {
    method: 'POST',
    body: form,
    credentials: 'include',
    signal,
  })
}

export function getChatResume(sessionId: string, signal?: AbortSignal) {
  return fetch(`/api/chat/resume/${sessionId}`, {
    credentials: 'include',
    signal,
  })
}

export function getStreamStatus(sessionId: string) {
  return fetch(`/api/chat/stream_status/${sessionId}`, { credentials: 'include' }).then(
    async (res) => {
      if (!res.ok) return { status: 'idle' as const }
      return res.json() as Promise<{ status: string; detached?: boolean }>
    },
  )
}

export function stopChatStream(sessionId: string) {
  return fetch(`/api/chat/stop/${sessionId}`, {
    method: 'POST',
    credentials: 'include',
  })
}

export function updateLastMeta(sessionId: string, metadata: Record<string, unknown>) {
  return fetch(`/api/session/${sessionId}/update-last-meta`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata }),
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Failed to update metadata')
    }
    return res.json()
  })
}

export function fetchSttStats() {
  return fetch('/api/stt/stats', { credentials: 'include' }).then(async (res) => {
    if (!res.ok) return { provider: 'disabled' as const }
    return res.json() as Promise<{ provider?: string }>
  })
}

export async function transcribeAudio(blob: Blob) {
  const fd = new FormData()
  fd.append('file', blob, 'audio.webm')
  const res = await fetch('/api/stt/transcribe', {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      typeof body.detail === 'string' ? body.detail : 'Transcription failed',
    )
  }
  return res.json() as Promise<{ text?: string }>
}

export async function synthesizeSpeech(text: string) {
  const res = await fetch('/api/tts/synthesize', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 4000) }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(typeof body.detail === 'string' ? body.detail : 'TTS failed')
  }
  return res.blob()
}

export function fetchTtsStats() {
  return fetch('/api/tts/stats', { credentials: 'include' }).then(async (res) => {
    if (!res.ok) return { provider: 'disabled' as const, available: false }
    return res.json() as Promise<{
      provider?: string
      available?: boolean
      speed?: number
      voice?: string
    }>
  })
}

export function searchMessages(query: string, limit = 20) {
  const q = encodeURIComponent(query.trim())
  return fetch(`/api/search?q=${q}&limit=${limit}`, { credentials: 'include' }).then(
    async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.detail === 'string' ? body.detail : 'Search failed')
      }
      return res.json() as Promise<SearchResult[]>
    },
  )
}

export async function uploadFiles(files: File[]) {
  const fd = new FormData()
  for (const f of files) {
    fd.append('files', f, f.name || 'paste.png')
  }
  const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail =
      typeof body.detail === 'string'
        ? body.detail
        : `Upload failed (${res.status})`
    throw new Error(detail)
  }
  return res.json() as Promise<UploadResponse>
}

export function uploadUrl(fileId: string) {
  return `/api/upload/${fileId}`
}
