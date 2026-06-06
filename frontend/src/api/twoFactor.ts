import { api } from './client'

export function fetchTwoFactorStatus() {
  return api.get<{ enabled: boolean }>('/api/auth/2fa/status')
}

export function setupTwoFactor() {
  return api.post<{
    secret: string
    uri: string
    qr_code: string
  }>('/api/auth/2fa/setup')
}

export function confirmTwoFactor(code: string) {
  return api.post<{ ok: boolean; backup_codes: string[] }>('/api/auth/2fa/confirm', {
    code,
  })
}

export function disableTwoFactor(password: string) {
  return api.post<{ ok: boolean }>('/api/auth/2fa/disable', { password })
}
