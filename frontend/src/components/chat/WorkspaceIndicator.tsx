import { useCallback, useEffect, useState } from 'react'
import { Folder, X } from 'lucide-react'
import { browseWorkspace, type WorkspaceBrowseResponse } from '@/api/workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspaceFolder } from '@/hooks/useWorkspaceFolder'
import { WORKSPACE_OPEN_EVENT, workspaceBasename } from '@/lib/workspaceFolder'
import { cn } from '@/lib/utils'

interface WorkspaceIndicatorProps {
  className?: string
}

export function WorkspaceIndicator({ className }: WorkspaceIndicatorProps) {
  const { user } = useAuth()
  const { path, setFolder, clear } = useWorkspaceFolder()
  const [open, setOpen] = useState(false)
  const [browse, setBrowse] = useState<WorkspaceBrowseResponse | null>(null)
  const [typedPath, setTypedPath] = useState('')
  const [loading, setLoading] = useState(false)

  const isAdmin = user?.is_admin || user?.auth_enabled === false

  const loadBrowse = useCallback(async (nextPath?: string) => {
    setLoading(true)
    try {
      const data = await browseWorkspace(nextPath)
      setBrowse(data)
      setTypedPath(data.path)
    } catch {
      setBrowse(null)
      setTypedPath(nextPath ?? '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadBrowse(path || undefined)
  }, [loadBrowse, open, path])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(WORKSPACE_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(WORKSPACE_OPEN_EVENT, onOpen)
  }, [])

  if (!isAdmin) return null

  return (
    <>
      {path ? (
        <button
          type="button"
          className={cn(
            'inline-flex max-w-[160px] items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary',
            className,
          )}
          title={`Workspace: ${path} — click to clear`}
          onClick={clear}
        >
          <Folder className="h-3 w-3 shrink-0" />
          <span className="truncate">{workspaceBasename(path)}</span>
          <X className="h-3 w-3 shrink-0 opacity-70" />
        </button>
      ) : (
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted',
            className,
          )}
          onClick={() => setOpen(true)}
        >
          <Folder className="h-3 w-3" />
          Workspace
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Select workspace folder"
        >
          <div className="w-full max-w-lg rounded-lg border border-border bg-panel shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Select workspace</h2>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 p-4">
              <Input
                value={typedPath}
                onChange={(e) => setTypedPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadBrowse(typedPath.trim())
                }}
                placeholder="Type or paste a folder path, then press Enter"
                spellCheck={false}
              />
              <div className="max-h-56 overflow-y-auto rounded border border-border">
                {loading ? (
                  <p className="p-3 text-sm text-muted-foreground">Loading…</p>
                ) : browse?.parent ? (
                  <button
                    type="button"
                    className="block w-full border-b border-border px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void loadBrowse(browse.parent ?? undefined)}
                  >
                    ↑ ..
                  </button>
                ) : null}
                {browse?.dirs.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm hover:bg-muted last:border-b-0"
                    onClick={() => void loadBrowse(dir.path)}
                  >
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{dir.name}</span>
                  </button>
                ))}
                {!loading && browse && browse.dirs.length === 0 && !browse.parent ? (
                  <p className="p-3 text-sm text-muted-foreground">No subfolders</p>
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const chosen = typedPath.trim() || browse?.path || ''
                  if (chosen) {
                    setFolder(chosen)
                    setOpen(false)
                  }
                }}
              >
                Use this folder
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
