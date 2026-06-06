import { beforeEach, describe, expect, it, vi } from 'vitest'
import { floodFillMask } from './floodFill'

describe('floodFillMask', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      }),
      putImageData: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext
  })

  it('fills connected region from seed', () => {
    const w = 4
    const h = 4
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const v = x < 2 ? 255 : 0
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 255
      }
    }
    const mask = floodFillMask(data, w, h, 0, 0, 10)
    expect(mask).not.toBeNull()
    expect(mask!.width).toBe(w)
    expect(mask!.height).toBe(h)
  })

  it('returns null for out-of-bounds seed', () => {
    const data = new Uint8ClampedArray(16)
    expect(floodFillMask(data, 2, 2, 5, 5, 10)).toBeNull()
  })
})
