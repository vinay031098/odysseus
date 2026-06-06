import { describe, expect, it } from 'vitest'
import { researchFailedNoSources, researchProgressPercent } from './researchJobHelpers'

describe('researchProgressPercent', () => {
  it('uses max rounds when set', () => {
    expect(researchProgressPercent({ round: 2 }, 4)).toBe(50)
  })

  it('defaults to 8 rounds in auto mode', () => {
    expect(researchProgressPercent({ round: 4 }, 0)).toBe(50)
  })
})

describe('researchFailedNoSources', () => {
  it('flags zero sources', () => {
    expect(researchFailedNoSources(0)).toBe(true)
    expect(researchFailedNoSources(3)).toBe(false)
    expect(researchFailedNoSources(undefined)).toBe(false)
  })
})
