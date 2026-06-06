import {
  Copy,
  Crop,
  Eraser,
  Hand,
  Lasso,
  Paintbrush,
  PaintBucket,
  Redo2,
  Undo2,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EditorTopbarMenus } from './EditorTopbarMenus'
import type { EditorTool } from './types'

type EditorToolbarProps = {
  tool: EditorTool
  brushSize: number
  brushHardness: number
  brushColor: string
  wandTolerance: number
  canvasWidth: number
  canvasHeight: number
  canUndo: boolean
  canRedo: boolean
  onToolChange: (tool: EditorTool) => void
  onBrushSizeChange: (size: number) => void
  onBrushHardnessChange: (hardness: number) => void
  onBrushColorChange: (color: string) => void
  onWandToleranceChange: (t: number) => void
  onUndo: () => void
  onRedo: () => void
  onHistoryOpen?: () => void
  onResize: (w: number, h: number) => void
  onRotate: (deg: 90 | 180 | 270) => void
  onFlip: (axis: 'h' | 'v') => void
  onPaste: () => void
  onCopyMask: () => void
  onClearMask: () => void
}

const TOOLS: { id: EditorTool; label: string; icon: typeof Hand }[] = [
  { id: 'move', label: 'Move / Transform', icon: Hand },
  { id: 'brush', label: 'Brush', icon: Paintbrush },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'inpaint', label: 'Mask brush', icon: Wand2 },
  { id: 'lasso', label: 'Lasso', icon: Lasso },
  { id: 'wand', label: 'Magic wand', icon: Wand2 },
  { id: 'floodFill', label: 'Flood fill', icon: PaintBucket },
  { id: 'clone', label: 'Clone stamp (Alt+click source)', icon: Copy },
  { id: 'crop', label: 'Crop', icon: Crop },
]

const PAINT_TOOLS: EditorTool[] = ['brush', 'eraser', 'inpaint', 'clone']
const WAND_TOOLS: EditorTool[] = ['wand', 'floodFill']

export function EditorToolbar({
  tool,
  brushSize,
  brushHardness,
  brushColor,
  wandTolerance,
  canvasWidth,
  canvasHeight,
  canUndo,
  canRedo,
  onToolChange,
  onBrushSizeChange,
  onBrushHardnessChange,
  onBrushColorChange,
  onWandToleranceChange,
  onUndo,
  onRedo,
  onHistoryOpen,
  onResize,
  onRotate,
  onFlip,
  onPaste,
  onCopyMask,
  onClearMask,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <EditorTopbarMenus
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onResize={onResize}
        onRotate={onRotate}
        onFlip={onFlip}
        onPaste={onPaste}
        onCopyMask={onCopyMask}
        onClearMask={onClearMask}
      />

      <div className="flex flex-wrap gap-1">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            size="sm"
            variant={tool === id ? 'default' : 'outline'}
            onClick={() => onToolChange(id)}
            aria-label={label}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>

      {PAINT_TOOLS.includes(tool) ? (
        <>
          <label className="flex items-center gap-2 text-xs text-muted">
            Size
            <input
              type="range"
              min={2}
              max={128}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-20"
              aria-label="Brush size"
            />
            <span className="w-6 tabular-nums">{brushSize}</span>
          </label>
          {tool !== 'inpaint' ? (
            <label className="flex items-center gap-2 text-xs text-muted">
              Hardness
              <input
                type="range"
                min={0}
                max={100}
                value={brushHardness}
                onChange={(e) => onBrushHardnessChange(Number(e.target.value))}
                className="w-20"
                aria-label="Brush hardness"
              />
              <span className="w-6 tabular-nums">{brushHardness}</span>
            </label>
          ) : null}
          {tool === 'brush' ? (
            <input
              type="color"
              value={brushColor}
              onChange={(e) => onBrushColorChange(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
              aria-label="Brush color"
            />
          ) : null}
        </>
      ) : null}

      {WAND_TOOLS.includes(tool) ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          Tolerance
          <input
            type="range"
            min={0}
            max={100}
            value={wandTolerance}
            onChange={(e) => onWandToleranceChange(Number(e.target.value))}
            className="w-20"
            aria-label="Wand tolerance"
          />
          <span className="w-6 tabular-nums">{wandTolerance}</span>
        </label>
      ) : null}

      <div className="ml-auto flex gap-1">
        <Button size="sm" variant="outline" disabled={!canUndo} onClick={onUndo} aria-label="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" disabled={!canRedo} onClick={onRedo} aria-label="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        {onHistoryOpen ? (
          <Button size="sm" variant="outline" onClick={onHistoryOpen}>
            History
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function HistoryList({
  entries,
  activeIndex,
  onJump,
}: {
  entries: { label: string }[]
  activeIndex: number
  onJump: (index: number) => void
}) {
  return (
    <ul className="max-h-48 overflow-y-auto rounded-md border border-border text-xs">
      {[...entries].reverse().map((entry, revIdx) => {
        const idx = entries.length - 1 - revIdx
        return (
          <li key={idx}>
            <button
              type="button"
              onClick={() => onJump(idx)}
              className={cn(
                'flex w-full px-3 py-1.5 text-left hover:bg-panel',
                idx === activeIndex && 'bg-panel font-medium',
              )}
            >
              {entry.label}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
