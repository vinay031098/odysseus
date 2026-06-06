import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildOutpaintMask } from './outpaintMask'

describe('buildOutpaintMask', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      }),
      putImageData: vi.fn(),
      drawImage: vi.fn(),
      filter: 'none',
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(64),
        width: 4,
        height: 4,
      })),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext
  })

  it('detects transparent pixels', () => {
    const w = 4
    const h = 4
    const data = new Uint8ClampedArray(w * h * 4)
    data[3] = 255
    data[7] = 255
    const result = buildOutpaintMask(data, w, h)
    expect(result).not.toBeNull()
    expect(result!.emptyCount).toBe(w * h - 2)
  })

  it('returns null when fully opaque', () => {
    const w = 2
    const h = 2
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 3; i < data.length; i += 4) data[i] = 255
    expect(buildOutpaintMask(data, w, h)).toBeNull()
  })
})
