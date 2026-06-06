import { Button } from '@/components/ui/button'

interface SkillBulkBarProps {
  selectedCount: number
  visibleCount: number
  allSelected: boolean
  onToggleAll: (checked: boolean) => void
  onAudit: () => void
  onPublish: () => void
  onDelete: () => void
  onDeleteNonPassing: () => void
  onCancel: () => void
  nonPassingCount: number
  anyDraftSelected: boolean
  busy?: boolean
}

export function SkillBulkBar({
  selectedCount,
  visibleCount,
  allSelected,
  onToggleAll,
  onAudit,
  onPublish,
  onDelete,
  onDeleteNonPassing,
  onCancel,
  nonPassingCount,
  anyDraftSelected,
  busy,
}: SkillBulkBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel/60 px-3 py-2">
      <label className="inline-flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={visibleCount > 0 && allSelected}
          onChange={(e) => onToggleAll(e.target.checked)}
          aria-label="Select all visible skills"
        />
        <span className="text-muted">All</span>
      </label>
      <span className="text-xs font-medium">{selectedCount} selected</span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onAudit}
          disabled={selectedCount === 0 || busy}
        >
          Audit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onPublish}
          disabled={!anyDraftSelected || busy}
        >
          Publish
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={onDeleteNonPassing}
          disabled={nonPassingCount === 0 || busy}
          title={
            nonPassingCount
              ? `Delete ${nonPassingCount} selected non-passing skill${nonPassingCount === 1 ? '' : 's'}`
              : 'No selected non-passing skills'
          }
        >
          Delete non-passing
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-7"
          onClick={onDelete}
          disabled={selectedCount === 0 || busy}
        >
          Delete
        </Button>
        <Button
          id="skills-bulk-cancel"
          type="button"
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
