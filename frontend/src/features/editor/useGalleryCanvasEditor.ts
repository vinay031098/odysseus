import { useCallback, useEffect, useRef, useState } from 'react'
import {
  canvasToBase64,
  loadLayerImage,
  type CanvasLayerData,
  type CanvasProject,
} from '@/lib/canvasHelpers'
import {
  type AdjLayer,
  newAdjLayer,
  renderLayerWithAdjLayers,
} from '@/lib/editor/adjLayers'
import { applyEdgeFeatherToDataUrl } from '@/lib/editor/edgeFeather'
import { strokePoint, strokeSegment, type StrokeOptions } from '@/lib/editor/strokePipeline'
import {
  drawTransformHandles,
  getTransformHandleAt,
  rotationFromPointer,
  type TransformHandleId,
} from '@/lib/editor/transformHandles'
import {
  defaultTransformPending,
  reapplyTransform,
  type TransformPending,
} from '@/lib/editor/transformSession'
import { applyCropToProject, normalizeCropRect, type CropRect } from './cropUtils'
import { floodFillMask } from './floodFill'
import { buildLassoMask, type Point } from './lassoMask'
import { applyMaskDilateAndFeather } from './maskOps'
import {
  applyAdjustmentsToDataUrl,
  DEFAULT_COLOR_BALANCE,
  DEFAULT_LEVELS,
  type ColorBalanceParams,
  type LevelsParams,
} from './pixelAdjustments'
import type { GalleryEditorTool } from './types'
import { useEditorHistory } from './useEditorHistory'

type UseGalleryCanvasEditorOptions = {
  initialProject: CanvasProject
  initialMaskDataUrl?: string
  onProjectChange?: (project: CanvasProject) => void
}

