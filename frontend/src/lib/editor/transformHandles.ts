/** Transform handle geometry — ported from static/js/editor/tools/transform-handles.js */

import type { TransformPending } from './transformSession'

export type TransformHandleId = 'nw' | 'ne' | 'sw' | 'se' | 'rot' | 'move' | null

function knobPosition(
  cxh: number,
  cyh: number,
  rotRad: number,
  baseInnerR: number,
  rotOffset: number,
  canvasW: number,
  canvasH: number,
) {
  let rotInside = false
  const outsideR = baseInnerR + rotOffset
  const knobLocalX = cxh + Math.sin(rotRad) * outsideR
  const knobLocalY = cyh - Math.cos(rotRad) * outsideR
  if (
    knobLocalX < 0 ||
    knobLocalY < 0 ||
    knobLocalX > canvasW ||
    knobLocalY > canvasH
  ) {
    rotInside = true
  }
  const innerR = rotInside ? Math.max(4, baseInnerR - rotOffset) : baseInnerR
  const rotR = rotInside ? innerR : baseInnerR + rotOffset
  return {
    rotInside,
    rotX: cxh + Math.sin(rotRad) * rotR,
    rotY: cyh - Math.cos(rotRad) * rotR,
  }
}

function rotatedCorners(
  cx: number,
  cy: number,
  preW: number,
  preH: number,
  rotRad: number,
) {
  const cosA = Math.cos(rotRad)
  const sinA = Math.sin(rotRad)
  const rotCorner = (dx: number, dy: number) => ({
    x: cx + dx * cosA - dy * sinA,
    y: cy + dx * sinA + dy * cosA,
  })
  return {
    tl: rotCorner(-preW / 2, -preH / 2),
    tr: rotCorner(preW / 2, -preH / 2),
    br: rotCorner(preW / 2, preH / 2),
    bl: rotCorner(-preW / 2, preH / 2),
  }
}

export function getTransformHandleAt(
  x: number,
  y: number,
  offset: { x: number; y: number },
  layerW: number,
  layerH: number,
  pending: TransformPending,
  zoom: number,
  canvasW: number,
  canvasH: number,
): TransformHandleId {
  const threshold = 8 / Math.max(zoom, 0.0001)
  const rotOffset = 24 / Math.max(zoom, 0.0001)
  const cxh = offset.x + layerW / 2
  const cyh = offset.y + layerH / 2
  const rotRad = (pending.rot * Math.PI) / 180
  const preW = pending.w || layerW
  const preH = pending.h || layerH
  const baseInnerR = preH / 2
  const knob = knobPosition(cxh, cyh, rotRad, baseInnerR, rotOffset, canvasW, canvasH)
  const { tl, tr, br, bl } = rotatedCorners(cxh, cyh, preW, preH, rotRad)

  const handles = [
    { x: tl.x, y: tl.y, id: 'nw' as const },
    { x: tr.x, y: tr.y, id: 'ne' as const },
    { x: br.x, y: br.y, id: 'se' as const },
    { x: bl.x, y: bl.y, id: 'sw' as const },
    { x: knob.rotX, y: knob.rotY, id: 'rot' as const },
  ]
  for (const c of handles) {
    if (Math.abs(x - c.x) < threshold && Math.abs(y - c.y) < threshold) return c.id
  }

  if (pointInRotatedRect(x, y, cxh, cyh, preW, preH, rotRad)) return 'move'
  return null
}

function pointInRotatedRect(
  px: number,
  py: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotRad: number,
) {
  const cos = Math.cos(-rotRad)
  const sin = Math.sin(-rotRad)
  const dx = px - cx
  const dy = py - cy
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  return lx >= -w / 2 && lx <= w / 2 && ly >= -h / 2 && ly <= h / 2
}

export function drawTransformHandles(
  ctx: CanvasRenderingContext2D,
  offset: { x: number; y: number },
  layerW: number,
  layerH: number,
  pending: TransformPending,
  zoom: number,
  canvasW: number,
  canvasH: number,
  activeHandle: TransformHandleId,
) {
  const sz = 10 / Math.max(zoom, 0.0001)
  const stroke = 1.5 / Math.max(zoom, 0.0001)
  const preW = pending.w || layerW
  const preH = pending.h || layerH
  const cxh = offset.x + layerW / 2
  const cyh = offset.y + layerH / 2
  const rotRad = (pending.rot * Math.PI) / 180
  const { tl, tr, br, bl } = rotatedCorners(cxh, cyh, preW, preH, rotRad)

  const drawRectOutline = () => {
    ctx.beginPath()
    ctx.moveTo(tl.x, tl.y)
    ctx.lineTo(tr.x, tr.y)
    ctx.lineTo(br.x, br.y)
    ctx.lineTo(bl.x, bl.y)
    ctx.closePath()
    ctx.stroke()
  }
  ctx.lineWidth = 1 / Math.max(zoom, 0.0001)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.setLineDash([6 / Math.max(zoom, 0.0001), 4 / Math.max(zoom, 0.0001)])
  drawRectOutline()
  ctx.strokeStyle = '#fff'
  ctx.setLineDash([])
  drawRectOutline()

  const rotOffset = 24 / Math.max(zoom, 0.0001)
  const baseInnerR = preH / 2
  const knob = knobPosition(cxh, cyh, rotRad, baseInnerR, rotOffset, canvasW, canvasH)
  const innerX = cxh + Math.sin(rotRad) * baseInnerR
  const innerY = cyh - Math.cos(rotRad) * baseInnerR

  if (!knob.rotInside) {
    ctx.beginPath()
    ctx.moveTo(innerX, innerY)
    ctx.lineTo(knob.rotX, knob.rotY)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 1 / Math.max(zoom, 0.0001)
    ctx.stroke()
  }

  const corners = [
    { x: tl.x, y: tl.y, id: 'nw' },
    { x: tr.x, y: tr.y, id: 'ne' },
    { x: br.x, y: br.y, id: 'se' },
    { x: bl.x, y: bl.y, id: 'sw' },
    { x: knob.rotX, y: knob.rotY, id: 'rot' },
  ]
  for (const c of corners) {
    const active = c.id === activeHandle
    const radius = active ? sz * 0.75 : sz / 2
    ctx.beginPath()
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = active ? '#e06c75' : '#fff'
    ctx.fill()
    ctx.lineWidth = stroke
    ctx.strokeStyle = active ? '#fff' : 'rgba(0, 0, 0, 0.5)'
    ctx.stroke()
  }
}

export function rotationFromPointer(
  x: number,
  y: number,
  offset: { x: number; y: number },
  layerW: number,
  layerH: number,
  shiftKey: boolean,
): number {
  const cx = offset.x + layerW / 2
  const cy = offset.y + layerH / 2
  const rad = Math.atan2(y - cy, x - cx) + Math.PI / 2
  let deg = Math.round((rad * 180) / Math.PI)
  if (shiftKey) deg = Math.round(deg / 15) * 15
  while (deg > 180) deg -= 360
  while (deg <= -180) deg += 360
  return deg
}
