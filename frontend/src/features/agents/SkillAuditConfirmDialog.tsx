import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface SkillAuditConfirmDialogProps {
  label: string
  onConfirm: (skipAudited: boolean) => void
  onCancel: () => void
}

export function SkillAuditConfirmDialog({
  label,
  onConfirm,
  onCancel,
}: SkillAuditConfirmDialogProps) {
  const [skipAudited, setSkipAudited] = useState(true)

  return (
    <div
      className="modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-audit-confirm-title"
      onClick={onCancel}
    >
      <div
        className="modal-content w-full max-w-md rounded-lg border border-border bg-panel p-0 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header px-4 pt-4">
          <h3 id="skill-audit-confirm-title" className="text-sm font-semibold">
            Audit skills
          </h3>
        </div>
        <div className="px-4 pb-4">
        <p className="mt-2 text-sm text-muted">
          Audit {label}? Each is tested from top to bottom, then published or moved to draft using
          your auto-approve confidence threshold.
        </p>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={skipAudited}
            onChange={(e) => setSkipAudited(e.target.checked)}
          />
          Skip already audited
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => onConfirm(skipAudited)}>
            Audit
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
