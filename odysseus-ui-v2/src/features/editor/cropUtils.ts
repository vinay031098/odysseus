import type { CanvasProject } from '@/lib/canvasHelpers'
import { loadLayerImage } from '@/lib/canvasHelpers'

export type CropRect = { x: number; y: number; w: number; h: number }

export function normalizeCropRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  canvasW: number,
  canvasH: number,
): CropRect {
  let x = Math.min(start.x, end.x)
  let y = Math.min(start.y, end.y)
  let w = Math.abs(end.x - start.x)
  let h = Math.abs(end.y - start.y)
  x = Math.max(0, Math.min(x, canvasW))
  y = Math.max(0, Math.min(y, canvasH))
  w = Math.min(w, canvasW - x)
  h = Math.min(h, canvasH - y)
  return { x, y, w, h }
}

export async function applyCropToProject(
  project: CanvasProject,
  rect: CropRect,
): Promise<CanvasProject> {
  if (rect.w < 1 || rect.h < 1) return project
  const layers = await Promise.all(
    project.layers.map(async (layer) => {
      const img = await loadLayerImage(layer.dataUrl)
      const c = document.createElement('canvas')
      c.width = rect.w
      c.height = rect.h
      const ctx = c.getContext('2d')!
      const sx = rect.x - layer.offset.x
      const sy = rect.y - layer.offset.y
      ctx.drawImage(img, sx, sy, rect.w, rect.h, 0, 0, rect.w, rect.h)
      return {
        ...layer,
        canvasW: rect.w,
        canvasH: rect.h,
        offset: { x: 0, y: 0 },
        dataUrl: c.toDataURL('image/png'),
      }
    }),
  )
  return {
    ...project,
    imgWidth: rect.w,
    imgHeight: rect.h,
    layers,
  }
}
