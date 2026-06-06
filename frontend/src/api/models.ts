import { api } from './client'
import type { DefaultChat, ModelEndpointItem, ModelOption, ModelsResponse } from './types'

export function fetchModels(refresh = false) {
  const q = refresh ? '?refresh=true' : ''
  return api.get<ModelsResponse>(`/api/models${q}`)
}

export function fetchDefaultChat() {
  return api.get<DefaultChat>('/api/default-chat')
}

export function flattenModelOptions(items: ModelEndpointItem[]): ModelOption[] {
  const out: ModelOption[] = []
  for (const item of items) {
    item.models.forEach((id, i) => {
      out.push({
        id,
        label: item.models_display?.[i] ?? id.split('/').pop() ?? id,
        url: item.url,
        endpointId: item.endpoint_id,
        endpointName: item.endpoint_name,
        offline: item.offline,
      })
    })
  }
  return out
}
