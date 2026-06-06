import { describe, expect, it } from 'vitest'
import {
  formatExtraRoots,
  normalizeKeybind,
  parseExtraRoots,
} from './settings-fields'

describe('settings-fields', () => {
  it('normalizes keybind strings', () => {
    expect(normalizeKeybind(' Ctrl + K ')).toBe('ctrl+k')
  })

  it('parses tool path roots', () => {
    expect(parseExtraRoots(['/tmp', ''])).toEqual(['/tmp'])
    expect(parseExtraRoots('nope')).toEqual([])
  })

  it('formats extra roots', () => {
    expect(formatExtraRoots(['/a', '/b'])).toBe('/a\n/b')
  })
})
