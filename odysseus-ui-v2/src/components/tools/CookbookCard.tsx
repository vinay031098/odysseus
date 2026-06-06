import { BookOpen, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CookbookRecipe } from '@/api/types'
import { cn } from '@/lib/utils'

interface CookbookCardProps {
  recipe: CookbookRecipe
  selected?: boolean
  onSelect: () => void
  onRunInChat: () => void
}

const SOURCE_LABELS: Record<CookbookRecipe['source'], string> = {
  preset: 'Preset',
  template: 'Template',
  builtin: 'Built-in',
}

export function CookbookCard({ recipe, selected, onSelect, onRunInChat }: CookbookCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors cursor-pointer',
        selected ? 'border-primary bg-primary/5' : 'border-border bg-panel/20 hover:bg-panel/40',
      )}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-sm">{recipe.name}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {SOURCE_LABELS[recipe.source]}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{recipe.prompt}</p>
      {recipe.temperature != null && (
        <p className="mt-2 text-[11px] text-muted-foreground">Temp {recipe.temperature}</p>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full"
        onClick={(e) => {
          e.stopPropagation()
          onRunInChat()
        }}
      >
        <MessageSquare className="mr-2 h-3 w-3" />
        Run in chat
      </Button>
    </div>
  )
}
