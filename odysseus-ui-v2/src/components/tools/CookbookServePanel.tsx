import { useMemo, useState } from 'react'
import { Calendar, Cpu, Loader2, Play, RefreshCw, Server, Square } from 'lucide-react'
import { CookbookSchedulePanel } from '@/features/cookbook/CookbookSchedulePanel'
import { CookbookServePresetsPanel } from '@/features/cookbook/CookbookServePresetsPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CookbookServePreset, CookbookServer } from '@/api/cookbookServe'
import {
  useCachedModels,
  useCookbookGpus,
  useCookbookPackages,
  useCookbookServeMutations,
  useCookbookServeState,
  useCookbookTasksStatus,
} from '@/hooks/useCookbookServe'
import {
  buildVllmServeCommand,
  extractGpusFromPreset,
  formatVramReadout,
  gpuIsBusy,
  mergeTasksWithLiveStatus,
  parseGpuSelection,
  presetDisplayLabel,
  presetHost,
  presetsForModel,
  serveTasksOnly,
  taskBadgeText,
  vramHealth,
  vramUsedPercent,
} from '@/lib/cookbookServeHelpers'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const VRAM_HEALTH_CLASS: Record<string, string> = {
  healthy: 'text-emerald-600 dark:text-emerald-400',
  tight: 'text-amber-600 dark:text-amber-400',
  critical: 'text-destructive',
}

interface CookbookServePanelProps {
  isAdmin: boolean
}

function defaultServers(servers: CookbookServer[] | undefined): CookbookServer[] {
  if (servers?.length) return servers
  return [{ host: '', port: '22', platform: 'linux' }]
}

