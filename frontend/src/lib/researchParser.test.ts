import { describe, expect, it } from 'vitest'
import {
  formatResearchPhase,
  isResearchTerminal,
  parseResearchStreamData,
  researchStatusLabel,
} from './researchParser'

describe('parseResearchStreamData', () => {
  it('parses progress events', () => {
    const event = parseResearchStreamData('{"phase":"searching","queries":3,"status":"running"}')
    expect(event?.phase).toBe('searching')
    expect(event?.queries).toBe(3)
  })

  it('returns null for invalid JSON', () => {
    expect(parseResearchStreamData('not-json')).toBeNull()
  })
})

describe('formatResearchPhase', () => {
  it('formats searching phase with round', () => {
    expect(formatResearchPhase({ phase: 'searching', round: 2, queries: 4 }, 8)).toBe(
      'Round 2/8: Searching (4 queries)',
    )
  })

  it('handles missing phase', () => {
    expect(formatResearchPhase(null)).toBe('Starting…')
  })
})

describe('isResearchTerminal', () => {
  it('detects final events', () => {
    expect(isResearchTerminal({ final: true, status: 'done' })).toBe(true)
    expect(isResearchTerminal({ status: 'running' })).toBe(false)
  })
})

describe('researchStatusLabel', () => {
  it('maps known statuses', () => {
    expect(researchStatusLabel('done')).toBe('Complete')
    expect(researchStatusLabel('error')).toBe('Failed')
  })
})
