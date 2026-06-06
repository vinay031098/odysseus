import { useCallback, useRef, useState } from 'react'
import type { CanvasProject } from '@/lib/canvasHelpers'

export type HistoryEntry = {
  label: string
  project: CanvasProject
}

const MAX_HISTORY = 50

export function useEditorHistory(initial: CanvasProject) {
  const [entries, setEntries] = useState<HistoryEntry[]>([{ label: 'Initial', project: initial }])
  const [index, setIndex] = useState(0)
  const skipRef = useRef(false)
  const indexRef = useRef(0)

  const syncIndex = useCallback((next: number) => {
    indexRef.current = next
    setIndex(next)
  }, [])

  const push = useCallback(
    (project: CanvasProject, label = 'Edit') => {
      if (skipRef.current) {
        skipRef.current = false
        return
      }
      setEntries((prev) => {
        const trimmed = prev.slice(0, indexRef.current + 1)
        const next = [...trimmed, { label, project: structuredClone(project) }]
        while (next.length > MAX_HISTORY) next.shift()
        const newIndex = next.length - 1
        syncIndex(newIndex)
        return next
      })
    },
    [syncIndex],
  )

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return
    skipRef.current = true
    syncIndex(indexRef.current - 1)
  }, [syncIndex])

  const redo = useCallback(() => {
    setEntries((prev) => {
      if (indexRef.current >= prev.length - 1) return prev
      skipRef.current = true
      syncIndex(indexRef.current + 1)
      return prev
    })
  }, [syncIndex])

  const jumpTo = useCallback(
    (i: number) => {
      skipRef.current = true
      syncIndex(Math.max(0, Math.min(i, entries.length - 1)))
    },
    [entries.length, syncIndex],
  )

  const current = entries[index]?.project ?? initial

  return {
    current,
    entries,
    index,
    canUndo: index > 0,
    canRedo: index < entries.length - 1,
    push,
    undo,
    redo,
    jumpTo,
    skipRef,
  }
}
