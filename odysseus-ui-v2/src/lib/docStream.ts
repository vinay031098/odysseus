import type { DocSuggestion } from '@/api/types'
import type { Document } from '@/api/documents'

export interface StreamingDocument {
  id: string
  title: string
  language: string
  content: string
  isStreaming: boolean
}

export function createStreamingDocId(): string {
  return `_streaming_${Date.now()}`
}

export function streamingDocToDocument(stream: StreamingDocument, sessionId: string | null): Document {
  return {
    id: stream.id,
    title: stream.title || 'Untitled',
    language: stream.language || 'markdown',
    current_content: stream.content,
    session_id: sessionId,
    version_count: 1,
    is_active: true,
    archived: false,
    created_at: null,
    updated_at: null,
  }
}

export function applyDocSuggestion(content: string, suggestion: DocSuggestion): string {
  if (!suggestion.find) return content
  if (content.includes(suggestion.find)) {
    return content.replace(suggestion.find, suggestion.replace ?? '')
  }
  return content
}
