import { useMemo, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  Folder,
  MessageSquarePlus,
  MoreHorizontal,
  Star,
  Trash2,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Session } from '@/api/types'
import {
  collectFolderNames,
  groupSessionsByFolder,
  sortSessions,
  type SessionSortMode,
  visibleSessions,
} from '@/lib/chatSessions'
import { cn } from '@/lib/utils'

interface SessionSidebarProps {
  sessions: Session[]
  archivedSessions: Session[]
  currentSessionId: string | null
  isPending: boolean
  incognitoIds: Set<string>
  onNewChat: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onToggleImportant: (id: string, important: boolean) => void
  onMoveToFolder: (id: string, folder: string) => void
  disabled?: boolean
}

export function SessionSidebar({
  sessions,
  archivedSessions,
  currentSessionId,
  isPending,
  incognitoIds,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
  onArchive,
  onUnarchive,
  onToggleImportant,
  onMoveToFolder,
  disabled,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SessionSortMode>('active')
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [showArchived, setShowArchived] = useState(false)
  const [newFolderFor, setNewFolderFor] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

  const visible = useMemo(
    () => sortSessions(visibleSessions(sessions, incognitoIds), sortMode),
    [sessions, incognitoIds, sortMode],
  )

  const folderNames = useMemo(() => collectFolderNames(visible), [visible])
  const grouped = useMemo(() => groupSessionsByFolder(visible), [visible])

  const startEdit = (session: Session) => {
    setEditingId(session.id)
    setEditName(session.name)
    setMenuId(null)
  }

  const commitEdit = (id: string) => {
    const name = editName.trim()
    if (name) onRename(id, name)
    setEditingId(null)
  }

  const renderSessionRow = (session: Session) => (
    <div
      key={session.id}
      className={cn(
        'group mb-0.5 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
        currentSessionId === session.id
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-muted',
      )}
    >
      {session.is_important ? (
        <Star className="h-3 w-3 shrink-0 fill-primary text-primary" aria-hidden />
      ) : null}
      {editingId === session.id ? (
        <Input
          className="h-7 flex-1 text-xs"
          value={editName}
          autoFocus
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => commitEdit(session.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit(session.id)
            if (e.key === 'Escape') setEditingId(null)
          }}
        />
      ) : (
        <>
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left"
            onClick={() => onSelect(session.id)}
          >
            {session.name}
          </button>
          <button
            type="button"
            className="hidden rounded p-1 hover:bg-background group-hover:inline-flex"
            onClick={() => onToggleImportant(session.id, !session.is_important)}
            aria-label={session.is_important ? 'Unfavorite' : 'Favorite'}
          >
            <Star
              className={cn('h-3 w-3', session.is_important && 'fill-primary text-primary')}
            />
          </button>
          <div className="relative">
            <button
              type="button"
              className="hidden rounded p-1 hover:bg-background group-hover:inline-flex"
              onClick={() => setMenuId(menuId === session.id ? null : session.id)}
              aria-label="Session menu"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
            {menuId === session.id && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[10rem] rounded-md border border-border bg-panel py-1 text-xs shadow-md">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted"
                  onClick={() => startEdit(session)}
                >
                  <Pencil className="h-3 w-3" /> Rename
                </button>
                {folderNames.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted"
                    onClick={() => {
                      onMoveToFolder(session.id, f)
                      setMenuId(null)
                    }}
                  >
                    <Folder className="h-3 w-3" /> {f}
                  </button>
                ))}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted"
                  onClick={() => {
                    setNewFolderFor(session.id)
                    setNewFolderName('')
                  }}
                >
                  <Folder className="h-3 w-3" /> New folder…
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted"
                  onClick={() => {
                    onMoveToFolder(session.id, '')
                    setMenuId(null)
                  }}
                >
                  (No folder)
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-muted"
                  onClick={() => {
                    onArchive(session.id)
                    setMenuId(null)
                  }}
                >
                  <Archive className="h-3 w-3" /> Archive
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-destructive hover:bg-muted"
                  onClick={() => {
                    if (!session.is_important) onDelete(session.id)
                    setMenuId(null)
                  }}
                  disabled={session.is_important}
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderFlat = () => visible.map(renderSessionRow)

  const renderGrouped = () => (
    <>
      {Object.keys(grouped.folders)
        .sort()
        .map((folderName) => {
          const collapsed = collapsedFolders[folderName]
          return (
            <div key={folderName} className="mb-2">
              <button
                type="button"
                className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setCollapsedFolders((c) => ({ ...c, [folderName]: !collapsed }))
                }
              >
                {collapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <Folder className="h-3 w-3" />
                <span className="truncate">{folderName}</span>
                <span>({grouped.folders[folderName].length})</span>
              </button>
              {!collapsed && grouped.folders[folderName].map(renderSessionRow)}
            </div>
          )
        })}
      {grouped.unfiled.map(renderSessionRow)}
    </>
  )

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="space-y-2 border-b border-border p-3">
        <Button
          className="w-full justify-start gap-2"
          variant="secondary"
          size="sm"
          onClick={onNewChat}
          disabled={disabled}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
        <select
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SessionSortMode)}
          aria-label="Session sort"
        >
          <option value="active">Last active</option>
          <option value="newest">Newest</option>
          <option value="group">By folder</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {newFolderFor && (
          <div className="mb-2 flex gap-1 px-1">
            <Input
              className="h-7 text-xs"
              placeholder="Folder name"
              value={newFolderName}
              autoFocus
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  onMoveToFolder(newFolderFor, newFolderName.trim())
                  setSortMode('group')
                  setNewFolderFor(null)
                  setMenuId(null)
                }
                if (e.key === 'Escape') setNewFolderFor(null)
              }}
            />
          </div>
        )}
        {isPending && (
          <div
            className={cn(
              'mb-1 rounded-md px-3 py-2 text-sm font-medium',
              'bg-accent text-accent-foreground',
            )}
          >
            New chat
          </div>
        )}
        {sortMode === 'group' ? renderGrouped() : renderFlat()}
        {!visible.length && !isPending && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        )}
        {archivedSessions.length > 0 && (
          <div className="mt-4 border-t border-border pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Archive className="h-3 w-3" />
              Archived ({archivedSessions.length})
            </button>
            {showArchived &&
              archivedSessions.map((session) => (
                <div
                  key={session.id}
                  className="group mb-0.5 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm opacity-80 hover:bg-muted"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => onSelect(session.id)}
                  >
                    {session.name}
                  </button>
                  <button
                    type="button"
                    className="hidden rounded p-1 hover:bg-background group-hover:inline-flex"
                    onClick={() => onUnarchive(session.id)}
                    aria-label="Restore"
                  >
                    <ArchiveRestore className="h-3 w-3" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </aside>
  )
}
