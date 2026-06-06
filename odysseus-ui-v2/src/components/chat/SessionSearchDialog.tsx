import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { searchMessages } from '@/api/chat'
import type { SearchResult, Session } from '@/api/types'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SessionSearchDialogProps {
  open: boolean
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  sessions?: Session[]
}

type FlatResult =
  | { kind: 'session'; sessionId: string; sessionName: string }
  | { kind: 'message'; item: SearchResult }

function formatTimestamp(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 86_400_000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604_800_000) {
    return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function highlightSnippet(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return (
    <>
      {before}
      <mark className="rounded bg-yellow-200/80 px-0.5 text-inherit dark:bg-yellow-500/30">
        {match}
      </mark>
      {after}
    </>
  )
}

export function SessionSearchDialog({
  open,
  onClose,
  onSelectSession,
  sessions = [],
}: SessionSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [messageResults, setMessageResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setMessageResults([])
    setSelected(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const sessionTitleMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const seen = new Set<string>()
    const matches: FlatResult[] = []
    for (const s of sessions) {
      if (seen.has(s.id)) continue
      const name = s.name?.trim() || 'Untitled'
      if (name.toLowerCase().includes(q)) {
        seen.add(s.id)
        matches.push({ kind: 'session', sessionId: s.id, sessionName: name })
      }
    }
    return matches.slice(0, 8)
  }, [query, sessions])

  const flatResults = useMemo(() => {
    const messageIds = new Set(messageResults.map((r) => r.session_id))
    const titleOnly = sessionTitleMatches.filter(
      (m) => m.kind === 'session' && !messageIds.has(m.sessionId),
    )
    const grouped = new Map<string, SearchResult[]>()
    for (const item of messageResults) {
      const list = grouped.get(item.session_id) ?? []
      list.push(item)
      grouped.set(item.session_id, list)
    }

    const out: FlatResult[] = [...titleOnly]
    for (const [, items] of grouped) {
      for (const item of items) {
        out.push({ kind: 'message', item })
      }
    }
    return out
  }, [messageResults, sessionTitleMatches])

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setMessageResults([])
      setSelected(-1)
      return
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      void searchMessages(q, 40)
        .then((data) => {
          setMessageResults(data)
          setSelected(-1)
        })
        .catch(() => setMessageResults([]))
        .finally(() => setLoading(false))
    }, 300)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const navigate = (sessionId: string) => {
    onSelectSession(sessionId)
    onClose()
  }

  let lastGroup: string | null = null

  return (
    <div
      className="modal fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal-content w-full max-w-xl overflow-hidden rounded-xl border border-border bg-panel shadow-xl p-0"
        role="dialog"
        aria-label="Search conversations"
      >
        <div className="modal-header border-b-0 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              runSearch(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected((i) => Math.min(i + 1, flatResults.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && selected >= 0 && flatResults[selected]) {
                e.preventDefault()
                const row = flatResults[selected]
                navigate(row.kind === 'session' ? row.sessionId : row.item.session_id)
              }
            }}
          />
          <button
            type="button"
            className="rounded p-1 hover:bg-muted"
            onClick={onClose}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Searching…</p>
          )}
          {!loading && query && !flatResults.length && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">No results found</p>
          )}
          {flatResults.map((row, i) => {
            if (row.kind === 'session') {
              return (
                <button
                  key={`session-${row.sessionId}`}
                  type="button"
                  className={cn(
                    'mb-1 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted',
                    selected === i && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => navigate(row.sessionId)}
                >
                  <div className="text-xs font-medium text-muted-foreground">Session title</div>
                  <div className="mt-0.5 font-medium text-foreground">
                    {highlightSnippet(row.sessionName, query.trim())}
                  </div>
                </button>
              )
            }

            const item = row.item
            const showHeader = item.session_id !== lastGroup
            if (showHeader) lastGroup = item.session_id

            return (
              <div key={`${item.session_id}-${i}-${item.timestamp}`}>
                {showHeader ? (
                  <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.session_name}
                  </div>
                ) : null}
                <button
                  type="button"
                  className={cn(
                    'mb-1 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted',
                    selected === i && 'bg-accent text-accent-foreground',
                  )}
                  onClick={() => navigate(item.session_id)}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {item.role === 'user' ? 'You' : 'AI'} · {formatTimestamp(item.timestamp)}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-foreground">
                    {highlightSnippet(item.content_snippet, query.trim())}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
