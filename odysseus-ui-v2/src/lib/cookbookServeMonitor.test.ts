import { describe, expect, it } from 'vitest'
import type { CookbookTask } from '@/api/cookbookServe'
import {
  applyServeReachability,
  connectHostFromRemote,
  serveEndpointBaseUrl,
  serveTaskFailed,
} from '@/lib/cookbookServeMonitor'

describe('cookbookServeMonitor', () => {
  it('resolves connect host from remote SSH user@host', () => {
    expect(connectHostFromRemote('user@gpu-box')).toBe('gpu-box')
    expect(connectHostFromRemote('')).toBe('127.0.0.1')
  })

  it('builds serve endpoint base URL from command port', () => {
    const task: CookbookTask = {
      sessionId: 's1',
      name: 'model',
      type: 'serve',
      status: 'running',
      remoteHost: 'user@localhost',
      payload: { _cmd: 'vllm serve org/model --port 8123' },
    }
    expect(serveEndpointBaseUrl(task)).toBe('http://localhost:8123/v1')
  })

  it('flags unreachable serve tasks', () => {
    const task: CookbookTask = {
      sessionId: 's1',
      name: 'model',
      type: 'serve',
      status: 'running',
      _unreachable: true,
    }
    expect(serveTaskFailed(task)).toBe(true)
  })

  it('marks serve unreachable after it was reachable', () => {
    const tasks: CookbookTask[] = [
      {
        sessionId: 's1',
        name: 'model',
        type: 'serve',
        status: 'running',
        _everReachable: true,
        payload: { _cmd: 'vllm serve org/model --port 8000' },
      },
    ]
    const { tasks: next, changed } = applyServeReachability(
      tasks,
      [{ id: 'ep1', base_url: 'http://127.0.0.1:8000/v1' }],
      { ep1: { alive: false, error: 'connection refused' } },
    )
    expect(changed).toBe(true)
    expect(next[0]._unreachable).toBe(true)
  })
})
