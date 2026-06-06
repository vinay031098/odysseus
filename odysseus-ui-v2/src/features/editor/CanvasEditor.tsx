import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasProject } from '@/lib/canvasHelpers'
import { Button } from '@/components/ui/button'
import { AiToolsPanel } from './AiToolsPanel'
import { AdjustmentsPanel } from './AdjustmentsPanel'
import { EditorToolbar, HistoryList } from './EditorToolbar'
import { LayerPanel } from './LayerPanel'
import { TransformPopup } from './TransformPopup'
import { useCanvasEditor } from './useCanvasEditor'
import { drawTransformHandles } from '@/lib/editor/transformHandles'
import { defaultTransformPending } from '@/lib/editor/transformSession'

type CanvasEditorProps = {
  initialProject: CanvasProject
  onChange?: (project: CanvasProject) => void
}

export function CanvasEditor({ initialProject, onChange }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [dropOver, setDropOver] = useState(false)
  const panDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  )

  const editor = useCanvasEditor({
    initialProject,
    onProjectChange: onChange,
  })

  const redraw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const composite = await editor.compositeToCanvas()
    canvas.width = editor.project.imgWidth
    canvas.height = editor.project.imgHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(composite, 0, 0)

    if (editor.maskCanvas) {
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(editor.maskCanvas, 0, 0)
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = '#ff6e6e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
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

    if (editor.cropRect && editor.cropRect.w > 0 && editor.cropRect.h > 0) {
      const { x, y, w, h } = editor.cropRect
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.clearRect(x, y, w, h)
      ctx.drawImage(composite, 0, 0)
      ctx.restore()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }

    if (editor.tool === 'move' && editor.activeLayer) {
      const pending =
        editor.transformPending ??
        defaultTransformPending(editor.activeLayer.canvasW, editor.activeLayer.canvasH)
      drawTransformHandles(
        ctx,
        editor.activeLayer.offset,
        editor.activeLayer.canvasW,
        editor.activeLayer.canvasH,
        pending,
        zoom,
        editor.project.imgWidth,
        editor.project.imgHeight,
        editor.activeTransformHandle,
      )
    }

    for (const guide of editor.snapGuides) {
      ctx.save()
      ctx.strokeStyle = '#e06c75'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      if (guide.vertical && guide.x !== undefined) {
        ctx.beginPath()
        ctx.moveTo(guide.x, 0)
        ctx.lineTo(guide.x, canvas.height)
        ctx.stroke()
      } else if (!guide.vertical && guide.y !== undefined) {
        ctx.beginPath()
        ctx.moveTo(0, guide.y)
        ctx.lineTo(canvas.width, guide.y)
        ctx.stroke()
      }
      ctx.restore()
    }
  }, [editor, zoom])

  useEffect(() => {
    void redraw()
  }, [editor.project, editor.maskCanvas, editor.lassoPoints, editor.cropRect, editor.tool, editor.snapGuides, editor.transformPending, editor.activeTransformHandle, redraw, zoom])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) editor.history.redo()
        else editor.history.undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault()
        editor.history.redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor.history])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (!item.type.startsWith('image/')) continue
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          editor.importImageAsLayer(img, 'Pasted')
          URL.revokeObjectURL(url)
        }
        img.src = url
        break
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [editor])

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvas.width
    const y = ((clientY - rect.top) / rect.height) * canvas.height
    return { x, y }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (editor.tool === 'move' && e.button === 0 && e.altKey)) {
      panDragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
      return
    }
    const { x, y } = toCanvasCoords(e.clientX, e.clientY)
    editor.handlePointerDown(x, y, { altKey: e.altKey, shiftKey: e.shiftKey, zoom })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panDragRef.current) {
      const d = panDragRef.current
      setPan({
        x: d.panX + (e.clientX - d.startX),
        y: d.panY + (e.clientY - d.startY),
      })
      return
    }
    const { x, y } = toCanvasCoords(e.clientX, e.clientY)
    editor.handlePointerMove(x, y, { shiftKey: e.shiftKey, zoom })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    panDragRef.current = null
    editor.handlePointerUp({ altKey: e.altKey })
  }

  const activeLayerIndex = editor.project.layers.findIndex((l) => l.id === editor.activeLayer?.id)

  const getCompositeImageData = useCallback(async () => {
    const c = await editor.compositeToCanvas()
    return c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  }, [editor])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorToolbar
        tool={editor.tool}
        brushSize={editor.brushSize}
        brushHardness={editor.brushHardness}
        brushColor={editor.brushColor}
        wandTolerance={editor.wandTolerance}
        canvasWidth={editor.project.imgWidth}
        canvasHeight={editor.project.imgHeight}
        canUndo={editor.history.canUndo}
        canRedo={editor.history.canRedo}
        onToolChange={editor.setTool}
        onBrushSizeChange={editor.setBrushSize}
        onBrushHardnessChange={editor.setBrushHardness}
        onBrushColorChange={editor.setBrushColor}
        onWandToleranceChange={editor.setWandTolerance}
        onUndo={editor.history.undo}
        onRedo={editor.history.redo}
        onHistoryOpen={() => setShowHistory((v) => !v)}
        onResize={editor.resizeCanvas}
        onRotate={(deg) => void editor.rotateCanvas(deg)}
        onFlip={(axis) => void editor.flipCanvas(axis)}
        onPaste={() => void editor.pasteFromClipboard()}
        onCopyMask={() => void editor.copySelectionToInternal()}
        onClearMask={editor.clearMask}
      />

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
        <div
          ref={containerRef}
          className="relative min-w-0 flex-1 overflow-auto bg-[repeating-conic-gradient(#80808020_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-4"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              setZoom((z) => Math.max(0.25, Math.min(4, z - e.deltaY * 0.001)))
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDropOver(true)
          }}
          onDragLeave={() => setDropOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDropOver(false)
            const file = [...(e.dataTransfer.files ?? [])].find((f) => f.type.startsWith('image/'))
            if (!file) return
            const url = URL.createObjectURL(file)
            const img = new Image()
            img.onload = () => {
              editor.importImageAsLayer(img, file.name.replace(/\.[^.]+$/, '') || 'Dropped')
              URL.revokeObjectURL(url)
            }
            img.src = url
          }}
        >
          {dropOver ? (
            <div className="pointer-events-none absolute inset-4 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary">
              Drop image to add as layer
            </div>
          ) : null}

          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full cursor-crosshair rounded border border-border shadow-sm"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          {editor.cropRect && editor.cropRect.w > 5 && editor.cropRect.h > 5 ? (
            <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-md border border-border bg-panel px-3 py-2 shadow-md">
              <span className="text-xs text-muted">
                {Math.round(editor.cropRect.w)}×{Math.round(editor.cropRect.h)}
              </span>
              <Button size="sm" onClick={() => void editor.applyCrop()}>
                Apply crop
              </Button>
              <Button size="sm" variant="outline" onClick={editor.cancelCrop}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex w-52 shrink-0 flex-col">
          {editor.tool === 'move' && editor.transformPending && editor.activeLayer ? (
            <TransformPopup
              pending={editor.transformPending}
              origW={editor.activeLayer.canvasW}
              origH={editor.activeLayer.canvasH}
              aspectLock={editor.transformAspectLock}
              onPendingChange={(next) => editor.previewTransform(next)}
              onAspectLockChange={editor.setTransformAspectLock}
              onApply={editor.commitTransformSession}
              onCancel={() => void editor.cancelTransformSession()}
            />
          ) : null}
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
            onMergeDown={() => void editor.mergeActiveLayerDown()}
            onDuplicate={editor.duplicateActiveLayer}
            onReorder={editor.reorderLayer}
            canMergeDown={activeLayerIndex > 0}
          />
          <AdjustmentsPanel
            layer={editor.activeLayer}
            onApply={(dataUrl, w, h, label) => {
              if (editor.activeLayer) {
                editor.applyLayerDataUrl(editor.activeLayer.id, dataUrl, w, h, label)
              }
            }}
          />
          <AiToolsPanel
            getFlattenedBase64={editor.getFlattenedBase64}
            getMaskBase64={editor.getMaskBase64}
            getCompositeImageData={getCompositeImageData}
            canvasWidth={editor.project.imgWidth}
            canvasHeight={editor.project.imgHeight}
            onResultLayer={(name, dataUrl, w, h) => editor.addLayer(name, dataUrl, w, h)}
          />
        </div>
      </div>
    </div>
  )
}
