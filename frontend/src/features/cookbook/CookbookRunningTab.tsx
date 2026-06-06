import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Pencil, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CookbookTask } from '@/api/cookbookServe'
import { execShell, saveCookbookState } from '@/api/cookbookServe'
import {
  useCookbookServeMutations,
  useCookbookServeState,
  useCookbookTasksStatus,
} from '@/hooks/useCookbookServe'
import { useCookbookDownloadMutations } from '@/hooks/useCookbookDownload'
import { useCookbookPipTaskMutation } from '@/hooks/useCookbookPipTask'
import { CookbookDiagnosisPanel } from '@/features/cookbook/CookbookDiagnosisPanel'
import {
  CookbookEditServeDialog,
  type EditServeFields,
} from '@/features/cookbook/CookbookEditServeDialog'
import { handleDiagnosisFix, taskNeedsDiagnosis } from '@/lib/cookbookDiagnosis'
import { downloadOutputLooksActive } from '@/lib/cookbookDownloadQueue'
import {
  mergeTasksWithLiveStatus,
  taskBadgeText,
  tmuxGracefulKill,
} from '@/lib/cookbookServeHelpers'
import type { DiagnosisEntry, DiagnosisFix } from '@/lib/cookbookDiagnosis'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CookbookRunningTabProps {
  isAdmin: boolean
}

