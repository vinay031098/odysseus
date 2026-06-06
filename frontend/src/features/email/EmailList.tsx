import { useRef } from 'react'
import { Archive, Paperclip } from 'lucide-react'
import type { EmailListItem } from '@/api/email-types'
import { formatEmailDate } from '@/lib/emailHelpers'
import { cn } from '@/lib/utils'

type EmailListProps = {
  emails: EmailListItem[]
  selectedUid: string | null
  onSelect: (uid: string) => void
  onArchive?: (uid: string) => void
  isLoading?: boolean
  errorMessage?: string
}

const HORIZ_THRESHOLD = 70
const VERT_CANCEL = 30

function EmailListRow({
  em,
  selected,
  onSelect,
  onArchive,
}: {
  em: EmailListItem
  selected: boolean
  onSelect: () => void
  onArchive?: () => void
}) {
  const itemRef = useRef<HTMLButtonElement>(null)
  const swipeRef = useRef({
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    swiping: false,
    blockClick: false,
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onArchive) return
    const t = e.touches[0]
    swipeRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      dx: 0,
      dy: 0,
      swiping: true,
      blockClick: false,
    }
    const el = itemRef.current
    if (el) el.style.transition = 'none'
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const s = swipeRef.current
    if (!s.swiping || !onArchive) return
    const t = e.touches[0]
    s.dx = t.clientX - s.startX
    s.dy = t.clientY - s.startY
    const el = itemRef.current
    if (!el) return
    if (Math.abs(s.dy) > VERT_CANCEL) {
      s.swiping = false
      el.style.transform = ''
      el.style.background = ''
      return
    }
    if (s.dx < 0) {
      const offset = Math.max(s.dx, -160)
      el.style.transform = `translateX(${offset}px)`
      el.style.background = `linear-gradient(to right, transparent, transparent ${100 + offset / 1.6}%, color-mix(in srgb, var(--color-destructive) 35%, transparent) ${100 + offset / 1.6}%)`
    }
  }

  const handleTouchEnd = () => {
    const s = swipeRef.current
    if (!s.swiping || !onArchive) return
    s.swiping = false
    const el = itemRef.current
    if (!el) return
    el.style.transition = 'transform 0.2s ease, opacity 0.2s ease'
    if (s.dx <= -HORIZ_THRESHOLD) {
      s.blockClick = true
      el.style.transform = 'translateX(-100%)'
      el.style.opacity = '0'
      window.setTimeout(() => {
        onArchive()
        el.style.transform = ''
        el.style.opacity = ''
        el.style.background = ''
        s.blockClick = false
      }, 200)
    } else {
      el.style.transform = ''
      el.style.background = ''
    }
  }

  const handleTouchCancel = () => {
    swipeRef.current.swiping = false
    const el = itemRef.current
    if (!el) return
    el.style.transition = 'transform 0.2s ease'
    el.style.transform = ''
    el.style.background = ''
  }

  return (
    <li className="relative overflow-hidden">
      {onArchive && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-center bg-destructive/20 text-destructive md:hidden"
          aria-hidden
        >
          <Archive className="h-4 w-4" />
        </div>
      )}
      <button
        ref={itemRef}
        type="button"
        onClick={() => {
          if (swipeRef.current.blockClick) return
          onSelect()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className={cn(
          'relative flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-panel/50 touch-pan-y',
          selected && 'bg-panel',
          !em.is_read && 'font-semibold',
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm">{em.from_name || em.from_address || 'Unknown'}</span>
          <span className="shrink-0 text-xs text-muted">
            {formatEmailDate(em.date_epoch, em.date)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm text-foreground">{em.subject || '(no subject)'}</span>
          {em.has_attachments && (
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Has attachments" />
          )}
        </div>
        {em.cached_summary && (
          <p className="line-clamp-2 text-xs text-muted">{em.cached_summary}</p>
        )}
      </button>
    </li>
  )
}

export function EmailList({
  emails,
  selectedUid,
  onSelect,
  onArchive,
  isLoading,
  errorMessage,
}: EmailListProps) {
  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-muted">Loading…</div>
  }

  if (errorMessage) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
        {errorMessage}
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
        No messages in this folder.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-y-auto">
      {emails.map((em) => (
        <EmailListRow
          key={em.uid}
          em={em}
          selected={selectedUid === em.uid}
          onSelect={() => onSelect(em.uid)}
          onArchive={onArchive ? () => onArchive(em.uid) : undefined}
        />
      ))}
    </ul>
  )
}
