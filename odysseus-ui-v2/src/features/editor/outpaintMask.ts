import { dilateMask } from './maskOps'

/** Build mask covering transparent areas of a flattened composite (for outpaint). */
export function buildOutpaintMask(
  flatData: Uint8ClampedArray,
  w: number,
  h: number,
  dilatePx = 12,
): { mask: HTMLCanvasElement; emptyCount: number } | null {
  const maskRaw = document.createElement('canvas')
  maskRaw.width = w
  maskRaw.height = h
  const mrCtx = maskRaw.getContext('2d')!
  const mrImg = mrCtx.createImageData(w, h)
  let emptyCount = 0
  for (let i = 0; i < flatData.length; i += 4) {
    if (flatData[i + 3] === 0) {
      mrImg.data[i] = 255
      mrImg.data[i + 1] = 255
      mrImg.data[i + 2] = 255
      mrImg.data[i + 3] = 255
      emptyCount++
    }
  }
  if (emptyCount === 0) return null
  mrCtx.putImageData(mrImg, 0, 0)
  const expanded = dilateMask(maskRaw, dilatePx)
  return { mask: expanded, emptyCount }
}
