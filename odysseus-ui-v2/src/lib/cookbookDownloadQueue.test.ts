import { describe, expect, it } from 'vitest'
import type { CookbookTask } from '@/api/cookbookServe'
import {
  downloadDedupeKey,
  downloadOutputLooksActive,
  sameDownloadTask,
  selfHealDownloadFromOutput,
} from '@/lib/cookbookDownloadQueue'

describe('cookbookDownloadQueue', () => {
  it('detects active shard download output', () => {
    expect(downloadOutputLooksActive('model-00012-of-00082.safetensors: 56%|')).toBe(true)
    expect(downloadOutputLooksActive('DOWNLOAD_OK')).toBe(false)
  })

  it('matches same download by repo and host', () => {
    const task: CookbookTask = {
      sessionId: 'dl-1',
      name: 'llama',
      type: 'download',
      status: 'running',
      payload: { repo_id: 'org/model', remote_host: 'gpu.local' },
      remoteHost: 'gpu.local',
    }
    expect(sameDownloadTask(task, 'org/model', 'gpu.local')).toBe(true)
    expect(sameDownloadTask(task, 'org/other', 'gpu.local')).toBe(false)
  })

  it('builds dedupe keys', () => {
    const task: CookbookTask = {
      sessionId: 'dl-1',
      name: 'llama',
      type: 'download',
      status: 'queued',
      payload: { repo_id: 'org/model' },
    }
    expect(downloadDedupeKey(task)).toBe('org/model@local')
  })

  it('self-heals finished task with active output', () => {
    const task: CookbookTask = {
      sessionId: 'dl-1',
      name: 'llama',
      type: 'download',
      status: 'done',
    }
    const healed = selfHealDownloadFromOutput(task, 'model-00001-of-00010.safetensors: 12%|')
    expect(healed?.status).toBe('running')
  })
})
