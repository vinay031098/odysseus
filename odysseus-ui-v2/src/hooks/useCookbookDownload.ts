import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  downloadModel,
  fetchHfLatest,
  type ModelDownloadRequest,
} from '@/api/cookbookDownload'
import type { CookbookState, CookbookTask, CookbookTaskPayload } from '@/api/cookbookServe'
import { saveCookbookState } from '@/api/cookbookServe'
import { healZombieDownload, sameDownloadTask } from '@/lib/cookbookDownloadQueue'

function taskPayload(payload: ModelDownloadRequest): CookbookTaskPayload {
  return {
    repo_id: payload.repo_id,
    include: payload.include ?? undefined,
    remote_host: payload.remote_host ?? undefined,
    disable_hf_transfer: payload.disable_hf_transfer,
  }
}


export function useHfLatest(vramGb = 0, enabled = true) {
  return useQuery({
    queryKey: ['cookbook', 'hf-latest', vramGb],
    queryFn: () => fetchHfLatest(vramGb, 10),
    enabled,
    staleTime: 120_000,
  })
}

export function useCookbookDownloadMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['cookbook', 'serve'] })
  }

  const startDownload = useMutation({
    mutationFn: async (args: {
      payload: ModelDownloadRequest
      shortName: string
      state: CookbookState
      replaceSessionId?: string
    }) => {
      const targetHost = args.payload.remote_host || 'local'
      let tasks = args.state.tasks ?? []

      const repoId = args.payload.repo_id
      const zombie = tasks.find(
        (t) =>
          sameDownloadTask(t, repoId, targetHost) &&
          ['done', 'error', 'crashed', 'stopped', 'failed'].includes(t.status),
      )
      if (zombie && !args.replaceSessionId) {
        const healed = await healZombieDownload(zombie)
        if (healed.revived) {
          tasks = tasks.map((t) =>
            t.sessionId === zombie.sessionId ? { ...t, status: 'running' } : t,
          )
          await saveCookbookState({ ...args.state, tasks })
          throw new Error(
            `${args.shortName} is still downloading (revived after stale state)`,
          )
        }
      }

      const duplicate = tasks.find(
        (t) =>
          sameDownloadTask(t, repoId, targetHost) &&
          (t.status === 'running' || t.status === 'queued'),
      )
      if (duplicate) {
        throw new Error(
          `${args.shortName} is already ${duplicate.status === 'queued' ? 'queued' : 'downloading'}`,
        )
      }

      const activeOnHost = tasks.find(
        (t) =>
          t.type === 'download' &&
          (t.status === 'running' || t.status === 'queued') &&
          (t.remoteHost || 'local') === targetHost,
      )

      if (activeOnHost && !args.replaceSessionId) {
        const queueId = `queue-${Date.now().toString(36)}`
        const queued: CookbookTask = {
          id: queueId,
          sessionId: queueId,
          name: args.shortName,
          type: 'download',
          status: 'queued',
          output: '',
          ts: Date.now(),
          payload: taskPayload(args.payload),
          remoteHost: args.payload.remote_host || '',
          sshPort: args.payload.ssh_port ?? undefined,
        }
        await saveCookbookState({
          ...args.state,
          tasks: [...tasks, queued],
        })
        return { queued: true as const, task: queued }
      }

      const res = await downloadModel(args.payload)
      if (!res.ok || !res.session_id) {
        throw new Error(res.error || 'Download failed')
      }

      let nextTasks: CookbookTask[]
      if (args.replaceSessionId) {
        nextTasks = tasks.map((t) =>
          t.sessionId === args.replaceSessionId
            ? {
                ...t,
                id: res.session_id,
                sessionId: res.session_id!,
                status: 'running',
                output: '',
                ts: Date.now(),
                payload: taskPayload(args.payload),
              }
            : t,
        )
      } else {
        const task: CookbookTask = {
          sessionId: res.session_id,
          id: res.session_id,
          name: args.shortName,
          type: 'download',
          status: 'running',
          ts: Date.now(),
          remoteHost: args.payload.remote_host || '',
          sshPort: args.payload.ssh_port ?? undefined,
          payload: taskPayload(args.payload),
        }
        nextTasks = [...tasks, task]
      }

      await saveCookbookState({ ...args.state, tasks: nextTasks })
      return { queued: false as const, sessionId: res.session_id }
    },
    onSuccess: invalidate,
  })

  const retryDownload = useMutation({
    mutationFn: async (args: {
      payload: ModelDownloadRequest
      shortName: string
      state: CookbookState
      replaceSessionId?: string
    }) => {
      return startDownload.mutateAsync({
        ...args,
        payload: { ...args.payload, disable_hf_transfer: true },
      })
    },
    onSuccess: invalidate,
  })

  return { startDownload, retryDownload }
}
