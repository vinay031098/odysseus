import { Copy, Eye, EyeOff, GripVertical, Layers, Lock, Unlock } from 'lucide-react'
import { useState } from 'react'
import type { CanvasLayerData } from '@/lib/canvasHelpers'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LayerPanelProps = {
  layers: CanvasLayerData[]
  activeLayerId: number
  onSelect: (id: number) => void
  onToggleVisible: (id: number) => void
  onToggleLock: (id: number) => void
  onOpacityChange: (id: number, opacity: number) => void
  onMergeDown: () => void
  onDuplicate?: () => void
  onReorder?: (orderedIds: number[]) => void
  canMergeDown: boolean
}

export function LayerPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onOpacityChange,
  onMergeDown,
  onDuplicate,
  onReorder,
  canMergeDown,
}: LayerPanelProps) {
  const reversed = [...layers].reverse()
  const activeIdx = layers.findIndex((l) => l.id === activeLayerId)
  const [dragId, setDragId] = useState<number | null>(null)

  const handleDrop = (targetId: number) => {
    if (!onReorder || dragId === null || dragId === targetId) return
    const ids = layers.map((l) => l.id)
    const fromIdx = ids.indexOf(dragId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, dragId)
    onReorder(ids)
    setDragId(null)
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Layers</span>
        <div className="flex gap-1">
          {onDuplicate ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px]"
              onClick={onDuplicate}
              title="Duplicate active layer"
            >
              <Copy className="mr-1 h-3 w-3" />
              Dup
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            disabled={!canMergeDown}
            onClick={onMergeDown}
            title="Merge active layer with layer below"
          >
          <Layers className="mr-1 h-3 w-3" />
          Merge
        </Button>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-border">
        {reversed.map((layer) => (
          <li
            key={layer.id}
            draggable={!!onReorder}
            onDragStart={() => setDragId(layer.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(layer.id)
            }}
            onDragEnd={() => setDragId(null)}
            className={cn(
              'px-3 py-2 text-sm hover:bg-background',
              activeLayerId === layer.id && 'bg-background',
              dragId === layer.id && 'opacity-50',
            )}
          >
            <div className="flex items-center gap-2">
              {onReorder ? (
                <span className="cursor-grab text-muted active:cursor-grabbing" title="Drag to reorder">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(layer.id)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {layer.name}
                {(layer.adjLayers?.length ?? 0) > 0 ? (
                  <span className="ml-1 text-[10px] text-muted">+{layer.adjLayers!.length} fx</span>
                ) : null}
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 hover:bg-panel"
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={() => onToggleVisible(layer.id)}
              >
                {layer.visible ? (
                  <Eye className="h-3.5 w-3.5 text-muted" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted" />
                )}
              </button>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 hover:bg-panel"
                aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={() => onToggleLock(layer.id)}
              >
                {layer.locked ? (
                  <Lock className="h-3.5 w-3.5 text-muted" />
                ) : (
                  <Unlock className="h-3.5 w-3.5 text-muted" />
                )}
              </button>
            </div>
            {activeLayerId === layer.id ? (
              <label className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                Opacity
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layer.opacity}
                  onChange={(e) => onOpacityChange(layer.id, Number(e.target.value))}
                  className="flex-1"
                  aria-label={`Opacity for ${layer.name}`}
                />
                <span className="w-8 tabular-nums">{layer.opacity}%</span>
              </label>
            ) : null}
          </li>
        ))}
      </ul>
      {activeIdx <= 0 && layers.length > 0 ? (
        <p className="border-t border-border px-3 py-2 text-[10px] text-muted">
          Select a layer above the bottom to merge down.
        </p>
      ) : null}
    </div>
  )
}
