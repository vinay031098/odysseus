import { api } from './client'

export function fetchHealth() {
  return api.get<{ status: string; timestamp: string }>('/api/health')
}

export function fetchReady() {
  return api.get<{
    ready: boolean
    checks?: Record<string, { ok: boolean; detail?: string }>
  }>('/api/ready')
}

export function fetchRuntime() {
  return api.get<{ in_docker: boolean; ollama_base_url: string }>('/api/runtime')
}

export function fetchVersion() {
  return api.get<{ version: string }>('/api/version')
}
