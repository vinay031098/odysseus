import { api } from './client'
import type { EmailAccount } from './email-types'

export type EmailAccountInput = {
  name: string
  is_default?: boolean
  enabled?: boolean
  imap_host: string
  imap_port?: number
  imap_user: string
  imap_password?: string
  imap_starttls?: boolean
  smtp_host: string
  smtp_port?: number
  smtp_security?: string
  smtp_user: string
  smtp_password?: string
  from_address: string
}

export function createEmailAccount(data: EmailAccountInput) {
  return api.post<{ ok: boolean; id?: string; error?: string }>(
    '/api/email/accounts',
    data,
  )
}

export function updateEmailAccount(id: string, data: Partial<EmailAccountInput>) {
  return api.put<{ ok: boolean; id?: string; error?: string }>(
    `/api/email/accounts/${id}`,
    data,
  )
}

export function deleteEmailAccount(id: string) {
  return api.delete<{ ok: boolean; error?: string }>(`/api/email/accounts/${id}`)
}

export function setDefaultEmailAccount(id: string) {
  return api.post<{ ok: boolean }>(`/api/email/accounts/${id}/set-default`)
}

export function testEmailAccount(body: Record<string, unknown>) {
  return api.post<{
    ok: boolean
    imap?: { ok: boolean; error?: string }
    smtp?: { ok: boolean; error?: string }
  }>('/api/email/accounts/test', body)
}

export type { EmailAccount }
