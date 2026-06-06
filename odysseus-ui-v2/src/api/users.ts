import { api } from './client'
import type { UserPrivileges } from './types'

export interface AuthUser {
  username: string
  is_admin: boolean
  privileges?: UserPrivileges
}

export function fetchUsers() {
  return api.get<{ users: AuthUser[] }>('/api/auth/users')
}

export function createUser(body: {
  username: string
  password: string
  is_admin?: boolean
}) {
  return api.post<{ ok: boolean }>('/api/auth/users', body)
}

export function deleteUser(username: string) {
  return api.delete<{ ok: boolean }>('/api/auth/users', { body: { username } })
}

export function updateUserPrivileges(username: string, privileges: UserPrivileges) {
  return api.put<{ ok: boolean; privileges: UserPrivileges }>(
    `/api/auth/users/${encodeURIComponent(username)}/privileges`,
    privileges,
  )
}

export function setSignupEnabled(enabled: boolean) {
  return api.put<{ ok: boolean; signup_enabled: boolean }>('/api/auth/open-signup', {
    enabled,
  })
}
