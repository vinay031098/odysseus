import { describe, expect, it } from 'vitest'
import { edgeFeather } from './edgeFeather'

function makeImageData(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c.getContext('2d')!.createImageData(w, h)
}

describe('edgeFeather', () => {
  it('feathers alpha near edges', () => {
    const img = makeImageData(8, 8)
    for (let i = 0; i < 64; i++) {
      img.data[i * 4 + 3] = 255
    }
    edgeFeather(img, 2, false)
    expect(img.data[3]).toBeLessThan(255)
    expect(img.data[(4 * 8 + 4) * 4 + 3]).toBe(255)
  })

  it('hard-deletes edge band', () => {
    const img = makeImageData(3, 3)
    for (let i = 0; i < 9; i++) img.data[i * 4 + 3] = 255
    edgeFeather(img, 1, true)
    expect(img.data[3]).toBe(0)
    expect(img.data[(1 * 3 + 1) * 4 + 3]).toBe(255)
  })
})
