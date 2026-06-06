import { describe, expect, it } from 'vitest'
import type { CookbookGpu } from './cookbookServe'

/** Smoke types used by the serve panel — catches accidental field renames. */
describe('cookbookServe types', () => {
  it('accepts GPU probe shape from backend', () => {
    const gpu: CookbookGpu = {
      index: 0,
      name: 'GPU',
      uuid: 'GPU-abc',
      free_mb: 1024,
      total_mb: 8192,
      used_mb: 7168,
      util_pct: 10,
      busy: false,
      processes: [],
    }
    expect(gpu.index).toBe(0)
  })
})
