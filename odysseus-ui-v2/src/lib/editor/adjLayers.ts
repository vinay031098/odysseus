/** Non-destructive adjustment layer stack — ported from static/js/editor/fx/pixel-pass.js */

import {
  applyBrightnessContrast,
  applyColorBalance,
  applyHueSaturation,
  applyLevels,
  type BrightnessContrastParams,
  type ColorBalanceParams,
  type HueSaturationParams,
  type LevelsParams,
} from '@/features/editor/pixelAdjustments'
import { loadLayerImage } from '@/lib/canvasHelpers'

export type AdjLayerType =
  | 'brightness-contrast'
  | 'hue-saturation'
  | 'levels'
  | 'color-balance'

export type AdjLayer = {
  id: string
  type: AdjLayerType
  name: string
  visible: boolean
  opacity: number
  params: BrightnessContrastParams | HueSaturationParams | LevelsParams | ColorBalanceParams
}

export const ADJ_LAYER_LABELS: Record<AdjLayerType, string> = {
  'brightness-contrast': 'Brightness / Contrast',
  'hue-saturation': 'Hue / Saturation',
  levels: 'Levels',
  'color-balance': 'Color Balance',
}

function applyAdjustment(src: HTMLCanvasElement, adj: AdjLayer): HTMLCanvasElement {
  switch (adj.type) {
    case 'brightness-contrast':
      return applyBrightnessContrast(src, adj.params as BrightnessContrastParams)
    case 'hue-saturation':
      return applyHueSaturation(src, adj.params as HueSaturationParams)
    case 'levels':
      return applyLevels(src, adj.params as LevelsParams)
    case 'color-balance':
      return applyColorBalance(src, adj.params as ColorBalanceParams)
    default:
      return src
  }
}

export async function renderLayerWithAdjLayers(
  dataUrl: string,
  w: number,
  h: number,
  adjLayers: AdjLayer[] = [],
): Promise<HTMLCanvasElement> {
  const img = await loadLayerImage(dataUrl)
  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  base.getContext('2d')!.drawImage(img, 0, 0)

  const stack = adjLayers.filter((a) => a.visible)
  if (stack.length === 0) return base

  let cur: HTMLCanvasElement = base
  for (const adj of stack) {
    const adjOut = applyAdjustment(cur, adj)
    if (adj.opacity >= 99.9) {
      cur = adjOut
    } else {
      const blend = document.createElement('canvas')
      blend.width = w
      blend.height = h
      const bctx = blend.getContext('2d')!
      bctx.drawImage(cur, 0, 0)
      bctx.globalAlpha = adj.opacity / 100
      bctx.drawImage(adjOut, 0, 0)
      bctx.globalAlpha = 1
      cur = blend
    }
  }
  return cur
}

export function newAdjLayer(type: AdjLayerType, id?: string): AdjLayer {
  const base = { id: id ?? `adj-${Date.now()}`, visible: true, opacity: 100 }
  switch (type) {
    case 'brightness-contrast':
      return { ...base, type, name: ADJ_LAYER_LABELS[type], params: { brightness: 1, contrast: 1 } }
    case 'hue-saturation':
      return { ...base, type, name: ADJ_LAYER_LABELS[type], params: { hue: 0, saturation: 1 } }
    case 'levels':
      return {
        ...base,
        type,
        name: ADJ_LAYER_LABELS[type],
        params: { inBlack: 0, inWhite: 255, gamma: 1, outBlack: 0, outWhite: 255 },
      }
    case 'color-balance':
      return {
        ...base,
        type,
        name: ADJ_LAYER_LABELS[type],
        params: {
          shadows: { r: 0, g: 0, b: 0 },
          midtones: { r: 0, g: 0, b: 0 },
          highlights: { r: 0, g: 0, b: 0 },
        },
      }
  }
}
