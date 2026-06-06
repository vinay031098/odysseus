/** Edge feather / edge delete — ported from static/js/editor/filters/edge-feather.js */

export function edgeFeather(imgData: ImageData, width: number, hardDelete: boolean): void {
  const w = imgData.width
  const h = imgData.height
  const d = imgData.data
  const dist = new Float32Array(w * h)
  dist.fill(width + 1)

  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] === 0) dist[i] = 0
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (dist[i] === 0) continue
      let min = dist[i]
      if (x > 0) min = Math.min(min, dist[i - 1] + 1)
      if (y > 0) min = Math.min(min, dist[(y - 1) * w + x] + 1)
      dist[i] = min
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (dist[i] === 0) continue
      let min = dist[i]
      if (x < w - 1) min = Math.min(min, dist[i + 1] + 1)
      if (y < h - 1) min = Math.min(min, dist[(y + 1) * w + x] + 1)
      dist[i] = min
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edgeDist = Math.min(x, y, w - 1 - x, h - 1 - y)
      const i = y * w + x
      dist[i] = Math.min(dist[i], edgeDist)
    }
  }

  for (let i = 0; i < w * h; i++) {
    if (d[i * 4 + 3] === 0) continue
    const edgeDist = dist[i]
    if (edgeDist < width) {
      if (hardDelete) {
        d[i * 4 + 3] = 0
      } else {
        const fade = edgeDist / width
        d[i * 4 + 3] = Math.round(d[i * 4 + 3] * fade)
      }
    }
  }
}

export async function applyEdgeFeatherToDataUrl(
  dataUrl: string,
  w: number,
  h: number,
  featherPx: number,
  edgeShiftPx: number,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  let imgData = ctx.getImageData(0, 0, w, h)

  if (edgeShiftPx !== 0) {
    const shift = Math.abs(edgeShiftPx)
    edgeFeather(imgData, shift, edgeShiftPx > 0)
    ctx.putImageData(imgData, 0, 0)
    imgData = ctx.getImageData(0, 0, w, h)
  }
  if (featherPx > 0) {
    edgeFeather(imgData, featherPx, false)
    ctx.putImageData(imgData, 0, 0)
  }
  return c.toDataURL('image/png')
}
