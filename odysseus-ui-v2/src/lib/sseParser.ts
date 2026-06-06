import type { AskUserPayload, ChatStreamPayload, StreamEvent } from '@/api/types'
import { normalizeUiControlEvent } from '@/lib/chatUiControl'

const RICH_EVENT_TYPES = new Set([
  'tool_start',
  'tool_output',
  'tool_progress',
  'agent_step',
  'web_sources',
  'rag_sources',
  'doc_stream_open',
  'doc_stream_delta',
  'doc_update',
  'doc_suggestions',
  'ask_user',
])

export function parseSseDataLine(data: string): StreamEvent | null {
  if (data === '[DONE]') return { type: 'done' }

  try {
    const json = JSON.parse(data) as ChatStreamPayload
    if (json.status !== undefined && json.status >= 400) {
      return {
        type: 'error',
        message: json.text || json.error?.message || `Error ${json.status}`,
      }
    }
    if (json.delta) return { type: 'delta', text: json.delta }
    if (json.thinking) return { type: 'thinking', text: json.thinking }
    if (json.text && json.type === 'error') {
      return { type: 'error', message: json.text }
    }

    const eventType = json.type
    if (eventType === 'tool_start') {
      return { type: 'tool_start', name: json.name ?? 'tool', label: json.label }
    }
    if (eventType === 'tool_progress' && json.message) {
      return { type: 'tool_progress', message: json.message }
    }
    if (eventType === 'agent_step') {
      return { type: 'agent_step', label: json.label ?? json.message }
    }
    if (eventType === 'web_sources' && Array.isArray(json.data)) {
      return { type: 'web_sources', data: json.data }
    }
    if (eventType === 'research_sources' && Array.isArray(json.data)) {
      return { type: 'research_sources', data: json.data }
    }
    if (eventType === 'rag_sources' && Array.isArray(json.data)) {
      return { type: 'rag_sources', data: json.data }
    }
    if (eventType === 'research_progress') {
      return {
        type: 'research_progress',
        phase: json.phase,
        title: json.title,
        total_sources: json.total_sources,
      }
    }
    if (eventType === 'doc_stream_open') {
      return {
        type: 'doc_stream_open',
        title: json.title,
        language: json.language,
      }
    }
    if (eventType === 'doc_stream_delta') {
      return { type: 'doc_stream_delta', content: json.content }
    }
    if (eventType === 'doc_update' && json.doc_id) {
      return {
        type: 'doc_update',
        doc_id: json.doc_id,
        content: json.content,
        title: json.title,
        language: json.language,
        version: json.version,
      }
    }
    if (eventType === 'doc_suggestions' && Array.isArray(json.suggestions)) {
      return {
        type: 'doc_suggestions',
        doc_id: json.doc_id,
        suggestions: json.suggestions,
      }
    }
    if (eventType === 'ask_user') {
      const raw = json.data
      if (
        raw &&
        typeof raw === 'object' &&
        !Array.isArray(raw) &&
        'question' in raw &&
        'options' in raw &&
        typeof (raw as AskUserPayload).question === 'string' &&
        Array.isArray((raw as AskUserPayload).options)
      ) {
        return { type: 'ask_user', data: raw as AskUserPayload }
      }
    }
    if (eventType === 'ui_control' || json.ui_event) {
      return normalizeUiControlEvent(json)
    }
    if (eventType && RICH_EVENT_TYPES.has(eventType)) {
      return { type: 'rich' }
    }
  } catch {
    return null
  }

  return null
}

export function isRichStreamEvent(event: StreamEvent): boolean {
  if (event.type === 'rich') return true
  return (
    event.type === 'thinking' ||
    event.type === 'tool_start' ||
    event.type === 'tool_progress' ||
    event.type === 'agent_step' ||
    event.type === 'web_sources' ||
    event.type === 'research_sources' ||
    event.type === 'rag_sources' ||
    event.type === 'research_progress' ||
    event.type === 'doc_stream_open' ||
    event.type === 'doc_stream_delta' ||
    event.type === 'doc_update' ||
    event.type === 'doc_suggestions' ||
    event.type === 'ask_user'
  )
}

export async function consumeSseStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    onEvent({ type: 'error', message: text || `Stream failed (${response.status})` })
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onEvent({ type: 'error', message: 'No response stream' })
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        const event = parseSseDataLine(data)
        if (event) {
          onEvent(event)
          if (event.type === 'done' || event.type === 'error') return
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
