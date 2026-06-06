import type { CookbookTask } from '@/api/cookbookServe'
import { api } from '@/api/client'

export interface LocalProbeResult {
  alive?: boolean
  error?: string
}

export function connectHostFromRemote(remoteHost?: string): string {
  if (!remoteHost?.trim()) return '127.0.0.1'
  const m = remoteHost.trim().match(/^[^@]+@(.+)$/)
  return m ? m[1] : remoteHost.trim()
}

export function serveEndpointBaseUrl(task: CookbookTask): string | null {
  const cmd = task.payload?._cmd || ''
  if (!cmd.trim()) return null
  const portMatch = cmd.match(/--port[=\s]+(\d+)/) || cmd.match(/(?:^|\s)-p[=\s]+(\d+)/)
  const port = portMatch ? portMatch[1] : '8000'
  const host = connectHostFromRemote(task.remoteHost)
  return `http://${host}:${port}/v1`
}

export function serveTaskFailed(task: CookbookTask): boolean {
  if (task.type !== 'serve') return false
  return !!task._unreachable || ['error', 'crashed', 'failed'].includes(task.status)
}

export async function fetchLocalEndpointProbes(): Promise<Record<string, LocalProbeResult>> {
  return api.get<Record<string, LocalProbeResult>>('/api/model-endpoints/probe-local')
}

export function applyServeReachability(
  tasks: CookbookTask[],
  endpoints: Array<{ id: string; base_url: string }>,
  probes: Record<string, LocalProbeResult>,
): { tasks: CookbookTask[]; changed: boolean } {
  const runningServes = tasks.filter((t) => t.type === 'serve' && t.status === 'running')
  if (!runningServes.length) return { tasks, changed: false }

  let changed = false
  const next = tasks.map((task) => {
    if (task.type !== 'serve' || task.status !== 'running') return task

    const baseUrl = serveEndpointBaseUrl(task)
    if (!baseUrl) return task

    const ep = endpoints.find((e) => {
      const normalized = e.base_url.replace(/\/+$/, '')
      return normalized === baseUrl.replace(/\/+$/, '')
    })
    if (!ep) return task

    const pr = probes[ep.id]
    if (!pr || pr.alive === undefined) return task

    let updated = { ...task }
    if (pr.alive === true && !task._everReachable) {
      updated = { ...updated, _everReachable: true }
      changed = true
    }

    const unreachable = pr.alive === false
    if (unreachable && !updated._everReachable) return task

    if (!!updated._unreachable !== unreachable) {
      updated = { ...updated, _unreachable: unreachable }
      changed = true
    }
    return updated
  })

  return { tasks: next, changed }
}
