import { api } from '@/api/client'

export interface Contact {
  uid: string
  name: string
  emails: string[]
  phones: string[]
}

export function listContacts() {
  return api.get<{ contacts: Contact[]; count: number }>('/api/contacts/list')
}

export function searchContacts(q: string) {
  const params = new URLSearchParams({ q })
  return api.get<{ results: Contact[] }>(`/api/contacts/search?${params}`)
}

export function addContact(body: { name?: string; email: string }) {
  return api.post<{ success: boolean; message?: string; error?: string }>('/api/contacts/add', body)
}

export function updateContact(
  uid: string,
  body: { name?: string; email?: string; emails?: string[]; phones?: string[] },
) {
  return api.put<{ success: boolean; error?: string }>(`/api/contacts/${encodeURIComponent(uid)}`, body)
}

export function deleteContact(uid: string) {
  return api.delete<{ success: boolean }>(`/api/contacts/${encodeURIComponent(uid)}`)
}
