import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import type { CookbookTask } from '@/api/cookbookServe'
import type { DiagnosisEntry, DiagnosisFix } from '@/lib/cookbookDiagnosis'
import {
  buildDiagnosisCopyBundle,
  diagnoseOutput,
  diagnosisSuggestion,
  DOWNLOAD_DIAGNOSIS_PATTERNS,
  SERVE_DIAGNOSIS_PATTERNS,
} from '@/lib/cookbookDiagnosis'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CookbookDiagnosisPanelProps {
  output: string
  task?: CookbookTask
  taskType?: string
  onFix: (fix: DiagnosisFix, entry: DiagnosisEntry) => void
  className?: string
}

export function CookbookDiagnosisPanel({
  output,
  task,
  taskType,
  onFix,
  className,
}: CookbookDiagnosisPanelProps) {
  const diagnosis = useMemo(() => {
    const patterns =
      taskType === 'download'
        ? DOWNLOAD_DIAGNOSIS_PATTERNS
        : taskType === 'serve'
          ? SERVE_DIAGNOSIS_PATTERNS
          : undefined
    return diagnoseOutput(output, patterns)
  }, [output, taskType])

  const suggestion = useMemo(() => {
    if (!diagnosis) return ''
    return diagnosisSuggestion(diagnosis)
  }, [diagnosis])

  const fixes = useMemo(() => {
    if (!diagnosis) return []
    const list = [...diagnosis.fixes]
    if (
      taskType === 'serve' &&
      !list.some((f) => f.label === 'Edit serve' || f.action === 'edit_serve')
    ) {
      list.push({ label: 'Edit serve', action: 'edit_serve' })
    }
    return list
  }, [diagnosis, taskType])

  async function copyBundle() {
    if (!diagnosis) return
    const text = buildDiagnosisCopyBundle({ task, diagnosis, output, suggestion })
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied troubleshooting bundle')
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  if (!diagnosis) return null

  return (
    <div
      className={cn(
        'mt-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm',
        className,
      )}
    >
      <p className="font-medium text-amber-800 dark:text-amber-200">{diagnosis.message}</p>
      <p className="mt-1 text-xs text-muted-foreground">{suggestion}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => void copyBundle()}
        >
          Copy troubleshooting bundle
        </Button>
        {fixes.map((fix) => (
          <Button
            key={fix.label}
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onFix(fix, diagnosis)}
          >
            {fix.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
