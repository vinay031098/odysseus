import { api } from './client'
import type { GpuQuery } from './cookbookServe'

export interface HwfitGpuGroup {
  count: number
  name: string
  vram_each: number
  vram_total: number
  indices?: number[]
}

export interface HwfitSystem {
  has_gpu?: boolean
  gpu_name?: string | null
  gpu_vram_gb?: number
  gpu_count?: number
  detected_gpu_count?: number
  available_ram_gb?: number
  total_ram_gb?: number
  cpu_cores?: number
  backend?: string
  platform?: string
  gpu_error?: string
  gpu_groups?: HwfitGpuGroup[]
  gpus?: Array<{ index: number; name: string; vram_gb: number }>
  active_group?: HwfitGpuGroup & { use_count?: number }
  manual_hardware?: boolean
  error?: string
}

export interface HwfitModel {
  name: string
  fit_level?: string
  score?: number
  required_gb?: number
  speed_tps?: number
  parameter_count?: string
  params_b?: number
  context?: number
  context_length?: number
  quant?: string
  quant_repo?: string | null
  run_mode?: string
  is_moe?: boolean
  is_image_gen?: boolean
  is_gguf?: boolean
  gguf_sources?: Array<{ repo?: string; file?: string }>
  capabilities?: string[]
  description?: string
}

export interface HwfitModelsResponse {
  system: HwfitSystem
  models: HwfitModel[]
  error?: string
}

export interface HwfitQuery extends GpuQuery {
  use_case?: string
  sort?: string
  limit?: number
  search?: string
  quant?: string
  ctx?: number
  gpu_count?: string
  gpu_group?: string
  platform?: string
  fresh?: boolean
  fit_only?: boolean
  ignore_detected_gpu?: boolean
  ignore_detected_ram?: boolean
  manual_mode?: string
  manual_gpu_count?: string
  manual_vram_gb?: string
  manual_ram_gb?: string
  manual_backend?: string
}

function queryString(query: HwfitQuery): string {
  const params = new URLSearchParams()
  if (query.host) params.set('host', query.host)
  if (query.ssh_port) params.set('ssh_port', query.ssh_port)
  if (query.platform) params.set('platform', query.platform)
  if (query.use_case) params.set('use_case', query.use_case)
  if (query.sort) params.set('sort', query.sort)
  if (query.limit != null) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.quant) params.set('quant', query.quant)
  if (query.ctx) params.set('ctx', String(query.ctx))
  if (query.gpu_count !== undefined && query.gpu_count !== '') {
    params.set('gpu_count', query.gpu_count)
  }
  if (query.gpu_group) params.set('gpu_group', query.gpu_group)
  if (query.fresh) params.set('fresh', '1')
  if (query.fit_only) params.set('fit_only', '1')
  if (query.ignore_detected_gpu) params.set('ignore_detected_gpu', 'true')
  if (query.ignore_detected_ram) params.set('ignore_detected_ram', 'true')
  if (query.manual_mode) params.set('manual_mode', query.manual_mode)
  if (query.manual_gpu_count) params.set('manual_gpu_count', query.manual_gpu_count)
  if (query.manual_vram_gb) params.set('manual_vram_gb', query.manual_vram_gb)
  if (query.manual_ram_gb) params.set('manual_ram_gb', query.manual_ram_gb)
  if (query.manual_backend) params.set('manual_backend', query.manual_backend)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function fetchHwfitModels(query: HwfitQuery = {}) {
  return api.get<HwfitModelsResponse>(`/api/hwfit/models${queryString(query)}`)
}

export function fetchHwfitSystem(query: GpuQuery & { fresh?: boolean; platform?: string } = {}) {
  const params = new URLSearchParams()
  if (query.host) params.set('host', query.host)
  if (query.ssh_port) params.set('ssh_port', query.ssh_port)
  if (query.platform) params.set('platform', query.platform)
  if (query.fresh) params.set('fresh', '1')
  const qs = params.toString()
  return api.get<HwfitSystem>(`/api/hwfit/system${qs ? `?${qs}` : ''}`)
}
