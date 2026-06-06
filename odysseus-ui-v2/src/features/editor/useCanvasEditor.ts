import { useCallback, useEffect, useRef, useState } from 'react'
import { floodFillMask } from '@/lib/galleryEditor/floodFill'
import { buildLassoMask, type Point } from '@/lib/galleryEditor/lassoMask'
import { mergeMaskOnto } from '@/lib/galleryEditor/maskUtils'
import {
  canvasToBase64,
  loadLayerImage,
  type CanvasLayerData,
  type CanvasProject,
} from '@/lib/canvasHelpers'
import {
  applyCropToProject,
  duplicateLayer,
  flipAllLayers,
  mergeLayersDown,
  resizeCanvasProject,
  rotateAllLayers,
  type CropRect,
} from '@/lib/editor/layerOps'
import { cropSelectionFromComposite, type CroppedSelection } from '@/lib/editor/selectionClipboard'
import { computeSnap, type SnapGuide } from '@/lib/editor/snap'
import {
  defaultTransformPending,
  reapplyTransform,
  type TransformPending,
} from '@/lib/editor/transformSession'
import {
  getTransformHandleAt,
  rotationFromPointer,
} from '@/lib/editor/transformHandles'
import { strokePoint, strokeSegment, type StrokeOptions } from '@/lib/editor/strokePipeline'
import type { CropRect as CropRectType, EditorTool, TransformHandle } from './types'
import { useEditorHistory } from './useEditorHistory'

type PointerOpts = { altKey?: boolean; shiftKey?: boolean; zoom?: number }

type UseCanvasEditorOptions = {
  initialProject: CanvasProject
  onProjectChange?: (project: CanvasProject) => void
}