export function CookbookRunningTab({ isAdmin }: CookbookRunningTabProps) {
  const navigate = useNavigate()
  const stateQuery = useCookbookServeState(isAdmin)
  const tasksQuery = useCookbookTasksStatus(isAdmin)
  const { stopServe, retryServe, relaunchServe } = useCookbookServeMutations()
  const { retryDownload } = useCookbookDownloadMutations()
  const pipTask = useCookbookPipTaskMutation()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<CookbookTask | null>(null)
  const [editFields, setEditFields] = useState<EditServeFields | undefined>()

  const merged = useMemo(() => {
    const saved = stateQuery.data?.tasks ?? []
    const live = tasksQuery.data?.tasks ?? []
    return mergeTasksWithLiveStatus(saved, live)
  }, [stateQuery.data?.tasks, tasksQuery.data?.tasks])

  const activeTasks = useMemo(
    () =>
      merged.filter(({ task }) =>
        ['download', 'serve'].includes(task.type) &&
        !['done', 'stopped'].includes(task.status),
      ),
    [merged],
  )

  const recentTasks = useMemo(
    () =>
      merged.filter(({ task }) =>
        ['download', 'serve'].includes(task.type) &&
        ['done', 'stopped', 'error', 'crashed', 'failed'].includes(task.status),
      ),
    [merged],
  )

  if (!isAdmin) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Running tasks require an admin account.
      </p>
    )
  }

  if (stateQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>
  }

  async function handleStop(task: CookbookTask) {
    try {
      if (task.type === 'serve') {
        await stopServe.mutateAsync({
          sessionId: task.sessionId,
          remoteHost: task.remoteHost,
          sshPort: task.sshPort,
          state: stateQuery.data ?? {},
        })
      } else {
        await execShell(
          tmuxGracefulKill(task.sessionId, task.remoteHost, task.sshPort),
        )
        const tasks = (stateQuery.data?.tasks ?? []).map((t) =>
          t.sessionId === task.sessionId ? { ...t, status: 'stopped' } : t,
        )
        await saveCookbookState({ ...stateQuery.data, tasks })
        void stateQuery.refetch()
      }
      toast.success('Task stopped')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Stop failed')
    }
  }

  async function handleClear(task: CookbookTask) {
    const tasks = (stateQuery.data?.tasks ?? []).filter((t) => t.sessionId !== task.sessionId)
    await saveCookbookState({ ...stateQuery.data, tasks })
    void stateQuery.refetch()
  }

  async function runQuickCmd(task: CookbookTask, cmd: string) {
    try {
      const pf =
        task.sshPort && task.sshPort !== '22' ? `-p ${task.sshPort} ` : ''
      const full = task.remoteHost ? `ssh ${pf}${task.remoteHost} '${cmd}'` : cmd
      const res = await execShell(full)
      toast.message(res.exit_code === 0 ? `Done: ${cmd}` : `Failed (exit ${res.exit_code})`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Command failed')
    }
  }

  async function handleDiagnosis(
    task: CookbookTask,
    fix: DiagnosisFix,
    _entry: DiagnosisEntry,
    output: string,
  ) {
    handleDiagnosisFix(fix, output, {
      onRetryDownload: () => {
        if (!task.payload?.repo_id) return
        void retryDownload
          .mutateAsync({
            payload: {
              repo_id: task.payload.repo_id,
              include: task.payload.include,
              remote_host: task.remoteHost || task.payload.remote_host,
              ssh_port: task.sshPort,
              disable_hf_transfer: true,
            },
            shortName: task.name,
            state: stateQuery.data ?? {},
            replaceSessionId: task.sessionId,
          })
          .then(() => toast.success('Retrying download…'))
      },
      onRetryNoTransfer: () => {
        if (!task.payload?.repo_id) return
        void retryDownload
          .mutateAsync({
            payload: {
              repo_id: task.payload.repo_id,
              include: task.payload.include,
              remote_host: task.remoteHost || task.payload.remote_host,
              ssh_port: task.sshPort,
              disable_hf_transfer: true,
            },
            shortName: task.name,
            state: stateQuery.data ?? {},
            replaceSessionId: task.sessionId,
          })
          .then(() => toast.success('Retrying without hf_transfer…'))
      },
      onServeRetry: (f) => {
        void retryServe
          .mutateAsync({ task, fix: f, state: stateQuery.data ?? {} })
          .then(() => toast.success('Relaunching serve…'))
          .catch((e) => toast.error(e instanceof Error ? e.message : 'Retry failed'))
      },
      onEditServe: (f) => {
        setEditTask(task)
        setEditFields(
          f?.value === 'llamacpp'
            ? { backend: 'llamacpp' }
            : f?.value === 'ollama'
              ? { backend: 'ollama' }
              : undefined,
        )
      },
      onOpenDeps: (pkg) => {
        const params = new URLSearchParams({ tab: 'deps' })
        if (pkg) params.set('pkg', pkg)
        navigate(`/cookbook?${params}`)
      },
      onQuickCmd: (cmd) => void runQuickCmd(task, cmd),
      onPipUpdate: (f) => {
        const env = stateQuery.data?.env ?? {}
        const servers = env.servers ?? []
        const server = servers.find((s) => s.host === (task.remoteHost || ''))
        void pipTask
          .mutateAsync({
            fix: f,
            state: stateQuery.data ?? {},
            env,
            remoteHost: task.remoteHost,
            sshPort: task.sshPort || server?.port,
            serverEnv: server?.env,
            serverEnvPath: server?.envPath,
            platform: task.platform || server?.platform || env.platform,
          })
          .then(() => toast.success(`Started ${f.pipTaskName || 'pip task'}… check Running tab`))
          .catch((e) => toast.error(e instanceof Error ? e.message : 'Pip task failed'))
      },
    })
  }

  async function handleEditSave(cmd: string, fields: EditServeFields) {
    if (!editTask) return
    try {
      await relaunchServe.mutateAsync({
        task: editTask,
        cmd,
        state: stateQuery.data ?? {},
        gpus: fields.gpus || undefined,
      })
      setEditTask(null)
      toast.success('Serve relaunched')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Relaunch failed')
    }
  }

  function canClearTask(task: CookbookTask, output: string): boolean {
    if (task.status === 'running' || task.status === 'queued') return false
    if (downloadOutputLooksActive(output)) return false
    return ['done', 'stopped', 'error', 'crashed', 'failed'].includes(task.status)
  }

  function renderTaskRow({ task, live }: (typeof merged)[number]) {
    const output = live?.output_tail || task.output || ''
    const expanded = expandedId === task.sessionId
    const badge = taskBadgeText(task, live)
    const showDiagnosis = expanded && taskNeedsDiagnosis(task, output)
    const clearLabel = downloadOutputLooksActive(output) ? 'reconnect' : 'clear'

    return (
      <div key={task.sessionId} className="rounded-lg border border-border bg-background">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          onClick={() => setExpandedId(expanded ? null : task.sessionId)}
        >
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide',
              task._unreachable && task.type === 'serve'
                ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                : task.status === 'running' || task.status === 'queued'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground',
            )}
            title={
              task._unreachable && task.type === 'serve'
                ? 'Server not responding — it may have crashed'
                : undefined
            }
          >
            {badge}
          </span>
          <span className="flex-1 text-sm font-medium">{task.name}</span>
          <span className="text-xs text-muted-foreground">{task.type}</span>
          {task.remoteHost && (
            <span className="text-xs text-muted-foreground">{task.remoteHost}</span>
          )}
        </button>

        {expanded && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-2">
              {(task.status === 'running' || task.status === 'queued') && (
                <Button type="button" size="sm" variant="outline" onClick={() => void handleStop(task)}>
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Stop
                </Button>
              )}
              {task.type === 'serve' && task.payload?._cmd && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditTask(task)
                    setEditFields(undefined)
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit serve
                </Button>
              )}
              {canClearTask(task, output) && (
                <Button type="button" size="sm" variant="ghost" onClick={() => void handleClear(task)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {clearLabel === 'reconnect' ? 'Reconnect' : 'Clear'}
                </Button>
              )}
            </div>
            {output && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-panel/50 p-3 text-xs whitespace-pre-wrap">
                {output}
              </pre>
            )}
            {showDiagnosis && (
              <CookbookDiagnosisPanel
                output={output}
                task={task}
                taskType={task.type}
                onFix={(fix, entry) => void handleDiagnosis(task, fix, entry, output)}
              />
            )}
            {live?.diagnosis?.message && !showDiagnosis && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                {live.diagnosis.message}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CookbookEditServeDialog
        task={editTask}
        open={!!editTask}
        initialFields={editFields}
        onClose={() => setEditTask(null)}
        onSave={(cmd, fields) => void handleEditSave(cmd, fields)}
        saving={relaunchServe.isPending}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Active</h2>
          {tasksQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No downloads or serves running.</p>
        ) : (
          activeTasks.map(renderTaskRow)
        )}
      </section>

      {recentTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Recent</h2>
          {recentTasks.map(renderTaskRow)}
        </section>
      )}
    </div>
  )
}
