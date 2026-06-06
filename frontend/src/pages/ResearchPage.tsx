import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import {
  researchSettingsToRequest,
  type ResearchBatchMode,
  type ResearchSettingsValues,
} from '@/features/research/researchSettingsHelpers'
import { ResearchForm } from '@/components/tools/ResearchForm'
import { ResearchResults } from '@/components/tools/ResearchResults'
import { useResearch } from '@/hooks/useResearch'
import type { ResearchJob } from '@/hooks/useResearch'

const DEFAULT_SETTINGS: ResearchSettingsValues = {
  category: '',
  maxRounds: 0,
  searchProvider: '',
  endpointId: '',
  model: '',
}

export function ResearchPage() {
  const [query, setQuery] = useState('')
  const [settings, setSettings] = useState<ResearchSettingsValues>(DEFAULT_SETTINGS)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const {
    jobs,
    queuedCount,
    startResearch,
    addToQueue,
    startQueuedJob,
    startAllQueued,
    removeQueuedJob,
    isStarting,
    cancelResearch,
    deleteResearch,
    loadResult,
    isLoading,
  } = useResearch()

  const buildRequest = () => researchSettingsToRequest(settings, query)

  const handleSubmit = () => {
    const body = buildRequest()
    if (!body.query && queuedCount === 0) return
    if (queuedCount > 0) {
      if (body.query) addToQueue(body)
      void startAllQueued('parallel')
      setQuery('')
      resetCategory()
      return
    }
    if (!body.query) return
    startResearch(body)
    setQuery('')
    resetCategory()
  }

  const handleStartAll = (mode: ResearchBatchMode) => {
    const body = buildRequest()
    if (body.query) addToQueue(body)
    setQuery('')
    resetCategory()
    void startAllQueued(mode)
  }

  const handleQueue = () => {
    const body = buildRequest()
    if (!body.query) return
    addToQueue(body)
    setQuery('')
    resetCategory()
  }

  const resetCategory = () => {
    setSettings((s) => ({ ...s, category: '' }))
  }

  const handleEditQueued = (job: ResearchJob) => {
    setQuery(job.query)
    const qs = job.queueSettings
    setSettings({
      category: job.category ?? qs?.category ?? '',
      maxRounds: job.maxRounds ?? qs?.max_rounds ?? 0,
      searchProvider: qs?.search_provider ?? '',
      endpointId: qs?.endpoint_id ?? '',
      model: qs?.model ?? '',
    })
    removeQueuedJob(job.id)
    setSelectedId(null)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Deep Research</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Multi-step web-augmented research with progress tracking, queue, and visual reports.
        </p>
      </div>

      <ResearchForm
        query={query}
        onQueryChange={setQuery}
        settings={settings}
        onSettingsChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        isStarting={isStarting}
        queuedCount={queuedCount}
        onSubmit={handleSubmit}
        onQueue={handleQueue}
        onStartAll={handleStartAll}
      />

      <div className="mt-6">
        {isLoading && !jobs.length ? (
          <p className="text-sm text-muted-foreground">Loading research library…</p>
        ) : (
          <ResearchResults
            jobs={jobs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCancel={cancelResearch}
            onDelete={deleteResearch}
            onLoadResult={loadResult}
            onStartQueued={startQueuedJob}
            onRemoveQueued={removeQueuedJob}
            onEditQueued={handleEditQueued}
          />
        )}
      </div>
    </div>
  )
}