export function CookbookServePanel({ isAdmin }: CookbookServePanelProps) {
  const stateQuery = useCookbookServeState(isAdmin)
  const [host, setHost] = useState('')
  const [serveRepo, setServeRepo] = useState('')
  const [servePort, setServePort] = useState('8000')
  const [serveCmdOverride, setServeCmdOverride] = useState<string | null>(null)
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const servers = useMemo(
    () => defaultServers(stateQuery.data?.env?.servers),
    [stateQuery.data?.env?.servers],
  )

  const activeServer = useMemo(() => {
    const match = servers.find((s) => s.host === host)
    return match ?? servers[0]
  }, [servers, host])

  const remoteHost = activeServer?.host?.trim() ?? ''
  const sshPort = activeServer?.port

  const gpusQuery = useCookbookGpus(remoteHost || undefined, sshPort, isAdmin)
  const tasksQuery = useCookbookTasksStatus(isAdmin)
  const packagesQuery = useCookbookPackages(remoteHost || undefined, sshPort, isAdmin)
  const cachedQuery = useCachedModels(remoteHost || undefined, sshPort, isAdmin)
  const { killPid, setupServer, startServe, stopServe } = useCookbookServeMutations()

  const runningServes = useMemo(() => {
    const saved = stateQuery.data?.tasks ?? []
    const live = tasksQuery.data?.tasks ?? []
    return serveTasksOnly(mergeTasksWithLiveStatus(saved, live))
  }, [stateQuery.data?.tasks, tasksQuery.data?.tasks])

  const readyModels = useMemo(
    () => (cachedQuery.data?.models ?? []).filter((m) => m.status === 'ready'),
    [cachedQuery.data?.models],
  )

  const serveCmd = useMemo(() => {
    if (serveCmdOverride?.trim()) return serveCmdOverride.trim()
    const repo = serveRepo.trim()
    const port = parseInt(servePort, 10)
    if (!repo || !Number.isFinite(port)) return ''
    return buildVllmServeCommand(repo, port)
  }, [serveCmdOverride, serveRepo, servePort])

  const modelPresets = useMemo(
    () => presetsForModel(stateQuery.data?.presets ?? [], serveRepo.trim()),
    [stateQuery.data?.presets, serveRepo],
  )

  function clearServeCmdOverride() {
    setServeCmdOverride(null)
  }

  function handleServeFieldChange(
    patch: Partial<{ repo: string; port: string }>,
  ) {
    if ('repo' in patch) setServeRepo(patch.repo ?? '')
    if ('port' in patch) setServePort(patch.port ?? '')
    clearServeCmdOverride()
  }

  function loadPreset(preset: CookbookServePreset) {
    const repo = preset.model?.trim()
    if (repo) setServeRepo(repo)
    const port = String(preset.port ?? preset.fields?.port ?? '8000')
    setServePort(port)
    setHost(presetHost(preset))
    setSelectedGpu(parseGpuSelection(extractGpusFromPreset(preset)))
    setServeCmdOverride(preset.cmd?.trim() || null)
    toast.success(`Loaded "${presetDisplayLabel(preset)}"`)
  }

  if (!isAdmin) {
    return (
      <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        GPU cookbook requires an admin account. Prompt presets remain available in the
        Presets tab.
      </p>
    )
  }

  if (stateQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading cookbook state…</p>
  }

  if (stateQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load cookbook state. Ensure the backend is running and you have admin
        access.
      </p>
    )
  }

  const gpus = gpusQuery.data?.ok ? (gpusQuery.data.gpus ?? []) : []
  const gpuError = gpusQuery.data?.ok === false ? gpusQuery.data.error : null

  async function handleKillPid(pid: number, signal: 'TERM' | 'KILL') {
    if (signal === 'KILL' && !window.confirm(`Force-kill PID ${pid}?`)) return
    try {
      const res = await killPid.mutateAsync({
        pid,
        signal,
        host: remoteHost || null,
        ssh_port: sshPort || null,
      })
      if (!res.ok) throw new Error(res.error || 'Kill failed')
      toast.success(`Sent SIG${signal} to PID ${pid}`)
      void gpusQuery.refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kill failed')
    }
  }

  async function handleSetup() {
    if (!remoteHost) {
      toast.error('Select a remote host first')
      return
    }
    try {
      const res = await setupServer.mutateAsync({ host: remoteHost, ssh_port: sshPort })
      if (!res.ok) throw new Error(res.error || res.output || 'Setup failed')
      toast.success(`Setup complete (${res.platform ?? 'remote'})`)
      void packagesQuery.refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Setup failed')
    }
  }

  async function handleServe() {
    const repo = serveRepo.trim()
    const port = parseInt(servePort, 10)
    if (!repo) {
      toast.error('Enter a model repo id')
      return
    }
    if (!Number.isFinite(port) || port < 1024) {
      toast.error('Enter a valid port (≥ 1024)')
      return
    }
    const cmd = serveCmd || buildVllmServeCommand(repo, port)
    const shortName = repo.split('/').pop() || repo
    try {
      await startServe.mutateAsync({
        shortName,
        body: {
          repo_id: repo,
          cmd,
          remote_host: remoteHost || undefined,
          ssh_port: sshPort || undefined,
          gpus: selectedGpu != null ? String(selectedGpu) : undefined,
          platform: activeServer?.platform,
        },
        state: stateQuery.data ?? {},
      })
      toast.success(`Serving ${shortName}…`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Serve failed')
    }
  }

  async function handleStop(sessionId: string, taskHost?: string, taskPort?: string) {
    try {
      await stopServe.mutateAsync({
        sessionId,
        remoteHost: taskHost,
        sshPort: taskPort,
        state: stateQuery.data ?? {},
      })
      toast.success('Serve stopped')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Stop failed')
    }
  }

  const remotePackages = (packagesQuery.data?.packages ?? []).filter(
    (p) => p.target === 'remote',
  )

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Server</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void gpusQuery.refetch()}
              disabled={gpusQuery.isFetching}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', gpusQuery.isFetching && 'animate-spin')} />
              Refresh GPUs
            </Button>
            {remoteHost ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleSetup()}
                disabled={setupServer.isPending}
              >
                {setupServer.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Setup remote
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cookbook-serve-host">Target host</Label>
            <select
              id="cookbook-serve-host"
              className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={host}
              onChange={(e) => {
                setHost(e.target.value)
                setSelectedGpu(null)
              }}
            >
              {servers.map((s) => (
                <option key={s.host || 'local'} value={s.host}>
                  {s.host ? `${s.host}${s.port && s.port !== '22' ? `:${s.port}` : ''}` : 'Local'}
                </option>
              ))}
            </select>
          </div>
          {stateQuery.data?.env?.hfTokenConfigured ? (
            <p className="self-end text-xs text-muted-foreground">
              HF token: {stateQuery.data.env.hfTokenMasked || 'configured'}
            </p>
          ) : (
            <p className="self-end text-xs text-amber-600 dark:text-amber-400">
              No HuggingFace token — gated models may fail
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">GPUs & VRAM</h2>
        </div>
        {gpuError ? (
          <p className="mt-2 text-sm text-muted-foreground">{gpuError}</p>
        ) : null}
        {!gpus.length && !gpuError ? (
          <p className="mt-2 text-sm text-muted-foreground">No GPU detected on this host.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {gpus.map((gpu) => {
              const pct = vramUsedPercent(gpu)
              const health = vramHealth(gpu)
              const busy = gpuIsBusy(gpu)
              const selected = selectedGpu === gpu.index
              return (
                <button
                  key={gpu.uuid ?? gpu.index}
                  type="button"
                  onClick={() => setSelectedGpu(selected ? null : gpu.index)}
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-panel/50',
                    busy && !selected && 'border-amber-500/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        GPU {gpu.index} · {gpu.name}
                      </p>
                      <p className={cn('mt-1 text-xs', VRAM_HEALTH_CLASS[health])}>
                        {formatVramReadout(gpu)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{gpu.util_pct}% util</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        health === 'critical'
                          ? 'bg-destructive'
                          : health === 'tight'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {(gpu.processes?.length ?? 0) > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {gpu.processes.map((p) => (
                        <li key={p.pid} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {p.pid} · {p.name} · {(p.used_mb / 1024).toFixed(1)}G
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              className="text-foreground hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleKillPid(p.pid, 'TERM')
                              }}
                            >
                              Kill
                            </button>
                            <button
                              type="button"
                              className="text-destructive hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                void handleKillPid(p.pid, 'KILL')
                              }}
                            >
                              !
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
        {selectedGpu != null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Serve will pin to GPU {selectedGpu}. Click the card again to clear.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <h2 className="font-semibold">Running serves</h2>
        {!runningServes.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No active model servers.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {runningServes.map(({ task, live }) => (
              <li
                key={task.sessionId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-panel/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{task.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.remoteHost || 'local'} · {taskBadgeText(task, live)}
                  </p>
                  {live?.output_tail ? (
                    <pre className="mt-1 max-h-16 overflow-hidden text-xs text-muted-foreground">
                      {live.output_tail}
                    </pre>
                  ) : null}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    void handleStop(task.sessionId, task.remoteHost, task.sshPort)
                  }
                  disabled={stopServe.isPending}
                >
                  <Square className="mr-2 h-3 w-3" />
                  Stop
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <h2 className="font-semibold">Serve model</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Launch from a saved preset or configure a quick vLLM serve below.
        </p>
        {modelPresets.length ? (
          <div className="mt-3">
            <Label htmlFor="serve-preset-quick">Saved configs for this model</Label>
            <select
              id="serve-preset-quick"
              className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              defaultValue=""
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10)
                e.target.value = ''
                if (!Number.isFinite(idx) || idx < 0) return
                const preset = modelPresets[idx]
                if (preset) loadPreset(preset)
              }}
            >
              <option value="">Load a saved config…</option>
              {modelPresets.map((preset, index) => (
                <option key={`${preset.model}-${preset.label}-${index}`} value={index}>
                  {presetDisplayLabel(preset, index)}
                  {preset.confirmedWorking ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.5fr)_auto] sm:items-end">
          <div>
            <Label htmlFor="serve-repo">Model repo</Label>
            {readyModels.length ? (
              <select
                id="serve-repo"
                className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={serveRepo}
                onChange={(e) => handleServeFieldChange({ repo: e.target.value })}
              >
                <option value="">Select cached model…</option>
                {readyModels.map((m) => (
                  <option key={m.repo_id} value={m.repo_id}>
                    {m.repo_id} ({m.size})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="serve-repo"
                className="mt-1"
                placeholder="org/model-name"
                value={serveRepo}
                onChange={(e) => handleServeFieldChange({ repo: e.target.value })}
              />
            )}
          </div>
          <div>
            <Label htmlFor="serve-port">Port</Label>
            <Input
              id="serve-port"
              className="mt-1"
              value={servePort}
              onChange={(e) => handleServeFieldChange({ port: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void handleServe()} disabled={startServe.isPending}>
              {startServe.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Serve
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!serveRepo.trim()}
              onClick={() => setScheduleOpen((v) => !v)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </div>
        </div>
        {serveCmd ? (
          <div className="mt-3 space-y-1">
            <Label htmlFor="serve-cmd-preview">Launch command</Label>
            <textarea
              id="serve-cmd-preview"
              readOnly
              className="min-h-[72px] w-full rounded-md border border-input bg-panel/30 px-3 py-2 font-mono text-xs text-muted-foreground"
              value={serveCmd}
            />
            {serveCmdOverride ? (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={clearServeCmdOverride}
              >
                Reset to default vLLM command
              </button>
            ) : null}
          </div>
        ) : null}
        {scheduleOpen && serveRepo.trim() && (
          <CookbookSchedulePanel
            className="mt-3"
            config={{
              title: serveRepo.split('/').pop() || serveRepo,
              repo_id: serveRepo.trim(),
              host: remoteHost,
            }}
            onClose={() => setScheduleOpen(false)}
          />
        )}
      </section>

      <CookbookServePresetsPanel
        state={stateQuery.data ?? {}}
        filterRepo={serveRepo.trim() || undefined}
        currentConfig={{
          repo: serveRepo,
          port: servePort,
          host: remoteHost,
          cmd: serveCmd,
          gpus: selectedGpu != null ? String(selectedGpu) : '',
        }}
        onLoad={loadPreset}
      />

      <section className="rounded-lg border border-border bg-background p-4">
        <h2 className="font-semibold">Runtime packages</h2>
        {packagesQuery.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Checking packages…</p>
        ) : (
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {remotePackages.map((pkg) => (
              <li key={pkg.name} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    pkg.installed ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )}
                />
                <span className="font-medium">{pkg.name}</span>
                <span className="text-xs text-muted-foreground truncate">{pkg.desc}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
