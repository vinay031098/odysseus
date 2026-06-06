/** Luminance histogram — ported from static/js/editor/fx/histogram.js */

export type LevelsMarkers = { inBlack: number; inWhite: number }

export function computeHistogram(data: Uint8ClampedArray): Uint32Array {
  const hist = new Uint32Array(256)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue
    const y = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) | 0
    hist[Math.min(255, y)]++
  }
  return hist
}

export function drawHistogram(
  canvas: HTMLCanvasElement,
  hist: Uint32Array,
  markers?: LevelsMarkers,
): void {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)

  let peak = 1
  for (let i = 0; i < 256; i++) if (hist[i] > peak) peak = hist[i]

  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 256; i++) {
    const x = (i / 256) * w
    const bh = Math.pow(hist[i] / peak, 0.5) * h
    ctx.fillRect(x, h - bh, w / 256 + 0.5, bh)
  }

  if (markers) {
    ctx.fillStyle = 'rgba(0,0,0,0.9)'
    ctx.fillRect((markers.inBlack / 256) * w, 0, 1, h)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect((markers.inWhite / 256) * w, 0, 1, h)
  }
}

export async function sampleLayerHistogram(
  dataUrl: string,
  w: number,
  h: number,
  maxSamples = 400,
): Promise<Uint32Array> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })
  const sampleW = Math.min(maxSamples, w)
  const sampleH = Math.min(maxSamples, h)
  const tmp = document.createElement('canvas')
  tmp.width = sampleW
  tmp.height = sampleH
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(img, 0, 0, sampleW, sampleH)
  const imgData = tctx.getImageData(0, 0, sampleW, sampleH).data
  return computeHistogram(imgData)
}
