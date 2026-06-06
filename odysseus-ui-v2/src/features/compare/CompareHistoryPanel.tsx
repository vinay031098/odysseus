import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteComparison, fetchCompareHistory } from '@/api/compare'
import type { CompareHistoryItem } from '@/api/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function formatWinner(item: CompareHistoryItem): string {
  if (!item.winner) return '—'
  if (item.winner === 'tie') return 'Tie'
  if (item.winner === 'a') return item.model_a.split('/').pop() ?? item.model_a
  if (item.winner === 'b') return item.model_b.split('/').pop() ?? item.model_b
  return item.winner
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function CompareHistoryPanel() {
  const queryClient = useQueryClient()
  const historyQuery = useQuery({
    queryKey: ['compare-history'],
    queryFn: fetchCompareHistory,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComparison,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compare-history'] })
      toast.success('Comparison deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    },
  })

  const items = historyQuery.data ?? []

  return (
    <div className="rounded-lg border border-border bg-panel/20">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Comparison history</h2>
        <span className="ml-auto text-xs text-muted-foreground">{items.length} records</span>
      </div>

      {historyQuery.isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading history…</p>
      ) : !items.length ? (
        <p className="p-4 text-sm text-muted-foreground">
          No comparisons yet. Run a comparison and vote to build history.
        </p>
      ) : (
        <ul className="max-h-[320px] divide-y divide-border overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-panel/40"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium">{item.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(item.model_a.split('/').pop() ?? item.model_a)} vs{' '}
                  {(item.model_b.split('/').pop() ?? item.model_b)}
                  {item.is_blind ? ' · blind' : ''}
                </p>
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">Winner:</span>{' '}
                  <span className={cn(item.winner ? 'text-foreground' : 'text-muted-foreground')}>
                    {formatWinner(item)}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{formatDate(item.voted_at ?? item.created_at)}</span>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Delete"
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
