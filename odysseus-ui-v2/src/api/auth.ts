import { api } from './client'
import type { AuthStatus, LoginRequest, LoginResponse } from './types'

export function fetchAuthStatus() {
  return api.get<AuthStatus>('/api/auth/status', { skipAuthRedirect: true })
}

export function login(body: LoginRequest) {
  return api.post<LoginResponse>('/api/auth/login', body, { skipAuthRedirect: true })
}

export function logout() {
  return api.post<{ ok: boolean }>('/api/auth/logout')
}
