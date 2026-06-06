import { postChatStream } from '@/api/chat'
import { api } from '@/api/client'
import { consumeSseStream } from '@/lib/sseParser'
import type { GroupPreset, PendingChat } from '@/api/types'

export function fetchGroupPresets() {
  return api.get<{ groups: GroupPreset[] }>('/api/presets/groups')
}

export function createNamedSession(name: string, pending: PendingChat) {
  const fd = new FormData()
  fd.append('name', name)
  fd.append('endpoint_url', pending.url)
  fd.append('model', pending.modelId)
  fd.append('skip_validation', 'true')
  if (pending.endpointId) fd.append('endpoint_id', pending.endpointId)
  return api.postForm<{ id: string; name: string }>('/api/session', fd)
}

export function injectMessages(
  sessionId: string,
  messages: { role: string; content: string }[],
) {
  return api.post<{ ok: boolean; count: number }>(
    `/api/session/${sessionId}/inject_messages`,
    { messages },
  )
}

export async function streamSessionMessage(
  sessionId: string,
  message: string,
  signal?: AbortSignal,
): Promise<string> {
  const fd = new FormData()
  fd.append('message', message)
  fd.append('session', sessionId)
  fd.append('mode', 'chat')

  const response = await postChatStream(fd, signal)
  let accumulated = ''
  let errorMessage: string | null = null

  await consumeSseStream(
    response,
    (event) => {
      if (event.type === 'delta') accumulated += event.text
      if (event.type === 'error') errorMessage = event.message
    },
    signal,
  )

  if (errorMessage) throw new Error(errorMessage)
  return accumulated
}
