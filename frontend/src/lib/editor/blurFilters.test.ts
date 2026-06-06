import { describe, expect, it } from 'vitest'
import { applyGaussianBlur, applyMotionBlur, applyZoomBlur } from './blurFilters'

describe('blurFilters', () => {
  it('returns unchanged image for zero gaussian radius', () => {
    const src = document.createElement('canvas')
    src.width = 8
    src.height = 8
    const ctx = src.getContext('2d')!
    ctx.fillStyle = '#f00'
    ctx.fillRect(0, 0, 8, 8)
    const out = applyGaussianBlur(src, 0)
    expect(out.width).toBe(8)
    expect(out.height).toBe(8)
  })

  it('applies zoom blur without changing dimensions', () => {
    const src = document.createElement('canvas')
    src.width = 16
    src.height = 16
    src.getContext('2d')!.fillRect(0, 0, 16, 16)
    const out = applyZoomBlur(src, 20)
    expect(out.width).toBe(16)
    expect(out.height).toBe(16)
  })

  it('applies motion blur without changing dimensions', () => {
    const src = document.createElement('canvas')
    src.width = 16
    src.height = 16
    src.getContext('2d')!.fillRect(0, 0, 16, 16)
    const out = applyMotionBlur(src, 20, 45)
    expect(out.width).toBe(16)
    expect(out.height).toBe(16)
  })
})
