import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { CompareRunState } from '@/hooks/useCompare'
import {
  buildComparisonMarkdown,
  buildMultiPaneComparisonMarkdown,
  compareExportFromState,
  copyComparisonMarkdown,
  downloadComparisonMarkdown,
  multiCompareExportInput,
  printComparisonMarkdown,
} from './compareHelpers'

interface CompareExportMenuProps {
  prompt: string
  disabled?: boolean
  /** Two-pane legacy state */
  state?: CompareRunState
  /** Multi-pane (2+) export */
  multiPanes?: Array<{ label: string; content: string; done: boolean }>
  isBlind?: boolean
  revealed?: string[] | null
  compareMode?: string
}

export function CompareExportMenu({
  state,
  prompt,
  disabled,
  multiPanes,
  isBlind,
  revealed,
  compareMode,
}: CompareExportMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open])

  const exportMd = () => {
    if (multiPanes && multiPanes.length >= 2) {
      return buildMultiPaneComparisonMarkdown(
        multiCompareExportInput(
          multiPanes.map((p) => ({ label: p.label, content: p.content })),
          prompt,
          isBlind ?? false,
          revealed ?? null,
          compareMode,
        ),
      )
    }
    if (state) {
      return buildComparisonMarkdown(compareExportFromState(state, prompt, compareMode))
    }
    return null
  }

  const run = async (action: 'copy' | 'download' | 'print') => {
    const md = exportMd()
    if (!md) {
      toast.error('Nothing to export yet — run a comparison first')
      return
    }
    setOpen(false)
    try {
      if (action === 'copy') {
        await copyComparisonMarkdown(md)
        toast.success('Copied comparison to clipboard')
      } else if (action === 'download') {
        downloadComparisonMarkdown(md)
        toast.success('Download started')
      } else {
        printComparisonMarkdown(md)
      }
    } catch {
      toast.error('Export failed')
    }
  }

  const allDone =
    multiPanes?.length
      ? multiPanes.every((p) => p.done)
      : state
        ? state.left.done && state.right.done
        : false

  return (
    <div className="relative" ref={wrapRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !allDone}
        onClick={() => setOpen((v) => !v)}
        title="Export comparison"
      >
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[170px] rounded-lg border border-border bg-panel py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background"
            onClick={() => run('copy')}
          >
            <FileText className="h-4 w-4" />
            Copy as Markdown
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background"
            onClick={() => run('download')}
          >
            <Download className="h-4 w-4" />
            Download .md
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background"
            onClick={() => run('print')}
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>
      )}
    </div>
  )
}
