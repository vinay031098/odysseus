import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  cancelResearch,
  deleteResearch,
  fetchActiveResearch,
  fetchResearchLibrary,
  peekResearchResult,
  startResearch,
} from '@/api/research'
import type {
  ResearchLibraryItem,
  ResearchProgress,
  ResearchResultPeek,
  ResearchStartRequest,
} from '@/api/types'
import {
  formatResearchPhase,
  isResearchTerminal,
  parseResearchStreamData,
} from '@/lib/researchParser'

export type ResearchJobStatus = 'queued' | 'running' | 'done' | 'cancelled' | 'error'

export interface ResearchJob {
  id: string
  query: string
  status: ResearchJobStatus
  progressLabel: string
  progress: ResearchProgress | null
  maxRounds: number
  startedAt: number
  elapsedMs: number
  result: ResearchResultPeek | null
  errorMsg: string | null
  sourceCount?: number
  fromLibrary?: boolean
  /** Settings preserved while queued (before server session exists). */
  queueSettings?: ResearchStartRequest
  category?: string
}

function libraryItemToJob(item: ResearchLibraryItem): ResearchJob {
  return {
    id: item.id,
    query: item.query,
    status: item.status === 'done' ? 'done' : 'error',
    progressLabel: 'Complete',
    progress: null,
    maxRounds: 0,
    startedAt: (item.started_at || 0) * 1000,
    elapsedMs: 0,
    result: null,
    errorMsg: null,
    sourceCount: item.source_count,
    fromLibrary: true,
    category: item.category,
  }
}

let queueCounter = 0
function nextQueueId() {
  queueCounter += 1
  return `queue-${Date.now()}-${queueCounter}`
}

