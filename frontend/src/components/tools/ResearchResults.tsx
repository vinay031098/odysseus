import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MessageSquare,
  Pencil,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'
import { spinoffResearchChat, researchReportUrl } from '@/api/research'
import type { ResearchResultPeek } from '@/api/types'
import { ResearchSynapse } from '@/features/research/ResearchSynapse'
import {
  buildResearchCopyText,
  copyResearchReport,
} from '@/features/research/researchCopyHelpers'
import {
  researchFailedNoSources,
  researchProgressPercent,
} from '@/features/research/researchJobHelpers'
import type { ResearchJob } from '@/hooks/useResearch'
import { researchStatusLabel } from '@/lib/researchParser'
import { cn } from '@/lib/utils'

function formatElapsed(ms: number) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface ResearchResultsProps {
  jobs: ResearchJob[]
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onLoadResult: (id: string) => Promise<unknown>
  onStartQueued: (id: string) => void
  onRemoveQueued: (id: string) => void
  onEditQueued: (job: ResearchJob) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function ResearchResults({
  jobs,
  onCancel,
  onDelete,
  onLoadResult,
  onStartQueued,
  onRemoveQueued,
  onEditQueued,
  selectedId,
  onSelect,
}: ResearchResultsProps) {
  const navigate = useNavigate()
  const [synapseMinimized, setSynapseMinimized] = useState(false)
  const [copyOk, setCopyOk] = useState(false)
  const [discussBusy, setDiscussBusy] = useState(false)

  const activeJobs = jobs.filter(
    (j) => j.status === 'queued' || j.status === 'running' || j.status === 'error' || j.status === 'cancelled',
  )
  const pastJobs = jobs.filter((j) => j.status === 'done')
  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null

  if (!jobs.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No research jobs yet. Start one above or queue several for batch launch.
      </div>
    )
  }

  const progressPct = selected
    ? researchProgressPercent(selected.progress, selected.maxRounds)
    : 0
  const failedNoSources =
    selected?.status === 'done' && researchFailedNoSources(selected.sourceCount)

  async function handleCopy(job: ResearchJob) {
    let result = job.result
    if (!result?.result) {
      const loaded = await onLoadResult(job.id)
      if (!loaded || typeof loaded !== 'object' || !('result' in loaded)) return
      result = loaded as ResearchResultPeek
    }
    const text = buildResearchCopyText(job, result)
    const ok = await copyResearchReport(text)
    setCopyOk(ok)
    if (ok) toast.success('Report copied')
    else toast.error('Copy failed')
    setTimeout(() => setCopyOk(false), 2000)
  }

  async function handleDiscuss(jobId: string) {
    setDiscussBusy(true)
    try {
      const res = await spinoffResearchChat(jobId)
      if (res.session_id) {
        navigate(`/chat/${res.session_id}`)
      } else {
        throw new Error('Server returned no session id')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not start follow-up chat',
      )
    } finally {
      setDiscussBusy(false)
    }
  }

  function JobListItem({ job }: { job: ResearchJob }) {
    return (
      <li key={job.id}>
        <button
          type="button"
          onClick={() => {
            onSelect(job.id)
            if (job.status === 'done' && !job.result) onLoadResult(job.id)
          }}
          className={cn(
            'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
            selected?.id === job.id
              ? 'bg-primary/10 text-foreground'
              : 'hover:bg-panel text-muted-foreground hover:text-foreground',
          )}
        >
          <div className="line-clamp-2 font-medium">{job.query}</div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span>{researchStatusLabel(job.status)}</span>
            {job.status === 'running' && <span>{formatElapsed(job.elapsedMs)}</span>}
            {job.sourceCount != null && <span>{job.sourceCount} sources</span>}
          </div>
        </button>
        {job.status === 'queued' ? (
          <div className="mt-1 flex flex-wrap gap-1 px-1 pb-2">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onStartQueued(job.id)}>
              <Play className="mr-1 h-3 w-3" />
              Start
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEditQueued(job)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRemoveQueued(job.id)}>
              Remove
            </Button>
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="max-h-[480px] overflow-y-auto rounded-lg border border-border bg-panel/20 p-2">
        {activeJobs.length > 0 ? (
          <div className="mb-3">
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active ({activeJobs.length})
            </div>
            <ul className="space-y-1">
              {activeJobs.map((job) => (
                <JobListItem key={job.id} job={job} />
              ))}
            </ul>
          </div>
        ) : null}
        {pastJobs.length > 0 ? (
          <div>
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Past ({pastJobs.length})
            </div>
            <ul className="space-y-1">
              {pastJobs.map((job) => (
                <JobListItem key={job.id} job={job} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {selected && (
        <div className="flex flex-col rounded-lg border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 font-medium">{selected.query}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{selected.progressLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === 'running' && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSynapseMinimized((v) => !v)}
                    title={synapseMinimized ? 'Show visualization' : 'Minimize visualization'}
                  >
                    {synapseMinimized ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onCancel(selected.id)}>
                    <XCircle className="mr-1 h-3 w-3" />
                    Cancel
                  </Button>
                </>
              )}
              {selected.status === 'done' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCopy(selected)}
                    title="Copy report to clipboard"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    {copyOk ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={discussBusy}
                    onClick={() => void handleDiscuss(selected.id)}
                    title="Open follow-up chat with this research as context"
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    {discussBusy ? 'Creating…' : 'Discuss'}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={researchReportUrl(selected.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Visual report
                    </a>
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(selected.id)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selected.status === 'running' && (
            <div className="border-b border-border px-4 py-3">
              {!synapseMinimized && (
                <ResearchSynapse
                  query={selected.query}
                  progress={selected.progress}
                  startedAt={selected.startedAt}
                  status="running"
                  compact
                />
              )}
              <div className="research-progress-bar">
                <div
                  className="research-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {failedNoSources && (
            <p className="border-b border-border px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
              Couldn&apos;t extract anything — try rephrasing the question or switch the search
              engine in Settings.
            </p>
          )}

          <div className="min-h-[240px] flex-1 overflow-y-auto p-4">
            {selected.errorMsg && (
              <p className="text-sm text-destructive">{selected.errorMsg}</p>
            )}
            {selected.result?.result ? (
              <MarkdownMessage content={selected.result.result} />
            ) : selected.status === 'done' ? (
              <p className="text-sm text-muted-foreground">
                Open the visual report or click Copy to load the text summary.
              </p>
            ) : selected.status === 'running' ? (
              <p className="animate-pulse text-sm text-muted-foreground">Research in progress…</p>
            ) : selected.status === 'queued' ? (
              <p className="text-sm text-muted-foreground">
                Queued — click Start on this job or use Start all to launch.
              </p>
            ) : null}

            {selected.result?.sources && selected.result.sources.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <h4 className="mb-2 text-sm font-medium">Sources</h4>
                <ul className="space-y-2 text-sm">
                  {selected.result.sources.slice(0, 10).map((s, i) => (
                    <li key={i}>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {s.title || s.url}
                        </a>
                      ) : (
                        <span>{s.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
