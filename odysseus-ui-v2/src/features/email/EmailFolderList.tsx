import { SCHEDULED_FOLDER } from '@/lib/emailHelpers'
import { cn } from '@/lib/utils'

type EmailFolderListProps = {
  folders: string[]
  selected: string
  onSelect: (folder: string) => void
  isLoading?: boolean
  showScheduled?: boolean
}

function folderLabel(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'inbox') return 'Inbox'
  if (lower.includes('sent')) return 'Sent'
  if (lower.includes('draft')) return 'Drafts'
  if (lower.includes('trash') || lower.includes('deleted')) return 'Trash'
  if (lower.includes('junk') || lower.includes('spam')) return 'Spam'
  if (lower.includes('archive')) return 'Archive'
  const parts = name.split(/[/\\]/)
  return parts[parts.length - 1] || name
}

export function EmailFolderList({
  folders,
  selected,
  onSelect,
  isLoading,
  showScheduled = true,
}: EmailFolderListProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-xs text-muted">Loading folders…</div>
    )
  }

  if (folders.length === 0) {
    return (
      <div className="p-4 text-xs text-muted">No folders found.</div>
    )
  }

  const sorted = [...folders].sort((a, b) => {
    const rank = (f: string) => {
      const l = f.toLowerCase()
      if (l === 'inbox') return 0
      if (l.includes('sent')) return 1
      if (l.includes('draft')) return 2
      if (l.includes('archive')) return 3
      if (l.includes('junk') || l.includes('spam')) return 8
      if (l.includes('trash') || l.includes('deleted')) return 9
      return 5
    }
    const dr = rank(a) - rank(b)
    return dr !== 0 ? dr : folderLabel(a).localeCompare(folderLabel(b))
  })

  return (
    <nav className="flex h-full flex-col overflow-y-auto p-2" aria-label="Mail folders">
      {sorted.map((folder) => (
        <button
          key={folder}
          type="button"
          onClick={() => onSelect(folder)}
          className={cn(
            'rounded-md px-3 py-2 text-left text-sm transition-colors',
            selected === folder
              ? 'bg-panel font-medium text-foreground'
              : 'text-muted hover:bg-panel/60 hover:text-foreground',
          )}
          title={folder}
        >
          {folderLabel(folder)}
        </button>
      ))}
      {showScheduled && (
        <>
          <div className="my-2 border-t border-border" />
          <button
            type="button"
            onClick={() => onSelect(SCHEDULED_FOLDER)}
            className={cn(
              'rounded-md px-3 py-2 text-left text-sm transition-colors',
              selected === SCHEDULED_FOLDER
                ? 'bg-panel font-medium text-foreground'
                : 'text-muted hover:bg-panel/60 hover:text-foreground',
            )}
          >
            Scheduled
          </button>
        </>
      )}
    </nav>
  )
}
