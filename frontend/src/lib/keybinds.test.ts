import { describe, expect, it } from 'vitest'
import { matchesKeybind } from './keybinds'

describe('matchesKeybind', () => {
  it('matches ctrl+k style combos', () => {
    const e = {
      key: 'k',
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent
    expect(matchesKeybind(e, 'ctrl+k')).toBe(true)
  })

  it('rejects wrong modifier', () => {
    const e = {
      key: 'k',
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    } as KeyboardEvent
    expect(matchesKeybind(e, 'ctrl+k')).toBe(false)
  })

  it('matches comma and slash combos', () => {
    expect(
      matchesKeybind(
        { key: ',', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false } as KeyboardEvent,
        'ctrl+,',
      ),
    ).toBe(true)
    expect(
      matchesKeybind(
        { key: '/', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false } as KeyboardEvent,
        'ctrl+/',
      ),
    ).toBe(true)
  })
})
