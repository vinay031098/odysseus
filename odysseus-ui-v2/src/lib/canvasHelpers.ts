/** Canvas document serialization — matches legacy gallery editor project format. */

import type { AdjLayer } from '@/lib/editor/adjLayers'

export const CANVAS_MARKER = '<!-- odysseus-canvas -->'
export const CANVAS_PROJECT_TYPE = 'odysseus-gallery-editor-project'

export type CanvasLayerData = {
  id: number
  name: string
  visible: boolean
  opacity: number
  locked: boolean
  canvasW: number
  canvasH: number
  offset: { x: number; y: number }
  dataUrl: string
  adjLayers?: AdjLayer[]
}

export type CanvasProject = {
  v: number
  type: typeof CANVAS_PROJECT_TYPE
  imgWidth: number
  imgHeight: number
  activeLayerId: number
  nextLayerId: number
  layers: CanvasLayerData[]
}

export function isCanvasDocument(language: string | null | undefined, content: string): boolean {
  if ((language || '').toLowerCase() === 'canvas') return true
  return content.trimStart().startsWith(CANVAS_MARKER)
}

export function parseCanvasProject(content: string): CanvasProject | null {
  const trimmed = content.trim()
  let json = trimmed
  if (trimmed.startsWith(CANVAS_MARKER)) {
    json = trimmed.slice(CANVAS_MARKER.length).trim()
  }
  try {
    const parsed = JSON.parse(json) as CanvasProject
    if (parsed?.type !== CANVAS_PROJECT_TYPE || !Array.isArray(parsed.layers)) return null
    return parsed
  } catch {
    return null
  }
}

export function serializeCanvasProject(project: CanvasProject): string {
  return `${CANVAS_MARKER}\n${JSON.stringify(project)}`
}

export function emptyCanvasProject(w = 800, h = 600): CanvasProject {
  const layerId = 1
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return {
    v: 1,
    type: CANVAS_PROJECT_TYPE,
    imgWidth: w,
    imgHeight: h,
    activeLayerId: layerId,
    nextLayerId: layerId + 1,
    layers: [
      {
        id: layerId,
        name: 'Background',
        visible: true,
        opacity: 100,
        locked: false,
        canvasW: w,
        canvasH: h,
        offset: { x: 0, y: 0 },
        dataUrl: canvas.toDataURL('image/png'),
      },
    ],
  }
}

export function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl.split(',')[1] ?? ''
}

export async function loadLayerImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load layer image'))
    img.src = dataUrl
  })
}
