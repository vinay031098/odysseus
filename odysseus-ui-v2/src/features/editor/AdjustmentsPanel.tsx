import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CanvasLayerData } from '@/lib/canvasHelpers'
import { drawHistogram, sampleLayerHistogram } from '@/lib/editor/histogram'
import { applyGaussianBlur, applyMotionBlur, applyZoomBlur } from '@/lib/editor/blurFilters'
import { loadLayerImage } from '@/lib/canvasHelpers'
import {
  applyAdjustmentsToDataUrl,
  DEFAULT_LEVELS,
  type BrightnessContrastParams,
  type HueSaturationParams,
  type LevelsParams,
} from './pixelAdjustments'

type AdjustmentsPanelProps = {
  layer: CanvasLayerData | undefined
  onApply: (dataUrl: string, w: number, h: number, label: string) => void
}

export function AdjustmentsPanel({ layer, onApply }: AdjustmentsPanelProps) {
  const histRef = useRef<HTMLCanvasElement>(null)
  const [bc, setBc] = useState<BrightnessContrastParams>({ brightness: 1, contrast: 1 })
  const [hs, setHs] = useState<HueSaturationParams>({ hue: 0, saturation: 1 })
  const [levels, setLevels] = useState<LevelsParams>(DEFAULT_LEVELS)
  const [gaussianRadius, setGaussianRadius] = useState(0)
  const [zoomStrength, setZoomStrength] = useState(0)
  const [motionLength, setMotionLength] = useState(0)
  const [motionAngle, setMotionAngle] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!layer || !histRef.current) return
    void sampleLayerHistogram(layer.dataUrl, layer.canvasW, layer.canvasH).then((hist) => {
      if (histRef.current) drawHistogram(histRef.current, hist, levels)
    })
  }, [layer, levels.inBlack, levels.inWhite])

  if (!layer) {
    return (
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted">
        Select a layer to adjust.
      </div>
    )
  }

  const runAdjustments = async (label: string) => {
    setBusy(true)
    try {
      const dataUrl = await applyAdjustmentsToDataUrl(
        layer.dataUrl,
        layer.canvasW,
        layer.canvasH,
        bc,
        hs,
        levels,
      )
      onApply(dataUrl, layer.canvasW, layer.canvasH, label)
      setBc({ brightness: 1, contrast: 1 })
      setHs({ hue: 0, saturation: 1 })
      setLevels(DEFAULT_LEVELS)
    } finally {
      setBusy(false)
    }
  }

  const runBlur = async (kind: 'gaussian' | 'zoom' | 'motion') => {
    setBusy(true)
    try {
      const img = await loadLayerImage(layer.dataUrl)
      const base = document.createElement('canvas')
      base.width = layer.canvasW
      base.height = layer.canvasH
      base.getContext('2d')!.drawImage(img, 0, 0)
      const out =
        kind === 'gaussian'
          ? applyGaussianBlur(base, gaussianRadius)
          : kind === 'zoom'
            ? applyZoomBlur(base, zoomStrength)
            : applyMotionBlur(base, motionLength, motionAngle)
      const label =
        kind === 'gaussian' ? 'Gaussian blur' : kind === 'zoom' ? 'Zoom blur' : 'Motion blur'
      onApply(out.toDataURL('image/png'), out.width, out.height, label)
      setGaussianRadius(0)
      setZoomStrength(0)
      setMotionLength(0)
      setMotionAngle(0)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-border px-3 py-2 text-xs">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">
        Adjustments
      </div>
      <canvas ref={histRef} width={200} height={48} className="mb-2 w-full rounded border border-border" />

      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        In black
        <input
          type="range"
          min={0}
          max={254}
          value={levels.inBlack}
          onChange={(e) => setLevels((l) => ({ ...l, inBlack: Number(e.target.value) }))}
          className="flex-1"
        />
        <span className="w-6 tabular-nums">{levels.inBlack}</span>
      </label>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        In white
        <input
          type="range"
          min={1}
          max={255}
          value={levels.inWhite}
          onChange={(e) => setLevels((l) => ({ ...l, inWhite: Number(e.target.value) }))}
          className="flex-1"
        />
        <span className="w-6 tabular-nums">{levels.inWhite}</span>
      </label>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Gamma
        <input
          type="range"
          min={10}
          max={300}
          value={Math.round(levels.gamma * 100)}
          onChange={(e) => setLevels((l) => ({ ...l, gamma: Number(e.target.value) / 100 }))}
          className="flex-1"
        />
        <span className="w-8 tabular-nums">{levels.gamma.toFixed(2)}</span>
      </label>

      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Brightness
        <input
          type="range"
          min={0}
          max={200}
          value={Math.round(bc.brightness * 100)}
          onChange={(e) => setBc((p) => ({ ...p, brightness: Number(e.target.value) / 100 }))}
          className="flex-1"
        />
      </label>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Contrast
        <input
          type="range"
          min={0}
          max={200}
          value={Math.round(bc.contrast * 100)}
          onChange={(e) => setBc((p) => ({ ...p, contrast: Number(e.target.value) / 100 }))}
          className="flex-1"
        />
      </label>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Hue
        <input
          type="range"
          min={-180}
          max={180}
          value={hs.hue}
          onChange={(e) => setHs((p) => ({ ...p, hue: Number(e.target.value) }))}
          className="flex-1"
        />
      </label>
      <label className="mb-3 flex items-center gap-2 text-[10px] text-muted">
        Saturation
        <input
          type="range"
          min={0}
          max={200}
          value={Math.round(hs.saturation * 100)}
          onChange={(e) => setHs((p) => ({ ...p, saturation: Number(e.target.value) / 100 }))}
          className="flex-1"
        />
      </label>

      <Button
        size="sm"
        className="mb-3 h-7 w-full text-[10px]"
        disabled={busy}
        onClick={() => void runAdjustments('Adjustments')}
      >
        Apply adjustments
      </Button>

      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">Blur</div>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Gaussian
        <input
          type="range"
          min={0}
          max={40}
          value={gaussianRadius}
          onChange={(e) => setGaussianRadius(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-6 tabular-nums">{gaussianRadius}</span>
      </label>
      <Button
        size="sm"
        variant="outline"
        className="mb-2 h-7 w-full text-[10px]"
        disabled={busy || gaussianRadius <= 0}
        onClick={() => void runBlur('gaussian')}
      >
        Apply Gaussian blur
      </Button>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Zoom
        <input
          type="range"
          min={0}
          max={100}
          value={zoomStrength}
          onChange={(e) => setZoomStrength(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-6 tabular-nums">{zoomStrength}</span>
      </label>
      <Button
        size="sm"
        variant="outline"
        className="mb-2 h-7 w-full text-[10px]"
        disabled={busy || zoomStrength <= 0}
        onClick={() => void runBlur('zoom')}
      >
        Apply zoom blur
      </Button>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Motion length
        <input
          type="range"
          min={0}
          max={120}
          value={motionLength}
          onChange={(e) => setMotionLength(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-6 tabular-nums">{motionLength}</span>
      </label>
      <label className="mb-2 flex items-center gap-2 text-[10px] text-muted">
        Motion angle
        <input
          type="range"
          min={-180}
          max={180}
          value={motionAngle}
          onChange={(e) => setMotionAngle(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-8 tabular-nums">{motionAngle}°</span>
      </label>
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-full text-[10px]"
        disabled={busy || motionLength <= 0}
        onClick={() => void runBlur('motion')}
      >
        Apply motion blur
      </Button>
    </div>
  )
}
