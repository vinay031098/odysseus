import '@testing-library/jest-dom/vitest'

// jsdom delegates HTMLCanvasElement (getContext, toDataURL, toBlob) to the optional
// `canvas` package when installed. Without it, editor tests log:
// "Not implemented: HTMLCanvasElement's toDataURL() method"
import { ImageData as CanvasImageData } from 'canvas'
import 'canvas'

if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = CanvasImageData as unknown as typeof globalThis.ImageData
}

const storage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value))
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => storage.clear(),
    key: (index: number) => [...storage.keys()][index] ?? null,
    get length() {
      return storage.size
    },
  },
  configurable: true,
})
