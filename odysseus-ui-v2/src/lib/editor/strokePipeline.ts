/** Brush stroke painting with hardness — mirrors legacy stroke-pipeline.js. */

export type StrokeOptions = {
  size: number
  hardness: number
  color: string
  opacity?: number
}

function stampRadius(size: number): number {
  return Math.max(1, size / 2)
}

function drawSoftStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: StrokeOptions,
  erase: boolean,
) {
  const radius = stampRadius(opts.size)
  const hardness = Math.max(0, Math.min(100, opts.hardness)) / 100
  const hardStop = radius * hardness
  const alpha = (opts.opacity ?? 100) / 100

  const grad = ctx.createRadialGradient(x, y, hardStop, x, y, radius)
  if (erase) {
    grad.addColorStop(0, `rgba(0,0,0,${alpha})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else {
    const { r, g, b } = hexToRgb(opts.color)
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Paint a segment from (x0,y0) to (x1,y1) with overlapping stamps. */
export function strokeSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: StrokeOptions,
  erase: boolean,
) {
  const radius = stampRadius(opts.size)
  const dist = Math.hypot(x1 - x0, y1 - y0)
  const step = Math.max(1, radius * 0.35)
  const steps = Math.max(1, Math.ceil(dist / step))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    drawSoftStamp(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, opts, erase)
  }
}

/** Single-point stamp (pointer down). */
export function strokePoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  opts: StrokeOptions,
  erase: boolean,
) {
  drawSoftStamp(ctx, x, y, opts, erase)
}
