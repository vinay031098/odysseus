import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  Brush,
  Copy,
  Crop,
  Eraser,
  Hand,
  Loader2,
  Lasso,
  Paintbrush,
  Redo2,
  Save,
  Type,
  Undo2,
  Wand2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryImage } from '@/api/gallery'
import * as galleryApi from '@/api/gallery'
import { Button } from '@/components/ui/button'
import { AdjLayersPanel } from '@/features/editor/AdjLayersPanel'
import { GalleryAiPanel } from '@/features/editor/GalleryAiPanel'
import { HistoryList } from '@/features/editor/EditorToolbar'
import { LayerPanel } from '@/features/editor/LayerPanel'
import { canvasCoords } from '@/features/editor/maskUtils'
import { normalizeCropRect } from '@/features/editor/cropUtils'
import type { GalleryEditorTool } from '@/features/editor/types'
import { useGalleryCanvasEditor } from '@/features/editor/useGalleryCanvasEditor'
import {
  CANVAS_PROJECT_TYPE,
  emptyCanvasProject,
  loadLayerImage,
  type CanvasProject,
} from '@/lib/canvasHelpers'
import { imageLabel } from '@/lib/galleryHelpers'
import { cn } from '@/lib/utils'

export type EditorTool = GalleryEditorTool

type GalleryEditorProps = {
  image: GalleryImage
  initialImageDataUrl?: string
  initialMaskDataUrl?: string
  initialProject?: CanvasProject
  onClose: () => void
  onSaved?: () => void
  onSaveDraft?: (payload: {
    imageDataUrl: string
    maskDataUrl: string
    thumbnail: string
    width: number
    height: number
  }) => void
}

const TOOLS: { id: GalleryEditorTool; label: string; icon: typeof Brush }[] = [
  { id: 'move', label: 'Move', icon: Hand },
  { id: 'brush', label: 'Brush', icon: Paintbrush },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'inpaint', label: 'Inpaint mask', icon: Brush },
  { id: 'lasso', label: 'Lasso', icon: Lasso },
  { id: 'wand', label: 'Magic wand', icon: Wand2 },
  { id: 'clone', label: 'Clone', icon: Copy },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'transform', label: 'Transform', icon: Crop },
]

async function buildProjectFromImage(
  src: string,
  name: string,
): Promise<CanvasProject> {
  const el = await loadLayerImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = el.naturalWidth
  canvas.height = el.naturalHeight
  canvas.getContext('2d')!.drawImage(el, 0, 0)
  return {
    v: 1,
    type: CANVAS_PROJECT_TYPE,
    imgWidth: el.naturalWidth,
    imgHeight: el.naturalHeight,
    activeLayerId: 1,
    nextLayerId: 2,
    layers: [
      {
        id: 1,
        name: name || 'Background',
        visible: true,
        opacity: 100,
        locked: false,
        canvasW: el.naturalWidth,
        canvasH: el.naturalHeight,
        offset: { x: 0, y: 0 },
        dataUrl: canvas.toDataURL('image/png'),
        adjLayers: [],
      },
    ],
  }
}

