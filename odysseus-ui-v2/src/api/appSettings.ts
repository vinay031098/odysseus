import { api } from './client'
import type { AuthSettings } from './types'

export type AppSettings = AuthSettings

export type FeatureFlags = Record<string, boolean>

export function fetchAppSettings() {
  return api.get<AppSettings>('/api/auth/settings')
}

export function saveAppSettings(body: Partial<AppSettings>) {
  return api.post<AppSettings>('/api/auth/settings', body)
}

export function fetchFeatures() {
  return api.get<FeatureFlags>('/api/auth/features')
}

export function saveFeatures(body: FeatureFlags) {
  return api.post<FeatureFlags>('/api/auth/features', body)
}
