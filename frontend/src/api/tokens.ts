import { api } from './client'

export interface ApiToken {
  id: string
  name: string
  owner: string | null
  token_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string | null
}

export function fetchApiTokens() {
  return api.get<ApiToken[]>('/api/tokens')
}

export function fetchTokenProfiles() {
  return api.get<{
    profiles: Record<string, string[]>
    allowed_scopes: string[]
  }>('/api/tokens/profiles')
}

export function createApiToken(input: { name: string; scopes?: string; profile?: string }) {
  const form = new FormData()
  form.append('name', input.name)
  if (input.scopes) form.append('scopes', input.scopes)
  if (input.profile) form.append('profile', input.profile)
  return api.postForm<{
    id: string
    name: string
    token: string
    token_prefix: string
    scopes: string[]
  }>('/api/tokens', form)
}

export function updateApiToken(id: string, body: { name?: string; scopes: string[] }) {
  return api.patch<ApiToken>(`/api/tokens/${id}`, body)
}

export function deleteApiToken(id: string) {
  return api.delete<{ status: string }>(`/api/tokens/${id}`)
}
