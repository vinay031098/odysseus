/** Mask dilation/erosion and feather — ported from static/js/editor/mask-utils.js */

export function dilateMask(src: HTMLCanvasElement, px: number): HTMLCanvasElement {
  const w = src.width
  const h = src.height
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  const ctx = tmp.getContext('2d')!
  if (px === 0) {
    ctx.drawImage(src, 0, 0)
    return tmp
  }
  const dilate = px > 0
  const radius = Math.abs(px)
  ctx.filter = `blur(${radius}px)`
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  const img = ctx.getImageData(0, 0, w, h)
  const threshold = dilate ? 8 : 247
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3]
    const keep = dilate ? a > threshold : a >= threshold
    if (keep) {
      img.data[i] = 255
      img.data[i + 1] = 255
      img.data[i + 2] = 255
      img.data[i + 3] = 255
    } else {
      img.data[i + 3] = 0
    }
  }
  ctx.putImageData(img, 0, 0)
  return tmp
}

export function featherMask(src: HTMLCanvasElement, featherPx: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  if (featherPx <= 0) {
    ctx.drawImage(src, 0, 0)
    return out
  }
  ctx.filter = `blur(${featherPx}px)`
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  return out
}

export function applyMaskDilateAndFeather(
  mask: HTMLCanvasElement,
  dilatePx: number,
  featherPx: number,
): HTMLCanvasElement {
  let shaped = mask
  if (dilatePx !== 0) shaped = dilateMask(mask, dilatePx)
  if (featherPx > 0) return featherMask(shaped, featherPx)
  const copy = document.createElement('canvas')
  copy.width = shaped.width
  copy.height = shaped.height
  copy.getContext('2d')!.drawImage(shaped, 0, 0)
  return copy
}
