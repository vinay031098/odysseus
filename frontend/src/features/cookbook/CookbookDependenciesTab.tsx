import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Loader2, Package, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CookbookEnvState, CookbookPackage, CookbookState } from '@/api/cookbookServe'
import { execShell } from '@/api/cookbookServe'
import { runCookbookPipInstall, runCookbookPipReinstall } from '@/lib/cookbookDepsHelpers'
import { useCookbookPackages, useCookbookServeState } from '@/hooks/useCookbookServe'
import { defaultCookbookServers } from '@/hooks/useCookbookEnv'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CookbookDependenciesTabProps {
  state: CookbookState
  env: CookbookEnvState
  isAdmin: boolean
  highlightPkg?: string
}

const WIN_UNSUPPORTED = new Set(['vllm', 'rembg', 'gfpgan'])

function InstalledPackageMenu({
  disabled,
  onUpdate,
}: {
  disabled: boolean
  onUpdate: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
        disabled={disabled}
        title="Installed — click for actions"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        Installed
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[8rem] rounded-md border border-border bg-popover p-1 shadow-md">
            <button
              type="button"
              className="flex w-full rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
              onClick={() => {
                setOpen(false)
                onUpdate()
              }}
            >
              Update
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function CookbookDependenciesTab({
  state,
  env,
  isAdmin,
  highlightPkg,
}: CookbookDependenciesTabProps) {
  const servers = useMemo(() => defaultCookbookServers(env.servers), [env.servers])
  const [hostKey, setHostKey] = useState(env.remoteHost || 'local')
  const [installing, setInstalling] = useState<string | null>(null)
  const stateQuery = useCookbookServeState(isAdmin)

  const activeServer = useMemo(() => {
    if (hostKey === 'local') return servers.find((s) => !s.host) ?? servers[0]
    return servers.find((s) => s.host === hostKey) ?? servers[0]
  }, [servers, hostKey])

  const remoteHost = activeServer.host?.trim() ?? ''
  const packagesQuery = useCookbookPackages(
    remoteHost || undefined,
    activeServer.port,
    isAdmin,
  )

  const packages = packagesQuery.data?.packages ?? []
  const appDeps = packages.filter((p) => p.target === 'local')
  const serverDeps = packages.filter((p) => p.target !== 'local')
  const isWindows = env.platform === 'windows'

  if (!isAdmin) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Dependencies require an admin account.
      </p>
    )
  }

  async function runPipTask(pkg: CookbookPackage, upgrade = false) {
    setInstalling(pkg.name)
    try {
      await runCookbookPipInstall({
        pkg,
        upgrade,
        state: stateQuery.data ?? state,
        remoteHost,
        activeServer,
        env,
      })
      toast.success(`${upgrade ? 'Updating' : 'Installing'} ${pkg.name}… check Running tab`)
      void packagesQuery.refetch()
      void stateQuery.refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setInstalling(null)
    }
  }

  async function runReinstall(pkg: CookbookPackage) {
    setInstalling(pkg.name)
    try {
      await runCookbookPipReinstall({
        pkgName: pkg.name,
        pipName: pkg.pip,
        state: stateQuery.data ?? state,
        remoteHost,
        activeServer,
        env,
      })
      toast.success(`Reinstalling ${pkg.name}… check Running tab`)
      void packagesQuery.refetch()
      void stateQuery.refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reinstall failed')
    } finally {
      setInstalling(null)
    }
  }

  async function rebuildLlamaCpp() {
    setInstalling('llama_cpp')
    try {
      const res = await execShell('rm -rf ~/.cache/odysseus/llama-cpp-build 2>/dev/null; echo cleared')
      if (res.exit_code !== 0) throw new Error('Rebuild clear failed')
      toast.success('Cleared llama.cpp build cache — next serve will recompile')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rebuild failed')
    } finally {
      setInstalling(null)
    }
  }

  function renderStatusTag(pkg: CookbookPackage, isLocal: boolean) {
    const isSystemDep = pkg.kind === 'system'
    const winBlocked = !isLocal && isWindows && WIN_UNSUPPORTED.has(pkg.name)

    if (winBlocked) {
      return (
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
          N/A
        </span>
      )
    }

    if (pkg.installed && isSystemDep) {
      return (
        <span
          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
          title="Found on selected server"
        >
          Installed
        </span>
      )
    }

    if (pkg.installed && pkg.pip_update_available === false) {
      const tip = pkg.update_note || pkg.status_note || 'Found externally; update outside Odysseus.'
      return (
        <span
          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
          title={tip}
        >
          Installed
        </span>
      )
    }

    if (pkg.installed && pkg.pip) {
      return (
        <InstalledPackageMenu
          disabled={!!installing}
          onUpdate={() => void runPipTask(pkg, true)}
        />
      )
    }

    if (isSystemDep) {
      const hint = pkg.install_hint || 'Install this OS package on the selected server.'
      const label = pkg.applicable === false ? 'N/A ?' : 'Missing'
      return (
        <span
          className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground"
          title={hint}
        >
          {label}
        </span>
      )
    }

    return (
      <Button
        type="button"
        size="sm"
        className="h-7 text-xs"
        disabled={installing === pkg.name}
        onClick={() => void runPipTask(pkg)}
      >
        {installing === pkg.name ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          'Install'
        )}
      </Button>
    )
  }

  function renderRow(pkg: CookbookPackage) {
    const isLocal = pkg.target === 'local'
    const highlighted =
      highlightPkg &&
      (pkg.name.toLowerCase() === highlightPkg.toLowerCase() ||
        pkg.pip.toLowerCase().includes(highlightPkg.toLowerCase()))

    return (
      <div
        key={`${pkg.target}-${pkg.name}`}
        className={cn(
          'flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/80 p-3',
          highlighted && 'ring-2 ring-primary/50',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{pkg.name}</p>
          <p className="text-xs text-muted-foreground">{pkg.desc}</p>
          {pkg.status_note && (
            <p className="mt-1 text-[10px] text-muted-foreground">{pkg.status_note}</p>
          )}
          {pkg.installed && pkg.pip_update_available === false && pkg.update_note && (
            <p className="mt-1 text-[10px] text-muted-foreground opacity-80">{pkg.update_note}</p>
          )}
          {!pkg.installed && pkg.kind === 'system' && pkg.install_hint && (
            <p className="mt-1 text-[10px] text-muted-foreground">{pkg.install_hint}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase">
            {pkg.category}
          </span>
          {pkg.name === 'llama_cpp' && pkg.installed && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!!installing}
              onClick={() => void rebuildLlamaCpp()}
            >
              Rebuild
            </Button>
          )}
          {(pkg.name === 'vllm' || pkg.name === 'sglang') && pkg.installed && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={installing === pkg.name}
              onClick={() => void runReinstall(pkg)}
            >
              Reinstall
            </Button>
          )}
          {renderStatusTag(pkg, isLocal)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-background p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Dependencies</h2>
              <p className="text-sm text-muted-foreground">
                Python packages and system tools for model serving.
              </p>
            </div>
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
              onClick={() => void packagesQuery.refetch()}
              disabled={packagesQuery.isFetching}
            >
              <RefreshCw
                className={cn('mr-1.5 h-3.5 w-3.5', packagesQuery.isFetching && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>
        </div>

        {packagesQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading packages…</p>
        )}

        {!packagesQuery.isLoading && !packages.length && (
          <p className="text-sm text-muted-foreground">No packages found.</p>
        )}

        {appDeps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Odysseus app
            </p>
            {appDeps.map(renderRow)}
          </div>
        )}

        {serverDeps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Server ({remoteHost || 'local'})
            </p>
            {serverDeps.map(renderRow)}
          </div>
        )}
      </section>
    </div>
  )
}