export function GalleryEditor({
  image,
  initialImageDataUrl,
  initialMaskDataUrl,
  initialProject,
  onClose,
  onSaved,
  onSaveDraft,
}: GalleryEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [loadedProject, setLoadedProject] = useState<CanvasProject | null>(
    initialProject ?? null,
  )

  const label = imageLabel(image)

  useEffect(() => {
    if (initialProject) {
      setLoadedProject(structuredClone(initialProject))
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const src = initialImageDataUrl ?? image.url
        const p = await buildProjectFromImage(src, label)
        if (!cancelled) setLoadedProject(p)
      } catch {
        toast.error('Could not load image')
        onClose()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [image.url, initialImageDataUrl, initialProject, label, onClose])

  const editor = useGalleryCanvasEditor({
    initialProject: loadedProject ?? emptyCanvasProject(800, 600),
    initialMaskDataUrl,
  })

  const composite = useCallback(async () => {
    const view = canvasRef.current
    if (!view) return
    const flat = await editor.compositeToCanvas()
    const ctx = view.getContext('2d')!
    ctx.clearRect(0, 0, view.width, view.height)
    ctx.drawImage(flat, 0, 0)
    if (editor.maskCanvas) {
      ctx.save()
      ctx.globalAlpha = 0.45
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(editor.maskCanvas, 0, 0)
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = '#ff5050'
      ctx.fillRect(0, 0, view.width, view.height)
      ctx.restore()
    }
    if (editor.lassoPoints.length > 1) {
      ctx.beginPath()
      ctx.moveTo(editor.lassoPoints[0].x, editor.lassoPoints[0].y)
      for (let i = 1; i < editor.lassoPoints.length; i++) {
        ctx.lineTo(editor.lassoPoints[i].x, editor.lassoPoints[i].y)
      }
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (editor.cropStart && editor.cropEnd) {
      const rect = normalizeCropRect(
        editor.cropStart,
        editor.cropEnd,
        editor.project.imgWidth,
        editor.project.imgHeight,
      )
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, view.width, view.height)
      ctx.clearRect(rect.x, rect.y, rect.w, rect.h)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
    }
    if (editor.pendingCrop) {
      const { x, y, w, h } = editor.pendingCrop
      ctx.strokeStyle = '#4af'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)
    }
    editor.drawTransformOverlay(ctx)
  }, [editor])

  useEffect(() => {
    if (loading) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = editor.project.imgWidth
    canvas.height = editor.project.imgHeight
    void composite()
  }, [
    composite,
    loading,
    editor.project,
    editor.maskCanvas,
    editor.lassoPoints,
    editor.cropStart,
    editor.cropEnd,
    editor.pendingCrop,
    editor.transformPending,
    editor.tool,
    editor.project.layers,
  ])

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = canvasCoords(e, canvas)
    void editor.handlePointerDown(x, y, e.altKey)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = canvasCoords(e, canvas)
    void editor.handlePointerMove(x, y, e.shiftKey)
  }

  const handlePointerUp = () => {
    editor.handlePointerUp()
    void composite()
  }

  const handleSave = async () => {
    if (image.id === '__blank__') {
      toast.message('Use Save draft for blank canvas projects')
      return
    }
    setBusy('save')
    try {
      const blob = await editor.exportPngBlob()
      await galleryApi.replaceGalleryImage(image.id, blob)
      toast.success('Saved to gallery')
      onSaved?.()
      onClose()
    } catch {
      toast.error('Could not save')
    } finally {
      setBusy(null)
    }
  }

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return
    const flat = await editor.compositeToCanvas()
    const rawMask = editor.getRawMaskCanvas()
    const thumb = document.createElement('canvas')
    const max = 120
    const scale = Math.min(1, max / Math.max(flat.width, flat.height))
    thumb.width = Math.round(flat.width * scale)
    thumb.height = Math.round(flat.height * scale)
    thumb.getContext('2d')!.drawImage(flat, 0, 0, thumb.width, thumb.height)
    onSaveDraft({
      imageDataUrl: flat.toDataURL('image/png'),
      maskDataUrl: rawMask?.toDataURL('image/png') ?? '',
      thumbnail: thumb.toDataURL('image/jpeg', 0.7),
      width: flat.width,
      height: flat.height,
    })
  }

  const handleExport = async () => {
    try {
      const blob = await editor.exportPngBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${image.filename.replace(/\.\w+$/, '') || 'export'}-edited.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported PNG')
    } catch {
      toast.error('Export failed')
    }
  }

  const getCompositeImageData = async () => {
    const flat = await editor.compositeToCanvas()
    return flat.getContext('2d')!.getImageData(0, 0, flat.width, flat.height).data
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-label={`Edit ${label}`}
      data-testid="gallery-editor"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="ghost" size="icon" aria-label="Close editor" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">Edit — {label}</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={!editor.history.canUndo}
          onClick={editor.history.undo}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!editor.history.canRedo}
          onClick={editor.history.redo}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
          History
        </Button>
        {onSaveDraft ? (
          <Button variant="secondary" size="sm" onClick={() => void handleSaveDraft()}>
            Save draft
          </Button>
        ) : null}
        {image.id !== '__blank__' ? (
          <Button size="sm" disabled={!!busy} onClick={() => void handleSave()}>
            {busy === 'save' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save
          </Button>
        ) : null}
      </header>

      {showHistory ? (
        <div className="border-b border-border px-3 py-2">
          <HistoryList
            entries={editor.history.entries}
            activeIndex={editor.history.index}
            onJump={editor.history.jumpTo}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 space-y-1 overflow-y-auto border-r border-border p-2">
          {TOOLS.map(({ id, label: tLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-panel',
                editor.tool === id && 'bg-panel font-medium',
              )}
              aria-pressed={editor.tool === id}
              onClick={() => editor.setTool(id)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {tLabel}
            </button>
          ))}
          <div className="mt-2 space-y-2 border-t border-border pt-2">
            <label className="block text-xs text-muted">
              Brush size
              <input
                type="range"
                min={4}
                max={200}
                value={editor.brushSize}
                onChange={(e) => editor.setBrushSize(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            {(editor.tool === 'brush' ||
              editor.tool === 'eraser' ||
              editor.tool === 'inpaint' ||
              editor.tool === 'clone') ? (
              <label className="block text-xs text-muted">
                Hardness {editor.brushHardness}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editor.brushHardness}
                  onChange={(e) => editor.setBrushHardness(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            ) : null}
            {editor.tool === 'wand' ? (
              <label className="block text-xs text-muted">
                Tolerance
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={editor.wandTolerance}
                  onChange={(e) => editor.setWandTolerance(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            ) : null}
            {editor.tool === 'inpaint' ? (
              <>
                <Button
                  variant={editor.eraseMask ? 'default' : 'secondary'}
                  size="sm"
                  className="w-full"
                  onClick={() => editor.setEraseMask((v) => !v)}
                >
                  <Eraser className="h-3.5 w-3.5" aria-hidden />
                  {editor.eraseMask ? 'Erasing mask' : 'Painting mask'}
                </Button>
                <label className="block text-xs text-muted">
                  Dilate {editor.maskDilate}px
                  <input
                    type="range"
                    min={-20}
                    max={20}
                    value={editor.maskDilate}
                    onChange={(e) => editor.setMaskDilate(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block text-xs text-muted">
                  Feather {editor.maskFeather}px
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={editor.maskFeather}
                    onChange={(e) => editor.setMaskFeather(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
              </>
            ) : null}
            {editor.tool === 'brush' ? (
              <input
                type="color"
                value={editor.brushColor}
                onChange={(e) => editor.setBrushColor(e.target.value)}
                className="h-8 w-full cursor-pointer rounded border border-border"
                aria-label="Brush color"
              />
            ) : null}
            {editor.tool === 'text' ? (
              <>
                <label className="block text-xs text-muted">
                  Font size {editor.textSize}px
                  <input
                    type="range"
                    min={12}
                    max={120}
                    value={editor.textSize}
                    onChange={(e) => editor.setTextSize(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
                <input
                  type="color"
                  value={editor.brushColor}
                  onChange={(e) => editor.setBrushColor(e.target.value)}
                  className="h-8 w-full cursor-pointer rounded border border-border"
                  aria-label="Text color"
                />
                <p className="text-[10px] text-muted">Click canvas to place text.</p>
              </>
            ) : null}
            {editor.tool === 'transform' ? (
              <div className="space-y-2">
                <p className="text-[10px] text-muted">
                  Drag corner handles or rotation knob. Hold Shift to constrain.
                </p>
                <Button size="sm" className="w-full" onClick={() => void editor.applyTransform()}>
                  Apply transform
                </Button>
              </div>
            ) : null}
            {editor.tool === 'crop' && editor.pendingCrop ? (
              <div className="flex gap-1">
                <Button size="sm" className="flex-1" onClick={() => void editor.applyCrop()}>
                  Apply crop
                </Button>
                <Button size="sm" variant="outline" onClick={editor.cancelCrop}>
                  Cancel
                </Button>
              </div>
            ) : null}
            <div className="space-y-2 border-t border-border pt-2">
              <p className="text-xs font-medium text-muted">Adjustments</p>
              <label className="block text-xs text-muted">
                Brightness {editor.brightness.toFixed(2)}
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={editor.brightness}
                  onChange={(e) => editor.setBrightness(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-muted">
                Contrast {editor.contrast.toFixed(2)}
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={editor.contrast}
                  onChange={(e) => editor.setContrast(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-muted">
                Hue {editor.hue}°
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={editor.hue}
                  onChange={(e) => editor.setHue(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-muted">
                Saturation {editor.saturation.toFixed(2)}
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={editor.saturation}
                  onChange={(e) => editor.setSaturation(Number(e.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-muted">
                Levels gamma {editor.levels.gamma.toFixed(2)}
                <input
                  type="range"
                  min={10}
                  max={300}
                  value={Math.round(editor.levels.gamma * 100)}
                  onChange={(e) =>
                    editor.setLevels({ ...editor.levels, gamma: Number(e.target.value) / 100 })
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-xs text-muted">
                Color balance mid R {editor.colorBalance.midtones.r}
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={editor.colorBalance.midtones.r}
                  onChange={(e) =>
                    editor.setColorBalance({
                      ...editor.colorBalance,
                      midtones: { ...editor.colorBalance.midtones, r: Number(e.target.value) },
                    })
                  }
                  className="mt-1 w-full"
                />
              </label>
              <Button size="sm" className="w-full" onClick={() => void editor.applyAdjustments()}>
                Apply adjustments
              </Button>
            </div>
            <AdjLayersPanel
              adjLayers={editor.activeLayer?.adjLayers ?? []}
              onAdd={editor.addAdjLayer}
              onUpdate={editor.updateAdjLayer}
              onRemove={editor.removeAdjLayer}
            />
            {editor.postEdgeLayerId ? (
              <div className="space-y-2 border-t border-border pt-2">
                <p className="text-xs font-medium text-muted">Postprocess edge</p>
                <label className="block text-xs text-muted">
                  Edge feather {editor.postEdgeFeather}px
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={editor.postEdgeFeather}
                    onChange={(e) => editor.setPostEdgeFeather(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block text-xs text-muted">
                  Edge stroke {editor.postEdgeStroke}px
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={editor.postEdgeStroke}
                    onChange={(e) => editor.setPostEdgeStroke(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
              </div>
            ) : null}
            <Button variant="outline" size="sm" className="w-full" onClick={editor.clearMask}>
              Clear mask
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-auto bg-panel/30 p-4">
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted" aria-label="Loading image" />
          ) : (
            <canvas
              ref={canvasRef}
              className="max-h-full max-w-full cursor-crosshair rounded border border-border shadow-sm"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}
        </div>

        <div className="flex w-64 shrink-0 flex-col border-l border-border">
          <LayerPanel
            layers={editor.project.layers}
            activeLayerId={editor.project.activeLayerId}
            onSelect={editor.setActiveLayerId}
            onToggleVisible={(id) =>
              editor.updateLayer(id, {
                visible: !editor.project.layers.find((l) => l.id === id)?.visible,
              })
            }
            onToggleLock={(id) =>
              editor.updateLayer(id, {
                locked: !editor.project.layers.find((l) => l.id === id)?.locked,
              })
            }
            onOpacityChange={(id, opacity) => editor.updateLayer(id, { opacity })}
            onMergeDown={() => void editor.mergeDown()}
            onReorder={editor.reorderLayers}
            canMergeDown={
              editor.project.layers.findIndex((l) => l.id === editor.project.activeLayerId) > 0
            }
          />
          <GalleryAiPanel
            getFlattenedBase64={editor.getFlattenedBase64}
            getMaskBase64={editor.getMaskBase64}
            getCompositeImageData={getCompositeImageData}
            canvasWidth={editor.project.imgWidth}
            canvasHeight={editor.project.imgHeight}
            onResultLayer={(name, dataUrl, w, h) =>
              editor.applyResultLayer(name, dataUrl, w, h, name === 'Inpaint' || name === 'Remove')
            }
            onExport={() => void handleExport()}
          />
        </div>
      </div>
    </div>
  )
}
