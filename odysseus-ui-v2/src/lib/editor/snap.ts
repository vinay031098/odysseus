/** Snap-while-dragging — ported from static/js/editor/snap.js */

export type SnapGuide = { vertical: boolean; x?: number; y?: number }

export type SnapLayer = {
  id: number
  visible: boolean
  offset: { x: number; y: number }
  w: number
  h: number
}

export type SnapContext = {
  zoom: number
  canvasW: number
  canvasH: number
  otherLayers: SnapLayer[]
}

export function computeSnap(
  layer: { w: number; h: number },
  nx: number,
  ny: number,
  ctx: SnapContext,
): { x: number; y: number; guides: SnapGuide[] } {
  const SNAP_PX = 6 / Math.max(ctx.zoom, 0.0001)
  const { canvasW: cw, canvasH: ch } = ctx
  const { w, h } = layer

  const vTargets: { x: number }[] = [{ x: 0 }, { x: cw }, { x: cw / 2 }]
  const hTargets: { y: number }[] = [{ y: 0 }, { y: ch }, { y: ch / 2 }]

  for (const other of ctx.otherLayers) {
    if (!other.visible) continue
    const o = other.offset
    const ow = other.w
    const oh = other.h
    vTargets.push({ x: o.x }, { x: o.x + ow }, { x: o.x + ow / 2 })
    hTargets.push({ y: o.y }, { y: o.y + oh }, { y: o.y + oh / 2 })
  }

  const myEdgesX = { l: nx, cx: nx + w / 2, r: nx + w }
  const myEdgesY = { t: ny, cy: ny + h / 2, b: ny + h }
  let bestX: { snapTo: number; src: string } | null = null
  let bestDx = Infinity
  let bestY: { snapTo: number; src: string } | null = null
  let bestDy = Infinity

  for (const [src, val] of Object.entries(myEdgesX)) {
    for (const t of vTargets) {
      const d = Math.abs(t.x - val)
      if (d < SNAP_PX && d < bestDx) {
        bestDx = d
        bestX = { snapTo: t.x, src }
      }
    }
  }
  for (const [src, val] of Object.entries(myEdgesY)) {
    for (const t of hTargets) {
      const d = Math.abs(t.y - val)
      if (d < SNAP_PX && d < bestDy) {
        bestDy = d
        bestY = { snapTo: t.y, src }
      }
    }
  }

  const guides: SnapGuide[] = []
  let snappedX = nx
  let snappedY = ny
  if (bestX) {
    if (bestX.src === 'l') snappedX = bestX.snapTo
    else if (bestX.src === 'cx') snappedX = bestX.snapTo - w / 2
    else snappedX = bestX.snapTo - w
    guides.push({ vertical: true, x: bestX.snapTo })
  }
  if (bestY) {
    if (bestY.src === 't') snappedY = bestY.snapTo
    else if (bestY.src === 'cy') snappedY = bestY.snapTo - h / 2
    else snappedY = bestY.snapTo - h
    guides.push({ vertical: false, y: bestY.snapTo })
  }
  return { x: snappedX, y: snappedY, guides }
}

export function cursorForTransformHandle(id: string | null): string {
  switch (id) {
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
    case 'rot':
      return 'grab'
    default:
      return 'default'
  }
}
