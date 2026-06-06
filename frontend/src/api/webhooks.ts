import { api } from './client'

export const WEBHOOK_EVENTS = [
  'session.created',
  'chat.completed',
  'chat.message',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export interface Webhook {
  id: string
  name: string
  url: string
  has_secret: boolean
  events: string[]
  is_active: boolean
  last_triggered_at: string | null
  last_status_code: number | null
  last_error: string | null
  created_at: string | null
}

export function fetchWebhooks() {
  return api.get<Webhook[]>('/api/webhooks')
}

export interface CreateWebhookInput {
  name: string
  url: string
  secret?: string
  events: string[]
}

export function createWebhook(input: CreateWebhookInput) {
  const form = new FormData()
  form.append('name', input.name)
  form.append('url', input.url)
  if (input.secret) form.append('secret', input.secret)
  form.append('events', input.events.join(','))
  return api.postForm<{ id: string; name: string }>('/api/webhooks', form)
}

export function testWebhook(id: string) {
  return api.post<{ status: string }>(`/api/webhooks/${id}/test`)
}

export function toggleWebhook(id: string) {
  return api.patch<{ id: string; is_active: boolean }>(`/api/webhooks/${id}`)
}

export function deleteWebhook(id: string) {
  return api.delete<{ status: string }>(`/api/webhooks/${id}`)
}
