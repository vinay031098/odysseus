/** Crop masked selection to tight bounding box for internal clipboard paste. */

export type CroppedSelection = {
  canvas: HTMLCanvasElement
  offset: { x: number; y: number }
}

export function cropSelectionFromMask(
  source: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  sourceOffset: { x: number; y: number },
): CroppedSelection | null {
  const w = mask.width
  const h = mask.height
  const maskCtx = mask.getContext('2d')
  const srcCtx = source.getContext('2d')
  if (!maskCtx || !srcCtx) return null

  const maskData = maskCtx.getImageData(0, 0, w, h).data
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = maskData[(y * w + x) * 4 + 3]
      if (a < 8) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < minX || maxY < minY) return null

  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const octx = out.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, source.width, source.height)
  const outData = octx.createImageData(cw, ch)

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = minX + x
      const sy = minY + y
      const mi = (sy * w + sx) * 4
      const mv = maskData[mi + 3] / 255
      if (mv <= 0) continue
      const si = (sy * w + sx) * 4
      const oi = (y * cw + x) * 4
      outData.data[oi] = srcData.data[si]
      outData.data[oi + 1] = srcData.data[si + 1]
      outData.data[oi + 2] = srcData.data[si + 2]
      outData.data[oi + 3] = Math.round(srcData.data[si + 3] * mv)
    }
  }
  octx.putImageData(outData, 0, 0)
  return {
    canvas: out,
    offset: { x: sourceOffset.x + minX, y: sourceOffset.y + minY },
  }
}

export async function cropSelectionFromComposite(
  composite: HTMLCanvasElement,
  mask: HTMLCanvasElement,
): Promise<CroppedSelection | null> {
  return cropSelectionFromMask(composite, mask, { x: 0, y: 0 })
}
