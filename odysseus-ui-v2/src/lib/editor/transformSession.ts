/** Transform preview/commit — ported from static/js/editor/tools/transform-session.js */

export type TransformPending = {
  w: number
  h: number
  rot: number
  skewX: number
  skewY: number
  flipH: boolean
  flipV: boolean
}

export function defaultTransformPending(w: number, h: number): TransformPending {
  return { w, h, rot: 0, skewX: 0, skewY: 0, flipH: false, flipV: false }
}

export function reapplyTransform(
  origCanvas: HTMLCanvasElement,
  origW: number,
  origH: number,
  origOffset: { x: number; y: number },
  pending: TransformPending,
): { canvas: HTMLCanvasElement; offset: { x: number; y: number } } {
  const w = Math.max(1, Math.abs(pending.w))
  const h = Math.max(1, Math.abs(pending.h))
  const rotDeg = pending.rot
  const rotRad = (rotDeg * Math.PI) / 180
  const skewXRad = (pending.skewX * Math.PI) / 180
  const skewYRad = (pending.skewY * Math.PI) / 180

  const cos = Math.abs(Math.cos(rotRad))
  const sin = Math.abs(Math.sin(rotRad))
  const skewPadX = Math.abs(Math.tan(skewXRad)) * h
  const skewPadY = Math.abs(Math.tan(skewYRad)) * w
  const finalW = Math.max(1, Math.round(w * cos + h * sin + skewPadX))
  const finalH = Math.max(1, Math.round(w * sin + h * cos + skewPadY))

  const tmp = document.createElement('canvas')
  tmp.width = finalW
  tmp.height = finalH
  const tCtx = tmp.getContext('2d')!
  tCtx.imageSmoothingEnabled = true
  tCtx.imageSmoothingQuality = 'high'
  tCtx.save()
  tCtx.translate(finalW / 2, finalH / 2)
  if (rotDeg) tCtx.rotate(rotRad)
  if (pending.skewX || pending.skewY) {
    tCtx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0)
  }
  tCtx.scale(pending.flipH ? -1 : 1, pending.flipV ? -1 : 1)
  tCtx.drawImage(origCanvas, -w / 2, -h / 2, w, h)
  tCtx.restore()

  const origCenterX = origOffset.x + origW / 2
  const origCenterY = origOffset.y + origH / 2
  return {
    canvas: tmp,
    offset: {
      x: Math.round(origCenterX - finalW / 2),
      y: Math.round(origCenterY - finalH / 2),
    },
  }
}
