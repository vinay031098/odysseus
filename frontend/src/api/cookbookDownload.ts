import { api } from './client'

export interface ModelDownloadRequest {
  repo_id: string
  include?: string | null
  hf_token?: string | null
  env_prefix?: string | null
  remote_host?: string | null
  ssh_port?: string | null
  platform?: string | null
  local_dir?: string | null
  disable_hf_transfer?: boolean
}

export interface HfLatestModel {
  repo_id: string
  downloads?: number
  likes?: number
  pipeline_tag?: string
  tags?: string[]
  est_vram_gb?: number
  short_name?: string
}

export interface HfLatestResponse {
  models: HfLatestModel[]
  error?: string
}

export interface ModelDownloadResponse {
  ok: boolean
  session_id?: string
  error?: string
}

export function downloadModel(body: ModelDownloadRequest) {
  return api.post<ModelDownloadResponse>('/api/model/download', body)
}

export function fetchHfLatest(vramGb = 0, limit = 10) {
  const params = new URLSearchParams()
  if (vramGb > 0) params.set('vram_gb', String(vramGb))
  params.set('limit', String(limit))
  return api.get<HfLatestResponse>(`/api/cookbook/hf-latest?${params}`)
}

export function fetchCookbookSshKey() {
  return api.get<{ ok?: boolean; public_key?: string; error?: string }>(
    '/api/cookbook/ssh-key',
  )
}

export function generateCookbookSshKey() {
  return api.post<{ ok?: boolean; public_key?: string; error?: string }>(
    '/api/cookbook/ssh-key',
  )
}
