import { describe, expect, it } from 'vitest'
import { mockCanvas2d } from '@/test/mockCanvas2d'
import { strokePoint, strokeSegment } from './strokePipeline'

describe('strokePipeline', () => {
  mockCanvas2d()

  it('paints without throwing', () => {
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 32
    const ctx = c.getContext('2d')!
    expect(() =>
      strokePoint(ctx, 16, 16, { size: 8, hardness: 100, color: '#ff0000' }, false),
    ).not.toThrow()
  })

  it('erases without throwing', () => {
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 32
    const ctx = c.getContext('2d')!
    ctx.fillRect(0, 0, 32, 32)
    expect(() =>
      strokeSegment(ctx, 10, 16, 22, 16, { size: 12, hardness: 80, color: '#000' }, true),
    ).not.toThrow()
  })
})
