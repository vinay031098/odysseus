import { describe, expect, it } from 'vitest'
import { parseDownloadInput, splitRepoTag, stripHfUrl } from '@/lib/cookbookDownloadHelpers'

describe('cookbookDownloadHelpers', () => {
  it('strips huggingface URLs', () => {
    expect(stripHfUrl('https://huggingface.co/meta-llama/Llama-3.2-1B')).toBe(
      'meta-llama/Llama-3.2-1B',
    )
  })

  it('splits quant tags', () => {
    expect(splitRepoTag('unsloth/Llama-3.2-1B:Q4_K_M')).toEqual({
      repo: 'unsloth/Llama-3.2-1B',
      include: '*Q4_K_M*',
    })
  })

  it('rejects bare model names', () => {
    expect(parseDownloadInput('Llama-3.2-1B').error).toMatch(/full HuggingFace repo/)
  })

  it('accepts org/model ids', () => {
    expect(parseDownloadInput('meta-llama/Llama-3.2-1B')).toEqual({
      repo: 'meta-llama/Llama-3.2-1B',
      include: null,
    })
  })
})
