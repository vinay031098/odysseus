import { useMemo, useRef, useState } from 'react'
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ModelDownloadRequest } from '@/api/cookbookDownload'
import type { CookbookEnvState, CookbookServer, CookbookState } from '@/api/cookbookServe'
import { useCookbookDownloadMutations, useHfLatest } from '@/hooks/useCookbookDownload'
import { defaultCookbookServers } from '@/hooks/useCookbookEnv'
import {
  buildEnvPrefix,
  ollamaPullCommand,
  parseDownloadInput,
} from '@/lib/cookbookDownloadHelpers'
import { consumeShellStream } from '@/lib/cookbookShellStream'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CookbookDownloadTabProps {
  state: CookbookState
  env: CookbookEnvState
  isAdmin: boolean
  onOpenRunning?: () => void
}

function resolveServer(servers: CookbookServer[], hostKey: string): CookbookServer {
  if (hostKey === 'local') return servers.find((s) => !s.host) ?? servers[0]
  return servers.find((s) => s.host === hostKey) ?? servers[0]
}

export function CookbookDownloadTab({
  state,
  env,
  isAdmin,
  onOpenRunning,
}: CookbookDownloadTabProps) {
  const servers = useMemo(() => defaultCookbookServers(env.servers), [env.servers])
  const [hostKey, setHostKey] = useState(env.remoteHost || 'local')
  const [repoInput, setRepoInput] = useState('')
  const [hfOpen, setHfOpen] = useState(false)
  const [sseOutput, setSseOutput] = useState('')
  const [sseRunning, setSseRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const activeServer = resolveServer(servers, hostKey)
  const remoteHost = activeServer.host?.trim() ?? ''
  const vramGb = 24

  const { startDownload } = useCookbookDownloadMutations()
  const hfQuery = useHfLatest(vramGb, isAdmin && hfOpen)

  const queuedTasks = useMemo(
    () =>
      (state.tasks ?? []).filter(
        (t) => t.type === 'download' && (t.status === 'queued' || t.status === 'running'),
      ),
    [state.tasks],
  )

  if (!isAdmin) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Model downloads require an admin account.
      </p>
    )
  }

  function buildPayload(repo: string, include: string | null): ModelDownloadRequest {
    const envType = remoteHost ? activeServer.env || 'none' : env.env || 'none'
    const envPath = remoteHost ? activeServer.envPath || '' : env.envPath || ''
    const platform = activeServer.platform || env.platform
    return {
      repo_id: repo,
      include: include || undefined,
      hf_token: env.hfToken || undefined,
      remote_host: remoteHost || undefined,
      ssh_port: activeServer.port || undefined,
      platform,
      local_dir: activeServer.downloadDir || undefined,
      env_prefix: buildEnvPrefix(envType, envPath, platform),
      disable_hf_transfer: true,
    }
  }

  async function runOllamaStream(repo: string) {
    const cmd = ollamaPullCommand(repo)
    setSseOutput('')
    setSseRunning(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { exitCode } = await consumeShellStream(cmd, {
        timeout: 0,
        signal: controller.signal,
        onData: (line) => {
          setSseOutput((prev) => {
            const isProgress = /^FILE .+\d+%/.test(line) || /\d+%\|/.test(line)
            if (isProgress && prev) {
              const lines = prev.split('\n')
              const curFile = line.match(/^FILE\s+(\S+)/)?.[1]
              const prevFile = lines[lines.length - 1]?.match(/^FILE\s+(\S+)/)?.[1]
              if (curFile && prevFile && curFile === prevFile) {
                lines[lines.length - 1] = line
                return lines.join('\n')
              }
            }
            return prev ? `${prev}\n${line}` : line
          })
        },
      })
      if (exitCode !== 0 && exitCode !== null) {
        toast.error('Ollama pull failed')
      } else {
        toast.success('Ollama pull finished')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error(e instanceof Error ? e.message : 'Stream failed')
      }
    } finally {
      setSseRunning(false)
    }
  }

  async function handleDownload(repoOverride?: string) {
    const parsed = parseDownloadInput(repoOverride ?? repoInput)
    if (parsed.error) {
      toast.error(parsed.error)
      return
    }

    const shortName = parsed.repo.split('/').pop() || parsed.repo
    const isOllama = /ollama/i.test(parsed.repo) || !parsed.repo.includes('/')

    if (isOllama && !remoteHost) {
      await runOllamaStream(parsed.repo)
      setRepoInput('')
      return
    }

    const payload = buildPayload(parsed.repo, parsed.include)
    try {
      const result = await startDownload.mutateAsync({
        payload,
        shortName,
        state,
      })
      if (result.queued) {
        toast.message(`Queued ${shortName} — waiting for current download`)
      } else {
        toast.success(`Downloading ${shortName}…`)
        onOpenRunning?.()
      }
      setRepoInput('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-background p-4 space-y-4">
        <div>
          <h2 className="font-semibold">Download models</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a HuggingFace repo, URL, or{' '}
            <code className="text-xs">org/model:quant</code> tag. Downloads run in tmux
            with live progress in the Running tab.
          </p>
        </div>

        {servers.length > 1 && (
          <div className="space-y-1 max-w-xs">
            <Label htmlFor="dl-server">Target server</Label>
            <select
              id="dl-server"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
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
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={repoInput}
            placeholder="org/model-name, HF URL, or org/model:QUANT_TAG"
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleDownload()}
          />
          <Button
            type="button"
            onClick={() => void handleDownload()}
            disabled={startDownload.isPending || sseRunning}
          >
            {startDownload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download
          </Button>
        </div>

        {queuedTasks.length > 0 && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p className="font-medium">Download queue</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {queuedTasks.map((t) => (
                <li key={t.sessionId}>
                  {t.name}{' '}
                  <span className="text-xs uppercase">({t.status})</span>
                  {t.remoteHost ? ` · ${t.remoteHost}` : ' · local'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sseOutput && (
          <pre className="max-h-48 overflow-auto rounded-md bg-panel/50 p-3 text-xs whitespace-pre-wrap">
            {sseOutput}
          </pre>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setHfOpen((v) => !v)}
        >
          <span className="font-semibold">Trending on HuggingFace</span>
          <span className="text-muted-foreground">{hfOpen ? '▾' : '▸'}</span>
        </button>

        {hfOpen && (
          <div className="mt-3 space-y-3">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void hfQuery.refetch()}
                disabled={hfQuery.isFetching}
              >
                <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', hfQuery.isFetching && 'animate-spin')} />
                Refresh
              </Button>
            </div>
            {hfQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading models…</p>
            )}
            {hfQuery.data?.error && (
              <p className="text-sm text-destructive">{hfQuery.data.error}</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {(hfQuery.data?.models ?? []).map((m) => (
                <div
                  key={m.repo_id}
                  className="rounded-md border border-border/80 p-3 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{m.short_name || m.repo_id.split('/').pop()}</p>
                      <p className="text-xs text-muted-foreground">{m.repo_id}</p>
                      {m.est_vram_gb != null && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          ~{m.est_vram_gb.toFixed(1)} GB VRAM
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://huggingface.co/${m.repo_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Open on HuggingFace"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 w-full text-xs"
                    onClick={() => void handleDownload(m.repo_id)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
