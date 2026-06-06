import { describe, expect, it } from 'vitest'
import type { CookbookGpu, CookbookTask, CookbookTaskLiveStatus } from '@/api/cookbookServe'
import {
  buildGpuQuery,
  buildServePresetDraft,
  buildVllmServeCommand,
  extractGpusFromPreset,
  formatVramReadout,
  gpuIsBusy,
  mergeTasksWithLiveStatus,
  normalizeServeCmd,
  parseGpuSelection,
  presetDisplayLabel,
  presetHost,
  presetsForModel,
  serveTasksOnly,
  taskBadgeText,
  taskStatusLabel,
  tmuxGracefulKill,
  vramHealth,
  vramUsedPercent,
} from './cookbookServeHelpers'

const sampleGpu: CookbookGpu = {
  index: 0,
  name: 'RTX 4090',
  free_mb: 2048,
  total_mb: 24576,
  used_mb: 22528,
  util_pct: 72,
  busy: true,
  processes: [{ pid: 1234, name: 'vllm', used_mb: 22000 }],
}

describe('buildGpuQuery', () => {
  it('builds host and ssh_port query', () => {
    expect(buildGpuQuery('gpu-box', '2222')).toEqual({
      host: 'gpu-box',
      ssh_port: '2222',
    })
  })

  it('omits empty values', () => {
    expect(buildGpuQuery('', '')).toEqual({})
  })
})

describe('vram helpers', () => {
  it('computes used percent', () => {
    expect(vramUsedPercent(sampleGpu)).toBe(92)
  })

  it('formats readout with tight hint', () => {
    expect(formatVramReadout(sampleGpu)).toMatch(/tight/)
  })

  it('flags critical when nearly full', () => {
    const full = { ...sampleGpu, used_mb: 24000, free_mb: 576 }
    expect(vramHealth(full)).toBe('critical')
  })
})

describe('gpuIsBusy', () => {
  it('is busy with processes', () => {
    expect(gpuIsBusy(sampleGpu)).toBe(true)
  })

  it('is free when idle', () => {
    expect(
      gpuIsBusy({
        ...sampleGpu,
        busy: false,
        processes: [],
        used_mb: 1000,
        free_mb: 23576,
      }),
    ).toBe(false)
  })
})

describe('taskStatusLabel', () => {
  it('maps download running', () => {
    expect(taskStatusLabel('running', 'download')).toBe('downloading')
  })

  it('maps serve ready', () => {
    expect(taskStatusLabel('ready', 'serve')).toBe('ready')
  })
})

describe('taskBadgeText', () => {
  const task: CookbookTask = {
    sessionId: 'serve-1',
    name: 'llama',
    type: 'serve',
    status: 'running',
  }

  it('shows live phase for warming serve', () => {
    const live: CookbookTaskLiveStatus = {
      session_id: 'serve-1',
      type: 'serve',
      model: 'llama',
      status: 'running',
      phase: 'loading 45%',
    }
    expect(taskBadgeText(task, live)).toBe('loading 45%')
  })
})

describe('tmuxGracefulKill', () => {
  it('builds local kill command', () => {
    expect(tmuxGracefulKill('serve-abc')).toContain('tmux kill-session -t serve-abc')
  })

  it('builds remote kill command', () => {
    expect(tmuxGracefulKill('serve-abc', 'gpu.local', '2222')).toMatch(
      /ssh -p 2222 gpu\.local/,
    )
  })
})

describe('buildVllmServeCommand', () => {
  it('includes repo and port', () => {
    expect(buildVllmServeCommand('meta/llama', 8000)).toBe(
      'vllm serve meta/llama --port 8000',
    )
  })
})

describe('mergeTasksWithLiveStatus', () => {
  it('pairs saved tasks with live status', () => {
    const saved: CookbookTask[] = [
      { sessionId: 'a', name: 'm', type: 'serve', status: 'running' },
    ]
    const live: CookbookTaskLiveStatus[] = [
      { session_id: 'a', type: 'serve', model: 'm', status: 'ready' },
    ]
    expect(mergeTasksWithLiveStatus(saved, live)[0].live?.status).toBe('ready')
  })
})

describe('serveTasksOnly', () => {
  it('filters finished serves', () => {
    const items = [
      {
        task: { sessionId: 'a', name: 'x', type: 'serve', status: 'running' },
        live: { session_id: 'a', type: 'serve', model: 'x', status: 'running' },
      },
      {
        task: { sessionId: 'b', name: 'y', type: 'serve', status: 'stopped' },
        live: { session_id: 'b', type: 'serve', model: 'y', status: 'stopped' },
      },
    ]
    expect(serveTasksOnly(items)).toHaveLength(1)
  })
})

describe('serve preset helpers', () => {
  const presets = [
    {
      name: 'llama',
      model: 'meta-llama/Llama-3-8B',
      label: 'fast',
      cmd: 'vllm serve meta-llama/Llama-3-8B --port 8000',
      remoteHost: 'gpu-box',
      port: '8000',
    },
    {
      name: 'qwen',
      model: 'Qwen/Qwen2-7B',
      cmd: 'CUDA_VISIBLE_DEVICES=1 vllm serve Qwen/Qwen2-7B --port 8001',
      fields: { gpus: '1', port: '8001' },
    },
  ]

  it('filters presets by repo or short name', () => {
    expect(presetsForModel(presets, 'meta-llama/Llama-3-8B')).toHaveLength(1)
    expect(presetsForModel(presets, 'Llama-3-8B')).toHaveLength(1)
    expect(presetsForModel(presets, 'Qwen/Qwen2-7B')).toHaveLength(1)
  })

  it('normalizes command whitespace', () => {
    expect(normalizeServeCmd('vllm  serve   x')).toBe('vllm serve x')
  })

  it('extracts gpu selection from preset fields or cmd', () => {
    expect(extractGpusFromPreset(presets[1])).toBe('1')
    expect(parseGpuSelection('0,1')).toBe(0)
  })

  it('builds preset draft matching legacy shape', () => {
    const draft = buildServePresetDraft({
      repo: 'org/model',
      port: '8000',
      host: 'gpu.local',
      cmd: 'vllm serve org/model --port 8000',
      gpus: '0',
      label: 'default',
    })
    expect(draft.model).toBe('org/model')
    expect(draft.remoteHost).toBe('gpu.local')
    expect(draft.fields?.gpus).toBe('0')
  })

  it('uses label for display', () => {
    expect(presetDisplayLabel(presets[0])).toBe('fast')
    expect(presetHost(presets[0])).toBe('gpu-box')
  })
})
