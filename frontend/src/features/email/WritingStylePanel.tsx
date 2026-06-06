import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import * as emailApi from '@/api/email'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const writingStyleKey = ['email', 'writing-style'] as const

export function WritingStylePanel() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: writingStyleKey,
    queryFn: emailApi.fetchWritingStyle,
  })

  const style = data?.style ?? ''

  const save = useMutation({
    mutationFn: (next: string) => emailApi.updateWritingStyle(next),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: writingStyleKey })
      toast.success('Writing style saved')
    },
    onError: () => toast.error('Could not save writing style'),
  })

  const extract = useMutation({
    mutationFn: () => emailApi.extractWritingStyle(15),
    onSuccess: (res) => {
      if (res.success && res.style) {
        void qc.invalidateQueries({ queryKey: writingStyleKey })
        toast.success('Writing style extracted from sent mail')
      } else {
        toast.error(res.error ?? 'Could not extract writing style')
      }
    },
    onError: () => toast.error('Could not extract writing style'),
  })

  return (
    <details className="border-b border-border px-4 py-2 text-sm">
      <summary className="cursor-pointer list-none font-medium text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Writing style (AI replies)
        </span>
      </summary>
      <div className="mt-3 space-y-2 pb-2">
        <Label htmlFor="email-writing-style" className="text-xs text-muted">
          Describe how you write email — used when generating AI replies.
        </Label>
        <textarea
          id="email-writing-style"
          defaultValue={style}
          key={style}
          rows={4}
          disabled={isLoading || save.isPending}
          className="flex w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          placeholder="Formal but warm; short paragraphs; signs off with “Best,” …"
          onBlur={(e) => {
            const next = e.target.value.trim()
            if (next !== style.trim()) save.mutate(next)
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={extract.isPending}
            onClick={() => extract.mutate()}
          >
            {extract.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing sent mail…
              </>
            ) : (
              'Extract from sent mail'
            )}
          </Button>
        </div>
      </div>
    </details>
  )
}
