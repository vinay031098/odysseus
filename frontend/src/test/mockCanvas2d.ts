import { beforeEach, vi } from 'vitest'

/** Minimal 2d canvas mock for jsdom unit tests. */
export function mockCanvas2d() {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn((type: string) => {
      if (type !== '2d') return null
      const store = new Map<string, unknown>()
      return {
        strokeStyle: '#000',
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        filter: 'none',
        lineWidth: 1,
        lineCap: 'butt',
        lineJoin: 'miter',
        setLineDash: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        clip: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        createImageData: (w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        putImageData: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        measureText: vi.fn(() => ({ width: 0 })),
        set fillStyle(v: string) {
          store.set('fillStyle', v)
        },
        get fillStyle() {
          return (store.get('fillStyle') as string) ?? '#000'
        },
      }
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,abc')
  })
}
