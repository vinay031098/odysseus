/** 4-connected flood fill — returns mask canvas with white where filled. */
export function floodFillMask(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  seedX: number,
  seedY: number,
  tolerance: number,
): HTMLCanvasElement | null {
  if (seedX < 0 || seedY < 0 || seedX >= w || seedY >= h) return null

  const seedIdx = (seedY * w + seedX) * 4
  const sr = src[seedIdx]
  const sg = src[seedIdx + 1]
  const sb = src[seedIdx + 2]
  const sa = src[seedIdx + 3]
  const tol = Math.pow(tolerance * 4.42, 2)

  const visited = new Uint8Array(w * h)
  const stack = [seedX, seedY]
  visited[seedY * w + seedX] = 1

  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const idx = ny * w + nx
      if (visited[idx]) continue
      const o = idx * 4
      const dr = src[o] - sr
      const dg = src[o + 1] - sg
      const db = src[o + 2] - sb
      const da = src[o + 3] - sa
      if (dr * dr + dg * dg + db * db + da * da <= tol) {
        visited[idx] = 1
        stack.push(nx, ny)
      }
    }
  }

  const mask = document.createElement('canvas')
  mask.width = w
  mask.height = h
  const mCtx = mask.getContext('2d')!
  const mData = mCtx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    if (visited[i]) {
      const o = i * 4
      mData.data[o] = 255
      mData.data[o + 1] = 255
      mData.data[o + 2] = 255
      mData.data[o + 3] = 255
    }
  }
  mCtx.putImageData(mData, 0, 0)
  return mask
}
