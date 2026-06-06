import { api } from './client'
import type { PromptPreset } from './types'

export function fetchPresetsMap() {
  return api.get<Record<string, PromptPreset>>('/api/presets')
}

export function saveCustomPreset(payload: {
  name: string
  enabled: boolean
  temperature: number
  max_tokens: number
  system_prompt: string
  inject_prefix?: string
  inject_suffix?: string
}) {
  return api.post<{ success: boolean; message?: string }>('/api/presets/custom', payload)
}
