import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CookbookTask } from '@/api/cookbookServe'

export interface EditServeFields {
  cmd?: string
  port?: string
  gpus?: string
  backend?: string
}

interface CookbookEditServeDialogProps {
  task: CookbookTask | null
  open: boolean
  initialFields?: EditServeFields
  onClose: () => void
  onSave: (cmd: string, fields: EditServeFields) => void
  saving?: boolean
}

export function CookbookEditServeDialog({
  task,
  open,
  initialFields,
  onClose,
  onSave,
  saving,
}: CookbookEditServeDialogProps) {
  const [cmd, setCmd] = useState('')
  const [port, setPort] = useState('8000')
  const [gpus, setGpus] = useState('')

  useEffect(() => {
    if (!open || !task) return
    setCmd(initialFields?.cmd ?? task.payload?._cmd ?? '')
    setPort(initialFields?.port ?? String(task.payload?.port ?? '8000'))
    setGpus(initialFields?.gpus ?? '')
  }, [open, task, initialFields])

  if (!open || !task) return null

  return (
    <div className="modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="modal-content w-full max-w-2xl rounded-lg border border-border bg-background p-0 shadow-lg"
        role="dialog"
        aria-labelledby="edit-serve-title"
      >
        <div className="modal-header px-4 pt-4">
          <h3 id="edit-serve-title" className="font-semibold">
            Edit serve: {task.name}
          </h3>
        </div>
        <div className="px-4 pb-4">
        <p className="mt-1 text-xs text-muted-foreground">
          Adjust the launch command, then relaunch. The current tmux session will be stopped.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="edit-serve-port">Port</Label>
            <Input
              id="edit-serve-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="edit-serve-gpus">CUDA_VISIBLE_DEVICES</Label>
            <Input
              id="edit-serve-gpus"
              placeholder="empty = all"
              value={gpus}
              onChange={(e) => setGpus(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <Label htmlFor="edit-serve-cmd">Launch command</Label>
          <textarea
            id="edit-serve-cmd"
            className="min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs"
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !cmd.trim()}
            onClick={() => onSave(cmd.trim(), { cmd: cmd.trim(), port, gpus })}
          >
            {saving ? 'Relaunching…' : 'Relaunch'}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
