import type { ScheduledTask } from '@/api/workspace-types'

const STATUS_ORDER = ['active', 'paused', 'running', 'completed', 'error'] as const

export function groupTasksByStatus(tasks: ScheduledTask[]): Map<string, ScheduledTask[]> {
  const groups = new Map<string, ScheduledTask[]>()
  for (const status of STATUS_ORDER) {
    const matching = tasks.filter((t) => t.status === status)
    if (matching.length) groups.set(status, matching)
  }
  const known = new Set(STATUS_ORDER)
  const other = tasks.filter((t) => !known.has(t.status as (typeof STATUS_ORDER)[number]))
  if (other.length) groups.set('other', other)
  return groups
}
