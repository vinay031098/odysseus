export type BrightnessContrastParams = {
  brightness: number
  contrast: number
}

export type HueSaturationParams = {
  hue: number
  saturation: number
}

export type ColorBalanceChannel = { r: number; g: number; b: number }

export type ColorBalanceParams = {
  shadows: ColorBalanceChannel
  midtones: ColorBalanceChannel
  highlights: ColorBalanceChannel
}

export const DEFAULT_COLOR_BALANCE: ColorBalanceParams = {
  shadows: { r: 0, g: 0, b: 0 },
  midtones: { r: 0, g: 0, b: 0 },
  highlights: { r: 0, g: 0, b: 0 },
}

export type LevelsParams = {
  inBlack: number
  inWhite: number
  gamma: number
  outBlack: number
  outWhite: number
}

export const DEFAULT_LEVELS: LevelsParams = {
  inBlack: 0,
  inWhite: 255,
  gamma: 1,
  outBlack: 0,
  outWhite: 255,
}

export function applyBrightnessContrast(
  src: HTMLCanvasElement,
  params: BrightnessContrastParams,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.filter = `brightness(${params.brightness}) contrast(${params.contrast})`
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  return out
}

export function applyLevels(src: HTMLCanvasElement, params: LevelsParams): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, out.width, out.height)
  const d = img.data
  const inLow = Math.max(0, Math.min(254, params.inBlack))
  const inHigh = Math.max(inLow + 1, Math.min(255, params.inWhite))
  const gamma = Math.max(0.1, params.gamma || 1)
  const outLow = Math.max(0, Math.min(255, params.outBlack))
  const outHigh = Math.max(outLow, Math.min(255, params.outWhite))
  const inv = 1 / gamma
  const span = outHigh - outLow
  const lut = new Uint8ClampedArray(256)
  for (let v = 0; v < 256; v++) {
    let t = (v - inLow) / (inHigh - inLow)
    if (t < 0) t = 0
    else if (t > 1) t = 1
    t = Math.pow(t, inv)
    lut[v] = Math.round(t * span + outLow)
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]]
    d[i + 1] = lut[d[i + 1]]
    d[i + 2] = lut[d[i + 2]]
  }
  ctx.putImageData(img, 0, 0)
  return out
}

export function applyColorBalance(
  src: HTMLCanvasElement,
  params: ColorBalanceParams,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, out.width, out.height)
  const d = img.data
  const scale = 0.6
  const s = params.shadows
  const m = params.midtones
  const hi = params.highlights
  const sR = s.r * scale
  const sG = s.g * scale
  const sB = s.b * scale
  const mR = m.r * scale
  const mG = m.g * scale
  const mB = m.b * scale
  const hR = hi.r * scale
  const hG = hi.g * scale
  const hB = hi.b * scale
  const wS = new Float32Array(256)
  const wM = new Float32Array(256)
  const wH = new Float32Array(256)
  const sig = 0.25
  for (let v = 0; v < 256; v++) {
    const t = v / 255
    wS[v] = Math.exp(-(t * t) / (2 * sig * sig))
    wM[v] = Math.exp(-((t - 0.5) * (t - 0.5)) / (2 * sig * sig))
    wH[v] = Math.exp(-((1 - t) * (1 - t)) / (2 * sig * sig))
  }
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]
    let g = d[i + 1]
    let b = d[i + 2]
    const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0
    const ws = wS[Y]
    const wm = wM[Y]
    const wh = wH[Y]
    r += sR * ws + mR * wm + hR * wh
    g += sG * ws + mG * wm + hG * wh
    b += sB * ws + mB * wm + hB * wh
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b
  }
  ctx.putImageData(img, 0, 0)
  return out
}

export function applyHueSaturation(
  src: HTMLCanvasElement,
  params: HueSaturationParams,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.filter = `saturate(${params.saturation}) hue-rotate(${params.hue}deg)`
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  return out
}

export async function applyAdjustmentsToDataUrl(
  dataUrl: string,
  w: number,
  h: number,
  bc?: BrightnessContrastParams,
  hs?: HueSaturationParams,
  levels?: LevelsParams,
  colorBalance?: ColorBalanceParams,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })
  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  base.getContext('2d')!.drawImage(img, 0, 0)
  let current = base
  if (bc && (bc.brightness !== 1 || bc.contrast !== 1)) {
    current = applyBrightnessContrast(current, bc)
  }
  if (hs && (hs.hue !== 0 || hs.saturation !== 1)) {
    current = applyHueSaturation(current, hs)
  }
  if (
    levels &&
    (levels.inBlack !== 0 ||
      levels.inWhite !== 255 ||
      levels.gamma !== 1 ||
      levels.outBlack !== 0 ||
      levels.outWhite !== 255)
  ) {
    current = applyLevels(current, levels)
  }
  if (
    colorBalance &&
    (colorBalance.shadows.r !== 0 ||
      colorBalance.shadows.g !== 0 ||
      colorBalance.shadows.b !== 0 ||
      colorBalance.midtones.r !== 0 ||
      colorBalance.midtones.g !== 0 ||
      colorBalance.midtones.b !== 0 ||
      colorBalance.highlights.r !== 0 ||
      colorBalance.highlights.g !== 0 ||
      colorBalance.highlights.b !== 0)
  ) {
    current = applyColorBalance(current, colorBalance)
  }
  return current.toDataURL('image/png')
}
