import { describe, expect, it } from 'vitest'
import { computeSnap } from './snap'

describe('computeSnap', () => {
  it('snaps layer left edge to canvas left', () => {
    const result = computeSnap({ w: 100, h: 50 }, 4, 10, {
      zoom: 1,
      canvasW: 800,
      canvasH: 600,
      otherLayers: [],
    })
    expect(result.x).toBe(0)
    expect(result.guides.some((g) => g.vertical && g.x === 0)).toBe(true)
  })

  it('snaps to another layer center', () => {
    const result = computeSnap({ w: 100, h: 50 }, 148, 10, {
      zoom: 1,
      canvasW: 800,
      canvasH: 600,
      otherLayers: [
        { id: 2, visible: true, offset: { x: 100, y: 0 }, w: 100, h: 50 },
      ],
    })
    expect(result.x).toBe(150)
  })
})
