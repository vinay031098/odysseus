import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Key, Plus, RefreshCw, Server, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchCookbookSshKey, generateCookbookSshKey } from '@/api/cookbookDownload'
import type { CookbookEnvState, CookbookServer, CookbookState } from '@/api/cookbookServe'
import { defaultCookbookServers, useCookbookEnvMutations } from '@/hooks/useCookbookEnv'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CookbookRemoteEnvPanelProps {
  state: CookbookState
  isAdmin: boolean
}

function emptyServer(): CookbookServer {
  return {
    host: '',
    name: '',
    port: '22',
    env: 'none',
    envPath: '',
    platform: 'linux',
    modelDirs: ['~/.cache/huggingface/hub'],
    downloadDir: '',
  }
}

export function CookbookRemoteEnvPanel({ state, isAdmin }: CookbookRemoteEnvPanelProps) {
  const { saveEnv, testSsh } = useCookbookEnvMutations()
  const [env, setEnv] = useState<CookbookEnvState>(() => ({
    ...state.env,
    servers: defaultCookbookServers(state.env?.servers),
  }))
  const [expanded, setExpanded] = useState(true)
  const [testStatus, setTestStatus] = useState<Record<number, string>>({})
  const [sshKey, setSshKey] = useState<string | null>(null)
  const [sshLoading, setSshLoading] = useState(false)

  const servers = useMemo(() => defaultCookbookServers(env.servers), [env.servers])

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Remote server settings require an admin account.
      </p>
    )
  }

  function updateServer(index: number, patch: Partial<CookbookServer>) {
    setEnv((prev) => {
      const nextServers = [...defaultCookbookServers(prev.servers)]
      nextServers[index] = { ...nextServers[index], ...patch }
      return { ...prev, servers: nextServers }
    })
  }

  function updateModelDirs(index: number, raw: string) {
    const dirs = raw
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
    updateServer(index, { modelDirs: dirs.length ? dirs : ['~/.cache/huggingface/hub'] })
  }

  function addServer() {
    setEnv((prev) => ({
      ...prev,
      servers: [...defaultCookbookServers(prev.servers), emptyServer()],
    }))
  }

  function removeServer(index: number) {
    setEnv((prev) => {
      const nextServers = defaultCookbookServers(prev.servers).filter((_, i) => i !== index)
      return { ...prev, servers: nextServers.length ? nextServers : [emptyServer()] }
    })
  }

  function setDefaultServer(host: string) {
    setEnv((prev) => ({ ...prev, remoteHost: host, defaultServer: host }))
  }

  async function persist(nextEnv: CookbookEnvState) {
    try {
      await saveEnv.mutateAsync({ state, env: nextEnv })
      toast.success('Server settings saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function handleSave() {
    await persist(env)
  }

  async function handleTest(index: number, server: CookbookServer) {
    if (!server.host?.trim()) {
      setTestStatus((s) => ({ ...s, [index]: 'Enter user@host' }))
      return
    }
    setTestStatus((s) => ({ ...s, [index]: 'Testing…' }))
    try {
      const res = await testSsh.mutateAsync({ host: server.host, port: server.port })
      setTestStatus((s) => ({ ...s, [index]: res.ok ? 'Connected' : res.message }))
    } catch (e) {
      setTestStatus((s) => ({
        ...s,
        [index]: e instanceof Error ? e.message : 'Test failed',
      }))
    }
  }

  async function loadSshKey() {
    setSshLoading(true)
    try {
      const res = await fetchCookbookSshKey()
      setSshKey(res.public_key || res.error || 'No key')
    } catch (e) {
      setSshKey(e instanceof Error ? e.message : 'Failed to load key')
    } finally {
      setSshLoading(false)
    }
  }

  async function handleGenerateKey() {
    setSshLoading(true)
    try {
      const res = await generateCookbookSshKey()
      if (!res.ok && res.error) throw new Error(res.error)
      setSshKey(res.public_key || '')
      toast.success('SSH key generated — add the public key to your remote servers')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Key generation failed')
    } finally {
      setSshLoading(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-background">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Server className="h-4 w-4 text-primary" />
        <span className="font-semibold">Remote servers &amp; environment</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          <div className="rounded-md border border-border/80 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4" />
              SSH key for remote servers
            </div>
            <p className="text-xs text-muted-foreground">
              Generate an Odysseus SSH key and add the public key to{' '}
              <code className="text-[10px]">~/.ssh/authorized_keys</code> on remote hosts.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sshLoading}
                onClick={() => void loadSshKey()}
              >
                Show public key
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={sshLoading}
                onClick={() => void handleGenerateKey()}
              >
                Generate key
              </Button>
              {sshKey && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void navigator.clipboard.writeText(sshKey)}
                >
                  Copy
                </Button>
              )}
            </div>
            {sshKey && (
              <pre className="max-h-24 overflow-auto rounded bg-muted/40 p-2 text-[10px] whitespace-pre-wrap">
                {sshKey}
              </pre>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cookbook-hf-token">HuggingFace token</Label>
              <Input
                id="cookbook-hf-token"
                type="password"
                placeholder={env.hfTokenMasked || 'Optional — for gated models'}
                onChange={(e) => setEnv((prev) => ({ ...prev, hfToken: e.target.value.trim() }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cookbook-gpus">CUDA_VISIBLE_DEVICES</Label>
              <Input
                id="cookbook-gpus"
                placeholder="e.g. 0,1 (empty = all)"
                defaultValue={env.gpus || ''}
                onChange={(e) => setEnv((prev) => ({ ...prev, gpus: e.target.value.trim() }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            {servers.map((server, index) => {
              const hostKey = server.host || 'local'
              const isDefault = (env.remoteHost || env.defaultServer || 'local') === hostKey
              return (
                <div
                  key={`${server.host}-${index}`}
                  className="rounded-md border border-border/80 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {server.host ? server.name || server.host : 'Local'}
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="radio"
                          name="default-server"
                          checked={isDefault}
                          onChange={() => setDefaultServer(hostKey)}
                        />
                        Default
                      </label>
                      {index > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-destructive"
                          onClick={() => removeServer(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        value={server.name || ''}
                        placeholder="GPU box"
                        disabled={!server.host}
                        onChange={(e) => updateServer(index, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>SSH host</Label>
                      <Input
                        value={server.host}
                        placeholder={index === 0 ? '(local)' : 'user@host'}
                        readOnly={index === 0}
                        disabled={index === 0}
                        onChange={(e) => updateServer(index, { host: e.target.value.trim() })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Port</Label>
                      <Input
                        value={server.port || '22'}
                        onChange={(e) => updateServer(index, { port: e.target.value.trim() })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Platform</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        value={server.platform || 'linux'}
                        onChange={(e) => updateServer(index, { platform: e.target.value })}
                      >
                        <option value="linux">linux</option>
                        <option value="windows">windows</option>
                        <option value="termux">termux</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Environment</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        value={server.env || 'none'}
                        onChange={(e) => updateServer(index, { env: e.target.value })}
                      >
                        <option value="none">none</option>
                        <option value="venv">venv</option>
                        <option value="conda">conda</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Env path</Label>
                      <Input
                        value={server.envPath || ''}
                        placeholder="/path/to/venv or env name"
                        onChange={(e) => updateServer(index, { envPath: e.target.value.trim() })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Model directories (comma-separated)</Label>
                      <Input
                        value={(server.modelDirs ?? []).join(', ')}
                        placeholder="~/.cache/huggingface/hub"
                        onChange={(e) => updateModelDirs(index, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Download directory (optional)</Label>
                      <Input
                        value={server.downloadDir || ''}
                        placeholder="Override HF cache path for downloads"
                        onChange={(e) => updateServer(index, { downloadDir: e.target.value.trim() })}
                      />
                    </div>
                  </div>
                  {index > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleTest(index, server)}
                        disabled={testSsh.isPending}
                      >
                        Test SSH
                      </Button>
                      {testStatus[index] && (
                        <span
                          className={cn(
                            'text-xs',
                            testStatus[index] === 'Connected'
                              ? 'text-emerald-600'
                              : 'text-muted-foreground',
                          )}
                        >
                          {testStatus[index]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addServer}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add server
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={saveEnv.isPending}
            >
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', saveEnv.isPending && 'animate-spin')} />
              Save settings
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
