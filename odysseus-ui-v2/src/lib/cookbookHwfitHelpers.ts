import type { HwfitModel } from '@/api/cookbookHwfit'

export const FIT_COLORS: Record<string, string> = {
  perfect: 'text-emerald-600 dark:text-emerald-400',
  good: 'text-amber-600 dark:text-amber-400',
  marginal: 'text-orange-600 dark:text-orange-400',
  too_tight: 'text-destructive',
  no_fit: 'text-muted-foreground',
}

export const CTX_PRESETS = [8192, 16384, 32768, 50000, 131072, 0] as const

export function ctxLabel(value: number): string {
  if (!value) return 'Max'
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
}

export function ctxValueFromSliderIndex(index: number): number {
  const idx = Math.max(0, Math.min(CTX_PRESETS.length - 1, index))
  return CTX_PRESETS[idx] ?? 0
}

export function formatFitLabel(level?: string): string {
  return (level || 'unknown').replace('_', ' ')
}

export function formatParams(model: HwfitModel): string {
  return model.parameter_count || '?'
}

export function formatVram(model: HwfitModel): string {
  return model.required_gb ? `${model.required_gb.toFixed(1)}G` : '?'
}

export function formatContext(model: HwfitModel): string {
  if (model.is_image_gen) return '—'
  if (!model.context) return '?'
  return model.context >= 1024 ? `${Math.round(model.context / 1024)}k` : String(model.context)
}

export function formatSpeed(model: HwfitModel): string {
  if (model.is_image_gen) return '—'
  const raw = model.speed_tps ?? 0
  if (raw <= 0) return '?'
  const capped = raw > 9999 ? 9999 : raw
  const text = capped >= 100 ? String(Math.round(capped)) : capped.toFixed(1)
  return `${text} t/s`
}

export function validTpCounts(poolSize: number): number[] {
  const out = [1, 2, 4, 8, 16].filter((n) => n <= poolSize)
  if (poolSize > 0 && !out.includes(poolSize)) out.push(poolSize)
  return out
}

export function shortGpuName(name: string): string {
  return (
    String(name || 'GPU')
      .replace(/^NVIDIA\s+GeForce\s+/i, '')
      .replace(/^NVIDIA\s+/i, '')
      .replace(/^AMD\s+(Radeon\s+)?/i, '')
      .trim() || 'GPU'
  )
}

export function sortHwfitModels(
  models: HwfitModel[],
  sortKey: string,
  ascending: boolean,
): HwfitModel[] {
  const next = [...models]
  if (sortKey === 'fit') {
    const fitRank: Record<string, number> = {
      perfect: 4,
      good: 3,
      marginal: 2,
      too_tight: 1,
      no_fit: 0,
    }
    next.sort((a, b) => {
      const ar = fitRank[a.fit_level ?? ''] ?? -1
      const br = fitRank[b.fit_level ?? ''] ?? -1
      if (ar !== br) return ascending ? ar - br : br - ar
      const as = Number(a.score) || 0
      const bs = Number(b.score) || 0
      return ascending ? as - bs : bs - as
    })
    return next
  }

  const fieldMap: Record<string, keyof HwfitModel> = {
    score: 'score',
    vram: 'required_gb',
    speed: 'speed_tps',
    params: 'params_b',
    context: 'context',
  }
  const field = fieldMap[sortKey] ?? 'score'
  next.sort((a, b) => {
    const av = Number(a[field]) || 0
    const bv = Number(b[field]) || 0
    return ascending ? av - bv : bv - av
  })
  return next
}

export type ServeBackend = 'vllm' | 'sglang' | 'llamacpp' | 'ollama' | 'diffusers' | 'unsupported'

export function detectHwfitBackend(
  model: HwfitModel,
  sysBackend = '',
  platform = 'linux',
): { backend: ServeBackend; label: string } {
  const q = (model.quant || '').toUpperCase()
  const sys = sysBackend.toLowerCase()
  const nm = `${model.quant_repo || ''} ${model.name || ''}`.toLowerCase()
  if (/\bmlx\b|mlx-|_mlx/i.test(nm) || q.startsWith('MLX')) {
    return { backend: 'unsupported', label: 'Unsupported' }
  }
  const isAwqLike =
    /^AWQ|^GPTQ|^NVFP4/.test(q) ||
    ['FP8', 'FP4', 'MXFP4', 'NF4', 'INT4', 'INT8', 'W4A16', 'W8A8', 'W8A16'].includes(q) ||
    /\b(awq|gptq|fp8|fp4|nvfp4|mxfp4|nf4|int4|int8|w4a16|w8a8|w8a16)\b/i.test(nm)
  const isGgufLike =
    model.is_gguf || /^Q[2-8]/.test(q) || /^IQ/.test(q) || q === 'GGUF' || nm.includes('gguf')

  if (model.is_image_gen) return { backend: 'diffusers', label: 'Diffusers' }
  if (isAwqLike) return { backend: 'vllm', label: 'vLLM' }
  if (isGgufLike) return { backend: 'llamacpp', label: 'llama.cpp' }
  if (platform === 'windows') return { backend: 'llamacpp', label: 'llama.cpp' }
  if (['metal', 'mps', 'apple'].includes(sys)) return { backend: 'llamacpp', label: 'llama.cpp' }
  if (sys === 'rocm') return { backend: 'sglang', label: 'SGLang' }
  return { backend: 'vllm', label: 'vLLM' }
}

