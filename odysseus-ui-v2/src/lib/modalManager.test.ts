import { describe, expect, it } from 'vitest'
import { getLastToolRoute, noteAppRoute, toggleAppWindow } from './modalManager'

describe('modalManager', () => {
  it('remembers tool routes', () => {
    noteAppRoute('/calendar')
    expect(getLastToolRoute()).toBe('/calendar')
    noteAppRoute('/settings')
    expect(getLastToolRoute()).toBe('/calendar')
  })

  it('toggles between chat and last tool', () => {
    noteAppRoute('/gallery')
    const paths: string[] = []
    toggleAppWindow('/chat', (p) => paths.push(p))
    expect(paths).toEqual(['/gallery'])
    toggleAppWindow('/gallery', (p) => paths.push(p))
    expect(paths).toEqual(['/gallery', '/chat'])
  })
})
