import { describe, expect, it } from 'vitest'
import {
  appendServeFlag,
  mutateServeCommand,
  prependServeEnv,
  removeServeFlag,
  replaceServeFlag,
} from '@/lib/cookbookServeCommandHelpers'

describe('cookbookServeCommandHelpers', () => {
  const base = 'vllm serve org/model --port 8000 --tensor-parallel-size 2'

  it('replaces existing flags', () => {
    expect(replaceServeFlag(base, '--tensor-parallel-size', '4')).toContain('--tensor-parallel-size 4')
    expect(replaceServeFlag(base, '--tensor-parallel-size', '4')).not.toContain('--tensor-parallel-size 2')
  })

  it('appends missing flags', () => {
    expect(appendServeFlag(base, '--enforce-eager')).toContain('--enforce-eager')
  })

  it('removes flags', () => {
    expect(removeServeFlag(base, '--tensor-parallel-size')).not.toContain('--tensor-parallel-size')
  })

  it('prepends env vars', () => {
    expect(prependServeEnv(base, 'VLLM_USE_FLASHINFER_SAMPLER=0 ')).toMatch(
      /^VLLM_USE_FLASHINFER_SAMPLER=0 /,
    )
  })

  it('mutateServeCommand dispatches by op', () => {
    expect(mutateServeCommand(base, 'replace', '--max-model-len', '4096')).toContain(
      '--max-model-len 4096',
    )
  })
})