export function filterModelsByEngine(
  models: HwfitModel[],
  engine: string,
  sysBackend = '',
  platform = 'linux',
): HwfitModel[] {
  if (!engine) return models
  return models.filter((m) => detectHwfitBackend(m, sysBackend, platform).backend === engine)
}

export function detectToolParser(modelName: string): string {
  const n = modelName.toLowerCase()
  if (n.includes('qwen')) return 'hermes'
  if (n.includes('mistral') || n.includes('mixtral')) return 'mistral'
  if (n.includes('llama')) return 'llama3_json'
  return 'hermes'
}

export interface QuickRunParams {
  model: HwfitModel
  system?: {
    gpu_count?: number
    gpu_vram_gb?: number
    active_group?: { use_count?: number; vram_each?: number; indices?: number[] }
    backend?: string
  }
  port?: number
}

export function buildQuickRunCommand(params: QuickRunParams): { cmd: string; backend: ServeBackend } {
  const { model, system } = params
  const platform = 'linux'
  const { backend } = detectHwfitBackend(model, system?.backend || '', platform)
  const grp = system?.active_group
  const poolCount = grp?.use_count || system?.gpu_count || 1
  const gpuMem = grp?.vram_each || (system?.gpu_vram_gb || 20) / (system?.gpu_count || 1)
  const modelVram = model.required_gb || 10
  const tpOpts = [1, 2, 4, 8, 16].filter((n) => n <= poolCount)
  if (poolCount > 0 && !tpOpts.includes(poolCount)) tpOpts.push(poolCount)
  let tp = tpOpts[tpOpts.length - 1] || 1
  for (const n of tpOpts) {
    if (n * gpuMem >= modelVram) {
      tp = n
      break
    }
  }
  const headroom = tp * gpuMem - modelVram
  let maxCtx = model.context_length || model.context || 8192
  if (headroom < 4) maxCtx = Math.min(maxCtx, 4096)
  else if (headroom < 8) maxCtx = Math.min(maxCtx, 8192)
  else if (headroom < 16) maxCtx = Math.min(maxCtx, 16384)
  const gpuUtil = modelVram / (tp * gpuMem) > 0.8 ? '0.95' : '0.90'
  const parser = detectToolParser(model.name)
  const port = params.port ?? 8000
  const repo = model.quant_repo || model.name

  if (backend === 'sglang') {
    let cmd = `python3 -m sglang.launch_server --model-path ${repo} --host 0.0.0.0 --port ${port}`
    if (tp > 1) cmd += ` --tp ${tp}`
    cmd += ` --context-length ${maxCtx} --mem-fraction-static ${gpuUtil} --trust-remote-code`
    return { cmd, backend }
  }
  if (backend === 'llamacpp') {
    const dir = `"$HOME/.cache/huggingface/hub/models--${repo.replace(/\//g, '--')}/snapshots"`
    const ggufPath = `$({ find ${dir} -name '*-00001-of-*.gguf' 2>/dev/null | sort; find ${dir} -name '*.gguf' 2>/dev/null | sort; } | head -1)`
    const cmd = `MODEL_FILE=${ggufPath} && { [ -n "$MODEL_FILE" ] && [ -f "$MODEL_FILE" ]; } || { echo "ERROR: No GGUF found on this host. Download a GGUF quant or switch backend."; exit 1; } && llama-server --model "$MODEL_FILE" --host 0.0.0.0 --port 8080 -ngl 99 -c ${maxCtx} || python3 -m llama_cpp.server --model "$MODEL_FILE" --host 0.0.0.0 --port 8080 --n_gpu_layers 99 --n_ctx ${maxCtx}`
    return { cmd, backend }
  }
  let cmd = `vllm serve ${repo} --host 0.0.0.0 --port ${port}`
  cmd += ` --tensor-parallel-size ${tp} --max-model-len ${maxCtx} --gpu-memory-utilization ${gpuUtil}`
  cmd += ' --dtype auto --enforce-eager --trust-remote-code'
  cmd += ` --enable-auto-tool-choice --tool-call-parser ${parser}`
  return { cmd, backend }
}
