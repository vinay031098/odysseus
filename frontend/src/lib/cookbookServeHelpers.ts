import type {
  CookbookGpu,
  CookbookServePreset,
  CookbookTask,
  CookbookTaskLiveStatus,
  GpuQuery,
} from '@/api/cookbookServe'

export const MAX_SERVE_PRESETS_PER_MODEL = 5

export function buildGpuQuery(host?: string, sshPort?: string): GpuQuery {
  const query: GpuQuery = {}
  if (host?.trim()) query.host = host.trim()
  if (sshPort?.trim()) query.ssh_port = sshPort.trim()
  return query
}

export function mbToGb(mb: number): number {
  return mb / 1024
}

export function vramUsedPercent(gpu: CookbookGpu): number {
  if (!gpu.total_mb) return 0
  return Math.round((gpu.used_mb / gpu.total_mb) * 100)
}

export type VramHealth = 'healthy' | 'tight' | 'critical'

export function vramHealth(gpu: CookbookGpu): VramHealth {
  const pct = vramUsedPercent(gpu)
  const spillG = mbToGb(gpu.gtt_used_mb ?? 0)
  const spilling = spillG > 0.5 && !gpu.unified_memory
  if (pct >= 97 || spilling) return 'critical'
  if (pct >= 85) return 'tight'
  return 'healthy'
}

export function formatVramReadout(gpu: CookbookGpu): string {
  const usedG = mbToGb(gpu.used_mb)
  const totG = mbToGb(gpu.total_mb)
  const pct = vramUsedPercent(gpu)
  const freeG = Math.max(0, totG - usedG)
  const spillG = mbToGb(gpu.gtt_used_mb ?? 0)
  const spilling = spillG > 0.5 && !gpu.unified_memory
  let txt = `${usedG.toFixed(1)} / ${totG.toFixed(1)} GB (${pct}%) · ${freeG.toFixed(1)} GB free`
  if (spilling) {
    txt += ` · ${spillG.toFixed(1)} GB spilled to RAM`
  } else if (pct >= 90) {
    txt += ' · tight'
  } else {
    txt += ' · healthy'
  }
  return txt
}

export function gpuIsBusy(gpu: CookbookGpu): boolean {
  const procCount = gpu.processes?.length ?? 0
  return procCount > 0 || gpu.busy
}

export function taskStatusLabel(status: string, type?: string): string {
  if (status === 'running' && type === 'download') return 'downloading'
  if (status === 'done' && type === 'download') return 'finished'
  if (status === 'error') return 'stopped'
  return status || ''
}

export function taskBadgeText(
  task: CookbookTask,
  live?: CookbookTaskLiveStatus,
): string {
  const type = task.type
  const status = live?.status ?? task.status
  if (task._unreachable && type === 'serve' && status === 'running') {
    return 'unreachable'
  }
  if (type === 'serve' && status === 'running' && (live?.phase || live?.progress)) {
    return live.phase || live.progress || 'running'
  }
  return taskStatusLabel(status, type)
}

export function tmuxGracefulKill(
  sessionId: string,
  remoteHost?: string,
  sshPort?: string,
): string {
  const pf = sshPort && sshPort !== '22' ? `-p ${sshPort} ` : ''
  if (remoteHost) {
    return `ssh ${pf}${remoteHost} 'tmux send-keys -t ${sessionId} C-c 2>/dev/null; sleep 2; tmux kill-session -t ${sessionId} 2>/dev/null'`
  }
  return `tmux send-keys -t ${sessionId} C-c 2>/dev/null; sleep 2; tmux kill-session -t ${sessionId} 2>/dev/null`
}

export function buildVllmServeCommand(repoId: string, port: number): string {
  return `vllm serve ${repoId} --port ${port}`
}

export function mergeTasksWithLiveStatus(
  saved: CookbookTask[],
  live: CookbookTaskLiveStatus[],
): Array<{ task: CookbookTask; live?: CookbookTaskLiveStatus }> {
  const liveById = new Map(live.map((t) => [t.session_id, t]))
  return saved.map((task) => ({
    task,
    live: liveById.get(task.sessionId),
  }))
}

export function serveTasksOnly(
  items: Array<{ task: CookbookTask; live?: CookbookTaskLiveStatus }>,
): Array<{ task: CookbookTask; live?: CookbookTaskLiveStatus }> {
  return items.filter(({ task, live }) => {
    const status = live?.status ?? task.status
    return task.type === 'serve' && !['done', 'stopped', 'crashed', 'failed'].includes(status)
  })
}

/** Match legacy `_presetsForModel` — presets for a repo id or short name. */
export function presetsForModel(
  presets: CookbookServePreset[],
  repo: string,
): CookbookServePreset[] {
  const short = repo.split('/').pop() || repo
  return presets.filter((p) => {
    const pm = p.model || ''
    const pn = p.name || ''
    return (
      pm === repo ||
      pn === repo ||
      pm.split('/').pop() === short ||
      pn === short
    )
  })
}

export function normalizeServeCmd(cmd: string): string {
  return String(cmd || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function presetHost(preset: CookbookServePreset): string {
  return (preset.remoteHost ?? preset.host ?? '').trim()
}

export function presetDisplayLabel(preset: CookbookServePreset, index?: number): string {
  if (preset.label?.trim()) return preset.label.trim()
  if (preset.name?.trim()) return preset.name.trim()
  return typeof index === 'number' ? `Config ${index + 1}` : 'Unnamed'
}

export function extractGpusFromPreset(preset: CookbookServePreset): string {
  const fromFields = preset.fields?.gpus
  if (typeof fromFields === 'string' && fromFields.trim()) return fromFields.trim()
  if (preset.gpus?.trim()) return preset.gpus.trim()
  const cmd = preset.cmd || ''
  const match = cmd.match(/CUDA_VISIBLE_DEVICES=(\S+)/)
  return match?.[1] ?? ''
}

export function parseGpuSelection(gpus: string): number | null {
  const trimmed = gpus.trim()
  if (!trimmed) return null
  const first = trimmed.split(',')[0]?.trim()
  const n = parseInt(first, 10)
  return Number.isFinite(n) ? n : null
}

export function buildServePresetDraft(args: {
  repo: string
  port: string
  host: string
  cmd: string
  gpus?: string | null
  label: string
}): CookbookServePreset {
  const repo = args.repo.trim()
  const shortName = repo.split('/').pop() || repo
  const port = args.port.trim() || '8000'
  const fields: Record<string, string | boolean> = {
    port,
    backend: 'vllm',
  }
  if (args.gpus?.trim()) fields.gpus = args.gpus.trim()
  return {
    name: shortName,
    model: repo,
    label: args.label.trim(),
    cmd: args.cmd.trim(),
    remoteHost: args.host.trim(),
    port,
    backend: 'vllm',
    fields,
  }
}
