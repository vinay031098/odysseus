import type { PointerEvent as ReactPointerEvent } from 'react'

export function canvasToBase64(canvas: HTMLCanvasElement, type = 'image/png'): string {
  const dataUrl = canvas.toDataURL(type)
  return dataUrl.split(',')[1] ?? ''
}

export function base64ToImage(b64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/png;base64,${b64}`
  })
}

export function mergeMaskOnto(
  target: HTMLCanvasElement,
  addition: HTMLCanvasElement,
  mode: 'add' | 'subtract' = 'add',
) {
  const ctx = target.getContext('2d')!
  ctx.globalCompositeOperation = mode === 'subtract' ? 'destination-out' : 'source-over'
  ctx.drawImage(addition, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
}

export function maskHasPixels(canvas: HTMLCanvasElement): boolean {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true
  }
  return false
}

export type CanvasPoint = { x: number; y: number }

export function canvasCoords(
  e: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): CanvasPoint {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}
