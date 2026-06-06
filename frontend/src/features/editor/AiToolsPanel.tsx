import { useState } from 'react'
import { Expand, Loader2, Sparkles, Scissors, Blend } from 'lucide-react'
import { toast } from 'sonner'
import * as imageTools from '@/api/imageTools'
import { buildOutpaintMask } from './outpaintMask'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AiToolsPanelProps = {
  getFlattenedBase64: () => Promise<string>
  getMaskBase64: () => string | null
  getCompositeImageData: () => Promise<Uint8ClampedArray>
  canvasWidth: number
  canvasHeight: number
  onResultLayer: (name: string, dataUrl: string, w: number, h: number) => void
}

export function AiToolsPanel({
  getFlattenedBase64,
  getMaskBase64,
  getCompositeImageData,
  onResultLayer,
  canvasWidth,
  canvasHeight,
}: AiToolsPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const applyResult = (b64: string, name: string) => {
    onResultLayer(name, `data:image/png;base64,${b64}`, canvasWidth, canvasHeight)
    toast.success(`${name} complete`)
  }

  const runInpaint = async () => {
    const mask = getMaskBase64()
    if (!mask) {
      toast.error('Paint a mask first (Mask tool)')
      return
    }
    if (!prompt.trim()) {
      toast.error('Enter an inpaint prompt')
      return
    }
    setBusy('inpaint')
    try {
      const image = await getFlattenedBase64()
      const res = await imageTools.inpaintImage({
        image,
        mask,
        prompt: prompt.trim(),
        strength: 0.85,
      })
      if (res.error || !res.image) throw new Error(res.error || 'Inpaint failed')
      applyResult(res.image, 'Inpaint')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Inpaint failed')
    } finally {
      setBusy(null)
    }
  }

  const runOutpaint = async () => {
    setBusy('outpaint')
    try {
      const flatData = await getCompositeImageData()
      const built = buildOutpaintMask(flatData, canvasWidth, canvasHeight)
      if (!built) {
        toast.error('No empty areas to outpaint — canvas is fully covered')
        return
      }
      const maskB64 = built.mask.toDataURL('image/png').split(',')[1] ?? ''
      const image = await getFlattenedBase64()
      const outPrompt =
        prompt.trim() ||
        'seamless natural continuation of the surrounding image, photorealistic, matching style'
      const res = await imageTools.inpaintImage({
        image,
        mask: maskB64,
        prompt: outPrompt,
        strength: 0.99,
      })
      if (res.error || !res.image) throw new Error(res.error || 'Outpaint failed')
      applyResult(res.image, 'Outpaint')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Outpaint failed')
    } finally {
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
        strength: 0.55,
        seam_fix: 0.35,
      })
      if (res.error || !res.image) throw new Error(res.error || 'Harmonize failed')
      applyResult(res.image, 'Harmonize')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Harmonize failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3 border-t border-border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">AI tools</p>
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Inpaint / outpaint prompt…"
        aria-label="AI prompt"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={Boolean(busy)} onClick={() => void runInpaint()}>
          {busy === 'inpaint' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3.5 w-3.5" />
          )}
          Inpaint
        </Button>
        <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void runOutpaint()}>
          {busy === 'outpaint' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Expand className="mr-1 h-3.5 w-3.5" />
          )}
          Outpaint
        </Button>
        <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void runRembg()}>
          {busy === 'rembg' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Scissors className="mr-1 h-3.5 w-3.5" />
          )}
          Remove BG
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(busy)}
          onClick={() => void runHarmonize()}
        >
          {busy === 'harmonize' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Blend className="mr-1 h-3.5 w-3.5" />
          )}
          Harmonize
        </Button>
      </div>
    </div>
  )
}
