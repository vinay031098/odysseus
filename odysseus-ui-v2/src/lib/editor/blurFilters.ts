/** Blur filters — ported from static/js/editor/filters/blur.js */

export function applyGaussianBlur(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const dst = out.getContext('2d')!
  if (!radius || radius <= 0) {
    dst.drawImage(src, 0, 0)
    return out
  }

  const r = radius
  const w = src.width
  const h = src.height
  const m = Math.ceil(r * 2 + 4)
  const pad = document.createElement('canvas')
  pad.width = w + m * 2
  pad.height = h + m * 2
  const pctx = pad.getContext('2d')!
  pctx.drawImage(src, m, m)
  pctx.drawImage(src, 0, 0, w, 1, m, 0, w, m)
  pctx.drawImage(src, 0, h - 1, w, 1, m, m + h, w, m)
  pctx.drawImage(src, 0, 0, 1, h, 0, m, m, h)
  pctx.drawImage(src, w - 1, 0, 1, h, m + w, m, m, h)
  pctx.drawImage(src, 0, 0, 1, 1, 0, 0, m, m)
  pctx.drawImage(src, w - 1, 0, 1, 1, m + w, 0, m, m)
  pctx.drawImage(src, 0, h - 1, 1, 1, 0, m + h, m, m)
  pctx.drawImage(src, w - 1, h - 1, 1, 1, m + w, m + h, m, m)

  const blurred = document.createElement('canvas')
  blurred.width = pad.width
  blurred.height = pad.height
  const octx = blurred.getContext('2d')!
  octx.filter = `blur(${r}px)`
  octx.drawImage(pad, 0, 0)
  dst.drawImage(blurred, m, m, w, h, 0, 0, w, h)
  return out
}

export function applyMotionBlur(
  src: HTMLCanvasElement,
  length: number,
  angleDeg: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  const w = src.width
  const h = src.height
  out.width = w
  out.height = h
  const dst = out.getContext('2d')!
  if (!length || length <= 0) {
    dst.drawImage(src, 0, 0)
    return out
  }

  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const steps = Math.max(4, Math.min(80, Math.round(length)))
  const acc = document.createElement('canvas')
  acc.width = w
  acc.height = h
  const actx = acc.getContext('2d')!
  actx.globalCompositeOperation = 'lighter'
  actx.globalAlpha = 1 / steps
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1) - 0.5
    actx.drawImage(src, dx * length * t, dy * length * t)
  }
  actx.globalCompositeOperation = 'source-over'
  actx.globalAlpha = 1
  dst.drawImage(acc, 0, 0)
  return out
}

export function applyZoomBlur(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  const w = src.width
  const h = src.height
  out.width = w
  out.height = h
  const dst = out.getContext('2d')!
  const steps = 16
  dst.drawImage(src, 0, 0)
  dst.globalAlpha = 0.18
  for (let s = 1; s <= steps; s++) {
    const t = s / steps
    const scale = 1 + (strength / 200) * t
    const sw = w * scale
    const sh = h * scale
    dst.drawImage(src, (w - sw) / 2, (h - sh) / 2, sw, sh)
  }
  dst.globalAlpha = 1
  return out
}
