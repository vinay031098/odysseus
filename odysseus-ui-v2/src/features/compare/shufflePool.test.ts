import { describe, expect, it, beforeEach } from 'vitest'
import {
  getExcludedModels,
  pickShuffleModels,
  setExcludedModels,
  setModelExcluded,
} from './shufflePool'
import type { ModelOption } from '@/api/types'

const pool: ModelOption[] = [
  { id: 'a', label: 'A', url: 'http://x', endpointId: 'e1' },
  { id: 'b', label: 'B', url: 'http://x', endpointId: 'e1' },
  { id: 'c', label: 'C', url: 'http://x', endpointId: 'e2' },
]

describe('shufflePool', () => {
  beforeEach(() => {
    setExcludedModels([])
  })

  it('excludes models from shuffle picks', () => {
    setModelExcluded('b', false)
    const picked = pickShuffleModels(pool, 2)
    expect(picked.every((m) => m.id !== 'b')).toBe(true)
    expect(picked).toHaveLength(2)
  })

  it('persists exclusions in localStorage', () => {
    setExcludedModels(['a'])
    expect(getExcludedModels()).toEqual(['a'])
  })
})
