import { Fragment, useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, ChevronUp, Loader2, Play, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { HwfitModel } from '@/api/cookbookHwfit'
import type { CookbookEnvState, CookbookState } from '@/api/cookbookServe'
import { useCookbookDownloadMutations } from '@/hooks/useCookbookDownload'
import { useCookbookServeMutations } from '@/hooks/useCookbookServe'
import { useHwfitCachedModels, useHwfitModels } from '@/hooks/useCookbookHwfit'
import { CookbookSchedulePanel } from '@/features/cookbook/CookbookSchedulePanel'
import { defaultCookbookServers } from '@/hooks/useCookbookEnv'
import { buildEnvPrefix, parseDownloadInput } from '@/lib/cookbookDownloadHelpers'
import type { ModelDownloadRequest } from '@/api/cookbookDownload'
import {
  loadManualHardware,
  manualHardwareLabel,
  manualHardwareParams,
  saveManualHardware,
  type ManualHardwareState,
} from '@/lib/cookbookHwfitManual'
import {
  buildQuickRunCommand,
  CTX_PRESETS,
  detectHwfitBackend,
  filterModelsByEngine,
  FIT_COLORS,
  ctxLabel,
  ctxValueFromSliderIndex,
  formatContext,
  formatFitLabel,
  formatParams,
  formatSpeed,
  formatVram,
  shortGpuName,
  sortHwfitModels,
  validTpCounts,
} from '@/lib/cookbookHwfitHelpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CookbookHwfitTabProps {
  state: CookbookState
  env: CookbookEnvState
  isAdmin: boolean
  onOpenRunning?: () => void
}

const USE_CASES = [
  { value: '', label: 'All use cases' },
  { value: 'chat', label: 'Chat' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'code', label: 'Code' },
  { value: 'image_gen', label: 'Image generation' },
]

const QUANTS = ['', 'Q4_K_M', 'Q8_0', 'AWQ-4bit', 'BF16']

const ENGINES = [
  { value: '', label: 'All engines' },
  { value: 'vllm', label: 'vLLM' },
  { value: 'sglang', label: 'SGLang' },
  { value: 'llamacpp', label: 'llama.cpp' },
  { value: 'diffusers', label: 'Diffusers' },
]

