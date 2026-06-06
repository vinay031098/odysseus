export type Point = { x: number; y: number }

export function buildLassoMask(
  points: Point[],
  w: number,
  h: number,
): HTMLCanvasElement | null {
  if (points.length < 3) return null
  const mask = document.createElement('canvas')
  mask.width = w
  mask.height = h
  const ctx = mask.getContext('2d')!
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.closePath()
  ctx.fillStyle = '#fff'
  ctx.fill()
  return mask
}
