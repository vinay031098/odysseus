import type { CanvasLayerData, CanvasProject } from '@/lib/canvasHelpers'
import { loadLayerImage } from '@/lib/canvasHelpers'

export type CropRect = { x: number; y: number; w: number; h: number }

export async function applyCropToProject(
  project: CanvasProject,
  crop: CropRect,
): Promise<CanvasProject> {
  const x = Math.round(crop.x)
  const y = Math.round(crop.y)
  const cw = Math.max(1, Math.round(crop.w))
  const ch = Math.max(1, Math.round(crop.h))
  const layers: CanvasLayerData[] = []
  for (const layer of project.layers) {
    const tmp = document.createElement('canvas')
    tmp.width = layer.canvasW
    tmp.height = layer.canvasH
    const tctx = tmp.getContext('2d')!
    const img = await loadLayerImage(layer.dataUrl)
    tctx.drawImage(img, 0, 0)
    const slice = tctx.getImageData(x - layer.offset.x, y - layer.offset.y, cw, ch)
    const out = document.createElement('canvas')
    out.width = cw
    out.height = ch
    out.getContext('2d')!.putImageData(slice, 0, 0)
    layers.push({
      ...layer,
      canvasW: cw,
      canvasH: ch,
      offset: { x: 0, y: 0 },
      dataUrl: out.toDataURL('image/png'),
    })
  }
  return { ...project, imgWidth: cw, imgHeight: ch, layers }
}

export function resizeCanvasProject(
  project: CanvasProject,
  newW: number,
  newH: number,
): CanvasProject {
  if (newW < 1 || newH < 1) return project
  return { ...project, imgWidth: newW, imgHeight: newH }
}

export async function mergeLayersDown(
  project: CanvasProject,
  upperId: number,
): Promise<CanvasProject | null> {
  const idx = project.layers.findIndex((l) => l.id === upperId)
  if (idx <= 0) return null
  const upper = project.layers[idx]
  const lower = project.layers[idx - 1]
  const out = document.createElement('canvas')
  out.width = project.imgWidth
  out.height = project.imgHeight
  const ctx = out.getContext('2d')!
  const lowerImg = await loadLayerImage(lower.dataUrl)
  const upperImg = await loadLayerImage(upper.dataUrl)
  ctx.drawImage(lowerImg, lower.offset.x, lower.offset.y)
  ctx.globalAlpha = upper.opacity / 100
  ctx.drawImage(upperImg, upper.offset.x, upper.offset.y)
  ctx.globalAlpha = 1
  const merged: CanvasLayerData = {
    ...lower,
    name: `${lower.name} + ${upper.name}`,
    opacity: 100,
    dataUrl: out.toDataURL('image/png'),
    canvasW: project.imgWidth,
    canvasH: project.imgHeight,
    offset: { x: 0, y: 0 },
  }
  const layers = [...project.layers]
  layers.splice(idx - 1, 2, merged)
  return {
    ...project,
    layers,
    activeLayerId: merged.id,
  }
}

export async function rotateAllLayers(
  project: CanvasProject,
  degrees: 90 | 180 | 270,
): Promise<CanvasProject> {
  const layers: CanvasLayerData[] = []
  let newW = project.imgWidth
  let newH = project.imgHeight
  if (degrees === 90 || degrees === 270) {
    newW = project.imgHeight
    newH = project.imgWidth
  }
  for (const layer of project.layers) {
    const img = await loadLayerImage(layer.dataUrl)
    const c = document.createElement('canvas')
    c.width = newW
    c.height = newH
    const ctx = c.getContext('2d')!
    ctx.translate(newW / 2, newH / 2)
    ctx.rotate((degrees * Math.PI) / 180)
    ctx.drawImage(img, -layer.canvasW / 2, -layer.canvasH / 2)
    layers.push({
      ...layer,
      canvasW: newW,
      canvasH: newH,
      offset: { x: 0, y: 0 },
      dataUrl: c.toDataURL('image/png'),
    })
  }
  return { ...project, imgWidth: newW, imgHeight: newH, layers }
}

export async function flipAllLayers(
  project: CanvasProject,
  axis: 'h' | 'v',
): Promise<CanvasProject> {
  const layers: CanvasLayerData[] = []
  for (const layer of project.layers) {
    const img = await loadLayerImage(layer.dataUrl)
    const c = document.createElement('canvas')
    c.width = layer.canvasW
    c.height = layer.canvasH
    const ctx = c.getContext('2d')!
    if (axis === 'h') {
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    } else {
      ctx.translate(0, c.height)
      ctx.scale(1, -1)
    }
    ctx.drawImage(img, 0, 0)
    layers.push({ ...layer, dataUrl: c.toDataURL('image/png') })
  }
  return { ...project, layers }
}

export async function scaleLayer(
  layer: CanvasLayerData,
  newW: number,
  newH: number,
): Promise<CanvasLayerData> {
  const img = await loadLayerImage(layer.dataUrl)
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(newW))
  c.height = Math.max(1, Math.round(newH))
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return {
    ...layer,
    canvasW: c.width,
    canvasH: c.height,
    dataUrl: c.toDataURL('image/png'),
  }
}

export function duplicateLayer(
  project: CanvasProject,
  layerId: number,
): CanvasProject | null {
  const idx = project.layers.findIndex((l) => l.id === layerId)
  if (idx < 0) return null
  const src = project.layers[idx]
  const copy: CanvasLayerData = {
    ...src,
    id: project.nextLayerId,
    name: `${src.name} copy`,
  }
  return {
    ...project,
    nextLayerId: project.nextLayerId + 1,
    activeLayerId: copy.id,
    layers: [...project.layers.slice(0, idx + 1), copy, ...project.layers.slice(idx + 1)],
  }
}

export function reorderLayers(
  project: CanvasProject,
  fromIndex: number,
  toIndex: number,
): CanvasProject {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return project
  if (fromIndex >= project.layers.length || toIndex >= project.layers.length) return project
  const layers = [...project.layers]
  const [moved] = layers.splice(fromIndex, 1)
  layers.splice(toIndex, 0, moved)
  return { ...project, layers }
}
