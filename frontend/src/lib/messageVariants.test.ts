import { describe, expect, it } from 'vitest'
import {
  getVariantIndex,
  hydrateMessagesWithVariants,
  nextVariantLabel,
  parseVariants,
  serializeVariants,
} from './messageVariants'

describe('messageVariants', () => {
  it('parseVariants reads raw/content fields', () => {
    const variants = parseVariants({
      variants: [
        { raw: 'first', label: 'original' },
        { raw: 'second', label: 'v1' },
      ],
      variantIndex: 0,
    })
    expect(variants).toEqual([
      { content: 'first', label: 'original' },
      { content: 'second', label: 'v1' },
    ])
    expect(getVariantIndex({ variantIndex: 0 }, 1)).toBe(0)
  })

  it('hydrateMessagesWithVariants applies selected variant content', () => {
    const out = hydrateMessagesWithVariants([
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: 'latest body',
        metadata: {
          variants: [
            { raw: 'variant A', label: 'original' },
            { raw: 'variant B', label: 'v1' },
          ],
          variantIndex: 0,
        },
      },
    ])
    expect(out[1]?.content).toBe('variant A')
  })

  it('serializeVariants and nextVariantLabel', () => {
    expect(nextVariantLabel(0)).toBe('original')
    expect(nextVariantLabel(2)).toBe('v2')
    expect(serializeVariants([{ content: 'x', label: 'original' }])).toEqual([
      { raw: 'x', label: 'original' },
    ])
  })
})