export function useGalleryCanvasEditor({
  initialProject,
  initialMaskDataUrl,
  onProjectChange,
}: UseGalleryCanvasEditorOptions) {
  const [project, setProject] = useState<CanvasProject>(() => structuredClone(initialProject))
  const [tool, setTool] = useState<GalleryEditorTool>('inpaint')
  const [brushSize, setBrushSize] = useState(40)
  const [brushHardness, setBrushHardness] = useState(80)
  const [brushColor, setBrushColor] = useState('#e06c75')
  const [textSize, setTextSize] = useState(48)
  const [textFont, setTextFont] = useState('sans-serif')
  const [wandTolerance, setWandTolerance] = useState(32)
  const [eraseMask, setEraseMask] = useState(false)
  const [maskDilate, setMaskDilate] = useState(0)
  const [maskFeather, setMaskFeather] = useState(0)
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(1)
  const [levels, setLevels] = useState<LevelsParams>({ ...DEFAULT_LEVELS })
  const [colorBalance, setColorBalance] = useState<ColorBalanceParams>({
    ...DEFAULT_COLOR_BALANCE,
    shadows: { ...DEFAULT_COLOR_BALANCE.shadows },
    midtones: { ...DEFAULT_COLOR_BALANCE.midtones },
    highlights: { ...DEFAULT_COLOR_BALANCE.highlights },
  })
  const [postEdgeFeather, setPostEdgeFeather] = useState(0)
  const [postEdgeStroke, setPostEdgeStroke] = useState(0)
  const [postEdgeLayerId, setPostEdgeLayerId] = useState<number | null>(null)
  const [postEdgeBaseUrl, setPostEdgeBaseUrl] = useState<string | null>(null)
  const [lassoPoints, setLassoPoints] = useState<Point[]>([])
  const [cropStart, setCropStart] = useState<Point | null>(null)
  const [cropEnd, setCropEnd] = useState<Point | null>(null)
  const [pendingCrop, setPendingCrop] = useState<CropRect | null>(null)
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null)
  const [displayMask, setDisplayMask] = useState<HTMLCanvasElement | null>(null)
  const [transformPending, setTransformPending] = useState<TransformPending | null>(null)
  const [transformPreviewUrl, setTransformPreviewUrl] = useState<string | null>(null)
  const [transformPreviewOffset, setTransformPreviewOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [transformHandle, setTransformHandle] = useState<TransformHandleId>(null)
  const [hoveredHandle, setHoveredHandle] = useState<TransformHandleId>(null)

  const history = useEditorHistory(initialProject)
  const drawingRef = useRef(false)
  const cloneSourceRef = useRef<Point | null>(null)
  const cloneSnapshotRef = useRef<HTMLCanvasElement | null>(null)
  const strokeStartRef = useRef<Point | null>(null)
  const lastPointRef = useRef<Point | null>(null)
  const strokeLayerRef = useRef<HTMLCanvasElement | null>(null)
  const transformOrigRef = useRef<{
    dataUrl: string
    w: number
    h: number
    offset: { x: number; y: number }
  } | null>(null)
  const transformDragRef = useRef<{
    handle: TransformHandleId
    startX: number
    startY: number
    startOff: { x: number; y: number }
    origW: number
    origH: number
    pending: TransformPending
  } | null>(null)
  const moveDragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    onProjectChange?.(project)
  }, [project, onProjectChange])

  useEffect(() => {
    if (!initialMaskDataUrl) return
    void loadLayerImage(initialMaskDataUrl).then((img) => {
      const c = document.createElement('canvas')
      c.width = project.imgWidth
      c.height = project.imgHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      setMaskCanvas(c)
    })
  }, [initialMaskDataUrl, project.imgWidth, project.imgHeight])

  useEffect(() => {
    if (!maskCanvas) {
      setDisplayMask(null)
      return
    }
    if (maskDilate === 0 && maskFeather === 0) {
      setDisplayMask(maskCanvas)
      return
    }
    setDisplayMask(applyMaskDilateAndFeather(maskCanvas, maskDilate, maskFeather))
  }, [maskCanvas, maskDilate, maskFeather])

  const activeLayer =
    project.layers.find((l) => l.id === project.activeLayerId) ?? project.layers[0]

  const pushHistory = useCallback(
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

  const reorderLayers = useCallback((orderedIds: number[]) => {
    setProject((p) => {
      const byId = new Map(p.layers.map((l) => [l.id, l]))
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean) as CanvasLayerData[]
      if (next.length !== p.layers.length) return p
      history.push({ ...p, layers: next }, 'Reorder layers')
      return { ...p, layers: next }
    })
  }, [history])

  const addAdjLayer = useCallback(
    (type: AdjLayer['type']) => {
      if (!activeLayer) return
      const adj = newAdjLayer(type)
      const stack = [...(activeLayer.adjLayers ?? []), adj]
      updateLayer(activeLayer.id, { adjLayers: stack })
    },
    [activeLayer, updateLayer],
  )

  const updateAdjLayer = useCallback(
    (adjId: string, patch: Partial<AdjLayer>) => {
      if (!activeLayer?.adjLayers) return
      updateLayer(activeLayer.id, {
        adjLayers: activeLayer.adjLayers.map((a) => (a.id === adjId ? { ...a, ...patch } : a)),
      })
    },
    [activeLayer, updateLayer],
  )

  const removeAdjLayer = useCallback(
    (adjId: string) => {
      if (!activeLayer?.adjLayers) return
      updateLayer(activeLayer.id, {
        adjLayers: activeLayer.adjLayers.filter((a) => a.id !== adjId),
      })
    },
    [activeLayer, updateLayer],
  )

  const mergeDown = useCallback(async () => {
    const idx = project.layers.findIndex((l) => l.id === project.activeLayerId)
    if (idx <= 0) return
    const upper = project.layers[idx]
    const lower = project.layers[idx - 1]
    if (upper.locked || lower.locked) return
    const upperRendered = await renderLayerWithAdjLayers(
      upper.dataUrl,
      upper.canvasW,
      upper.canvasH,
      upper.adjLayers,
    )
    const lowerRendered = await renderLayerWithAdjLayers(
      lower.dataUrl,
      lower.canvasW,
      lower.canvasH,
      lower.adjLayers,
    )
    const c = document.createElement('canvas')
    c.width = project.imgWidth
    c.height = project.imgHeight
    const ctx = c.getContext('2d')!
    ctx.globalAlpha = lower.opacity / 100
    ctx.drawImage(lowerRendered, lower.offset.x, lower.offset.y)
    ctx.globalAlpha = upper.opacity / 100
    ctx.drawImage(upperRendered, upper.offset.x, upper.offset.y)
    ctx.globalAlpha = 1
    const merged: CanvasLayerData = {
      ...lower,
      name: `${lower.name} + ${upper.name}`,
      dataUrl: c.toDataURL('image/png'),
      opacity: 100,
      adjLayers: [],
    }
    const next = {
      ...project,
      activeLayerId: merged.id,
      layers: project.layers.filter((l) => l.id !== upper.id).map((l) => (l.id === lower.id ? merged : l)),
    }
    pushHistory(next, 'Merge down')
  }, [project, pushHistory])

  const addLayer = useCallback(
    (name: string, dataUrl: string, w: number, h: number) => {
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
          offset: { x: 0, y: 0 },
          dataUrl,
          adjLayers: [],
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

  const clearMask = useCallback(() => {
    const c = ensureMaskCanvas()
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setMaskCanvas(c)
    setLassoPoints([])
  }, [ensureMaskCanvas])

  const strokeOpts = useCallback(
    (): StrokeOptions => ({
      size: brushSize,
      hardness: brushHardness,
      color: brushColor,
    }),
    [brushColor, brushHardness, brushSize],
  )

  const compositeToCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    const out = document.createElement('canvas')
    out.width = project.imgWidth
    out.height = project.imgHeight
    const ctx = out.getContext('2d')!
    ctx.clearRect(0, 0, out.width, out.height)
    for (const layer of project.layers) {
      if (!layer.visible) continue
      let rendered: HTMLCanvasElement
      if (
        tool === 'transform' &&
        transformPreviewUrl &&
        layer.id === activeLayer?.id
      ) {
        rendered = await loadLayerImage(transformPreviewUrl).then((img) => {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          c.getContext('2d')!.drawImage(img, 0, 0)
          return c
        })
      } else {
        rendered = await renderLayerWithAdjLayers(
          layer.dataUrl,
          layer.canvasW,
          layer.canvasH,
          layer.adjLayers,
        )
      }
      ctx.globalAlpha = layer.opacity / 100
      const off =
        tool === 'transform' && layer.id === activeLayer?.id
          ? transformPreviewOffset
          : layer.offset
      ctx.drawImage(rendered, off.x, off.y)
    }
    ctx.globalAlpha = 1
    return out
  }, [
    activeLayer?.id,
    project,
    tool,
    transformPreviewOffset,
    transformPreviewUrl,
  ])

  const getFlattenedBase64 = useCallback(async () => {
    const canvas = await compositeToCanvas()
    return canvasToBase64(canvas)
  }, [compositeToCanvas])

  const getMaskBase64 = useCallback(() => {
    const m = displayMask ?? maskCanvas
    if (!m || !maskHasPixels(m)) return null
    return canvasToBase64(m)
  }, [displayMask, maskCanvas])

  const getRawMaskCanvas = useCallback(() => maskCanvas, [maskCanvas])

  const paintMask = useCallback(
    (x: number, y: number, erase: boolean) => {
      const mask = ensureMaskCanvas()
      const ctx = mask.getContext('2d')!
      const lx = x
      const ly = y
      const opts = { ...strokeOpts(), color: '#ffffff', opacity: 100 }
      if (lastPointRef.current && !erase) {
        strokeSegment(ctx, lastPointRef.current.x, lastPointRef.current.y, lx, ly, opts, erase)
      } else {
        strokePoint(ctx, lx, ly, opts, erase)
      }
      setMaskCanvas(mask)
    },
    [ensureMaskCanvas, strokeOpts],
  )

  const beginLayerStroke = useCallback(async () => {
    if (!activeLayer || strokeLayerRef.current) return
    const layerCanvas = document.createElement('canvas')
    layerCanvas.width = activeLayer.canvasW
    layerCanvas.height = activeLayer.canvasH
    const img = await loadLayerImage(activeLayer.dataUrl)
    layerCanvas.getContext('2d')!.drawImage(img, 0, 0)
    strokeLayerRef.current = layerCanvas
  }, [activeLayer])

  const paintBrushOnLayer = useCallback(
    async (x: number, y: number, start: boolean) => {
      if (!activeLayer || activeLayer.locked) return
      if (!strokeLayerRef.current) await beginLayerStroke()
      const layerCanvas = strokeLayerRef.current
      if (!layerCanvas) return
      const layerCtx = layerCanvas.getContext('2d')!
      const lx = x - activeLayer.offset.x
      const ly = y - activeLayer.offset.y
      const opts = strokeOpts()
      if (start) {
        strokePoint(layerCtx, lx, ly, opts, tool === 'eraser')
      } else if (lastPointRef.current) {
        strokeSegment(
          layerCtx,
          lastPointRef.current.x - activeLayer.offset.x,
          lastPointRef.current.y - activeLayer.offset.y,
          lx,
          ly,
          opts,
          tool === 'eraser',
        )
      }
      updateLayer(activeLayer.id, { dataUrl: layerCanvas.toDataURL('image/png') })
    },
    [activeLayer, beginLayerStroke, strokeOpts, tool, updateLayer],
  )

  const placeText = useCallback(
    async (x: number, y: number, text: string) => {
      if (!activeLayer || activeLayer.locked || !text.trim()) return
      const layerCanvas = document.createElement('canvas')
      layerCanvas.width = activeLayer.canvasW
      layerCanvas.height = activeLayer.canvasH
      const ctx = layerCanvas.getContext('2d')!
      const img = await loadLayerImage(activeLayer.dataUrl)
      ctx.drawImage(img, 0, 0)
      ctx.font = `${textSize}px ${textFont}`
      ctx.fillStyle = brushColor
      ctx.textBaseline = 'top'
      ctx.fillText(text.trim(), x - activeLayer.offset.x, y - activeLayer.offset.y)
      const next = {
        ...project,
        layers: project.layers.map((l) =>
          l.id === activeLayer.id ? { ...l, dataUrl: layerCanvas.toDataURL('image/png') } : l,
        ),
      }
      pushHistory(next, 'Text')
    },
    [activeLayer, brushColor, project, pushHistory, textFont, textSize],
  )

  const stampClone = useCallback(
    async (x: number, y: number) => {
      if (!activeLayer) return
      const src = cloneSourceRef.current
      const start = strokeStartRef.current
      const snap = cloneSnapshotRef.current
      if (!src || !start || !snap) return
      const layerCanvas = document.createElement('canvas')
      layerCanvas.width = activeLayer.canvasW
      layerCanvas.height = activeLayer.canvasH
      const ctx = layerCanvas.getContext('2d')!
      const img = await loadLayerImage(activeLayer.dataUrl)
      ctx.drawImage(img, 0, 0)
      const dx = x - start.x
      const dy = y - start.y
      const sx = src.x + dx
      const sy = src.y + dy
      const lx = x - activeLayer.offset.x
      const ly = y - activeLayer.offset.y
      ctx.save()
      ctx.beginPath()
      ctx.arc(lx, ly, brushSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(
        snap,
        sx - brushSize / 2,
        sy - brushSize / 2,
        brushSize,
        brushSize,
        lx - brushSize / 2,
        ly - brushSize / 2,
        brushSize,
        brushSize,
      )
      ctx.restore()
      updateLayer(activeLayer.id, { dataUrl: layerCanvas.toDataURL('image/png') })
    },
    [activeLayer, brushSize, updateLayer],
  )

  const finishLasso = useCallback(() => {
    if (lassoPoints.length < 3) {
      setLassoPoints([])
      return
    }
    const lassoMask = buildLassoMask(lassoPoints, project.imgWidth, project.imgHeight)
    if (lassoMask) {
      const mask = ensureMaskCanvas()
      const ctx = mask.getContext('2d')!
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(lassoMask, 0, 0)
      setMaskCanvas(mask)
    }
    setLassoPoints([])
  }, [ensureMaskCanvas, lassoPoints, project.imgHeight, project.imgWidth])

  const commitStroke = useCallback(() => {
    history.push(project, tool === 'inpaint' ? 'Mask stroke' : tool === 'clone' ? 'Clone' : 'Paint stroke')
  }, [history, project, tool])

  const startTransformSession = useCallback(async () => {
    if (!activeLayer || activeLayer.locked) return
    transformOrigRef.current = {
      dataUrl: activeLayer.dataUrl,
      w: activeLayer.canvasW,
      h: activeLayer.canvasH,
      offset: { ...activeLayer.offset },
    }
    const pending = defaultTransformPending(activeLayer.canvasW, activeLayer.canvasH)
    setTransformPending(pending)
    const img = await loadLayerImage(activeLayer.dataUrl)
    const origCanvas = document.createElement('canvas')
    origCanvas.width = activeLayer.canvasW
    origCanvas.height = activeLayer.canvasH
    origCanvas.getContext('2d')!.drawImage(img, 0, 0)
    const { canvas, offset } = reapplyTransform(
      origCanvas,
      activeLayer.canvasW,
      activeLayer.canvasH,
      activeLayer.offset,
      pending,
    )
    setTransformPreviewUrl(canvas.toDataURL('image/png'))
    setTransformPreviewOffset(offset)
  }, [activeLayer])

  useEffect(() => {
    if (tool === 'transform') void startTransformSession()
    else {
      setTransformPending(null)
      setTransformPreviewUrl(null)
      transformOrigRef.current = null
    }
  }, [tool, project.activeLayerId, startTransformSession])

  const refreshTransformPreview = useCallback(
    (pending: TransformPending, offset?: { x: number; y: number }) => {
      const orig = transformOrigRef.current
      if (!orig) return
      void loadLayerImage(orig.dataUrl).then((img) => {
        const origCanvas = document.createElement('canvas')
        origCanvas.width = orig.w
        origCanvas.height = orig.h
        origCanvas.getContext('2d')!.drawImage(img, 0, 0)
        const baseOff = offset ?? orig.offset
        const { canvas, offset: nextOff } = reapplyTransform(
          origCanvas,
          orig.w,
          orig.h,
          baseOff,
          pending,
        )
        setTransformPreviewUrl(canvas.toDataURL('image/png'))
        setTransformPreviewOffset(nextOff)
        setTransformPending({ ...pending })
      })
    },
    [],
  )

  const handlePointerDown = useCallback(
    async (x: number, y: number, altKey: boolean) => {
      if (tool === 'transform' && activeLayer && transformPending && transformOrigRef.current) {
        const handle = getTransformHandleAt(
          x,
          y,
          transformPreviewOffset,
          transformOrigRef.current.w,
          transformOrigRef.current.h,
          transformPending,
          1,
          project.imgWidth,
          project.imgHeight,
        )
        setTransformHandle(handle)
        if (handle === 'move') {
          moveDragRef.current = {
            x,
            y,
            ox: transformPreviewOffset.x,
            oy: transformPreviewOffset.y,
          }
        } else if (handle) {
          transformDragRef.current = {
            handle,
            startX: x,
            startY: y,
            startOff: { ...transformPreviewOffset },
            origW: transformOrigRef.current.w,
            origH: transformOrigRef.current.h,
            pending: { ...transformPending },
          }
        }
        return
      }
      if (tool === 'move' && activeLayer && !activeLayer.locked) {
        moveDragRef.current = { x, y, ox: activeLayer.offset.x, oy: activeLayer.offset.y }
        return
      }
      if (tool === 'text') {
        const text = window.prompt('Enter text:')
        if (text) await placeText(x, y, text)
        return
      }
      if (tool === 'crop') {
        setCropStart({ x, y })
        setCropEnd({ x, y })
        setPendingCrop(null)
        drawingRef.current = true
        return
      }
      if (tool === 'clone' && altKey) {
        cloneSourceRef.current = { x, y }
        return
      }
      if (tool === 'clone') {
        if (!cloneSourceRef.current || !activeLayer) return
        const snap = document.createElement('canvas')
        snap.width = project.imgWidth
        snap.height = project.imgHeight
        const flat = await compositeToCanvas()
        snap.getContext('2d')!.drawImage(flat, 0, 0)
        cloneSnapshotRef.current = snap
        strokeStartRef.current = { x, y }
        drawingRef.current = true
        lastPointRef.current = { x, y }
        await stampClone(x, y)
        return
      }
      if (tool === 'wand') {
        const flat = await compositeToCanvas()
        const data = flat.getContext('2d')!.getImageData(0, 0, flat.width, flat.height).data
        const fill = floodFillMask(
          data,
          flat.width,
          flat.height,
          Math.floor(x),
          Math.floor(y),
          wandTolerance,
        )
        if (fill) {
          const mask = ensureMaskCanvas()
          const ctx = mask.getContext('2d')!
          ctx.globalCompositeOperation = altKey ? 'destination-out' : 'source-over'
          ctx.drawImage(fill, 0, 0)
          ctx.globalCompositeOperation = 'source-over'
          setMaskCanvas(mask)
          history.push(project, 'Magic wand')
        }
        return
      }
      if (tool === 'lasso') {
        setLassoPoints([{ x, y }])
        drawingRef.current = true
        return
      }
      if (tool === 'inpaint') {
        drawingRef.current = true
        lastPointRef.current = { x, y }
        paintMask(x, y, eraseMask)
        return
      }
      if (tool === 'brush' || tool === 'eraser') {
        drawingRef.current = true
        lastPointRef.current = { x, y }
        await paintBrushOnLayer(x, y, true)
      }
    },
    [
      activeLayer,
      compositeToCanvas,
      eraseMask,
      ensureMaskCanvas,
      history,
      paintBrushOnLayer,
      paintMask,
      placeText,
      project,
      stampClone,
      tool,
      transformPending,
      transformPreviewOffset,
      wandTolerance,
    ],
  )

  const handlePointerMove = useCallback(
    async (x: number, y: number, shiftKey = false) => {
      if (tool === 'transform' && transformPending && transformOrigRef.current) {
        if (moveDragRef.current) {
          const d = moveDragRef.current
          setTransformPreviewOffset({
            x: d.ox + (x - d.x),
            y: d.oy + (y - d.y),
          })
          return
        }
        if (transformDragRef.current) {
          const drag = transformDragRef.current
          if (drag.handle === 'rot') {
            const rot = rotationFromPointer(
              x,
              y,
              transformPreviewOffset,
              drag.origW,
              drag.origH,
              shiftKey,
            )
            refreshTransformPreview({ ...drag.pending, rot })
            return
          }
          const dx = x - drag.startX
          const dy = y - drag.startY
          let newW = drag.origW
          let newH = drag.origH
          const h = drag.handle
          if (!h) return
          if (h.includes('e')) newW = drag.origW + dx
          if (h.includes('w')) newW = drag.origW - dx
          if (h.includes('s')) newH = drag.origH + dy
          if (h.includes('n')) newH = drag.origH - dy
          if (shiftKey && drag.origW > 0 && drag.origH > 0) {
            const aspect = drag.origW / drag.origH
            if (Math.abs(newW - drag.origW) >= Math.abs(newH - drag.origH)) {
              newH = Math.max(1, Math.round(newW / aspect))
            } else {
              newW = Math.max(1, Math.round(newH * aspect))
            }
          }
          newW = Math.max(1, Math.round(newW))
          newH = Math.max(1, Math.round(newH))
          const anchorOffX =
            drag.startOff.x + (h.includes('w') ? drag.origW - newW : 0)
          const anchorOffY =
            drag.startOff.y + (h.includes('n') ? drag.origH - newH : 0)
          refreshTransformPreview(
            { ...drag.pending, w: newW, h: newH },
            {
              x: anchorOffX,
              y: anchorOffY,
            },
          )
          return
        }
        const hovered = getTransformHandleAt(
          x,
          y,
          transformPreviewOffset,
          transformOrigRef.current.w,
          transformOrigRef.current.h,
          transformPending,
          1,
          project.imgWidth,
          project.imgHeight,
        )
        setHoveredHandle(hovered)
        return
      }
      if (tool === 'move' && moveDragRef.current && activeLayer) {
        const d = moveDragRef.current
        updateLayer(activeLayer.id, {
          offset: { x: d.ox + (x - d.x), y: d.oy + (y - d.y) },
        })
        return
      }
      if (!drawingRef.current) return
      if (tool === 'crop' && cropStart) {
        setCropEnd({ x, y })
        return
      }
      if (tool === 'lasso') {
        setLassoPoints((pts) => [...pts, { x, y }])
        return
      }
      if (tool === 'clone') {
        await stampClone(x, y)
        lastPointRef.current = { x, y }
        return
      }
      if (tool === 'inpaint') {
        paintMask(x, y, eraseMask)
        lastPointRef.current = { x, y }
        return
      }
      if (tool === 'brush' || tool === 'eraser') {
        await paintBrushOnLayer(x, y, false)
        lastPointRef.current = { x, y }
      }
    },
    [
      activeLayer,
      cropStart,
      eraseMask,
      paintBrushOnLayer,
      paintMask,
      project.imgHeight,
      project.imgWidth,
      refreshTransformPreview,
      stampClone,
      tool,
      transformPending,
      transformPreviewOffset,
      updateLayer,
    ],
  )

  const handlePointerUp = useCallback(() => {
    if (tool === 'move' || tool === 'transform') {
      if (moveDragRef.current || transformDragRef.current) {
        if (tool === 'move' && activeLayer) history.push(project, 'Move layer')
        if (tool === 'transform' && transformPending && transformPreviewUrl && activeLayer) {
          updateLayer(activeLayer.id, {
            dataUrl: transformPreviewUrl,
            canvasW: transformPending.w,
            canvasH: transformPending.h,
            offset: transformPreviewOffset,
          })
          transformOrigRef.current = {
            dataUrl: transformPreviewUrl,
            w: transformPending.w,
            h: transformPending.h,
            offset: { ...transformPreviewOffset },
          }
        }
      }
      moveDragRef.current = null
      transformDragRef.current = null
      setTransformHandle(null)
      return
    }
    if (tool === 'lasso' && drawingRef.current) finishLasso()
    if (tool === 'crop' && cropStart && cropEnd) {
      const rect = normalizeCropRect(cropStart, cropEnd, project.imgWidth, project.imgHeight)
      if (rect.w > 4 && rect.h > 4) setPendingCrop(rect)
    }
    if (drawingRef.current && (tool === 'inpaint' || tool === 'brush' || tool === 'eraser' || tool === 'clone')) {
      commitStroke()
    }
    drawingRef.current = false
    strokeStartRef.current = null
    lastPointRef.current = null
    strokeLayerRef.current = null
  }, [
    activeLayer,
    commitStroke,
    cropEnd,
    cropStart,
    finishLasso,
    history,
    project,
    tool,
    transformPending,
    transformPreviewOffset,
    transformPreviewUrl,
    updateLayer,
  ])

  const applyCrop = useCallback(async () => {
    if (!pendingCrop) return
    const next = await applyCropToProject(project, pendingCrop)
    pushHistory(next, 'Crop')
    setPendingCrop(null)
    setCropStart(null)
    setCropEnd(null)
    clearMask()
  }, [clearMask, pendingCrop, project, pushHistory])

  const cancelCrop = useCallback(() => {
    setPendingCrop(null)
    setCropStart(null)
    setCropEnd(null)
  }, [])

  const applyTransform = useCallback(async () => {
    if (!activeLayer || !transformPreviewUrl || !transformPending) return
    const next = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === activeLayer.id
          ? {
              ...l,
              dataUrl: transformPreviewUrl,
              canvasW: transformPending.w,
              canvasH: transformPending.h,
              offset: transformPreviewOffset,
            }
          : l,
      ),
    }
    pushHistory(next, 'Transform')
    transformOrigRef.current = null
    setTransformPending(null)
    setTransformPreviewUrl(null)
  }, [activeLayer, project, pushHistory, transformPending, transformPreviewOffset, transformPreviewUrl])

  const applyAdjustments = useCallback(async () => {
    if (!activeLayer || activeLayer.locked) return
    const dataUrl = await applyAdjustmentsToDataUrl(
      activeLayer.dataUrl,
      activeLayer.canvasW,
      activeLayer.canvasH,
      { brightness, contrast },
      { hue, saturation },
      levels,
      colorBalance,
    )
    const next = {
      ...project,
      layers: project.layers.map((l) =>
        l.id === activeLayer.id ? { ...l, dataUrl, adjLayers: [] } : l,
      ),
    }
    pushHistory(next, 'Adjustments')
    setBrightness(1)
    setContrast(1)
    setHue(0)
    setSaturation(1)
    setLevels({ ...DEFAULT_LEVELS })
    setColorBalance({
      ...DEFAULT_COLOR_BALANCE,
      shadows: { ...DEFAULT_COLOR_BALANCE.shadows },
      midtones: { ...DEFAULT_COLOR_BALANCE.midtones },
      highlights: { ...DEFAULT_COLOR_BALANCE.highlights },
    })
  }, [
    activeLayer,
    brightness,
    colorBalance,
    contrast,
    hue,
    levels,
    project,
    pushHistory,
    saturation,
  ])

  const applyPostEdge = useCallback(async () => {
    if (!postEdgeLayerId || !postEdgeBaseUrl) return
    const layer = project.layers.find((l) => l.id === postEdgeLayerId)
    if (!layer) return
    const dataUrl = await applyEdgeFeatherToDataUrl(
      postEdgeBaseUrl,
      layer.canvasW,
      layer.canvasH,
      postEdgeFeather,
      postEdgeStroke,
    )
    updateLayer(layer.id, { dataUrl })
  }, [postEdgeBaseUrl, postEdgeFeather, postEdgeLayerId, postEdgeStroke, project.layers, updateLayer])

  useEffect(() => {
    if (!postEdgeLayerId || !postEdgeBaseUrl) return
    const t = window.setTimeout(() => {
      void applyPostEdge()
    }, 80)
    return () => window.clearTimeout(t)
  }, [applyPostEdge, postEdgeBaseUrl, postEdgeFeather, postEdgeLayerId, postEdgeStroke])

  const applyResultLayer = useCallback(
    (name: string, dataUrl: string, w: number, h: number, trackPostEdge = false) => {
      if (w !== project.imgWidth || h !== project.imgHeight) {
        const next: CanvasProject = {
          ...project,
          imgWidth: w,
          imgHeight: h,
          layers: [
            {
              id: project.activeLayerId,
              name,
              visible: true,
              opacity: 100,
              locked: false,
              canvasW: w,
              canvasH: h,
              offset: { x: 0, y: 0 },
              dataUrl,
              adjLayers: [],
            },
          ],
        }
        pushHistory(next, name)
      } else {
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
            offset: { x: 0, y: 0 },
            dataUrl,
            adjLayers: [],
          }
          const next = {
            ...p,
            activeLayerId: id,
            nextLayerId: id + 1,
            layers: [...p.layers, layer],
          }
          history.push(next, name)
          if (trackPostEdge) {
            setPostEdgeLayerId(id)
            setPostEdgeBaseUrl(dataUrl)
            setPostEdgeFeather(0)
            setPostEdgeStroke(0)
          }
          return next
        })
      }
      clearMask()
    },
    [clearMask, history, project, pushHistory],
  )

  const drawTransformOverlay = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (tool !== 'transform' || !transformPending || !transformOrigRef.current) return
      drawTransformHandles(
        ctx,
        transformPreviewOffset,
        transformOrigRef.current.w,
        transformOrigRef.current.h,
        transformPending,
        1,
        project.imgWidth,
        project.imgHeight,
        transformHandle ?? hoveredHandle,
      )
    },
    [
      hoveredHandle,
      project.imgHeight,
      project.imgWidth,
      tool,
      transformHandle,
      transformPending,
      transformPreviewOffset,
    ],
  )

  const applyHistory = useCallback(() => {
    setProject(structuredClone(history.current))
  }, [history])

  useEffect(() => {
    applyHistory()
  }, [history.index, applyHistory])

  const exportPngBlob = useCallback(async (): Promise<Blob> => {
    const canvas = await compositeToCanvas()
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png')
    })
  }, [compositeToCanvas])

  return {
    project,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushHardness,
    setBrushHardness,
    brushColor,
    setBrushColor,
    textSize,
    setTextSize,
    textFont,
    setTextFont,
    wandTolerance,
    setWandTolerance,
    eraseMask,
    setEraseMask,
    maskDilate,
    setMaskDilate,
    maskFeather,
    setMaskFeather,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    hue,
    setHue,
    saturation,
    setSaturation,
    levels,
    setLevels,
    colorBalance,
    setColorBalance,
    postEdgeFeather,
    setPostEdgeFeather,
    postEdgeStroke,
    setPostEdgeStroke,
    postEdgeLayerId,
    transformPending,
    lassoPoints,
    cropStart,
    cropEnd,
    pendingCrop,
    maskCanvas: displayMask ?? maskCanvas,
    history,
    activeLayer,
    setActiveLayerId,
    updateLayer,
    reorderLayers,
    addAdjLayer,
    updateAdjLayer,
    removeAdjLayer,
    mergeDown,
    addLayer,
    clearMask,
    compositeToCanvas,
    getFlattenedBase64,
    getMaskBase64,
    getRawMaskCanvas,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    applyCrop,
    cancelCrop,
    applyTransform,
    applyAdjustments,
    applyResultLayer,
    drawTransformOverlay,
    exportPngBlob,
  }
}

function maskHasPixels(canvas: HTMLCanvasElement): boolean {
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true
  }
  return false
}