export function CookbookHwfitTab({ state, env, isAdmin, onOpenRunning }: CookbookHwfitTabProps) {
  const servers = useMemo(() => defaultCookbookServers(env.servers), [env.servers])
  const [hostKey, setHostKey] = useState(env.remoteHost || 'local')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [useCase, setUseCase] = useState('')
  const [quant, setQuant] = useState('')
  const [sort, setSort] = useState('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [ctxIndex, setCtxIndex] = useState(3)
  const [gpuCount, setGpuCount] = useState<number | null>(null)
  const [gpuGroup, setGpuGroup] = useState(0)
  const [fitOnly, setFitOnly] = useState(false)
  const [fresh, setFresh] = useState(false)
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const [engine, setEngine] = useState('')
  const [manualHw, setManualHw] = useState<ManualHardwareState | null>(() => loadManualHardware())
  const [manualOpen, setManualOpen] = useState(false)
  const [scheduleModel, setScheduleModel] = useState<HwfitModel | null>(null)
  const { startServe } = useCookbookServeMutations()

  const activeServer = useMemo(() => {
    if (hostKey === 'local') return servers.find((s) => !s.host) ?? servers[0]
    return servers.find((s) => s.host === hostKey) ?? servers[0]
  }, [servers, hostKey])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const ctxValue = ctxValueFromSliderIndex(ctxIndex)
  const remoteHost = activeServer.host?.trim() ?? ''

  const manualParams = useMemo(() => manualHardwareParams(manualHw), [manualHw])

  const hwfitQuery = useHwfitModels(
    {
      host: remoteHost || undefined,
      ssh_port: activeServer.port,
      platform: activeServer.platform,
      search: debouncedSearch || undefined,
      use_case: useCase || undefined,
      quant: quant || undefined,
      ctx: ctxValue || undefined,
      sort,
      limit: 80,
      gpu_count: gpuCount != null ? String(gpuCount) : undefined,
      gpu_group: gpuGroup ? String(gpuGroup) : undefined,
      fit_only: fitOnly,
      fresh: fresh || !!manualHw,
      ...manualParams,
    },
    isAdmin,
  )

  const cachedQuery = useHwfitCachedModels(remoteHost, activeServer.port, isAdmin)
  const { startDownload } = useCookbookDownloadMutations()

  const cachedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const m of cachedQuery.data?.models ?? []) {
      if (m.status !== 'stalled') ids.add(m.repo_id)
    }
    return ids
  }, [cachedQuery.data?.models])

  const system = hwfitQuery.data?.system
  const models = useMemo(() => {
    const raw = hwfitQuery.data?.models ?? []
    const filtered = filterModelsByEngine(
      raw,
      engine,
      hwfitQuery.data?.system?.backend || '',
      activeServer.platform || 'linux',
    )
    return sortHwfitModels(filtered, sort, sortAsc)
  }, [hwfitQuery.data?.models, hwfitQuery.data?.system?.backend, engine, activeServer.platform, sort, sortAsc])

  const gpuGroups = system?.gpu_groups ?? []
  const activeGroup = gpuGroups[gpuGroup] ?? gpuGroups[0]
  const tpOptions = validTpCounts(activeGroup?.count ?? system?.gpu_count ?? 1)

  useEffect(() => {
    if (fresh && !hwfitQuery.isFetching) setFresh(false)
  }, [fresh, hwfitQuery.isFetching])

  if (!isAdmin) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Hardware fit scoring requires an admin account.
      </p>
    )
  }

  function buildPayload(model: HwfitModel): ModelDownloadRequest {
    const repo = model.quant_repo || model.name
    const envType = remoteHost ? activeServer.env || 'none' : env.env || 'none'
    const envPath = remoteHost ? activeServer.envPath || '' : env.envPath || ''
    const platform = activeServer.platform || env.platform
    return {
      repo_id: repo,
      hf_token: env.hfToken || undefined,
      remote_host: remoteHost || undefined,
      ssh_port: activeServer.port || undefined,
      platform,
      local_dir: activeServer.downloadDir || undefined,
      env_prefix: buildEnvPrefix(envType, envPath, platform),
      disable_hf_transfer: true,
    }
  }

  function applyManualHw(next: ManualHardwareState | null) {
    setManualHw(next)
    saveManualHardware(next)
    setFresh(true)
  }

  async function quickRun(model: HwfitModel) {
    const repo = model.quant_repo || model.name
    const shortName = repo.split('/').pop() || repo
    const downloaded = isDownloaded(model.name)
    if (!downloaded) {
      toast.message('Model not downloaded — starting download first')
      await downloadModel(model)
      return
    }
    const { cmd } = buildQuickRunCommand({
      model,
      system: hwfitQuery.data?.system,
    })
    const envType = remoteHost ? activeServer.env || 'none' : env.env || 'none'
    const envPath = remoteHost ? activeServer.envPath || '' : env.envPath || ''
    try {
      await startServe.mutateAsync({
        shortName,
        body: {
          repo_id: repo,
          cmd,
          remote_host: remoteHost || undefined,
          ssh_port: activeServer.port || undefined,
          env_prefix: buildEnvPrefix(envType, envPath, activeServer.platform || env.platform),
          gpus: env.gpus || undefined,
          platform: activeServer.platform,
        },
        state,
      })
      toast.success(`Quick run: ${shortName}`)
      onOpenRunning?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Quick run failed')
    }
  }

  async function downloadModel(model: HwfitModel) {
    const repo = model.quant_repo || model.name
    const parsed = parseDownloadInput(repo)
    if (parsed.error) {
      toast.error(parsed.error)
      return
    }
    const shortName = parsed.repo.split('/').pop() || parsed.repo
    try {
      const result = await startDownload.mutateAsync({
        payload: buildPayload(model),
        shortName,
        state,
      })
      if (result.queued) toast.message(`Queued ${shortName}`)
      else {
        toast.success(`Downloading ${shortName}…`)
        onOpenRunning?.()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    }
  }

  function toggleSort(column: string) {
    if (sort === column) setSortAsc((v) => !v)
    else {
      setSort(column)
      setSortAsc(false)
    }
  }

  function isDownloaded(name: string): boolean {
    if (cachedIds.has(name)) return true
    const short = name.split('/').pop()
    return [...cachedIds].some((id) => id.endsWith(`/${short}`) || id === short)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-background p-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">What fits?</h2>
            <p className="text-sm text-muted-foreground">
              Rank models against detected GPU/RAM on the selected server.
            </p>
          </div>
          <div className="flex gap-2">
            {servers.length > 1 && (
              <select
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={hostKey === '' ? 'local' : hostKey}
                onChange={(e) => setHostKey(e.target.value)}
              >
                <option value="local">Local</option>
                {servers
                  .filter((s) => s.host)
                  .map((s) => (
                    <option key={s.host} value={s.host}>
                      {s.name || s.host}
                    </option>
                  ))}
              </select>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFresh(true)
                void hwfitQuery.refetch()
              }}
              disabled={hwfitQuery.isFetching}
            >
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', hwfitQuery.isFetching && 'animate-spin')} />
              Rescan
            </Button>
          </div>
        </div>

        {manualHw && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-xs">
              {manualHardwareLabel(manualHw)}
            </span>
            <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => applyManualHw(null)}>
              Clear manual
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setManualOpen((v) => !v)}>
            Manual hardware simulator
          </Button>
          <select
            className="h-7 rounded-md border border-input bg-transparent px-2 text-xs"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            title="Filter by serving engine"
          >
            {ENGINES.map((e) => (
              <option key={e.value || 'all'} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        {manualOpen && (
          <div className="rounded-md border border-dashed border-border p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="space-y-1">
              <Label>Mode</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={manualHw?.mode ?? 'gpu'}
                onChange={(e) =>
                  setManualHw((prev) => ({
                    mode: e.target.value as 'gpu' | 'ram',
                    gpuCount: prev?.gpuCount ?? 1,
                    vramGb: prev?.vramGb ?? 24,
                    ramGb: prev?.ramGb ?? 64,
                    backend: prev?.backend ?? 'cuda',
                  }))
                }
              >
                <option value="gpu">GPU</option>
                <option value="ram">RAM only</option>
              </select>
            </div>
            {manualHw?.mode !== 'ram' && (
              <>
                <div className="space-y-1">
                  <Label>GPU count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={manualHw?.gpuCount ?? 1}
                    onChange={(e) =>
                      setManualHw((prev) => ({
                        ...(prev || { mode: 'gpu', vramGb: 24, ramGb: 64, backend: 'cuda' }),
                        gpuCount: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>VRAM each (GB)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={manualHw?.vramGb ?? 24}
                    onChange={(e) =>
                      setManualHw((prev) => ({
                        ...(prev || { mode: 'gpu', gpuCount: 1, ramGb: 64, backend: 'cuda' }),
                        vramGb: Number(e.target.value) || 8,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Backend</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={manualHw?.backend ?? 'cuda'}
                    onChange={(e) =>
                      setManualHw((prev) => ({
                        ...(prev || { mode: 'gpu', gpuCount: 1, vramGb: 24, ramGb: 64 }),
                        backend: e.target.value,
                      }))
                    }
                  >
                    <option value="cuda">cuda</option>
                    <option value="rocm">rocm</option>
                    <option value="metal">metal</option>
                  </select>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Total RAM (GB)</Label>
              <Input
                type="number"
                min={1}
                value={manualHw?.ramGb ?? 64}
                onChange={(e) =>
                  setManualHw((prev) => ({
                    ...(prev || { mode: 'gpu', gpuCount: 1, vramGb: 24, backend: 'cuda' }),
                    ramGb: Number(e.target.value) || 32,
                  }))
                }
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button
                type="button"
                size="sm"
                onClick={() => manualHw && applyManualHw(manualHw)}
                disabled={!manualHw}
              >
                Apply simulator
              </Button>
            </div>
          </div>
        )}

        {system && (
          <div className="flex flex-wrap gap-2 text-xs">
            {system.gpu_name ? (
              <span className="rounded-full border border-border px-2 py-0.5">
                {system.gpu_count && system.gpu_count > 1
                  ? `${system.gpu_count}× ${system.gpu_name}`
                  : system.gpu_name}
              </span>
            ) : system.gpu_error ? (
              <span className="rounded-full border border-destructive/40 px-2 py-0.5 text-destructive">
                GPU driver error
              </span>
            ) : (
              <span className="rounded-full border border-border px-2 py-0.5">No GPU</span>
            )}
            {system.gpu_vram_gb ? (
              <span className="rounded-full border border-border px-2 py-0.5">
                {system.gpu_vram_gb.toFixed(1)} GB VRAM
              </span>
            ) : null}
            <span className="rounded-full border border-border px-2 py-0.5">
              {system.available_ram_gb?.toFixed(1) ?? '?'} / {system.total_ram_gb?.toFixed(1) ?? '?'} GB RAM
            </span>
            {system.backend && (
              <span className="rounded-full border border-border px-2 py-0.5">{system.backend}</span>
            )}
          </div>
        )}

        {gpuGroups.length > 1 && (
          <div className="space-y-1 max-w-md">
            <Label>GPU pool</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={gpuGroup}
              onChange={(e) => {
                setGpuGroup(Number(e.target.value))
                setGpuCount(null)
              }}
            >
              {gpuGroups.map((g, i) => (
                <option key={i} value={i}>
                  {g.count}× {shortGpuName(g.name)} ({Math.round(g.vram_total)} GB)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={gpuCount === 0 ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setGpuCount(gpuCount === 0 ? null : 0)}
          >
            RAM
          </Button>
          {tpOptions.map((n) => (
            <Button
              key={n}
              type="button"
              size="sm"
              variant={gpuCount === n ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setGpuCount(gpuCount === n ? null : n)}
            >
              {n === 1 ? 'GPU' : `${n} GPU`}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
          >
            {USE_CASES.map((u) => (
              <option key={u.value || 'all'} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={quant}
            onChange={(e) => setQuant(e.target.value)}
          >
            <option value="">All quants</option>
            {QUANTS.filter(Boolean).map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Context</span>
              <span>{ctxLabel(ctxValue)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={CTX_PRESETS.length - 1}
              step={1}
              value={ctxIndex}
              onChange={(e) => setCtxIndex(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fitOnly}
            onChange={(e) => setFitOnly(e.target.checked)}
          />
          Show only models that fit
        </label>
      </section>

      <section className="rounded-lg border border-border bg-background overflow-hidden">
        {hwfitQuery.isLoading && (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning hardware…
          </div>
        )}
        {hwfitQuery.data?.error && (
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-destructive">Couldn&apos;t scan hardware</p>
            <p className="mt-1 text-xs text-muted-foreground">{hwfitQuery.data.error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => void hwfitQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        )}
        {!hwfitQuery.isLoading && !hwfitQuery.data?.error && models.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No models match these filters.</p>
        )}
        {models.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  {[
                    { key: 'fit', label: 'Fit' },
                    { key: null, label: 'Model' },
                    { key: 'params', label: 'Param' },
                    { key: null, label: 'Quant' },
                    { key: 'vram', label: 'VRAM' },
                    { key: 'context', label: 'Ctx' },
                    { key: 'speed', label: 'Speed' },
                    { key: 'score', label: 'Score' },
                  ].map((col) => (
                    <th key={col.label} className="px-3 py-2 text-left font-medium">
                      {col.key ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 hover:text-foreground"
                          onClick={() => toggleSort(col.key!)}
                        >
                          {col.label}
                          {sort === col.key &&
                            (sortAsc ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            ))}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const open = expandedModel === model.name
                  return (
                    <Fragment key={model.name}>
                      <tr
                        key={model.name}
                        className={cn(
                          'border-b border-border/60 cursor-pointer hover:bg-muted/20',
                          open && 'bg-muted/30',
                        )}
                        onClick={() => setExpandedModel(open ? null : model.name)}
                      >
                        <td className={cn('px-3 py-2 capitalize', FIT_COLORS[model.fit_level ?? ''])}>
                          {formatFitLabel(model.fit_level)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {model.name.split('/').pop()}
                          {isDownloaded(model.name) && (
                            <span className="ml-1 text-emerald-500" title="Downloaded">
                              ●
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{formatParams(model)}</td>
                        <td className="px-3 py-2">{model.quant || '?'}</td>
                        <td className="px-3 py-2">{formatVram(model)}</td>
                        <td className="px-3 py-2">{formatContext(model)}</td>
                        <td className="px-3 py-2">{formatSpeed(model)}</td>
                        <td className="px-3 py-2">{model.score?.toFixed?.(1) ?? model.score ?? '0'}</td>
                      </tr>
                      {open && (
                        <tr key={`${model.name}-panel`} className="border-b border-border/60 bg-muted/10">
                          <td colSpan={8} className="px-3 py-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted-foreground">{model.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {detectHwfitBackend(model, system?.backend || '', activeServer.platform || 'linux').label}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void downloadModel(model)
                                }}
                              >
                                Download
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void quickRun(model)
                                }}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Quick Run
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setScheduleModel(scheduleModel?.name === model.name ? null : model)
                                }}
                              >
                                <Calendar className="mr-1 h-3 w-3" />
                                Schedule
                              </Button>
                              <a
                                href={`https://huggingface.co/${model.quant_repo || model.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                HF ↗
                              </a>
                            </div>
                            {scheduleModel?.name === model.name && (
                              <CookbookSchedulePanel
                                config={{
                                  title: model.name.split('/').pop() || model.name,
                                  repo_id: model.quant_repo || model.name,
                                  host: remoteHost,
                                }}
                                onClose={() => setScheduleModel(null)}
                              />
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
