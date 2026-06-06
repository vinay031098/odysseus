import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  execShell,
  fetchCachedModels,
  fetchCookbookGpus,
  fetchCookbookPackages,
  fetchCookbookState,
  fetchCookbookTasksStatus,
  killCookbookPid,
  saveCookbookState,
  serveModel,
  setupCookbookServer,
  type CookbookState,
  type CookbookTask,
  type CookbookServePreset,
  type GpuQuery,
  type KillPidRequest,
  type ServeModelRequest,
  type SetupRequest,
} from '@/api/cookbookServe'
import { buildGpuQuery, tmuxGracefulKill } from '@/lib/cookbookServeHelpers'
import { mutateServeCommand } from '@/lib/cookbookServeCommandHelpers'
import type { DiagnosisFix } from '@/lib/cookbookDiagnosis'

export const cookbookServeKeys = {
  state: ['cookbook', 'serve', 'state'] as const,
  gpus: (query: GpuQuery) => ['cookbook', 'serve', 'gpus', query] as const,
  tasks: ['cookbook', 'serve', 'tasks'] as const,
  packages: (query: GpuQuery) => ['cookbook', 'serve', 'packages', query] as const,
  cached: (query: GpuQuery) => ['cookbook', 'serve', 'cached', query] as const,
}

export function useCookbookServeState(enabled = true) {
  return useQuery({
    queryKey: cookbookServeKeys.state,
    queryFn: fetchCookbookState,
    enabled,
    staleTime: 10_000,
  })
}

export function useCookbookGpus(host?: string, sshPort?: string, enabled = true) {
  const query = buildGpuQuery(host, sshPort)
  return useQuery({
    queryKey: cookbookServeKeys.gpus(query),
    queryFn: () => fetchCookbookGpus(query),
    enabled,
    refetchInterval: 4_000,
    staleTime: 2_000,
  })
}

export function useCookbookTasksStatus(enabled = true) {
  return useQuery({
    queryKey: cookbookServeKeys.tasks,
    queryFn: fetchCookbookTasksStatus,
    enabled,
    refetchInterval: 3_000,
    staleTime: 1_000,
  })
}

export function useCookbookPackages(host?: string, sshPort?: string, enabled = true) {
  const query = buildGpuQuery(host, sshPort)
  return useQuery({
    queryKey: cookbookServeKeys.packages(query),
    queryFn: () => fetchCookbookPackages(query),
    enabled,
    staleTime: 30_000,
  })
}

export function useCachedModels(host?: string, sshPort?: string, enabled = true) {
  const query = buildGpuQuery(host, sshPort)
  return useQuery({
    queryKey: cookbookServeKeys.cached(query),
    queryFn: () => fetchCachedModels(query),
    enabled,
    staleTime: 60_000,
  })
}