export function useResearch() {
  const queryClient = useQueryClient()
  const [jobs, setJobs] = useState<ResearchJob[]>([])
  const esRefs = useRef<Map<string, EventSource>>(new Map())

  const libraryQuery = useQuery({
    queryKey: ['research-library'],
    queryFn: () => fetchResearchLibrary({ limit: 30 }),
    staleTime: 30_000,
  })

  const activeQuery = useQuery({
    queryKey: ['research-active'],
    queryFn: fetchActiveResearch,
    refetchInterval: 15_000,
  })

  useEffect(() => {
    const active = activeQuery.data?.active ?? []
    const library = libraryQuery.data?.research ?? []

    setJobs((prev) => {
      const byId = new Map(prev.map((j) => [j.id, j]))

      for (const task of active) {
        const existing = byId.get(task.session_id)
        byId.set(task.session_id, {
          id: task.session_id,
          query: task.query,
          status: 'running',
          progressLabel: formatResearchPhase(task.progress, existing?.maxRounds),
          progress: task.progress ?? null,
          maxRounds: existing?.maxRounds ?? 0,
          startedAt: task.started_at ? task.started_at * 1000 : Date.now(),
          elapsedMs: existing?.elapsedMs ?? 0,
          result: existing?.result ?? null,
          errorMsg: existing?.errorMsg ?? null,
          sourceCount: task.progress?.total_sources ?? existing?.sourceCount,
        })
      }

      for (const item of library) {
        if (item.status !== 'done' || byId.has(item.id)) continue
        byId.set(item.id, libraryItemToJob(item))
      }

      return [...byId.values()].sort((a, b) => b.startedAt - a.startedAt)
    })
  }, [activeQuery.data, libraryQuery.data])

  const connectStream = useCallback((jobId: string) => {
    if (esRefs.current.has(jobId)) return
    const es = new EventSource(`/api/research/stream/${jobId}`)
    esRefs.current.set(jobId, es)

    es.onmessage = (evt) => {
      const event = parseResearchStreamData(evt.data)
      if (!event) return

      if (event.status === 'not_found') {
        es.close()
        esRefs.current.delete(jobId)
        return
      }

      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j
          if (isResearchTerminal(event)) {
            const status =
              event.status === 'done'
                ? 'done'
                : event.status === 'cancelled'
                  ? 'cancelled'
                  : 'error'
            return {
              ...j,
              status,
              progressLabel: status === 'done' ? 'Complete' : event.error ?? status,
              errorMsg: event.error ?? null,
            }
          }
          return {
            ...j,
            progressLabel: formatResearchPhase(event, j.maxRounds),
            progress: {
              phase: event.phase,
              round: event.round,
              queries: event.queries,
              total_sources: event.total_sources,
              total_findings: event.total_findings,
              model: event.model,
            },
            sourceCount: event.total_sources ?? j.sourceCount,
          }
        }),
      )

      if (isResearchTerminal(event)) {
        es.close()
        esRefs.current.delete(jobId)
        if (event.status === 'done') {
          peekResearchResult(jobId)
            .then((result) => {
              setJobs((prev) =>
                prev.map((j) => (j.id === jobId ? { ...j, result, status: 'done' } : j)),
              )
            })
            .catch(() => {})
        }
        queryClient.invalidateQueries({ queryKey: ['research-library'] })
        queryClient.invalidateQueries({ queryKey: ['research-active'] })
      }
    }

    es.onerror = () => {
      es.close()
      esRefs.current.delete(jobId)
    }
  }, [queryClient])

  useEffect(() => {
    for (const job of jobs) {
      if (job.status === 'running') connectStream(job.id)
    }
  }, [jobs, connectStream])

  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.status === 'running' && j.startedAt
            ? { ...j, elapsedMs: Date.now() - j.startedAt }
            : j,
        ),
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const refs = esRefs.current
    return () => {
      for (const es of refs.values()) es.close()
      refs.clear()
    }
  }, [])

  const startMutation = useMutation({
    mutationFn: (body: ResearchStartRequest) => startResearch(body),
    onSuccess: (data, body) => {
      const job: ResearchJob = {
        id: data.session_id,
        query: data.query,
        status: 'running',
        progressLabel: 'Starting…',
        progress: null,
        maxRounds: body.max_rounds ?? 0,
        startedAt: Date.now(),
        elapsedMs: 0,
        result: null,
        errorMsg: null,
        category: body.category ?? undefined,
      }
      setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)])
      connectStream(data.session_id)
      toast.success('Research started')
      queryClient.invalidateQueries({ queryKey: ['research-active'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to start research')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelResearch,
    onSuccess: (_, id) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: 'cancelled', progressLabel: 'Cancelled' } : j,
        ),
      )
      toast.success('Research cancelled')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteResearch,
    onSuccess: (_, id) => {
      setJobs((prev) => prev.filter((j) => j.id !== id))
      queryClient.invalidateQueries({ queryKey: ['research-library'] })
      toast.success('Research deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
  })

  const loadResult = useCallback(async (jobId: string) => {
    try {
      const result = await peekResearchResult(jobId)
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, result, status: 'done' } : j)),
      )
      return result
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load result')
      return null
    }
  }, [])

  const addToQueue = useCallback((body: ResearchStartRequest) => {
    const id = nextQueueId()
    const job: ResearchJob = {
      id,
      query: body.query,
      status: 'queued',
      progressLabel: 'Queued',
      progress: null,
      maxRounds: body.max_rounds ?? 0,
      startedAt: Date.now(),
      elapsedMs: 0,
      result: null,
      errorMsg: null,
      queueSettings: body,
      category: body.category ?? undefined,
    }
    setJobs((prev) => [job, ...prev])
    toast.message('Added to queue')
    return id
  }, [])

  const removeQueuedJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId || j.status !== 'queued'))
  }, [])

  const startQueuedJob = useCallback(
    (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId && j.status === 'queued')
      if (!job?.queueSettings) return
      removeQueuedJob(jobId)
      startMutation.mutate(job.queueSettings)
    },
    [jobs, removeQueuedJob, startMutation],
  )

  const startAllQueued = useCallback(
    async (mode: 'parallel' | 'sequential' = 'parallel') => {
      const queued = jobs.filter((j) => j.status === 'queued')
      if (!queued.length) return

      const launch = async (job: ResearchJob) => {
        if (!job.queueSettings) return
        removeQueuedJob(job.id)
        await startMutation.mutateAsync(job.queueSettings)
      }

      if (mode === 'parallel') {
        await Promise.all(queued.map((job) => launch(job)))
      } else {
        for (const job of queued) {
          await launch(job)
        }
      }
    },
    [jobs, removeQueuedJob, startMutation],
  )

  const queuedCount = jobs.filter((j) => j.status === 'queued').length

  return {
    jobs,
    queuedCount,
    isLoading: libraryQuery.isLoading,
    startResearch: startMutation.mutate,
    addToQueue,
    startQueuedJob,
    startAllQueued,
    removeQueuedJob,
    isStarting: startMutation.isPending,
    cancelResearch: cancelMutation.mutate,
    deleteResearch: deleteMutation.mutate,
    loadResult,
    refetch: () => {
      libraryQuery.refetch()
      activeQuery.refetch()
    },
  }
}
