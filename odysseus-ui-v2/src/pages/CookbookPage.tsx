import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { storePrefillPrompt } from '@/api/cookbook'
import { CookbookCard } from '@/components/tools/CookbookCard'
import { CookbookDetail } from '@/components/tools/CookbookDetail'
import { CookbookServePanel } from '@/components/tools/CookbookServePanel'
import { CookbookDependenciesTab } from '@/features/cookbook/CookbookDependenciesTab'
import { CookbookDownloadTab } from '@/features/cookbook/CookbookDownloadTab'
import { CookbookHwfitTab } from '@/features/cookbook/CookbookHwfitTab'
import { CookbookPresetsEditor } from '@/features/cookbook/CookbookPresetsEditor'
import { CookbookRemoteEnvPanel } from '@/features/cookbook/CookbookRemoteEnvPanel'
import { CookbookRunningTab } from '@/features/cookbook/CookbookRunningTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCookbook } from '@/hooks/useCookbook'
import { useCookbookDownloadQueue } from '@/hooks/useCookbookDownloadQueue'
import { useCookbookBackgroundMonitor } from '@/hooks/useCookbookBackgroundMonitor'
import { useCookbookServeState } from '@/hooks/useCookbookServe'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const COOKBOOK_TABS = ['presets', 'download', 'hwfit', 'running', 'serve', 'deps', 'env'] as const
type CookbookTab = (typeof COOKBOOK_TABS)[number]

function isCookbookTab(value: string | null): value is CookbookTab {
  return !!value && (COOKBOOK_TABS as readonly string[]).includes(value)
}

function resolveTab(value: string | null): CookbookTab {
  return isCookbookTab(value) ? value : 'presets'
}

export function CookbookPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const { recipes, isLoading, isError } = useCookbook()
  const serveStateQuery = useCookbookServeState(isAdmin)
  useCookbookDownloadQueue(isAdmin)
  useCookbookBackgroundMonitor(isAdmin && !!serveStateQuery.data)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tab = useMemo(() => resolveTab(searchParams.get('tab')), [searchParams])
  const highlightPkg = searchParams.get('pkg') ?? undefined
  const env = serveStateQuery.data?.env ?? {}

  const selected = recipes.find((r) => r.id === selectedId) ?? recipes[0] ?? null

  const runInChat = (recipe = selected) => {
    if (!recipe?.prompt) {
      toast.error('No prompt to send')
      return
    }
    storePrefillPrompt(recipe.prompt)
    navigate('/chat', { state: { prefill: true } })
    toast.success(`"${recipe.name}" loaded in chat`)
  }

  function handleTabChange(value: string) {
    if (!isCookbookTab(value)) return
    setSearchParams(value === 'presets' ? {} : { tab: value }, { replace: true })
  }

  function openRunningTab() {
    setSearchParams({ tab: 'running' }, { replace: true })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Cookbook</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Prompt presets, model downloads, hardware fit scoring, and GPU serving.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
          <TabsTrigger value="hwfit">What Fits</TabsTrigger>
          <TabsTrigger value="running">Running</TabsTrigger>
          <TabsTrigger value="serve">GPU Serve</TabsTrigger>
          <TabsTrigger value="deps">Dependencies</TabsTrigger>
          <TabsTrigger value="env">Servers</TabsTrigger>
        </TabsList>

        <TabsContent value="presets">
          <CookbookPresetsEditor
            selected={selected}
            isAdmin={isAdmin}
            onSelect={setSelectedId}
          />

          {isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">Loading recipes…</p>
          )}
          {isError && (
            <p className="mt-4 text-sm text-destructive">
              Failed to load recipes from the server.
            </p>
          )}

          {!isLoading && !recipes.length && (
            <p className="mt-4 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No recipes found. Built-in presets appear once the backend is reachable.
            </p>
          )}

          {recipes.length > 0 && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 content-start">
                {recipes.map((recipe) => (
                  <CookbookCard
                    key={recipe.id}
                    recipe={recipe}
                    selected={selected?.id === recipe.id}
                    onSelect={() => setSelectedId(recipe.id)}
                    onRunInChat={() => runInChat(recipe)}
                  />
                ))}
              </div>
              <CookbookDetail recipe={selected} onRunInChat={() => runInChat()} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="download">
          <CookbookDownloadTab
            state={serveStateQuery.data ?? {}}
            env={env}
            isAdmin={isAdmin}
            onOpenRunning={openRunningTab}
          />
        </TabsContent>

        <TabsContent value="hwfit">
          <CookbookHwfitTab
            state={serveStateQuery.data ?? {}}
            env={env}
            isAdmin={isAdmin}
            onOpenRunning={openRunningTab}
          />
        </TabsContent>

        <TabsContent value="running">
          <CookbookRunningTab isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="serve">
          <CookbookServePanel isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="deps">
          <CookbookDependenciesTab
            state={serveStateQuery.data ?? {}}
            env={env}
            isAdmin={isAdmin}
            highlightPkg={highlightPkg}
          />
        </TabsContent>

        <TabsContent value="env">
          <CookbookRemoteEnvPanel state={serveStateQuery.data ?? {}} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