export function useCookbookServeMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['cookbook', 'serve'] })
  }

  const killPid = useMutation({
    mutationFn: (body: KillPidRequest) => killCookbookPid(body),
    onSuccess: invalidate,
  })

  const setupServer = useMutation({
    mutationFn: (body: SetupRequest) => setupCookbookServer(body),
  })

  const startServe = useMutation({
    mutationFn: async (args: {
      body: ServeModelRequest
      shortName: string
      state: CookbookState
    }) => {
      const res = await serveModel(args.body)
      if (!res.ok || !res.session_id) {
        throw new Error(res.error || res.detail || 'Failed to start serve')
      }
      const task: CookbookTask = {
        sessionId: res.session_id,
        id: res.session_id,
        name: args.shortName,
        type: 'serve',
        status: 'running',
        ts: Date.now(),
        remoteHost: args.body.remote_host,
        sshPort: args.body.ssh_port,
        payload: {
          repo_id: args.body.repo_id,
          remote_host: args.body.remote_host,
          _cmd: args.body.cmd,
        },
      }
      const next: CookbookState = {
        ...args.state,
        tasks: [...(args.state.tasks ?? []), task],
      }
      await saveCookbookState(next)
      return { sessionId: res.session_id, task }
    },
    onSuccess: invalidate,
  })

  const stopServe = useMutation({
    mutationFn: async (args: {
      sessionId: string
      remoteHost?: string
      sshPort?: string
      state: CookbookState
    }) => {
      await execShell(tmuxGracefulKill(args.sessionId, args.remoteHost, args.sshPort))
      const tasks = (args.state.tasks ?? []).filter((t) => t.sessionId !== args.sessionId)
      await saveCookbookState({ ...args.state, tasks })
    },
    onSuccess: invalidate,
  })

  const retryServe = useMutation({
    mutationFn: async (args: {
      task: CookbookTask
      fix: DiagnosisFix
      state: CookbookState
      cmdOverride?: string
      gpus?: string
    }) => {
      const task = args.task
      const oldCmd = args.cmdOverride ?? task.payload?._cmd
      if (!oldCmd || !task.payload?.repo_id) {
        throw new Error('No serve command to retry')
      }

      const newCmd =
        args.fix.action === 'serve_retry'
          ? mutateServeCommand(oldCmd, 'append', args.fix.flag || '')
          : args.fix.action === 'serve_retry_replace'
            ? mutateServeCommand(oldCmd, 'replace', args.fix.flag || '', args.fix.value)
            : args.fix.action === 'serve_retry_remove'
              ? mutateServeCommand(oldCmd, 'remove', args.fix.flag || '')
              : args.fix.action === 'serve_retry_prepend'
                ? mutateServeCommand(oldCmd, 'prepend', args.fix.flag || '')
                : oldCmd

      await execShell(tmuxGracefulKill(task.sessionId, task.remoteHost, task.sshPort))
      const tasks = (args.state.tasks ?? []).filter((t) => t.sessionId !== task.sessionId)
      await saveCookbookState({ ...args.state, tasks })

      const res = await serveModel({
        repo_id: task.payload.repo_id,
        cmd: newCmd,
        remote_host: task.remoteHost || task.payload.remote_host,
        ssh_port: task.sshPort,
        gpus: args.gpus,
        platform: task.platform,
      })
      if (!res.ok || !res.session_id) {
        throw new Error(res.error || res.detail || 'Retry failed')
      }

      const nextTask: CookbookTask = {
        sessionId: res.session_id,
        id: res.session_id,
        name: task.name,
        type: 'serve',
        status: 'running',
        ts: Date.now(),
        remoteHost: task.remoteHost,
        sshPort: task.sshPort,
        platform: task.platform,
        payload: {
          ...task.payload,
          _cmd: newCmd,
        },
      }
      await saveCookbookState({
        ...args.state,
        tasks: [...tasks, nextTask],
      })
      return { sessionId: res.session_id, cmd: newCmd }
    },
    onSuccess: invalidate,
  })

  const relaunchServe = useMutation({
    mutationFn: async (args: {
      task: CookbookTask
      cmd: string
      state: CookbookState
      gpus?: string
    }) => {
      await execShell(tmuxGracefulKill(args.task.sessionId, args.task.remoteHost, args.task.sshPort))
      const tasks = (args.state.tasks ?? []).filter((t) => t.sessionId !== args.task.sessionId)
      await saveCookbookState({ ...args.state, tasks })

      const res = await serveModel({
        repo_id: args.task.payload?.repo_id || args.task.name,
        cmd: args.cmd,
        remote_host: args.task.remoteHost || args.task.payload?.remote_host,
        ssh_port: args.task.sshPort,
        gpus: args.gpus,
        platform: args.task.platform,
      })
      if (!res.ok || !res.session_id) {
        throw new Error(res.error || res.detail || 'Relaunch failed')
      }

      const nextTask: CookbookTask = {
        sessionId: res.session_id,
        id: res.session_id,
        name: args.task.name,
        type: 'serve',
        status: 'running',
        ts: Date.now(),
        remoteHost: args.task.remoteHost,
        sshPort: args.task.sshPort,
        platform: args.task.platform,
        payload: {
          ...args.task.payload,
          repo_id: args.task.payload?.repo_id || args.task.name,
          _cmd: args.cmd,
        },
      }
      await saveCookbookState({ ...args.state, tasks: [...tasks, nextTask] })
      return res.session_id
    },
    onSuccess: invalidate,
  })

  return { killPid, setupServer, startServe, stopServe, retryServe, relaunchServe }
}

export function useServePresetsMutations() {
  const queryClient = useQueryClient()

  const savePresets = useMutation({
    mutationFn: async (args: { state: CookbookState; presets: CookbookServePreset[] }) => {
      const res = await saveCookbookState({ ...args.state, presets: args.presets })
      if (!res.ok) throw new Error(res.error || 'Failed to save presets')
      return args.presets
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cookbookServeKeys.state })
    },
  })

  return { savePresets }
}
