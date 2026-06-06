import { api } from './client'

export interface Integration {
  id: string
  name: string
  preset?: string
  base_url?: string
  auth_type?: string
  auth_header?: string
  has_api_key?: boolean
  description?: string
  [key: string]: unknown
}

export function fetchIntegrations() {
  return api.get<{ integrations: Integration[] }>('/api/auth/integrations')
}

export function fetchIntegrationPresets() {
  return api.get<{ presets: Record<string, Record<string, unknown>> }>(
    '/api/auth/integrations/presets',
  )
}

export function createIntegration(body: Record<string, unknown>) {
  return api.post<{ ok: boolean; integration: Integration }>(
    '/api/auth/integrations',
    body,
  )
}

export function updateIntegration(id: string, body: Record<string, unknown>) {
  return api.put<{ ok: boolean; integration: Integration }>(
    `/api/auth/integrations/${id}`,
    body,
  )
}

export function deleteIntegration(id: string) {
  return api.delete<{ ok: boolean }>(`/api/auth/integrations/${id}`)
}

export function testIntegration(id: string) {
  return api.post<{ ok: boolean; message?: string }>(
    `/api/auth/integrations/${id}/test`,
  )
}
