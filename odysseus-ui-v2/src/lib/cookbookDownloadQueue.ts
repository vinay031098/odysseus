import type { CookbookTask, CookbookTaskPayload } from '@/api/cookbookServe'
import type { ModelDownloadRequest } from '@/api/cookbookDownload'
import { downloadModel } from '@/api/cookbookDownload'
import { execShell } from '@/api/cookbookServe'

export function downloadDedupeKey(task: CookbookTask): string {
  const repo = task.payload?.repo_id || task.name
  const host = task.remoteHost || task.payload?.remote_host || 'local'
  return `${repo}@${host}`
}

export function sameDownloadTask(
  task: CookbookTask,
  repoId: string,
  targetHost: string,
): boolean {
  if (task.type !== 'download') return false
  const tRepo = task.payload?.repo_id || task.name
  const tHost = task.remoteHost || task.payload?.remote_host || 'local'
  return String(tRepo) === String(repoId) && String(tHost || 'local') === targetHost
}

/** Active shard progress in tmux output — download may still be running. */
export function downloadOutputLooksActive(output: string): boolean {
  if (!output.trim()) return false
  if (output.includes('DOWNLOAD_OK') || output.includes('DOWNLOAD_FAILED')) return false
  return (
    /model-\d+-of-\d+\.[a-z]+:\s+(?!100%)\d+%/i.test(output) ||
    /Downloading\s+'[^']+'\s+to\s+'[^']*\.incomplete'/i.test(output)
  )
}

export function taskPayloadToDownloadRequest(
  payload: CookbookTaskPayload,
  sshPort?: string,
): ModelDownloadRequest {
  return {
    repo_id: payload.repo_id || '',
    include: payload.include,
    remote_host: payload.remote_host,
    ssh_port: sshPort,
    disable_hf_transfer: payload.disable_hf_transfer ?? true,
  }
}

function tmuxHasSessionCmd(sessionId: string, remoteHost?: string, sshPort?: string): string {
  const pf = sshPort && sshPort !== '22' ? `-p ${sshPort} ` : ''
  if (remoteHost) {
    return `ssh ${pf}${remoteHost} 'tmux has-session -t ${sessionId} 2>/dev/null'`
  }
  return `tmux has-session -t ${sessionId} 2>/dev/null`
}

/** Revive a zombie download whose tmux session is still alive. */
export async function healZombieDownload(
  task: CookbookTask,
): Promise<{ revived: boolean; tasks: CookbookTask[] }> {
  if (
    task.type !== 'download' ||
    !task.sessionId ||
    task.sessionId.startsWith('queue-') ||
    !['done', 'error', 'crashed', 'stopped', 'failed'].includes(task.status)
  ) {
    return { revived: false, tasks: [task] }
  }
  try {
    const res = await execShell(
      tmuxHasSessionCmd(task.sessionId, task.remoteHost, task.sshPort),
    )
    if (res.exit_code === 0) {
      return {
        revived: true,
        tasks: [{ ...task, status: 'running' }],
      }
    }
  } catch {
    /* probe failed */
  }
  return { revived: false, tasks: [task] }
}

/** Self-heal downloads marked finished while output still shows progress. */
export function selfHealDownloadFromOutput(task: CookbookTask, output: string): CookbookTask | null {
  if (task.type !== 'download') return null
  if (!downloadOutputLooksActive(output)) return null
  if (['done', 'stopped', 'error', 'crashed', 'failed'].includes(task.status)) {
    return { ...task, status: 'running', _lastStatusFlipAt: Date.now() }
  }
  return null
}

const STATUS_FLIP_COOLDOWN_MS = 45_000

function isDemonstrablyFinishedDownload(task: CookbookTask): boolean {
  if (task.status !== 'done') return false
  const output = task.output || ''
  return /DOWNLOAD_OK|\/snapshots\//.test(output)
}

function staleDownloadCandidate(task: CookbookTask): boolean {
  if (task.type !== 'download') return false
  if (!['done', 'error', 'crashed', 'stopped', 'failed'].includes(task.status)) return false
  if (!task.sessionId || task.sessionId.startsWith('queue-')) return false
  if (isDemonstrablyFinishedDownload(task)) return false
  if (task._lastStatusFlipAt && Date.now() - task._lastStatusFlipAt < STATUS_FLIP_COOLDOWN_MS) {
    return false
  }
  return true
}

/**
 * Revive download tasks whose tmux session is still alive but status says finished.
 * Mirrors legacy `_selfHealStaleTasks`.
 */
export async function selfHealStaleTasks(
  tasks: CookbookTask[],
): Promise<{ tasks: CookbookTask[]; flipped: number }> {
  const candidates = tasks.filter(staleDownloadCandidate)
  if (!candidates.length) return { tasks, flipped: 0 }

  let next = [...tasks]
  let flipped = 0

  for (const candidate of candidates) {
    const { revived } = await healZombieDownload(candidate)
    if (!revived) continue
    next = next.map((t) =>
      t.sessionId === candidate.sessionId
        ? {
            ...t,
            status: 'running',
            _selfHealed: true,
            _lastStatusFlipAt: Date.now(),
          }
        : t,
    )
    flipped++
  }

  return { tasks: next, flipped }
}

export interface ProcessQueueResult {
  tasks: CookbookTask[]
  started: string[]
}

/**
 * Dequeue one download per idle host. Call after a download finishes or on poll.
 */
export async function processDownloadQueue(tasks: CookbookTask[]): Promise<ProcessQueueResult> {
  const running = tasks.filter((t) => t.type === 'download' && t.status === 'running')
  const queued = tasks.filter((t) => t.type === 'download' && t.status === 'queued')
  if (!queued.length) return { tasks, started: [] }

  const busyHosts = new Set(running.map((t) => t.remoteHost || 'local'))
  let nextTasks = [...tasks]
  const started: string[] = []

  for (const task of queued) {
    const host = task.remoteHost || 'local'
    if (busyHosts.has(host)) continue
    if (!task.payload?.repo_id) {
      nextTasks = nextTasks.map((t) =>
        t.sessionId === task.sessionId
          ? { ...t, status: 'error', output: 'No payload' }
          : t,
      )
      continue
    }

    busyHosts.add(host)
    const oldId = task.sessionId

    nextTasks = nextTasks.map((t) =>
      t.sessionId === oldId ? { ...t, status: 'running' } : t,
    )

    try {
      const payload = taskPayloadToDownloadRequest(task.payload, task.sshPort)
      const res = await downloadModel(payload)
      if (!res.ok || !res.session_id) {
        nextTasks = nextTasks.map((t) =>
          t.sessionId === oldId
            ? { ...t, status: 'error', output: res.error || 'Download failed' }
            : t,
        )
        continue
      }

      const key = downloadDedupeKey(task)
      nextTasks = nextTasks
        .filter(
          (t) =>
            !(
              t.sessionId !== oldId &&
              t.type === 'download' &&
              t.status === 'queued' &&
              downloadDedupeKey(t) === key
            ),
        )
        .map((t) =>
          t.sessionId === oldId
            ? {
                ...t,
                id: res.session_id,
                sessionId: res.session_id!,
                status: 'running',
              }
            : t,
        )
      started.push(res.session_id)
    } catch (e) {
      nextTasks = nextTasks.map((t) =>
        t.sessionId === oldId
          ? {
              ...t,
              status: 'error',
              output: e instanceof Error ? e.message : 'Download failed',
            }
          : t,
      )
    }
  }

  return { tasks: nextTasks, started }
}
