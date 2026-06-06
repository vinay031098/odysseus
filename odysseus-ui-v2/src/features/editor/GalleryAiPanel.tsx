import { useState } from 'react'
import {
  Blend,
  Download,
  Eraser,
  Expand,
  Loader2,
  Scissors,
  Sparkles,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import * as galleryApi from '@/api/gallery'
import * as imageTools from '@/api/imageTools'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageToolModelSelect } from './ImageToolModelSelect'
import { buildOutpaintMask } from './outpaintMask'
import { parseModelValue } from '@/lib/editor/imageModelCaps'

type GalleryAiPanelProps = {
  getFlattenedBase64: () => Promise<string>
  getMaskBase64: () => string | null
  getCompositeImageData: () => Promise<Uint8ClampedArray>
  canvasWidth: number
  canvasHeight: number
  onResultLayer: (name: string, dataUrl: string, w: number, h: number) => void
  onExport?: () => void
}

export function GalleryAiPanel({
  getFlattenedBase64,
  getMaskBase64,
  getCompositeImageData,
  canvasWidth,
  canvasHeight,
  onResultLayer,
  onExport,
}: GalleryAiPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const [harmonizeColor, setHarmonizeColor] = useState(65)
  const [harmonizeSeam, setHarmonizeSeam] = useState(0)
  const [inpaintStrength, setInpaintStrength] = useState(85)
  const [inpaintModel, setInpaintModel] = useState('')
  const [harmonizeModel, setHarmonizeModel] = useState('')
  const [styleModel, setStyleModel] = useState('')
  const [upscaleModel, setUpscaleModel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const modelFields = (value: string) => {
    const { endpoint, model } = parseModelValue(value)
    return {
      ...(endpoint ? { _endpoint: endpoint } : {}),
      ...(model ? { _model: model } : {}),
    }
  }

  const applyResult = (b64: string, name: string, w = canvasWidth, h = canvasHeight) => {
    onResultLayer(name, `data:image/png;base64,${b64}`, w, h)
    toast.success(`${name} complete`)
  }

  const runInpaint = async (opts?: {
    prompt?: string
    strength?: number
    maskB64?: string
    busyKey?: string
    resultName?: string
  }) => {
    const mask = opts?.maskB64 ?? getMaskBase64()
    if (!mask) {
      toast.error('Paint a mask first')
      return
    }
    const key = opts?.busyKey ?? 'inpaint'
    setBusy(key)
    try {
      const image = await getFlattenedBase64()
      const res = await imageTools.inpaintImage({
        image,
        mask,
        prompt: opts?.prompt ?? (prompt.trim() || 'fill naturally'),
        strength: opts?.strength ?? inpaintStrength / 100,
        ...modelFields(inpaintModel),
      })
      if (res.error || !res.image) throw new Error(res.error || 'Inpaint failed')
      applyResult(res.image, opts?.resultName ?? 'Inpaint')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Inpaint failed')
    } finally {
      setBusy(null)
    }
  }

  const runRemove = async () => {
    const { endpoint } = parseModelValue(inpaintModel)
    const isOpenAI = endpoint.toLowerCase().includes('api.openai.com')
    const userP = prompt.trim()
    const removePrompt = isOpenAI
      ? userP
        ? `Remove ${userP}. Fill seamlessly with the surrounding background, photorealistic, no objects, no people.`
        : 'Remove the masked area. Fill seamlessly with the surrounding background, photorealistic, no objects, no people.'
      : 'seamless natural background, photorealistic, continuation of surrounding scene, empty area, no objects, no people, no text, clean'
    await runInpaint({
      prompt: removePrompt,
      strength: isOpenAI ? inpaintStrength / 100 : 0.99,
      busyKey: 'remove',
      resultName: 'Remove',
    })
  }

  const runOutpaint = async () => {
    setBusy('outpaint')
    try {
      const flatData = await getCompositeImageData()
      const built = buildOutpaintMask(flatData, canvasWidth, canvasHeight)
      if (!built) {
        toast.error('No empty areas to outpaint')
        setBusy(null)
        return
      }
      const maskB64 = built.mask.toDataURL('image/png').split(',')[1] ?? ''
      await runInpaint({
        prompt:
          prompt.trim() ||
          'seamless natural continuation of the surrounding image, photorealistic, matching style',
        strength: 0.99,
        maskB64,
        busyKey: 'outpaint',
        resultName: 'Outpaint',
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Outpaint failed')
      setBusy(null)
    }
  }

  const runRembg = async () => {
    setBusy('rembg')
    try {
      const image = await getFlattenedBase64()
      const hint = getMaskBase64()
      const res = await imageTools.removeBackground({
        image,
        hint_mask: hint ?? undefined,
      })
      if (res.error || !res.image) throw new Error(res.error || 'Background removal failed')
      applyResult(res.image, 'Remove BG')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Background removal failed')
    } finally {
      setBusy(null)
    }
  }

  const runHarmonize = async () => {
    setBusy('harmonize')
    try {
      const image = await getFlattenedBase64()
      const mask = getMaskBase64()
      const res = await imageTools.harmonizeImage({
        image,
        mask: mask ?? undefined,
        strength: harmonizeColor / 100,
        seam_fix: harmonizeSeam / 100,
        ...modelFields(harmonizeModel),
      })
      if (res.error || !res.image) throw new Error(res.error || 'Harmonize failed')
      applyResult(res.image, 'Harmonize')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Harmonize failed')
    } finally {
      setBusy(null)
    }
  }

  const runUpscale = async () => {
    setBusy('upscale')
    try {
      const b64 = await getFlattenedBase64()
      const blob = await fetch(`data:image/png;base64,${b64}`).then((r) => r.blob())
      const res = await galleryApi.galleryAiUpscale(blob, 2)
      if (res.error || !res.image) throw new Error(res.error || 'Upscale failed')
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = `data:image/png;base64,${res.image}`
      })
      applyResult(res.image!, 'Upscale 2×', img.naturalWidth, img.naturalHeight)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upscale failed')
    } finally {
      setBusy(null)
    }
  }

  const runStyleTransfer = async () => {
    if (!stylePrompt.trim()) {
      toast.error('Enter a style prompt')
      return
    }
    setBusy('style')
    try {
      const b64 = await getFlattenedBase64()
      const blob = await fetch(`data:image/png;base64,${b64}`).then((r) => r.blob())
      const res = await galleryApi.galleryStyleTransfer(blob, stylePrompt.trim())
      if (res.error || !res.image) throw new Error(res.error || 'Style transfer failed')
      applyResult(res.image, 'Style')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Style transfer failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3 overflow-y-auto p-3 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Inpaint</h3>
        <label className="mb-2 block text-xs text-muted">
          Model
          <ImageToolModelSelect
            tool="inpaint"
            value={inpaintModel}
            onChange={setInpaintModel}
            className="mt-1 h-8 w-full rounded-md border border-border bg-panel px-2 text-xs"
          />
        </label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe fill…"
          className="mb-2"
        />
        <label className="mb-2 block text-xs text-muted">
          Strength {(inpaintStrength / 100).toFixed(2)}
          <input
            type="range"
            min={10}
            max={100}
            value={inpaintStrength}
            onChange={(e) => setInpaintStrength(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1" size="sm" disabled={!!busy} onClick={() => void runInpaint()}>
            {busy === 'inpaint' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            Generate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!!busy}
            onClick={() => void runRemove()}
          >
            {busy === 'remove' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Eraser className="h-4 w-4" aria-hidden />
            )}
            Remove
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!!busy}
            onClick={() => void runOutpaint()}
          >
            {busy === 'outpaint' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Expand className="h-4 w-4" aria-hidden />
            )}
            Outpaint
          </Button>
        </div>
      </section>

      <section className="space-y-2 border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Harmonize</h3>
        <label className="block text-xs text-muted">
          Model
          <ImageToolModelSelect
            tool="img2img"
            value={harmonizeModel}
            onChange={setHarmonizeModel}
            className="mt-1 h-8 w-full rounded-md border border-border bg-panel px-2 text-xs"
          />
        </label>
        <label className="block text-xs text-muted">
          Color match {(harmonizeColor / 100).toFixed(2)}
          <input
            type="range"
            min={0}
            max={100}
            value={harmonizeColor}
            onChange={(e) => setHarmonizeColor(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-muted">
          Seam fix {(harmonizeSeam / 100).toFixed(2)}
          <input
            type="range"
            min={0}
            max={100}
            value={harmonizeSeam}
            onChange={(e) => setHarmonizeSeam(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!!busy}
          onClick={() => void runHarmonize()}
        >
          {busy === 'harmonize' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Blend className="h-4 w-4" aria-hidden />
          )}
          Harmonize
        </Button>
      </section>

      <section className="space-y-2 border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">AI actions</h3>
        <label className="block text-xs text-muted">
          Upscale model
          <ImageToolModelSelect
            tool="img2img"
            value={upscaleModel}
            onChange={setUpscaleModel}
            className="mt-1 h-8 w-full rounded-md border border-border bg-panel px-2 text-xs"
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!!busy}
          onClick={() => void runUpscale()}
        >
          {busy === 'upscale' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ZoomIn className="h-4 w-4" aria-hidden />
          )}
          Upscale 2×
        </Button>
        <label className="block text-xs text-muted">
          Style model
          <ImageToolModelSelect
            tool="img2img"
            value={styleModel}
            onChange={setStyleModel}
            className="mt-1 h-8 w-full rounded-md border border-border bg-panel px-2 text-xs"
          />
        </label>
        <Input
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          placeholder="Style prompt…"
        />
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!!busy}
          onClick={() => void runStyleTransfer()}
        >
          {busy === 'style' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          Style transfer
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!!busy}
          onClick={() => void runRembg()}
        >
          {busy === 'rembg' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Scissors className="h-4 w-4" aria-hidden />
          )}
          Remove background
        </Button>
      </section>

      <section className="border-t border-border pt-3">
        <Button variant="outline" size="sm" className="w-full" onClick={onExport}>
          <Download className="h-4 w-4" aria-hidden />
          Export PNG
        </Button>
      </section>
    </div>
  )
}
