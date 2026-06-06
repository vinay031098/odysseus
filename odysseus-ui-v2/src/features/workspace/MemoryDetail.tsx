import { useEffect, useState } from 'react'
import type { MemoryEntry } from '@/api/workspace-types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const CATEGORIES = ['fact', 'preference', 'context', 'instruction'] as const

type MemoryDetailProps = {
  entry: MemoryEntry | null
  onSave: (id: string, text: string, category: string) => void
  onAdd: (text: string, category: string) => void
  isSaving?: boolean
}

export function MemoryDetail({ entry, onSave, onAdd, isSaving }: MemoryDetailProps) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<string>('fact')
  const isNew = entry === null

  useEffect(() => {
    if (entry) {
      setText(entry.text)
      setCategory(entry.category ?? 'fact')
    } else {
      setText('')
      setCategory('fact')
    }
  }, [entry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    if (entry) {
      onSave(entry.id, trimmed, category)
    } else {
      onAdd(trimmed, category)
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold">{isNew ? 'Add memory' : 'Edit memory'}</h3>
      <div className="space-y-2">
        <Label htmlFor="memory-category">Category</Label>
        <select
          id="memory-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <Label htmlFor="memory-text">Text</Label>
        <textarea
          id="memory-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Something the assistant should remember…"
          rows={8}
          className="min-h-[200px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
      </div>
      <Button type="submit" disabled={isSaving || !text.trim()}>
        {isNew ? 'Add memory' : 'Save changes'}
      </Button>
      {entry?.source ? (
        <p className="text-xs text-muted">Source: {entry.source}</p>
      ) : null}
    </form>
  )
}
