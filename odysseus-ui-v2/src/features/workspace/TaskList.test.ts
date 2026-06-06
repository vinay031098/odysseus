import { describe, expect, it } from 'vitest'
import { groupTasksByStatus } from '@/lib/workspace/taskHelpers'
import type { ScheduledTask } from '@/api/workspace-types'

describe('groupTasksByStatus', () => {
  it('orders known statuses before other', () => {
    const tasks: ScheduledTask[] = [
      { id: '1', name: 'A', task_type: 'llm', status: 'paused' },
      { id: '2', name: 'B', task_type: 'llm', status: 'active' },
      { id: '3', name: 'C', task_type: 'llm', status: 'custom' },
    ]
    const groups = groupTasksByStatus(tasks)
    expect([...groups.keys()][0]).toBe('active')
    expect([...groups.keys()][1]).toBe('paused')
    expect(groups.get('other')?.map((t) => t.id)).toEqual(['3'])
  })
})
