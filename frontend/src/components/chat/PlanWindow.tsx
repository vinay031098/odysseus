import { X } from 'lucide-react'
import { MarkdownMessage } from '@/components/chat/MarkdownMessage'
import { Button } from '@/components/ui/button'

interface PlanWindowProps {
  open: boolean
  title?: string
  planMarkdown: string
  onClose: () => void
  onApprove?: () => void
}

export function PlanWindow({ open, title, planMarkdown, onClose, onApprove }: PlanWindowProps) {
  if (!open) return null

  return (
    <div className="modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="modal-content flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl p-0"
        role="dialog"
        aria-labelledby="plan-window-title"
      >
        <div className="modal-header justify-between px-4 py-3">
          <h2 id="plan-window-title" className="text-sm font-semibold">
            {title ?? (onApprove ? 'Proposed plan' : 'Approved plan')}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close plan window">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <MarkdownMessage content={planMarkdown} />
        </div>
        {onApprove ? (
          <div className="border-t border-border px-4 py-3">
            <Button type="button" onClick={onApprove}>
              Approve & Run
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface PlanApproveBarProps {
  onApprove: () => void
  onOpenWindow: () => void
}

export function PlanApproveBar({ onApprove, onOpenWindow }: PlanApproveBarProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
      <Button type="button" size="sm" onClick={onApprove}>
        Approve & Run
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onOpenWindow}>
        Open in window
      </Button>
    </div>
  )
}
