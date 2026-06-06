import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dilateMask, featherMask } from './maskOps'

function makeMock2d(w = 10, h = 10) {
  const imageData = {
    data: new Uint8ClampedArray(w * h * 4),
    width: w,
    height: h,
  }
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => imageData),
    putImageData: vi.fn(),
    filter: 'none',
    fillStyle: '',
    fillRect: vi.fn(),
  }
}

describe('maskOps', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() =>
      makeMock2d(),
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext
  })

  it('dilateMask returns canvas with same dimensions', () => {
    const src = document.createElement('canvas')
    src.width = 10
    src.height = 10
    const out = dilateMask(src, 2)
    expect(out.width).toBe(10)
    expect(out.height).toBe(10)
  })

  it('featherMask returns same-size canvas', () => {
    const src = document.createElement('canvas')
    src.width = 8
    src.height = 8
    const out = featherMask(src, 3)
    expect(out.width).toBe(8)
    expect(out.height).toBe(8)
  })
})
