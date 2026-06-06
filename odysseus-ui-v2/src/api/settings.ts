import { api, consumeProbeStream } from './client'
import type {
  AuthSettings,
  ChangePasswordRequest,
  CreateModelEndpointResponse,
  ModelEndpoint,
  UserPrefs,
} from './types'

export function changePassword(body: ChangePasswordRequest) {
  return api.post<{ ok: boolean }>('/api/auth/change-password', body)
}

export function fetchModelEndpoints() {
  return api.get<ModelEndpoint[]>('/api/model-endpoints')
}

export interface CreateEndpointInput {
  name?: string
  base_url: string
  api_key?: string
  model_type?: string
  endpoint_kind?: string
  skip_probe?: boolean
}

export function createModelEndpoint(input: CreateEndpointInput) {
  const form = new FormData()
  form.append('base_url', input.base_url)
  if (input.name) form.append('name', input.name)
  if (input.api_key) form.append('api_key', input.api_key)
  form.append('model_type', input.model_type ?? 'llm')
  form.append('endpoint_kind', input.endpoint_kind ?? 'auto')
  if (input.skip_probe) form.append('skip_probe', 'true')
  return api.postForm<CreateModelEndpointResponse>('/api/model-endpoints', form)
}

export function updateModelEndpoint(
  epId: string,
  body: Partial<Pick<ModelEndpoint, 'name' | 'is_enabled' | 'model_type'>>,
) {
  return api.patch<ModelEndpoint>(`/api/model-endpoints/${epId}`, body)
}

export function deleteModelEndpoint(epId: string) {
  return api.delete<{ ok?: boolean }>(`/api/model-endpoints/${epId}`)
}

export function probeModelEndpoint(epId: string) {
  return consumeProbeStream(`/api/model-endpoints/${epId}/probe`)
}

export function fetchAuthSettings() {
  return api.get<AuthSettings>('/api/auth/settings')
}

export function saveAuthSettings(body: Partial<AuthSettings>) {
  return api.post<AuthSettings>('/api/auth/settings', body)
}

export function fetchUserPrefs() {
  return api.get<UserPrefs>('/api/prefs')
}

export function setUserPref(key: string, value: unknown) {
  return api.put<{ key: string; value: unknown }>(`/api/prefs/${key}`, { value })
}