export function useCanvasEditor({ initialProject, onProjectChange }: UseCanvasEditorOptions) {
  const [project, setProject] = useState<CanvasProject>(() => structuredClone(initialProject))
  const [tool, setTool] = useState<EditorTool>('move')
  const [brushSize, setBrushSize] = useState(12)
  const [brushHardness, setBrushHardness] = useState(80)
  const [brushColor, setBrushColor] = useState('#e06c75')
  const [wandTolerance, setWandTolerance] = useState(32)
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null)
  const [lassoPoints, setLassoPoints] = useState<Point[]>([])
  const [cropRect, setCropRect] = useState<CropRectType | null>(null)
  const [cropDragging, setCropDragging] = useState(false)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])
  const [transformPending, setTransformPending] = useState<TransformPending | null>(null)
  const [transformAspectLock, setTransformAspectLock] = useState(true)
  const [activeTransformHandle, setActiveTransformHandle] = useState<TransformHandle>(null)

  const history = useEditorHistory(initialProject)
  const projectRef = useRef(project)

  useEffect(() => {
    projectRef.current = project
  }, [project])

  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const strokeLayerRef = useRef<HTMLCanvasElement | null>(null)
  const cloneSourceRef = useRef<Point | null>(null)
  const cloneSnapshotRef = useRef<HTMLCanvasElement | null>(null)
  const cloneStartRef = useRef<Point | null>(null)
  const cropStartRef = useRef<Point | null>(null)
  const cropMoveStartRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null)
  const moveStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const transformHandleRef = useRef<TransformHandle>(null)
  const transformStartRef = useRef<{ x: number; y: number; w: number; h: number; ox: number; oy: number } | null>(null)
  const transformSessionRef = useRef<{
    origCanvas: HTMLCanvasElement
    origW: number
    origH: number
    origOffset: { x: number; y: number }
  } | null>(null)
  const transformOrigOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const internalClipboardRef = useRef<CroppedSelection | null>(null)

  useEffect(() => {
    setProject(structuredClone(initialProject))
  }, [initialProject])

  useEffect(() => {
    onProjectChange?.(project)
  }, [project, onProjectChange])

  useEffect(() => {
    setProject(structuredClone(history.current))
    setMaskCanvas(null)
    setCropRect(null)
    setLassoPoints([])
  }, [history.index, history])

  const activeLayer =
    project.layers.find((l) => l.id === project.activeLayerId) ?? project.layers[0]

  const commitProject = useCallback(
    (next: CanvasProject, label: string) => {
      setProject(next)
      history.push(next, label)
    },
    [history],
  )

  const setActiveLayerId = useCallback((id: number) => {
    setProject((p) => ({ ...p, activeLayerId: id }))
  }, [])

  const updateLayer = useCallback((layerId: number, patch: Partial<CanvasLayerData>) => {
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
    }))
  }, [])

  const addLayer = useCallback(
    (name: string, dataUrl: string, w: number, h: number, offset = { x: 0, y: 0 }) => {
      setProject((p) => {
        const id = p.nextLayerId
        const layer: CanvasLayerData = {
          id,
          name,
          visible: true,
          opacity: 100,
          locked: false,
          canvasW: w,
          canvasH: h,
          offset,
          dataUrl,
        }
        const next = {
          ...p,
          activeLayerId: id,
          nextLayerId: id + 1,
          layers: [...p.layers, layer],
        }
        history.push(next, `Add ${name}`)
        return next
      })
    },
    [history],
  )

  const compositeToCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    const out = document.createElement('canvas')
    out.width = project.imgWidth
    out.height = project.imgHeight
    const ctx = out.getContext('2d')
    if (!ctx) return out
    ctx.clearRect(0, 0, out.width, out.height)
    for (const layer of project.layers) {
      if (!layer.visible) continue
      const img = await loadLayerImage(layer.dataUrl)
      ctx.globalAlpha = layer.opacity / 100
      ctx.drawImage(img, layer.offset.x, layer.offset.y)
    }
    ctx.globalAlpha = 1
    return out
  }, [project])

  const getFlattenedBase64 = useCallback(async () => {
    const canvas = await compositeToCanvas()
    return canvasToBase64(canvas)
  }, [compositeToCanvas])

  const getMaskBase64 = useCallback(() => {
    if (!maskCanvas) return null
    return canvasToBase64(maskCanvas)
  }, [maskCanvas])

  const ensureMaskCanvas = useCallback(() => {
    if (maskCanvas && maskCanvas.width === project.imgWidth && maskCanvas.height === project.imgHeight) {
      return maskCanvas
    }
    const c = document.createElement('canvas')
    c.width = project.imgWidth
    c.height = project.imgHeight
    setMaskCanvas(c)
    return c
  }, [maskCanvas, project.imgWidth, project.imgHeight])

  const strokeOpts = useCallback(
    (): StrokeOptions => ({
      size: brushSize,
      hardness: brushHardness,
      color: brushColor,
    }),
    [brushColor, brushHardness, brushSize],
  )

  const finishStrokeToLayer = useCallback(() => {
    const layerCanvas = strokeLayerRef.current
    if (!layerCanvas || !activeLayer) return
    const dataUrl = layerCanvas.toDataURL('image/png')
    setProject((p) => ({
      ...p,
      layers: p.layers.map((l) => (l.id === activeLayer.id ? { ...l, dataUrl } : l)),
    }))
  }, [activeLayer])

  const beginLayerStroke = useCallback(async () => {
    if (!activeLayer || strokeLayerRef.current) return
    const layerCanvas = document.createElement('canvas')
    layerCanvas.width = activeLayer.canvasW
    layerCanvas.height = activeLayer.canvasH
    const img = await loadLayerImage(activeLayer.dataUrl)
    layerCanvas.getContext('2d')!.drawImage(img, 0, 0)
    strokeLayerRef.current = layerCanvas
  }, [activeLayer])

  const paintStroke = useCallback(
    (x: number, y: number, start: boolean) => {
      if (!activeLayer || activeLayer.locked) return

      if (tool === 'inpaint') {
        const mask = ensureMaskCanvas()
        const mctx = mask.getContext('2d')
        if (!mctx) return
        const opts = { ...strokeOpts(), color: '#ffffff', opacity: 100 }
        if (start) strokePoint(mctx, x, y, opts, false)
        else if (lastPointRef.current)
          strokeSegment(mctx, lastPointRef.current.x, lastPointRef.current.y, x, y, opts, false)
        setMaskCanvas(mask)
        return
      }

      if (tool === 'brush' || tool === 'eraser') {
        const layerCtx = strokeLayerRef.current?.getContext('2d')
        if (!layerCtx) return
        const opts = strokeOpts()
        if (start) strokePoint(layerCtx, x, y, opts, tool === 'eraser')
        else if (lastPointRef.current)
          strokeSegment(
            layerCtx,
            lastPointRef.current.x,
            lastPointRef.current.y,
            x,
            y,
            opts,
            tool === 'eraser',
          )
        finishStrokeToLayer()
      }
    },
    [activeLayer, ensureMaskCanvas, finishStrokeToLayer, strokeOpts, tool],
  )

  const stampClone = useCallback(
    (x: number, y: number) => {
      if (!activeLayer || activeLayer.locked) return
      const snap = cloneSnapshotRef.current
      const src = cloneSourceRef.current
      const start = cloneStartRef.current
      if (!snap || !src || !start) return

      void loadLayerImage(activeLayer.dataUrl).then((img) => {
        const layerCanvas = document.createElement('canvas')
        layerCanvas.width = activeLayer.canvasW
        layerCanvas.height = activeLayer.canvasH
        const ctx = layerCanvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const dx = x - start.x
        const dy = y - start.y
        const sx = src.x + dx
        const sy = src.y + dy
        ctx.save()
        ctx.beginPath()
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(
          snap,
          sx - brushSize / 2,
          sy - brushSize / 2,
          brushSize,
          brushSize,
          x - brushSize / 2,
          y - brushSize / 2,
          brushSize,
          brushSize,
        )
        ctx.restore()
        setProject((p) => ({
          ...p,
          layers: p.layers.map((l) =>
            l.id === activeLayer.id ? { ...l, dataUrl: layerCanvas.toDataURL('image/png') } : l,
          ),
        }))
      })
    },
    [activeLayer, brushSize],
  )

  const applyWand = useCallback(
    async (x: number, y: number, subtract: boolean) => {
      const flat = await compositeToCanvas()
      const ctx = flat.getContext('2d')!
      const data = ctx.getImageData(0, 0, flat.width, flat.height).data
      const fill = floodFillMask(
        data,
        flat.width,
        flat.height,
        Math.floor(x),
        Math.floor(y),
        wandTolerance,
      )
      if (!fill) return
      const mask = ensureMaskCanvas()
      mergeMaskOnto(mask, fill, subtract ? 'subtract' : 'add')
      setMaskCanvas(mask)
    },
    [compositeToCanvas, ensureMaskCanvas, wandTolerance],
  )

  const finishLasso = useCallback(
    (subtract: boolean) => {
      if (lassoPoints.length < 3) {
        setLassoPoints([])
        return
      }
      const lassoMask = buildLassoMask(lassoPoints, project.imgWidth, project.imgHeight)
      if (lassoMask) {
        const mask = ensureMaskCanvas()
        mergeMaskOnto(mask, lassoMask, subtract ? 'subtract' : 'add')
        setMaskCanvas(mask)
        history.push(projectRef.current, subtract ? 'Lasso subtract' : 'Lasso select')
      }
      setLassoPoints([])
    },
    [ensureMaskCanvas, history, lassoPoints, project.imgWidth, project.imgHeight],
  )

  const getLayerBounds = useCallback(
    (layer: CanvasLayerData) => ({
      x: layer.offset.x,
      y: layer.offset.y,
      w: layer.canvasW,
      h: layer.canvasH,
    }),
    [],
  )

  const ensureTransformSession = useCallback(async () => {
    if (transformSessionRef.current || !activeLayer) return
    const img = await loadLayerImage(activeLayer.dataUrl)
    const snap = document.createElement('canvas')
    snap.width = activeLayer.canvasW
    snap.height = activeLayer.canvasH
    snap.getContext('2d')!.drawImage(img, 0, 0)
    transformSessionRef.current = {
      origCanvas: snap,
      origW: activeLayer.canvasW,
      origH: activeLayer.canvasH,
      origOffset: { ...activeLayer.offset },
    }
    transformOrigOffsetRef.current = { ...activeLayer.offset }
    setTransformPending(defaultTransformPending(activeLayer.canvasW, activeLayer.canvasH))
  }, [activeLayer])

  const previewTransform = useCallback(
    (pending: TransformPending) => {
      const session = transformSessionRef.current
      if (!session || !activeLayer) return
      const anchor = transformOrigOffsetRef.current ?? session.origOffset
      const { canvas, offset } = reapplyTransform(
        session.origCanvas,
        session.origW,
        session.origH,
        anchor,
        pending,
      )
      setTransformPending(pending)
      updateLayer(activeLayer.id, {
        dataUrl: canvas.toDataURL('image/png'),
        canvasW: canvas.width,
        canvasH: canvas.height,
        offset,
      })
    },
    [activeLayer, updateLayer],
  )

  const clearTransformSession = useCallback(() => {
    transformSessionRef.current = null
    transformOrigOffsetRef.current = null
    transformHandleRef.current = null
    transformStartRef.current = null
    setTransformPending(null)
    setActiveTransformHandle(null)
  }, [])

  const commitTransformSession = useCallback(() => {
    if (transformSessionRef.current) {
      history.push(projectRef.current, 'Transform layer')
    }
    clearTransformSession()
  }, [clearTransformSession, history])

  const cancelTransformSession = useCallback(async () => {
    const session = transformSessionRef.current
    if (!session || !activeLayer) {
      clearTransformSession()
      return
    }
    updateLayer(activeLayer.id, {
      dataUrl: session.origCanvas.toDataURL('image/png'),
      canvasW: session.origW,
      canvasH: session.origH,
      offset: { ...session.origOffset },
    })
    clearTransformSession()
  }, [activeLayer, clearTransformSession, updateLayer])

  useEffect(() => {
    if (tool === 'move' && activeLayer && !activeLayer.locked) {
      void ensureTransformSession()
    } else if (tool !== 'move') {
      clearTransformSession()
    }
  }, [activeLayer?.id, activeLayer?.locked, clearTransformSession, ensureTransformSession, tool])

  const hitTestTransform = useCallback(
    (x: number, y: number, zoom: number): TransformHandle => {
      if (!activeLayer || tool !== 'move') return null
      const pending = transformPending ?? defaultTransformPending(activeLayer.canvasW, activeLayer.canvasH)
      return getTransformHandleAt(
        x,
        y,
        activeLayer.offset,
        activeLayer.canvasW,
        activeLayer.canvasH,
        pending,
        zoom,
        project.imgWidth,
        project.imgHeight,
      )
    },
    [activeLayer, project.imgHeight, project.imgWidth, tool, transformPending],
  )

  const commitStroke = useCallback(() => {
    const label =
      tool === 'inpaint'
        ? 'Mask stroke'
        : tool === 'clone'
          ? 'Clone stroke'
          : tool === 'brush' || tool === 'eraser'
            ? 'Paint stroke'
            : 'Edit'
    history.push(projectRef.current, label)
  }, [history, tool])

  const handlePointerDown = useCallback(
    (x: number, y: number, opts?: PointerOpts) => {
      if (tool === 'move') {
        void ensureTransformSession().then(() => {
          const handle = hitTestTransform(x, y, opts?.zoom ?? 1)
          transformHandleRef.current = handle
          setActiveTransformHandle(handle)
          if (handle === 'move' && activeLayer && !activeLayer.locked) {
            moveStartRef.current = {
              x,
              y,
              ox: activeLayer.offset.x,
              oy: activeLayer.offset.y,
            }
          } else if (handle && handle !== 'move' && activeLayer && !activeLayer.locked) {
            const session = transformSessionRef.current
            const pending = transformPending ?? defaultTransformPending(activeLayer.canvasW, activeLayer.canvasH)
            transformStartRef.current = {
              x,
              y,
              w: pending.w,
              h: pending.h,
              ox: activeLayer.offset.x,
              oy: activeLayer.offset.y,
            }
            if (session) {
              transformOrigOffsetRef.current = { ...session.origOffset }
            }
          }
        })
        return
      }

      if (tool === 'crop') {
        if (
          cropRect &&
          x >= cropRect.x &&
          x <= cropRect.x + cropRect.w &&
          y >= cropRect.y &&
          y <= cropRect.y + cropRect.h
        ) {
          cropMoveStartRef.current = { x, y, rx: cropRect.x, ry: cropRect.y }
          return
        }
        cropStartRef.current = { x, y }
        setCropDragging(true)
        setCropRect({ x, y, w: 0, h: 0 })
        return
      }

      if (tool === 'clone' && opts?.altKey) {
        cloneSourceRef.current = { x, y }
        return
      }
      if (tool === 'clone') {
        if (!cloneSourceRef.current) return
        void loadLayerImage(activeLayer!.dataUrl).then((img) => {
          const snap = document.createElement('canvas')
          snap.width = img.naturalWidth
          snap.height = img.naturalHeight
          snap.getContext('2d')!.drawImage(img, 0, 0)
          cloneSnapshotRef.current = snap
        })
        cloneStartRef.current = { x, y }
        drawingRef.current = true
        stampClone(x, y)
        return
      }

      if (tool === 'wand' || tool === 'floodFill') {
        void applyWand(x, y, Boolean(opts?.altKey)).then(() => {
          history.push(
            projectRef.current,
            tool === 'floodFill'
              ? 'Flood fill'
              : opts?.altKey
                ? 'Wand subtract'
                : 'Wand select',
          )
        })
        return
      }

      if (tool === 'lasso') {
        setLassoPoints([{ x, y }])
        drawingRef.current = true
        return
      }

      if (tool === 'brush' || tool === 'eraser' || tool === 'inpaint') {
        if (tool === 'brush' || tool === 'eraser') void beginLayerStroke()
        drawingRef.current = true
        lastPointRef.current = { x, y }
        paintStroke(x, y, true)
      }
    },
    [
      activeLayer,
      applyWand,
      beginLayerStroke,
      cropRect,
      getLayerBounds,
      ensureTransformSession,
      history,
      hitTestTransform,
      transformPending,
      paintStroke,
      stampClone,
      tool,
    ],
  )

  const handlePointerMove = useCallback(
    (x: number, y: number, opts?: PointerOpts) => {
      if (tool === 'move') {
        if (moveStartRef.current && activeLayer) {
          const d = moveStartRef.current
          const snapped = computeSnap(
            { w: activeLayer.canvasW, h: activeLayer.canvasH },
            d.ox + (x - d.x),
            d.oy + (y - d.y),
            {
              zoom: opts?.zoom ?? 1,
              canvasW: project.imgWidth,
              canvasH: project.imgHeight,
              otherLayers: project.layers
                .filter((l) => l.id !== activeLayer.id)
                .map((l) => ({
                  id: l.id,
                  visible: l.visible,
                  offset: l.offset,
                  w: l.canvasW,
                  h: l.canvasH,
                })),
            },
          )
          setSnapGuides(snapped.guides)
          updateLayer(activeLayer.id, { offset: { x: snapped.x, y: snapped.y } })
          return
        }
        if (
          transformHandleRef.current &&
          transformHandleRef.current !== 'move' &&
          transformStartRef.current &&
          activeLayer &&
          transformSessionRef.current
        ) {
          const start = transformStartRef.current
          const handle = transformHandleRef.current
          const pending =
            transformPending ??
            defaultTransformPending(activeLayer.canvasW, activeLayer.canvasH)
          let next = { ...pending }

          if (handle === 'rot') {
            next.rot = rotationFromPointer(
              x,
              y,
              activeLayer.offset,
              activeLayer.canvasW,
              activeLayer.canvasH,
              Boolean(opts?.shiftKey),
            )
          } else {
            const dx = x - start.x
            const dy = y - start.y
            let newW = start.w
            let newH = start.h
            if (handle.includes('e')) newW = start.w + dx
            if (handle.includes('w')) newW = start.w - dx
            if (handle.includes('s')) newH = start.h + dy
            if (handle.includes('n')) newH = start.h - dy
            if (opts?.shiftKey && start.w > 0 && start.h > 0) {
              const aspect = start.w / start.h
              const wDelta = Math.abs(newW - start.w)
              const hDelta = Math.abs(newH - start.h)
              if (wDelta >= hDelta) newH = Math.max(1, Math.round(newW / aspect))
              else newW = Math.max(1, Math.round(newH * aspect))
            }
            newW = Math.max(1, Math.round(newW))
            newH = Math.max(1, Math.round(newH))
            next = { ...next, w: newW, h: newH }
            const anchorOffX =
              start.ox + (handle.includes('w') ? start.w - newW : 0)
            const anchorOffY =
              start.oy + (handle.includes('n') ? start.h - newH : 0)
            transformOrigOffsetRef.current = {
              x: anchorOffX + newW / 2 - start.w / 2,
              y: anchorOffY + newH / 2 - start.h / 2,
            }
          }
          previewTransform(next)
          return
        }
        setSnapGuides([])
      }

      if (tool === 'crop') {
        if (cropMoveStartRef.current && cropRect) {
          const d = cropMoveStartRef.current
          const dx = x - d.x
          const dy = y - d.y
          const nx = Math.max(0, Math.min(d.rx + dx, project.imgWidth - cropRect.w))
          const ny = Math.max(0, Math.min(d.ry + dy, project.imgHeight - cropRect.h))
          setCropRect({ ...cropRect, x: nx, y: ny })
          return
        }
        if (cropDragging && cropStartRef.current) {
          const s = cropStartRef.current
          const x0 = Math.min(s.x, x)
          const y0 = Math.min(s.y, y)
          let w = Math.abs(x - s.x)
          let h = Math.abs(y - s.y)
          if (opts?.shiftKey && w > 0 && h > 0) {
            const side = Math.max(w, h)
            w = side
            h = side
          }
          setCropRect({ x: x0, y: y0, w, h })
        }
        return
      }

      if (!drawingRef.current) return

      if (tool === 'lasso') {
        setLassoPoints((pts) => [...pts, { x, y }])
        return
      }
      if (tool === 'clone') {
        stampClone(x, y)
        return
      }
      if (tool === 'brush' || tool === 'eraser' || tool === 'inpaint') {
        paintStroke(x, y, false)
        lastPointRef.current = { x, y }
      }
    },
    [
      activeLayer,
      cropDragging,
      cropRect,
      previewTransform,
      project,
      transformPending,
      stampClone,
      tool,
      updateLayer,
    ],
  )

  const handlePointerUp = useCallback(
    (opts?: { altKey?: boolean }) => {
      if (tool === 'move') {
        if (moveStartRef.current) {
          history.push(projectRef.current, 'Move layer')
        } else if (transformStartRef.current) {
          commitTransformSession()
        }
        moveStartRef.current = null
        transformStartRef.current = null
        transformHandleRef.current = null
        setActiveTransformHandle(null)
        setSnapGuides([])
        return
      }
      if (tool === 'crop') {
        cropMoveStartRef.current = null
        setCropDragging(false)
        cropStartRef.current = null
        return
      }
      if (tool === 'lasso' && drawingRef.current) {
        finishLasso(Boolean(opts?.altKey))
      }
      if (drawingRef.current) {
        drawingRef.current = false
        lastPointRef.current = null
        strokeLayerRef.current = null
        commitStroke()
      }
    },
    [commitStroke, commitTransformSession, finishLasso, history, tool],
  )

  const applyCrop = useCallback(async () => {
    if (!cropRect || cropRect.w < 5 || cropRect.h < 5) return
    const next = await applyCropToProject(project, cropRect as CropRect)
    setCropRect(null)
    commitProject(next, 'Crop')
    setMaskCanvas(null)
  }, [commitProject, cropRect, project])

  const cancelCrop = useCallback(() => setCropRect(null), [])

  const mergeActiveLayerDown = useCallback(async () => {
    if (!activeLayer) return
    const next = await mergeLayersDown(project, activeLayer.id)
    if (next) commitProject(next, 'Merge layers')
  }, [activeLayer, commitProject, project])

  const resizeCanvas = useCallback(
    (w: number, h: number) => {
      const next = resizeCanvasProject(project, w, h)
      commitProject(next, 'Resize canvas')
    },
    [commitProject, project],
  )

  const rotateCanvas = useCallback(
    async (deg: 90 | 180 | 270) => {
      const next = await rotateAllLayers(project, deg)
      commitProject(next, `Rotate ${deg}°`)
      setMaskCanvas(null)
    },
    [commitProject, project],
  )

  const flipCanvas = useCallback(
    async (axis: 'h' | 'v') => {
      const next = await flipAllLayers(project, axis)
      commitProject(next, `Flip ${axis}`)
    },
    [commitProject, project],
  )

  const importImageAsLayer = useCallback(
    (img: HTMLImageElement, name = 'Imported') => {
      const dataUrl = (() => {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        c.getContext('2d')!.drawImage(img, 0, 0)
        return c.toDataURL('image/png')
      })()
      addLayer(name, dataUrl, img.naturalWidth, img.naturalHeight)
      setTool('move')
    },
    [addLayer],
  )

  const pasteFromClipboard = useCallback(async () => {
    if (internalClipboardRef.current) {
      const { canvas, offset } = internalClipboardRef.current
      addLayer('Pasted Selection', canvas.toDataURL('image/png'), canvas.width, canvas.height, offset)
      setTool('move')
      return
    }
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        const url = URL.createObjectURL(blob)
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = reject
          el.src = url
        })
        URL.revokeObjectURL(url)
        importImageAsLayer(img, 'Pasted')
        return
      }
    } catch {
      /* clipboard unavailable */
    }
  }, [addLayer, importImageAsLayer])

  const copySelectionToInternal = useCallback(async () => {
    if (!maskCanvas) return
    const flat = await compositeToCanvas()
    const cropped = await cropSelectionFromComposite(flat, maskCanvas)
    if (cropped) internalClipboardRef.current = cropped
  }, [compositeToCanvas, maskCanvas])

  const duplicateActiveLayer = useCallback(() => {
    if (!activeLayer) return
    const next = duplicateLayer(project, activeLayer.id)
    if (next) commitProject(next, `Duplicate ${activeLayer.name}`)
  }, [activeLayer, commitProject, project])

  const reorderLayer = useCallback(
    (orderedIds: number[]) => {
      const byId = new Map(project.layers.map((l) => [l.id, l]))
      const layers = orderedIds
        .map((id) => byId.get(id))
        .filter((l): l is (typeof project.layers)[number] => !!l)
      if (layers.length !== project.layers.length) return
      commitProject({ ...project, layers }, 'Reorder layers')
    },
    [commitProject, project],
  )

  const applyLayerDataUrl = useCallback(
    (layerId: number, dataUrl: string, w: number, h: number, label: string) => {
      setProject((p) => {
        const next = {
          ...p,
          layers: p.layers.map((l) =>
            l.id === layerId ? { ...l, dataUrl, canvasW: w, canvasH: h } : l,
          ),
        }
        history.push(next, label)
        return next
      })
    },
    [history],
  )

  const clearMask = useCallback(() => {
    if (maskCanvas) {
      maskCanvas.getContext('2d')!.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      setMaskCanvas(maskCanvas)
      history.push(projectRef.current, 'Clear mask')
    }
  }, [history, maskCanvas])

  return {
    project,
    setProject,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    brushColor,
    setBrushColor,
    wandTolerance,
    setWandTolerance,
    activeLayer,
    setActiveLayerId,
    updateLayer,
    addLayer,
    maskCanvas,
    lassoPoints,
    cropRect,
    snapGuides,
    transformPending,
    transformAspectLock,
    setTransformAspectLock,
    activeTransformHandle,
    history,
    compositeToCanvas,
    getFlattenedBase64,
    getMaskBase64,
    getLayerBounds,
    hitTestTransform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    applyCrop,
    cancelCrop,
    mergeActiveLayerDown,
    resizeCanvas,
    rotateCanvas,
    flipCanvas,
    importImageAsLayer,
    pasteFromClipboard,
    copySelectionToInternal,
    duplicateActiveLayer,
    reorderLayer,
    applyLayerDataUrl,
    previewTransform,
    commitTransformSession,
    cancelTransformSession,
    clearMask,
  }
}
