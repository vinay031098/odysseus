import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminGate, SettingsCard } from '@/features/settings/SettingsCard'
import { useAppSettings } from '@/hooks/useAppSettings'
import { usePersonalDocs } from '@/hooks/usePersonalDocs'
import { formatExtraRoots, parseExtraRoots } from '@/lib/settings-fields'
import { useAuth } from '@/hooks/useAuth'

export function ToolsTab() {
  const { user } = useAuth()
  const isAdmin = !!user?.is_admin
  const { settings, save, isSaving } = useAppSettings()
  const {
    data: personal,
    isLoading: ragLoading,
    addDir,
    removeDir,
    removeFile,
    reload,
    upload,
  } = usePersonalDocs(isAdmin)
  const [rootsText, setRootsText] = useState('')
  const [ragDir, setRagDir] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    setRootsText(formatExtraRoots(parseExtraRoots(settings?.tool_path_extra_roots)))
  }, [settings])

  if (!isAdmin) {
    return <AdminGate>Tool path configuration requires an administrator account.</AdminGate>
  }

  async function handleSavePaths() {
    const roots = rootsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    try {
      await save({ tool_path_extra_roots: roots })
      toast.success('Tool paths saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function handleAddRagDir() {
    const dir = ragDir.trim()
    if (!dir) return
    setStatus('Indexing…')
    try {
      const res = await addDir.mutateAsync(dir)
      if (res.success) {
        toast.success(`Indexed ${res.indexed_count ?? 0} chunks`)
        setRagDir('')
        setStatus('')
      } else {
        setStatus(res.detail ?? res.message ?? 'Failed')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setStatus(`Uploading ${files.length} file(s)…`)
    try {
      const res = await upload.mutateAsync(files)
      if (res.success) {
        toast.success(`Uploaded ${res.uploaded?.length ?? 0}, indexed ${res.indexed_count ?? 0}`)
        setStatus('')
      } else {
        setStatus(res.detail ?? 'Upload failed')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Tool path roots"
        description="Extra directories the agent may read/write (one path per line)."
      >
        <div className="space-y-3">
          <Label htmlFor="tool-roots">Additional roots</Label>
          <textarea
            id="tool-roots"
            value={rootsText}
            onChange={(e) => setRootsText(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            placeholder="/Users/you/projects"
          />
          <Button type="button" onClick={() => void handleSavePaths()} disabled={isSaving}>
            Save tool paths
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="RAG / personal documents"
        description="Indexed directories and uploads for knowledge-base search (admin)."
      >
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="rag-dir">Add directory path</Label>
              <Input
                id="rag-dir"
                value={ragDir}
                onChange={(e) => setRagDir(e.target.value)}
                placeholder="/path/under/personal/documents"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <Button type="button" onClick={() => void handleAddRagDir()} disabled={addDir.isPending}>
              {addDir.isPending ? 'Indexing…' : 'Add directory'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void reload.mutateAsync().then((r) => {
                  toast.success(`Reloaded index (${r.count} documents)`)
                })
              }
              disabled={reload.isPending}
            >
              Reload index
            </Button>
          </div>

          <div>
            <Label htmlFor="rag-upload">Upload files</Label>
            <Input
              id="rag-upload"
              type="file"
              multiple
              className="mt-1"
              onChange={(e) => void handleUpload(e.target.files)}
            />
          </div>

          {status && <p className="text-xs text-muted">{status}</p>}

          {ragLoading ? (
            <p className="text-muted">Loading RAG index…</p>
          ) : (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Directories</p>
                <ul className="mt-2 space-y-1">
                  {(personal?.directories ?? []).length === 0 ? (
                    <li className="text-muted">No directories indexed</li>
                  ) : (
                    personal!.directories.map((d) => (
                      <li key={d} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                        <span className="truncate font-mono text-xs" title={d}>
                          {d}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (!confirm(`Remove directory from RAG?\n${d}`)) return
                            void removeDir.mutateAsync(d).then(() => toast.success('Removed'))
                          }}
                        >
                          Remove
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Files</p>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {(personal?.files ?? []).length === 0 ? (
                    <li className="text-muted">No files indexed</li>
                  ) : (
                    personal!.files.map((f) => (
                      <li
                        key={f.path || f.name}
                        className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1"
                      >
                        <span className="truncate text-xs" title={f.path || f.name}>
                          {f.name}
                          {f.size != null && (
                            <span className="ml-2 text-muted">
                              {f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`}
                            </span>
                          )}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const path = f.path || f.name
                            if (!confirm(`Delete "${path}" from RAG?`)) return
                            void removeFile.mutateAsync(path).then(() => toast.success('Deleted'))
                          }}
                        >
                          Delete
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </SettingsCard>
    </div>
  )
}
